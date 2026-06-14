"use client";

import { FieldLabel, TagInput } from "@/components/assessments/shared/FormFields";
import type { AssessmentIntake } from "@/types/assessment";

interface Props {
  intake: AssessmentIntake;
  disabled?: boolean;
  onChange: (patch: Partial<AssessmentIntake>) => void;
}

const ROADMAP_FIELDS: Array<{
  key: keyof NonNullable<AssessmentIntake["roadmapInputs"]>;
  label: string;
  hint: string;
  placeholder: string;
  optional?: boolean;
}> = [
  {
    key: "priorities0to30",
    label: "Próximos 30 días",
    hint: "Lo más urgente — suele ser suficiente para el informe",
    placeholder: "Ej: unificar inventario en un solo sistema + Enter",
  },
  {
    key: "priorities30to60",
    label: "30–60 días",
    hint: "Opcional",
    placeholder: "Ej: capacitar equipo en nuevo proceso + Enter",
    optional: true,
  },
  {
    key: "priorities60to90",
    label: "60–90 días",
    hint: "Opcional",
    placeholder: "Ej: integrar ventas con bodega + Enter",
    optional: true,
  },
  {
    key: "priorities3to6",
    label: "3–6 meses",
    hint: "Opcional — visión mediano plazo",
    placeholder: "Ej: implementar ERP modular + Enter",
    optional: true,
  },
  {
    key: "priorities6to12",
    label: "6–12 meses",
    hint: "Opcional",
    placeholder: "Ej: automatizar reportes gerenciales + Enter",
    optional: true,
  },
];

export function IntakePhaseRoadmap({ intake, disabled, onChange }: Props) {
  const roadmap = intake.roadmapInputs ?? {};

  return (
    <div className="space-y-5">
      {ROADMAP_FIELDS.map(({ key, label, hint, placeholder, optional }) => (
        <div key={key} className="space-y-2">
          <FieldLabel hint={hint}>
            {label}
            {optional && (
              <span className="ml-1 text-xs font-normal text-foreground/50">(opcional)</span>
            )}
          </FieldLabel>
          <TagInput
            disabled={disabled}
            value={roadmap[key] ?? []}
            onChange={(v) =>
              onChange({ roadmapInputs: { ...roadmap, [key]: v } })
            }
            placeholder={placeholder}
          />
        </div>
      ))}
    </div>
  );
}
