/**
 * Skill lexicon + text extraction helpers for ClusterHire ranking.
 *
 * Everything here is deterministic: the same input text always yields the same
 * extracted skills, depth signals and recency signals. No data is invented —
 * a skill only exists if it literally appears in the stored text.
 */

export interface SkillDef {
  /** canonical display name */
  name: string;
  /** lowercase aliases matched as whole words in text */
  aliases: string[];
  /** broad family, used for adjacent-skill credit */
  family: string;
}

export const SKILL_LEXICON: SkillDef[] = [
  { name: "Python", aliases: ["python", "py3"], family: "backend" },
  { name: "JavaScript", aliases: ["javascript", "js", "es6"], family: "frontend" },
  { name: "TypeScript", aliases: ["typescript", "ts"], family: "frontend" },
  { name: "React", aliases: ["react", "reactjs", "react.js"], family: "frontend" },
  { name: "Next.js", aliases: ["next.js", "nextjs"], family: "frontend" },
  { name: "Vue", aliases: ["vue", "vuejs", "vue.js"], family: "frontend" },
  { name: "Node.js", aliases: ["node", "node.js", "nodejs"], family: "backend" },
  { name: "Go", aliases: ["golang"], family: "backend" },
  { name: "Java", aliases: ["java"], family: "backend" },
  { name: "Ruby", aliases: ["ruby", "rails"], family: "backend" },
  { name: "C#", aliases: ["c#", ".net", "dotnet"], family: "backend" },
  { name: "PHP", aliases: ["php", "laravel"], family: "backend" },
  { name: "Rust", aliases: ["rust"], family: "backend" },
  { name: "SQL", aliases: ["sql", "postgres", "postgresql", "mysql"], family: "data" },
  { name: "NoSQL", aliases: ["mongodb", "dynamodb", "redis", "nosql"], family: "data" },
  { name: "Data Engineering", aliases: ["etl", "airflow", "dbt", "spark", "data pipeline", "data pipelines"], family: "data" },
  { name: "Machine Learning", aliases: ["machine learning", "ml", "pytorch", "tensorflow", "scikit-learn", "sklearn"], family: "ai" },
  { name: "LLM / GenAI", aliases: ["llm", "llms", "genai", "generative ai", "rag", "prompt engineering", "openai"], family: "ai" },
  { name: "Analytics", aliases: ["analytics", "tableau", "looker", "power bi", "metabase"], family: "data" },
  { name: "AWS", aliases: ["aws", "amazon web services", "ec2", "s3", "lambda"], family: "cloud" },
  { name: "GCP", aliases: ["gcp", "google cloud", "bigquery"], family: "cloud" },
  { name: "Azure", aliases: ["azure"], family: "cloud" },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"], family: "infra" },
  { name: "Docker", aliases: ["docker", "containers"], family: "infra" },
  { name: "Terraform", aliases: ["terraform", "iac"], family: "infra" },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "continuous integration", "github actions", "jenkins"], family: "infra" },
  { name: "Security", aliases: ["security", "appsec", "infosec", "soc2", "penetration testing"], family: "security" },
  { name: "Mobile", aliases: ["ios", "android", "swift", "kotlin", "react native", "flutter"], family: "mobile" },
  { name: "QA / Testing", aliases: ["qa", "testing", "test automation", "cypress", "playwright", "jest"], family: "quality" },
  { name: "Design", aliases: ["design", "figma", "ux", "ui", "product design", "prototyping"], family: "design" },
  { name: "Product Management", aliases: ["product management", "roadmap", "product owner", "pm"], family: "product" },
  { name: "Project Management", aliases: ["project management", "scrum", "agile", "kanban", "jira"], family: "product" },
  { name: "Sales", aliases: ["sales", "quota", "pipeline generation", "saas sales", "account executive"], family: "gtm" },
  { name: "Marketing", aliases: ["marketing", "seo", "demand generation", "content marketing", "growth"], family: "gtm" },
  { name: "Customer Success", aliases: ["customer success", "account management", "churn", "onboarding customers"], family: "gtm" },
  { name: "Finance", aliases: ["finance", "fp&a", "accounting", "forecasting", "budgeting"], family: "gna" },
  { name: "Recruiting", aliases: ["recruiting", "talent acquisition", "sourcing", "ats"], family: "gna" },
  { name: "Operations", aliases: ["operations", "ops", "process improvement", "logistics"], family: "gna" },
  { name: "Support", aliases: ["support", "helpdesk", "zendesk", "ticketing"], family: "gna" },
  { name: "Leadership", aliases: ["leadership", "managed a team", "team lead", "mentored", "mentoring", "line manager"], family: "leadership" },
  { name: "Communication", aliases: ["communication", "stakeholder", "presentation", "writing"], family: "soft" },
];

/** Words that, near a skill mention, indicate real applied usage rather than a keyword drop. */
export const DEPTH_MARKERS = [
  "built", "building", "shipped", "designed", "architected", "led", "leading", "owned",
  "implemented", "migrated", "scaled", "production", "deployed", "maintained", "developed",
  "years", "yrs", "delivered", "launched", "optimized", "rewrote", "founded",
];

/** Words indicating the experience is current / recent. */
export const RECENCY_MARKERS = [
  "current", "currently", "present", "today", "this year", "recent", "recently", "now at",
];

export const SENIORITY_TERMS = [
  "intern", "junior", "associate", "mid", "senior", "staff", "principal", "lead",
  "head", "director", "vp", "manager", "chief",
];

const WORD_SPLIT = /[^a-z0-9+#./&]+/i;

export function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase();
}

/** Whole-token / phrase containment check that avoids partial-word false positives. */
export function mentions(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i");
  return re.test(haystack);
}

export function countMentions(haystack: string, needle: string): number {
  if (!haystack || !needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "gi");
  return (haystack.match(re) ?? []).length;
}

export interface SkillHit {
  skill: string;
  family: string;
  /** how many times any alias appears */
  occurrences: number;
  /** depth markers found in the same sentence as the skill */
  depthMarkers: string[];
  /** recency markers found in the same sentence as the skill */
  recencyMarkers: string[];
  /** explicit "N years" figure found in the same sentence — never inferred */
  yearsStated: number | null;
  /** the sentence the skill was found in, trimmed for display */
  quote: string | null;
}

function sentences(text: string): string[] {
  return text
    .split(/[.;\n•|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extract every lexicon skill that literally appears in the given text. */
export function extractSkills(rawText: string): SkillHit[] {
  const text = normalize(rawText);
  if (!text.trim()) return [];
  const sents = sentences(text);
  const hits: SkillHit[] = [];

  for (const def of SKILL_LEXICON) {
    let occurrences = 0;
    const depthMarkers = new Set<string>();
    const recencyMarkers = new Set<string>();
    let yearsStated: number | null = null;
    let quote: string | null = null;

    for (const alias of def.aliases) {
      occurrences += countMentions(text, alias);
    }
    if (occurrences === 0) continue;

    for (const sentence of sents) {
      const inSentence = def.aliases.some((a) => mentions(sentence, a));
      if (!inSentence) continue;
      if (!quote) quote = sentence.slice(0, 180);
      for (const m of DEPTH_MARKERS) if (mentions(sentence, m)) depthMarkers.add(m);
      for (const m of RECENCY_MARKERS) if (sentence.includes(m)) recencyMarkers.add(m);
      const years = sentence.match(/(\d{1,2})\s*(?:\+)?\s*(?:years|yrs|yr)/);
      if (years) {
        const n = Number(years[1]);
        if (Number.isFinite(n) && (yearsStated === null || n > yearsStated)) yearsStated = n;
      }
    }

    hits.push({
      skill: def.name,
      family: def.family,
      occurrences,
      depthMarkers: [...depthMarkers],
      recencyMarkers: [...recencyMarkers],
      yearsStated,
      quote,
    });
  }

  return hits;
}

/**
 * Depth score for one skill hit, 0..1.
 *  0.50 — bare mention (keyword only)
 *  +0.20 — repeated mentions
 *  +0.20 — applied-usage language in the same sentence
 *  +0.10 — an explicitly stated duration
 */
export function skillDepth(hit: SkillHit): number {
  let d = 0.5;
  if (hit.occurrences > 1) d += 0.2;
  if (hit.depthMarkers.length > 0) d += 0.2;
  if (hit.yearsStated !== null) d += 0.1;
  return Math.min(1, d);
}

/** Meaningful non-stopword tokens, used for title/role overlap. */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "with", "at", "by",
  "we", "you", "our", "is", "are", "be", "will", "who", "this", "that", "role",
  "team", "work", "working", "experience", "years", "candidate", "job",
]);

export function tokens(text: string | null | undefined): string[] {
  return normalize(text)
    .split(WORD_SPLIT)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}
