import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScoreBreakdown } from "@/components/ranking/ScoreBreakdown";
import { CompareDialog } from "@/components/ranking/CompareDialog";
import {
  DEFAULT_WEIGHTS,
  DIMENSIONS,
  DIMENSION_LABEL,
  explainMovement,
  normalizeWeights,
  rankCandidates,
  type CandidateScore,
  type Dimension,
  type RankCandidate,
  type RankRequisition,
  type Weights,
} from "@/lib/ranking/engine";
import {
  ChevronDown,
  ExternalLink,
  Info,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking — ClusterHire" },
      {
        name: "description",
        content:
          "Explainable, deterministic candidate ranking against a requisition with tunable weights and side-by-side comparison.",
      },
      { property: "og:title", content: "Explainable candidate ranking — ClusterHire" },
      {
        property: "og:description",
        content:
          "See exactly why each candidate ranks where they do, tune the weighting, and compare candidates side by side.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RankingPage,
});

function rebalance(weights: Weights, changed: Dimension, value: number): Weights {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const others = DIMENSIONS.filter((d) => d !== changed);
  const othersTotal = others.reduce((s, d) => s + weights[d], 0);
  const remaining = 100 - v;
  const next = { ...weights, [changed]: v } as Weights;
  if (othersTotal === 0) {
    const each = Math.floor(remaining / others.length);
    others.forEach((d, i) => (next[d] = each + (i === 0 ? remaining - each * others.length : 0)));
    return next;
  }
  let assigned = 0;
  others.forEach((d, i) => {
    const share =
      i === others.length - 1
        ? remaining - assigned
        : Math.round((weights[d] / othersTotal) * remaining);
    next[d] = Math.max(0, share);
    assigned += next[d];
  });
  return normalizeWeights(next);
}

function RankingPage() {
  const [reqId, setReqId] = useState<string>("");
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [moves, setMoves] = useState<ReturnType<typeof explainMovement>>([]);

  const prevRef = useRef<{ scores: CandidateScore[]; weights: Weights } | null>(null);

  const reqs = useQuery({
    queryKey: ["ranking-reqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requisitions")
        .select("id,title,department,notes")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RankRequisition[];
    },
  });

  const cands = useQuery({
    queryKey: ["ranking-candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select(
          "id,name,email,phone,source,stage,notes,resume_link,rating,last_activity_at,created_at,requisition_id",
        );
      if (error) throw error;
      return (data ?? []) as RankCandidate[];
    },
  });

  const activeReq = useMemo(
    () => reqs.data?.find((r) => r.id === reqId) ?? reqs.data?.[0] ?? null,
    [reqs.data, reqId],
  );

  const pool = useMemo(() => {
    const all = cands.data ?? [];
    if (!activeReq) return [];
    const onReq = all.filter((c) => c.requisition_id === activeReq.id);
    return onReq.length > 0 ? onReq : all;
  }, [cands.data, activeReq]);

  const scores = useMemo(() => {
    if (!activeReq) return [];
    return rankCandidates(pool, activeReq, weights);
  }, [pool, activeReq, weights]);

  const applyWeights = (d: Dimension, value: number) => {
    const next = rebalance(weights, d, value);
    if (activeReq) {
      const before = prevRef.current?.scores.length
        ? prevRef.current
        : { scores, weights };
      const after = rankCandidates(pool, activeReq, next);
      setMoves(explainMovement(before.scores, after, before.weights, next, 1));
      prevRef.current = { scores: after, weights: next };
    }
    setWeights(next);
  };

  const reset = () => {
    setWeights({ ...DEFAULT_WEIGHTS });
    setMoves([]);
    prevRef.current = null;
  };

  const toggleSelect = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id],
    );
  };

  const selectedScores = scores.filter((s) => selected.includes(s.candidate.id));

  return (
    <div>
      <div className="grid gap-3 sm:flex sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Ranking</h1>
          <p className="text-sm text-muted-foreground">
            Explainable, reproducible scoring of candidates against a requisition — decision support, not
            an automated hiring decision.
          </p>
        </div>
        <button
          onClick={() => setHowOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
        >
          <Info className="h-4 w-4" /> How ranking works
        </button>
      </div>

      <div className="glass mt-4 rounded-2xl p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <label htmlFor="req" className="eyebrow mb-1.5 block">
              Requisition
            </label>
            <select
              id="req"
              value={activeReq?.id ?? ""}
              onChange={(e) => {
                setReqId(e.target.value);
                setMoves([]);
                prevRef.current = null;
                setSelected([]);
              }}
              className="w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm text-foreground"
            >
              {(reqs.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              {activeReq
                ? `${pool.length} candidate${pool.length === 1 ? "" : "s"} scored${
                    pool.length && pool[0].requisition_id !== activeReq.id
                      ? " (no candidates assigned yet — scoring your whole pipeline)"
                      : ""
                  }`
                : "No requisitions yet."}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow inline-flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Tune ranking
              </span>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DIMENSIONS.map((d) => (
                <div key={d}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{DIMENSION_LABEL[d]}</span>
                    <span className="font-mono text-foreground">{weights[d]}%</span>
                  </div>
                  <Slider
                    value={[weights[d]]}
                    min={0}
                    max={80}
                    step={5}
                    aria-label={`${DIMENSION_LABEL[d]} weight`}
                    onValueChange={(v) => applyWeights(d, v[0])}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Weights always total 100% — adjusting one rebalances the others.
            </p>
          </div>
        </div>
      </div>

      {moves.length > 0 && (
        <div className="glass mt-4 rounded-2xl p-4 sm:p-5">
          <p className="eyebrow mb-2">Ranking changes</p>
          <ul className="grid gap-1.5">
            {moves.slice(0, 5).map((m) => (
              <li key={m.id} className="flex gap-2 text-xs text-foreground/85">
                {m.delta > 0 ? (
                  <ArrowUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <ArrowDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span>
                  <b className="text-foreground">{m.name}</b> #{m.from} → #{m.to} — {m.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected.length >= 2 && (
        <div className="sticky top-[61px] z-20 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/90 px-4 py-2.5 backdrop-blur">
          <span className="text-xs text-muted-foreground">{selected.length} selected (max 3)</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected([])} className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
            <button
              onClick={() => setComparing(true)}
              className="btn-teal rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              Compare
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {(cands.isLoading || reqs.isLoading) && (
          <p className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {!reqs.isLoading && (reqs.data ?? []).length === 0 && (
          <p className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            Create a requisition first — ranking needs a role to score against.
          </p>
        )}
        {!cands.isLoading && activeReq && scores.length === 0 && (
          <p className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No candidates to score yet.
          </p>
        )}

        {scores.map((s, i) => {
          const open = expanded === s.candidate.id;
          return (
            <div key={s.candidate.id} className="glass rounded-2xl">
              <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                <input
                  type="checkbox"
                  aria-label={`Select ${s.candidate.name} for comparison`}
                  checked={selected.includes(s.candidate.id)}
                  onChange={() => toggleSelect(s.candidate.id)}
                  className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                />
                <span className="w-8 shrink-0 font-mono text-sm text-muted-foreground">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{s.candidate.name}</p>
                    {s.insufficient && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Insufficient evidence
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.matchedSkills.length
                      ? s.matchedSkills.slice(0, 4).map((m) => m.skill).join(" · ")
                      : "No recognised skills in the stored record"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-semibold text-foreground">{s.overall}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall</div>
                </div>
                <Link
                  to="/candidates/$id"
                  params={{ id: s.candidate.id }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-foreground hover:bg-muted"
                >
                  <ExternalLink className="h-3 w-3" /> Open
                </Link>
                <button
                  onClick={() => setExpanded(open ? null : s.candidate.id)}
                  aria-expanded={open}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-foreground hover:bg-muted"
                >
                  {open ? "Hide" : "Explain"}
                  <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              </div>
              {open && (
                <div className="border-t border-border p-4 sm:p-5">
                  <ScoreBreakdown score={s} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CompareDialog
        scores={selectedScores}
        open={comparing && selectedScores.length >= 2}
        onOpenChange={(v) => setComparing(v)}
      />

      <Dialog open={howOpen} onOpenChange={setHowOpen}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>How ranking works</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p>
              ClusterHire does not rank by keyword similarity alone. Each candidate is scored on four
              dimensions, each computed deterministically from data already in your workspace — the
              requisition title, department and notes, and the candidate's notes, resume link, source,
              recruiter rating and pipeline activity.
            </p>
            <ul className="grid gap-2">
              <li>
                <b className="text-foreground">Skill Alignment</b> — required skills found in the
                candidate record, weighted by depth: a bare mention counts less than repeated mentions,
                applied-usage language ("built", "led", "shipped") or a stated duration.
              </li>
              <li>
                <b className="text-foreground">Experience Relevance</b> — overlap with the role's
                vocabulary, explicitly stated durations, seniority language, and how far your own team has
                already advanced the candidate.
              </li>
              <li>
                <b className="text-foreground">Skill Recency</b> — whether the record marks relevant skills
                as current, plus recency of pipeline activity.
              </li>
              <li>
                <b className="text-foreground">Evidence Strength</b> — how much substantiating material
                exists: notes depth, resume link, recruiter rating, applied-usage language, source.
              </li>
            </ul>
            <p>
              Overall = the sum of each dimension's 0–1 quality multiplied by its weight. The same data and
              weights always produce the same score. Nothing about employers, projects, certifications or
              years is invented — where the record is thin the result is reported as
              "Insufficient evidence".
            </p>
            <p className="rounded-xl border border-border p-3 text-xs">
              This ranking is decision support for recruiters. It does not make hiring decisions and should
              always be reviewed by a human.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
