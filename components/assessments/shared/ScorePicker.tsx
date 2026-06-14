"use client";

import { cn } from "@/lib/utils";
import { SCORE_LEVELS } from "@/components/assessments/intake/phase-guidance";

interface ScorePickerProps {
  value?: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}

export function ScorePicker({ value, onChange, disabled }: ScorePickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {SCORE_LEVELS.map((level) => {
          const selected = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              disabled={disabled}
              title={level.description}
              onClick={() => onChange(level.value)}
              className={cn(
                "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-all",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {level.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-foreground/65">
        {value != null
          ? SCORE_LEVELS.find((l) => l.value === value)?.description
          : "0 = crítico · 3 = aceptable · 5 = excelente"}
      </p>
    </div>
  );
}
