import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIMENSIONS, DIMENSION_LABEL, type CandidateScore } from "@/lib/ranking/engine";

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="border-t border-border px-3 py-2 align-top text-xs text-foreground/85">{children}</td>;
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <span className="text-muted-foreground">{empty}</span>;
  return (
    <ul className="grid gap-1">
      {items.map((i, k) => (
        <li key={k}>· {i}</li>
      ))}
    </ul>
  );
}

export function CompareDialog({
  scores,
  open,
  onOpenChange,
}: {
  scores: CandidateScore[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compare candidates</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr>
                <th className="w-40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Dimension
                </th>
                {scores.map((s) => (
                  <th key={s.candidate.id} className="px-3 py-2 text-sm font-semibold text-foreground">
                    {s.candidate.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <Cell>Overall match</Cell>
                {scores.map((s) => (
                  <Cell key={s.candidate.id}>
                    <span className="font-mono text-base font-semibold text-foreground">{s.overall}</span>
                  </Cell>
                ))}
              </tr>
              {DIMENSIONS.map((d) => (
                <tr key={d}>
                  <Cell>{DIMENSION_LABEL[d]}</Cell>
                  {scores.map((s) => (
                    <Cell key={s.candidate.id}>
                      <span className="font-mono">
                        {s.dimensions[d].points.toFixed(1)}/{s.dimensions[d].max}
                      </span>
                    </Cell>
                  ))}
                </tr>
              ))}
              <tr>
                <Cell>Matching skills</Cell>
                {scores.map((s) => (
                  <Cell key={s.candidate.id}>
                    <List
                      items={s.matchedSkills.map((m) => `${m.skill} (${Math.round(m.depth * 100)}%)`)}
                      empty="Insufficient evidence"
                    />
                  </Cell>
                ))}
              </tr>
              <tr>
                <Cell>Missing / weak skills</Cell>
                {scores.map((s) => (
                  <Cell key={s.candidate.id}>
                    <List items={s.missingSkills} empty="None detected" />
                  </Cell>
                ))}
              </tr>
              <tr>
                <Cell>Strengths</Cell>
                {scores.map((s) => (
                  <Cell key={s.candidate.id}>
                    <List items={s.strengths} empty="Insufficient evidence" />
                  </Cell>
                ))}
              </tr>
              <tr>
                <Cell>Potential gaps</Cell>
                {scores.map((s) => (
                  <Cell key={s.candidate.id}>
                    <List items={s.gaps} empty="None detected" />
                  </Cell>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
