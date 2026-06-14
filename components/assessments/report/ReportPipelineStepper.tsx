"use client";

import { Check, Circle, Loader2, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/components/assessments/constants";
import type { PipelineStageId, ReportMode } from "@/types/assessment";

type StageStatus = "pending" | "active" | "done" | "skipped";

interface ReportPipelineStepperProps {
  activeStageId?: PipelineStageId | null;
  mode: ReportMode;
  isRunning: boolean;
  completedStages?: PipelineStageId[];
}

export function ReportPipelineStepper({
  activeStageId,
  mode,
  isRunning,
  completedStages = [],
}: ReportPipelineStepperProps) {
  const usesAi = mode !== "deterministic";

  const getStatus = (stageId: PipelineStageId): StageStatus => {
    if (completedStages.includes(stageId)) return "done";
    if (stageId === activeStageId) return "active";
    if (stageId === "generate_ai_narratives" && !usesAi) return "skipped";
    return "pending";
  };

  if (!isRunning && completedStages.length === 0) return null;

  return (
    <ul className="space-y-2">
      {PIPELINE_STAGES.map((stage) => {
        const status = getStatus(stage.id);
        const showAi = stage.usesAi && usesAi;

        return (
          <li
            key={stage.id}
            className={cn(
              "flex items-center gap-2 text-sm",
              status === "active" && "font-medium text-foreground",
              status === "pending" && "text-muted-foreground/60",
              status === "skipped" && "text-muted-foreground/40",
            )}
          >
            {status === "done" && <Check className="h-4 w-4 text-success shrink-0" />}
            {status === "active" && (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            )}
            {status === "skipped" && (
              <SkipForward className="h-4 w-4 shrink-0 opacity-40" />
            )}
            {status === "pending" && <Circle className="h-4 w-4 shrink-0 opacity-30" />}
            <span>
              {stage.label}
              {showAi && status === "active" && (
                <span className="text-muted-foreground"> (IA)</span>
              )}
              {status === "skipped" && (
                <span className="text-xs"> — omitido</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
