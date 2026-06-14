"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { REPORT_MODES } from "@/components/assessments/constants";
import type { ReportMode } from "@/types/assessment";

interface ReportModeSelectorProps {
  value: ReportMode;
  onChange: (mode: ReportMode) => void;
  readyForAiNarratives: boolean;
}

export function ReportModeSelector({
  value,
  onChange,
  readyForAiNarratives,
}: ReportModeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {REPORT_MODES.map((mode) => {
        const isHybridNeedsAi = mode.value === "hybrid" && !readyForAiNarratives;
        const isSelected = value === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={cn(
              "flex flex-col rounded-lg border px-3 py-2 text-left transition-all min-w-[140px]",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {mode.label}
              {mode.default && !isSelected && (
                <Badge variant="secondary" className="text-[10px]">default</Badge>
              )}
            </span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              {mode.aiCalls === 0 ? "0 llamadas IA" : `${mode.aiCalls} llamadas IA`}
            </span>
            {isHybridNeedsAi && mode.value === "hybrid" && (
              <span className="mt-1 text-[10px] text-warning">Usará plantillas (&lt;70%)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
