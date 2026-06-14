"use client";

import { cn } from "@/lib/utils";
import type { IntakePhaseId } from "@/types/assessment";
import { DEFAULT_INTAKE_PHASES } from "@/components/assessments/constants";
import { PHASE_GUIDANCE } from "@/components/assessments/intake/phase-guidance";
import { Check } from "lucide-react";

interface IntakeWizardProps {
  activePhase: IntakePhaseId;
  onPhaseChange: (phase: IntakePhaseId) => void;
  phases?: Array<{ id: IntakePhaseId; label: string; order: number }>;
  completedPhases?: Set<IntakePhaseId>;
}

export function IntakeWizard({
  activePhase,
  onPhaseChange,
  phases = DEFAULT_INTAKE_PHASES,
  completedPhases,
}: IntakeWizardProps) {
  const sorted = [...phases].sort((a, b) => a.order - b.order);

  return (
    <nav className="space-y-1.5" aria-label="Pasos del diagnóstico">
      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
        Pasos
      </p>
      {sorted.map((phase, index) => {
        const isActive = phase.id === activePhase;
        const isDone = completedPhases?.has(phase.id);
        const hint = PHASE_GUIDANCE[phase.id]?.title ?? phase.label;

        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => onPhaseChange(phase.id)}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                isActive
                  ? "bg-primary-foreground/25 text-primary-foreground"
                  : isDone
                    ? "bg-success-muted text-success"
                    : "bg-muted text-foreground",
              )}
            >
              {isDone && !isActive ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug">{phase.label}</span>
              <span
                className={cn(
                  "block text-[11px] leading-snug mt-0.5",
                  isActive ? "text-primary-foreground/85" : "text-foreground/60",
                )}
              >
                {hint}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
