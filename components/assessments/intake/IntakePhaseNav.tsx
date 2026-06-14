"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IntakePhaseId } from "@/types/assessment";

interface IntakePhaseNavProps {
  phases: Array<{ id: IntakePhaseId; label: string; order: number }>;
  activePhase: IntakePhaseId;
  onPhaseChange: (phase: IntakePhaseId) => void;
}

export function IntakePhaseNav({ phases, activePhase, onPhaseChange }: IntakePhaseNavProps) {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((p) => p.id === activePhase);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-4 mt-6">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!prev}
        onClick={() => prev && onPhaseChange(prev.id)}
      >
        <ChevronLeft className="h-4 w-4" />
        {prev ? prev.label : "Anterior"}
      </Button>
      <span className="text-xs text-foreground/60 tabular-nums">
        Paso {idx + 1} de {sorted.length}
      </span>
      <Button
        type="button"
        size="sm"
        disabled={!next}
        onClick={() => next && onPhaseChange(next.id)}
      >
        {next ? next.label : "Siguiente"}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
