"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { IntakeCompleteness, IntakePhaseId } from "@/types/assessment";
import { BLOCK_TO_PHASE } from "@/components/assessments/constants";
import { CheckCircle2, Circle } from "lucide-react";

interface IntakeCompletenessBarProps {
  completeness: IntakeCompleteness;
  onNavigatePhase?: (phase: IntakePhaseId) => void;
  compact?: boolean;
}

export function IntakeCompletenessBar({
  completeness,
  onNavigatePhase,
  compact,
}: IntakeCompletenessBarProps) {
  const { percent, blocks, missingForReport, readyForReport, readyForAiNarratives } = completeness;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Completitud del diagnóstico</p>
          <p className="text-xs text-muted-foreground">
            {readyForReport
              ? readyForAiNarratives
                ? "Listo para narrativas IA"
                : "Listo para informe (plantillas)"
              : "Completa más campos para generar informe"}
          </p>
        </div>
        <span className="text-lg font-semibold tabular-nums">{percent}%</span>
      </div>

      <Progress value={percent} className="h-2" />

      {!compact && blocks.length > 0 && (
        <ul className="space-y-1">
          {blocks.map((block) => {
            const phase = BLOCK_TO_PHASE[block.id] ?? "general";
            return (
              <li key={block.id}>
                <button
                  type="button"
                  disabled={!onNavigatePhase}
                  onClick={() => onNavigatePhase?.(phase)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    onNavigatePhase && "hover:bg-muted/60",
                    !block.filled && "text-foreground",
                    block.filled && "text-muted-foreground",
                  )}
                >
                  {block.filled ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className="min-w-0">
                    <span className="font-medium">{block.label}</span>
                    {!block.filled && block.hint && (
                      <span className="block text-xs text-muted-foreground">{block.hint}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!compact && missingForReport.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-muted/40 p-3">
          <p className="text-xs font-semibold text-warning">Pendiente para informe</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {missingForReport.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
