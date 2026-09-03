import { DIMENSIONS, DIMENSION_LABEL, type CandidateScore } from "@/lib/ranking/engine";
import { Check, AlertTriangle } from "lucide-react";

export function DimensionBar({
  label,
  points,
  max,
}: {
  label: string;
  points: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((points / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground">
        {points.toFixed(1)}/{max}
      </span>
      <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-signal transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ScoreBreakdown({ score }: { score: CandidateScore }) {
  const strengths = score.strengths;
  const gaps = score.gaps;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid gap-3">
        {DIMENSIONS.map((d) => (
          <DimensionBar
            key={d}
            label={DIMENSION_LABEL[d]}
            points={score.dimensions[d].points}
            max={score.dimensions[d].max}
          />
        ))}
        {score.matchedSkills.length > 0 && (
          <div>
            <p className="eyebrow mb-1.5">Matching skills</p>
            <div className="flex flex-wrap gap-1.5">
              {score.matchedSkills.map((m) => (
                <span
                  key={m.skill}
                  title={m.evidence ?? undefined}
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    m.depth >= 0.7
                      ? "border-signal/40 bg-signal/10 text-foreground"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {m.skill}
                  <span className="ml-1 font-mono opacity-70">{Math.round(m.depth * 100)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {score.missingSkills.length > 0 && (
          <div>
            <p className="eyebrow mb-1.5">Missing / weak</p>
            <div className="flex flex-wrap gap-1.5">
              {score.missingSkills.map((s) => (
                <span key={s} className="rounded-full border border-border bg-transparent px-2 py-0.5 text-xs text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        <div>
          <p className="eyebrow mb-1.5">Why this candidate ranked here</p>
          {strengths.length === 0 ? (
            <p className="text-xs text-muted-foreground">Insufficient evidence in the record.</p>
          ) : (
            <ul className="grid gap-1.5">
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/85">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="eyebrow mb-1.5">Potential gaps</p>
          {gaps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No gaps detected in the stored data.</p>
          ) : (
            <ul className="grid gap-1.5">
              {gaps.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
