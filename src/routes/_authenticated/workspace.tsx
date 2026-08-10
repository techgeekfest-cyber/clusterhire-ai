import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { LayoutGroup } from "framer-motion";
import { Viewport, type ChatTurn } from "@/components/workspace/Viewport";
import { AgentPrompt } from "@/components/workspace/AgentPrompt";
import { askAgent } from "@/lib/workspace/agent.functions";
import { parseSlashCommand, type ModuleSpec } from "@/lib/workspace/intent";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({ meta: [{ title: "Ask — ClusterHire" }] }),
  component: Workspace,
});

function makeId() {
  return "t_" + Math.random().toString(36).slice(2, 10);
}

function moduleIntro(spec: ModuleSpec): string {
  switch (spec.kind) {
    case "candidate":
      return spec.query ? `Here's what I have on **${spec.query}**.` : "Here are your recent candidates.";
    case "requisition":
      return spec.query ? `Requisition **${spec.query}**.` : "Create or edit a requisition below.";
    case "graph":
      return "Your live pipeline graph — click a stage to inspect it.";
    case "analytics":
      return "Here's the chart.";
    case "help":
      return "";
    default:
      return "";
  }
}

function Workspace() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(askAgent);

  const handleSubmit = useCallback(
    async (raw: string) => {
      const utterance = raw.trim();
      if (!utterance || busy) return;

      const turnId = makeId();

      // Slash commands render an interactive module inline — no model call.
      if (utterance.startsWith("/")) {
        const spec = parseSlashCommand(utterance) ?? { kind: "help" as const };
        setTurns((prev) => [
          ...prev,
          {
            id: turnId,
            utterance,
            reply: moduleIntro(spec),
            pending: false,
            createdAt: Date.now(),
            module: spec,
          },
        ]);
        return;
      }

      setTurns((prev) => [
        ...prev,
        { id: turnId, utterance, reply: "", pending: true, createdAt: Date.now() },
      ]);
      setBusy(true);

      // Build history from prior turns (exclude the one we just added)
      const history = turns.flatMap((t) => [
        { role: "user" as const, content: t.utterance },
        ...(t.reply ? [{ role: "assistant" as const, content: t.reply }] : []),
      ]);

      try {
        const out = await ask({ data: { utterance, history } });
        setTurns((prev) =>
          prev.map((t) => (t.id === turnId ? { ...t, reply: out.reply, pending: false } : t)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        toast.error(msg);
        setTurns((prev) =>
          prev.map((t) => (t.id === turnId ? { ...t, reply: msg, pending: false } : t)),
        );
      } finally {
        setBusy(false);
      }
    },
    [ask, busy, turns],
  );


  return (
    <LayoutGroup>
      <Viewport turns={turns} />
      <AgentPrompt onSubmit={handleSubmit} busy={busy} />
    </LayoutGroup>
  );
}
