"use client";

import { ScoreBadge } from "@/components/companies/ScoreBadge";
import { IntakeCompletenessBar } from "@/components/assessments/intake/IntakeCompletenessBar";
import type { Assessment, IntakeCompleteness, IntakePhaseId } from "@/types/assessment";

interface Props {
  assessment: Assessment;
  completeness: IntakeCompleteness;
  onNavigatePhase: (phase: IntakePhaseId) => void;
}

export function IntakePhaseReview({ assessment, completeness, onNavigatePhase }: Props) {
  const score = assessment.chilsmartScore;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {score != null && (
          <div className="flex flex-col items-center gap-2">
            <ScoreBadge score={score} size="lg" />
            <p className="text-sm font-medium">ChilSmart Score</p>
            <p className="text-xs text-muted-foreground">Calculado desde subcategorías</p>
          </div>
        )}
        <div className="flex-1">
          <IntakeCompletenessBar
            completeness={completeness}
            onNavigatePhase={onNavigatePhase}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
        <p className="text-sm font-medium">Listo para generar informe</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {completeness.readyForReport
            ? completeness.readyForAiNarratives
              ? "El formulario tiene suficiente detalle para narrativas IA pulidas (≥70%). Usa el tab Informe para generar."
              : "Puedes generar un informe determinístico o híbrido con plantillas (55–69%)."
            : "Completa al menos 55% del formulario antes de generar el informe."}
        </p>
      </div>
    </div>
  );
}
