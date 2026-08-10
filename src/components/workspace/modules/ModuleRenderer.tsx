import type { ModuleSpec } from "@/lib/workspace/intent";
import { CandidateCard } from "./CandidateCard";
import { RequisitionPanel } from "./RequisitionPanel";
import { PipelineGraph } from "./PipelineGraph";
import { AnalyticsCard } from "./AnalyticsCard";
import { HelpModule } from "./HelpModule";
import { TextTurn } from "./TextTurn";

export function ModuleRenderer({ spec }: { spec: ModuleSpec }) {
  switch (spec.kind) {
    case "candidate":
      return <CandidateCard query={spec.query} targetStage={spec.targetStage} />;
    case "requisition":
      return <RequisitionPanel query={spec.query} />;
    case "graph":
      return <PipelineGraph />;
    case "analytics":
      return <AnalyticsCard view={spec.view} />;
    case "help":
      return <HelpModule />;
    case "text":
      return <TextTurn body={spec.body} />;
    default:
      return null;
  }
}
