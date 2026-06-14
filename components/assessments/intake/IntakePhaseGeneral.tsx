"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel, TagInput } from "@/components/assessments/shared/FormFields";
import type { AssessmentIntake } from "@/types/assessment";

interface Props {
  intake: AssessmentIntake;
  disabled?: boolean;
  onChange: (patch: Partial<AssessmentIntake>) => void;
}

export function IntakePhaseGeneral({ intake, disabled, onChange }: Props) {
  const general = intake.general ?? {};

  const update = (field: keyof AssessmentIntake["general"], value: unknown) => {
    onChange({ general: { ...general, [field]: value } });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel hint="Aproximado está bien">
            ¿Cuántas personas en la operación?
          </FieldLabel>
          <Input
            type="number"
            min={1}
            disabled={disabled}
            value={general.workerCount ?? ""}
            onChange={(e) =>
              update("workerCount", e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Fecha de reunión</FieldLabel>
          <Input
            type="date"
            disabled={disabled}
            value={general.meetingDate?.slice(0, 10) ?? ""}
            onChange={(e) => update("meetingDate", e.target.value || undefined)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel>¿Quién decide sobre cambios?</FieldLabel>
          <Input
            disabled={disabled}
            placeholder="Nombre"
            value={general.decisionMakerName ?? ""}
            onChange={(e) => update("decisionMakerName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Cargo del decisor</FieldLabel>
          <Input
            disabled={disabled}
            placeholder="Ej: Gerente general"
            value={general.decisionMakerRole ?? ""}
            onChange={(e) => update("decisionMakerRole", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Asistentes</FieldLabel>
        <TagInput
          disabled={disabled}
          value={general.attendees ?? []}
          onChange={(v) => update("attendees", v)}
          placeholder="Nombre y Enter"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel hint="Apuntes tuyos durante la reunión">
          Notas del consultor
        </FieldLabel>
        <Textarea
          rows={4}
          disabled={disabled}
          value={general.consultantNotes ?? ""}
          onChange={(e) => update("consultantNotes", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel
          hint="Opcional. No reemplaza el formulario estructurado — úsalo como complemento."
        >
          Transcripción de reunión
        </FieldLabel>
        <Textarea
          rows={5}
          disabled={disabled}
          value={general.meetingTranscript ?? ""}
          onChange={(e) => update("meetingTranscript", e.target.value)}
          placeholder="Pega la transcripción si la tienes…"
        />
      </div>
    </div>
  );
}
