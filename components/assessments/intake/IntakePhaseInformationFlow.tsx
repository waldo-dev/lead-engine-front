"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel, TagInput } from "@/components/assessments/shared/FormFields";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AssessmentIntake } from "@/types/assessment";

interface Props {
  intake: AssessmentIntake;
  disabled?: boolean;
  onChange: (patch: Partial<AssessmentIntake>) => void;
}

export function IntakePhaseInformationFlow({ intake, disabled, onChange }: Props) {
  const flow = intake.informationFlow ?? {};
  const [showDetails, setShowDetails] = useState(false);

  const update = (
    field: keyof NonNullable<AssessmentIntake["informationFlow"]>,
    value: unknown,
  ) => {
    onChange({ informationFlow: { ...flow, [field]: value } });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <FieldLabel
          hint="Cuéntalo como una historia: de dónde sale un dato y cómo llega a quien lo usa."
        >
          ¿Cómo se mueve la información en la empresa?
        </FieldLabel>
        <Textarea
          rows={5}
          disabled={disabled}
          placeholder="Ej: El vendedor anota el pedido en WhatsApp, luego alguien lo pasa a Excel, y finanzas vuelve a copiarlo al sistema…"
          value={flow.description ?? ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {showDetails ? "Ocultar detalle opcional" : "Agregar detalle opcional"}
      </Button>

      {showDetails && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <div className="space-y-2">
            <FieldLabel hint="Momentos donde el dato se pierde o nadie sabe el valor real">
              ¿Dónde se pierde información?
            </FieldLabel>
            <TagInput
              disabled={disabled}
              value={flow.dataLossPoints ?? []}
              onChange={(v) => update("dataLossPoints", v)}
              placeholder="Ej: al pasar de WhatsApp a Excel + Enter"
            />
          </div>

          <div className="space-y-2">
            <FieldLabel hint="Mismo dato en dos lugares sin sincronizar">
              ¿Dónde se duplica?
            </FieldLabel>
            <TagInput
              disabled={disabled}
              value={flow.duplicationPoints ?? []}
              onChange={(v) => update("duplicationPoints", v)}
              placeholder="Ej: stock en Excel y en ERP + Enter"
            />
          </div>

          <div className="space-y-2">
            <FieldLabel hint="No se puede rastrear origen o historial">
              ¿Qué no se puede rastrear?
            </FieldLabel>
            <TagInput
              disabled={disabled}
              value={flow.traceabilityGaps ?? []}
              onChange={(v) => update("traceabilityGaps", v)}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Pasos 100% manuales</FieldLabel>
            <TagInput
              disabled={disabled}
              value={flow.manualSteps ?? []}
              onChange={(v) => update("manualSteps", v)}
              placeholder="Ej: conciliación de caja en papel + Enter"
            />
          </div>
        </div>
      )}
    </div>
  );
}
