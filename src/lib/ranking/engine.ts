/**
 * Deterministic, explainable candidate ranking.
 *
 * Every number below is computed from data already stored in the database
 * (candidate name/email/phone/source/stage/notes/resume_link/rating/timestamps
 * and requisition title/department/notes). Nothing is inferred about employers,
 * projects, certifications or durations that is not literally present in the
 * stored text. Where data is missing we return an "Insufficient evidence" note
 * rather than guessing.
 */

import {
  extractSkills,
  mentions,
  normalize,
  skillDepth,
  tokens,
  SENIORITY_TERMS,
  type SkillHit,
} from "./skills";

export const DIMENSIONS = ["skill", "experience", "recency", "evidence"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABEL: Record<Dimension, string> = {
  skill: "Skill Alignment",
  experience: "Experience Relevance",
  recency: "Skill Recency",
  evidence: "Evidence Strength",
};

export type Weights = Record<Dimension, number>;

/** Default weights (must total 100). */
export const DEFAULT_WEIGHTS: Weights = {
  skill: 45,
  experience: 25,
  recency: 15,
  evidence: 15,
};

export interface RankCandidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string;
  notes: string | null;
  resume_link: string | null;
  rating: number | null;
  last_activity_at: string;
  created_at: string;
  requisition_id: string | null;
}

export interface RankRequisition {
  id: string;
  title: string;
  department: string | null;
  notes: string | null;
}

export interface SkillMatch {
  skill: string;
  depth: number;
  occurrences: number;
  yearsStated: number | null;
  evidence: string | null;
  recent: boolean;
}

export interface DimensionResult {
  dimension: Dimension;
  /** 0..1 normalized quality on this dimension */
  ratio: number;
  /** points earned out of the weighted maximum */
  points: number;
  /** weighted maximum (equal to the weight) */
  max: number;
  reasons: string[];
  gaps: string[];
}

export interface CandidateScore {
  candidate: RankCandidate;
  overall: number;
  dimensions: Record<Dimension, DimensionResult>;
  matchedSkills: SkillMatch[];
  missingSkills: string[];
  weakSkills: SkillMatch[];
  strengths: string[];
  gaps: string[];
  dataCoverage: number;
  insufficient: boolean;
}

const STAGE_PROGRESS: Record<string, number> = {
  applied: 0,
  screen: 0.35,
  interview: 0.7,
  offer: 0.95,
  hired: 1,
  rejected: 0,
};

/** Text the requisition provides for requirement extraction. */
function reqText(req: RankRequisition): string {
  return [req.title, req.department, req.notes].filter(Boolean).join(". ");
}

/** Text the candidate provides as evidence. */
function candText(c: RankCandidate): string {
  return [c.notes, c.resume_link, c.source].filter(Boolean).join(". ");
}

export interface RequirementProfile {
  skills: SkillHit[];
  skillNames: string[];
  families: Set<string>;
  titleTokens: string[];
  seniority: string | null;
  hasNotes: boolean;
}

export function buildRequirementProfile(req: RankRequisition): RequirementProfile {
  const text = reqText(req);
  const skills = extractSkills(text);
  const lower = normalize(text);
  const seniority = SENIORITY_TERMS.find((t) => mentions(lower, t)) ?? null;
  return {
    skills,
    skillNames: skills.map((s) => s.skill),
    families: new Set(skills.map((s) => s.family)),
    titleTokens: tokens(`${req.title} ${req.department ?? ""}`),
    seniority,
    hasNotes: Boolean(req.notes && req.notes.trim().length > 20),
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function monthsSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 999;
  return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44);
}

/* ---------------------------------------------------------------- dimensions */

function scoreSkill(profile: RequirementProfile, hits: SkillHit[]) {
  const byName = new Map(hits.map((h) => [h.skill, h]));
  const matched: SkillMatch[] = [];
  const missing: string[] = [];
  let earned = 0;

  for (const required of profile.skills) {
    const hit = byName.get(required.skill);
    if (hit) {
      const depth = skillDepth(hit);
      earned += depth;
      matched.push({
        skill: hit.skill,
        depth,
        occurrences: hit.occurrences,
        yearsStated: hit.yearsStated,
        evidence: hit.quote,
        recent: hit.recencyMarkers.length > 0,
      });
    } else {
      // adjacent-family credit: related skill in the same family counts partially
      const adjacent = hits.find((h) => h.family === required.family);
      if (adjacent) {
        earned += 0.25;
        missing.push(`${required.skill} (related: ${adjacent.skill})`);
      } else {
        missing.push(required.skill);
      }
    }
  }

  const denom = profile.skills.length;
  const ratio = denom === 0 ? 0 : clamp01(earned / denom);
  return { ratio, matched, missing, denom };
}

function scoreExperience(
  profile: RequirementProfile,
  c: RankCandidate,
  hits: SkillHit[],
) {
  const text = normalize(candText(c));
  const reasons: string[] = [];
  const gaps: string[] = [];

  // 1. role/department vocabulary overlap (0..0.45)
  const candTokens = new Set(tokens(text));
  const overlap = profile.titleTokens.filter((t) => candTokens.has(t));
  const overlapRatio = profile.titleTokens.length
    ? overlap.length / profile.titleTokens.length
    : 0;
  if (overlap.length) {
    reasons.push(`Notes reference role vocabulary: ${overlap.slice(0, 4).join(", ")}`);
  } else if (text.trim()) {
    gaps.push("Notes do not reference the role title or department vocabulary");
  }

  // 2. explicitly stated duration on a required skill (0..0.3)
  const statedYears = hits
    .filter((h) => profile.skillNames.includes(h.skill) && h.yearsStated !== null)
    .map((h) => ({ skill: h.skill, years: h.yearsStated as number }));
  const maxYears = statedYears.reduce((m, s) => Math.max(m, s.years), 0);
  const yearsRatio = clamp01(maxYears / 6);
  if (statedYears.length) {
    reasons.push(
      `States ${statedYears
        .slice(0, 3)
        .map((s) => `${s.years}y ${s.skill}`)
        .join(", ")}`,
    );
  } else {
    gaps.push("No stated duration of relevant experience in the record");
  }

  // 3. seniority alignment (0..0.1)
  const candSeniority = SENIORITY_TERMS.find((t) => mentions(text, t)) ?? null;
  const seniorityMatch = profile.seniority && candSeniority === profile.seniority;
  if (seniorityMatch) reasons.push(`Seniority language matches the requisition (${candSeniority})`);
  else if (profile.seniority && candSeniority)
    gaps.push(`Requisition asks for "${profile.seniority}", record says "${candSeniority}"`);

  // 4. human-vetted pipeline progress (0..0.15)
  const progress = STAGE_PROGRESS[c.stage] ?? 0;
  if (progress >= 0.7) reasons.push(`Already advanced to ${c.stage} by your team`);

  const ratio = clamp01(
    overlapRatio * 0.45 + yearsRatio * 0.3 + (seniorityMatch ? 0.1 : 0) + progress * 0.15,
  );
  return { ratio, reasons, gaps };
}

function scoreRecency(profile: RequirementProfile, c: RankCandidate, hits: SkillHit[]) {
  const reasons: string[] = [];
  const gaps: string[] = [];

  const relevant = hits.filter((h) => profile.skillNames.includes(h.skill));
  const recentFlagged = relevant.filter((h) => h.recencyMarkers.length > 0);
  const textRecency = relevant.length ? recentFlagged.length / relevant.length : 0;
  if (recentFlagged.length) {
    reasons.push(
      `Record marks ${recentFlagged.map((h) => h.skill).slice(0, 3).join(", ")} as current`,
    );
  } else if (relevant.length) {
    gaps.push("No language in the record indicates the relevant skills are current");
  }

  const months = monthsSince(c.last_activity_at);
  const activityRatio = clamp01(1 - months / 12);
  if (months <= 1) reasons.push("Active in your pipeline within the last month");
  else if (months > 6) gaps.push(`No pipeline activity for about ${Math.round(months)} months`);

  const ratio = clamp01(textRecency * 0.55 + activityRatio * 0.45);
  return { ratio, reasons, gaps };
}

function scoreEvidence(c: RankCandidate, hits: SkillHit[]) {
  const reasons: string[] = [];
  const gaps: string[] = [];
  let score = 0;

  const noteLen = (c.notes ?? "").trim().length;
  if (noteLen >= 240) {
    score += 0.35;
    reasons.push("Detailed written notes on file");
  } else if (noteLen >= 60) {
    score += 0.2;
    reasons.push("Some written notes on file");
  } else {
    gaps.push("Little or no written notes — insufficient evidence to assess depth");
  }

  if (c.resume_link) {
    score += 0.25;
    reasons.push("Resume link attached");
  } else {
    gaps.push("No resume attached");
  }

  if (c.rating !== null && c.rating !== undefined) {
    score += 0.15 * clamp01(c.rating / 5);
    reasons.push(`Recruiter rating recorded (${c.rating}/5)`);
  } else {
    gaps.push("No recruiter rating recorded");
  }

  const withDepth = hits.filter((h) => h.depthMarkers.length > 0);
  if (withDepth.length) {
    score += Math.min(0.15, withDepth.length * 0.05);
    reasons.push(
      `Applied-usage language for ${withDepth.map((h) => h.skill).slice(0, 3).join(", ")}`,
    );
  }

  if (c.email && c.phone) score += 0.05;
  if (c.source) {
    score += 0.05;
    reasons.push(`Source recorded: ${c.source}`);
  }

  return { ratio: clamp01(score), reasons, gaps };
}

/* -------------------------------------------------------------------- public */

export function normalizeWeights(w: Weights): Weights {
  const total = DIMENSIONS.reduce((s, d) => s + (w[d] || 0), 0);
  if (total === 0) return { ...DEFAULT_WEIGHTS };
  if (total === 100) return { ...w };
  const scaled = DIMENSIONS.map((d) => ({ d, v: ((w[d] || 0) / total) * 100 }));
  const rounded = scaled.map((s) => ({ d: s.d, v: Math.floor(s.v) }));
  let remainder = 100 - rounded.reduce((s, r) => s + r.v, 0);
  const order = [...scaled].sort((a, b) => (b.v % 1) - (a.v % 1));
  for (const o of order) {
    if (remainder <= 0) break;
    const target = rounded.find((r) => r.d === o.d)!;
    target.v += 1;
    remainder -= 1;
  }
  return rounded.reduce((acc, r) => ({ ...acc, [r.d]: r.v }), {} as Weights);
}

export function scoreCandidate(
  c: RankCandidate,
  profile: RequirementProfile,
  weights: Weights = DEFAULT_WEIGHTS,
): CandidateScore {
  const w = normalizeWeights(weights);
  const hits = extractSkills(candText(c));

  const skill = scoreSkill(profile, hits);
  const experience = scoreExperience(profile, c, hits);
  const recency = scoreRecency(profile, c, hits);
  const evidence = scoreEvidence(c, hits);

  const skillReasons: string[] = [];
  const skillGaps: string[] = [];
  const strong = skill.matched.filter((m) => m.depth >= 0.7);
  const weak = skill.matched.filter((m) => m.depth < 0.7);
  if (strong.length)
    skillReasons.push(
      `Strong evidence for ${strong.map((m) => m.skill).slice(0, 4).join(", ")}`,
    );
  if (weak.length)
    skillGaps.push(
      `${weak.map((m) => m.skill).slice(0, 4).join(", ")} mentioned but with thin supporting detail`,
    );
  if (skill.missing.length)
    skillGaps.push(`No evidence of ${skill.missing.slice(0, 5).join(", ")}`);
  if (skill.denom === 0)
    skillGaps.push("Requisition lists no recognisable skills — insufficient evidence to compare");

  const mk = (d: Dimension, ratio: number, reasons: string[], gaps: string[]): DimensionResult => ({
    dimension: d,
    ratio,
    points: Math.round(ratio * w[d] * 10) / 10,
    max: w[d],
    reasons,
    gaps,
  });

  const dimensions: Record<Dimension, DimensionResult> = {
    skill: mk("skill", skill.ratio, skillReasons, skillGaps),
    experience: mk("experience", experience.ratio, experience.reasons, experience.gaps),
    recency: mk("recency", recency.ratio, recency.reasons, recency.gaps),
    evidence: mk("evidence", evidence.ratio, evidence.reasons, evidence.gaps),
  };

  const overall = Math.round(DIMENSIONS.reduce((s, d) => s + dimensions[d].ratio * w[d], 0));

  const coverageSignals = [
    Boolean(c.notes && c.notes.trim().length > 40),
    Boolean(c.resume_link),
    c.rating !== null && c.rating !== undefined,
    hits.length > 0,
  ];
  const dataCoverage = coverageSignals.filter(Boolean).length / coverageSignals.length;

  return {
    candidate: c,
    overall,
    dimensions,
    matchedSkills: skill.matched.sort((a, b) => b.depth - a.depth),
    missingSkills: skill.missing,
    weakSkills: weak,
    strengths: DIMENSIONS.flatMap((d) => dimensions[d].reasons),
    gaps: DIMENSIONS.flatMap((d) => dimensions[d].gaps),
    dataCoverage,
    insufficient: dataCoverage <= 0.25,
  };
}

export function rankCandidates(
  candidates: RankCandidate[],
  req: RankRequisition,
  weights: Weights = DEFAULT_WEIGHTS,
): CandidateScore[] {
  const profile = buildRequirementProfile(req);
  return candidates
    .map((c) => scoreCandidate(c, profile, weights))
    .sort((a, b) =>
      b.overall - a.overall ||
      b.dimensions.skill.ratio - a.dimensions.skill.ratio ||
      a.candidate.name.localeCompare(b.candidate.name),
    );
}

/* ------------------------------------------------------- movement explanation */

export interface RankMove {
  id: string;
  name: string;
  from: number;
  to: number;
  delta: number;
  reason: string;
}

/** Explains rank movement strictly from weight deltas and the candidate's own dimension ratios. */
export function explainMovement(
  previous: CandidateScore[],
  next: CandidateScore[],
  prevWeights: Weights,
  nextWeights: Weights,
  minDelta = 1,
): RankMove[] {
  const prevIndex = new Map(previous.map((s, i) => [s.candidate.id, i + 1]));
  const weightDelta = DIMENSIONS.map((d) => ({ d, delta: nextWeights[d] - prevWeights[d] }))
    .filter((x) => x.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const moves: RankMove[] = [];
  next.forEach((score, i) => {
    const from = prevIndex.get(score.candidate.id);
    if (!from) return;
    const to = i + 1;
    const delta = from - to;
    if (Math.abs(delta) < minDelta) return;

    let reason: string;
    if (weightDelta.length === 0) {
      reason = "Ranking inputs changed.";
    } else {
      const up = delta > 0;
      // pick the weight change that best explains the direction of the move
      const driver =
        weightDelta.find((x) =>
          up
            ? (x.delta > 0 && score.dimensions[x.d].ratio >= 0.5) ||
              (x.delta < 0 && score.dimensions[x.d].ratio < 0.5)
            : (x.delta > 0 && score.dimensions[x.d].ratio < 0.5) ||
              (x.delta < 0 && score.dimensions[x.d].ratio >= 0.5),
        ) ?? weightDelta[0];
      const label = DIMENSION_LABEL[driver.d];
      const strength = Math.round(score.dimensions[driver.d].ratio * 100);
      reason = up
        ? `moved up because the ranking now places ${driver.delta > 0 ? "greater" : "less"} weight on ${label}, where this candidate scores ${strength}% on available evidence.`
        : `moved down because the ranking now places ${driver.delta > 0 ? "greater" : "less"} weight on ${label}, where this candidate scores ${strength}% on available evidence.`;
    }

    moves.push({ id: score.candidate.id, name: score.candidate.name, from, to, delta, reason });
  });

  return moves.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
