"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FieldLabel, TagInput } from "@/components/assessments/shared/FormFields";
import { ScorePicker } from "@/components/assessments/shared/ScorePicker";
import { cn } from "@/lib/utils";
import {
  CATEGORY_CLIENT_PROMPTS,
  DEFAULT_CATEGORY_PROMPTS,
} from "@/components/assessments/intake/phase-guidance";
import type { AssessmentFramework, AssessmentIntake } from "@/types/assessment";

interface Props {
  intake: AssessmentIntake;
  framework?: AssessmentFramework;
  disabled?: boolean;
  onChange: (patch: Partial<AssessmentIntake>) => void;
}

function categoryProgress(
  catId: string,
  intakeCategories: AssessmentIntake["categories"],
): boolean {
  const data = intakeCategories[catId];
  if (!data) return false;
  return Boolean(
    data.observations?.trim() ||
      (data.painPoints && data.painPoints.length > 0) ||
      Object.values(data.subcategories ?? {}).some((s) => s.score != null),
  );
}

export function IntakePhaseCategories({
  intake,
  framework,
  disabled,
  onChange,
}: Props) {
  const categories = framework?.categories ?? [];
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? "");
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({});
  const intakeCategories = intake.categories ?? {};

  const catData = intakeCategories[activeCat] ?? {};

  const updateCategory = (catId: string, data: AssessmentIntake["categories"][string]) => {
    onChange({
      categories: {
        ...intakeCategories,
        [catId]: data,
      },
    });
  };

  const updateSubcategory = (
    subId: string,
    field: "score" | "notes",
    value: number | string,
  ) => {
    const subs = { ...catData.subcategories };
    subs[subId] = { ...subs[subId], [field]: value };
    updateCategory(activeCat, { ...catData, subcategories: subs });
  };

  const toggleCriterion = (subId: string, idx: number, criteriaLen: number) => {
    const subs = { ...catData.subcategories };
    const current = subs[subId] ?? {};
    const met = [...(current.criteriaMet ?? Array(criteriaLen).fill(false))];
    met[idx] = !met[idx];
    subs[subId] = { ...current, criteriaMet: met };
    updateCategory(activeCat, { ...catData, subcategories: subs });
  };

  if (categories.length === 0) {
    return (
      <p className="text-sm text-foreground/70">
        Cargando áreas de evaluación…
      </p>
    );
  }

  const activeFramework = categories.find((c) => c.id === activeCat);
  const clientPrompts =
    CATEGORY_CLIENT_PROMPTS[activeCat] ?? DEFAULT_CATEGORY_PROMPTS;

  return (
    <div className="flex flex-col gap-5">
      {/* Selector de categorías — siempre legible */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          Elige un área para evaluar
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = cat.id === activeCat;
            const hasData = categoryProgress(cat.id, intakeCategories);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCat(cat.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground shadow-sm hover:border-primary/50 hover:bg-accent",
                )}
              >
                <span className="flex items-center gap-2">
                  {hasData && !isActive && (
                    <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                  )}
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs font-semibold text-foreground/70">Para esta área, pregunta:</p>
        <ul className="mt-1.5 space-y-1 text-sm text-foreground">
          {clientPrompts.map((q) => (
            <li key={q}>· {q}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-5">
        {activeFramework?.description && (
          <p className="text-sm text-foreground/75">{activeFramework.description}</p>
        )}

        <div className="space-y-2">
          <FieldLabel
            hint="Resume en 1–2 frases lo que te contaron. No tiene que ser formal."
          >
            Lo que observamos en esta área
          </FieldLabel>
          <Textarea
            rows={3}
            disabled={disabled}
            placeholder="Ej: Todo el inventario está en planillas Excel sin una fuente única…"
            value={catData.observations ?? ""}
            onChange={(e) =>
              updateCategory(activeCat, { ...catData, observations: e.target.value })
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel hint="Problemas o frustraciones que mencionaron">
              ¿Qué les duele aquí?
            </FieldLabel>
            <TagInput
              disabled={disabled}
              value={catData.painPoints ?? []}
              onChange={(v) => updateCategory(activeCat, { ...catData, painPoints: v })}
              placeholder="Ej: datos duplicados + Enter"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel hint="Algo que ya funciona bien — ayuda al informe">
              ¿Qué está bien?
            </FieldLabel>
            <TagInput
              disabled={disabled}
              value={catData.strengths ?? []}
              onChange={(v) => updateCategory(activeCat, { ...catData, strengths: v })}
              placeholder="Ej: equipo conoce la operación + Enter"
            />
          </div>
        </div>

        {activeFramework?.subcategories.map((sub) => {
          const subData = catData.subcategories?.[sub.id] ?? {};
          const criteriaOpen = expandedCriteria[sub.id] ?? false;
          const hasCriteria = sub.criteria.length > 0;

          return (
            <div
              key={sub.id}
              className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{sub.label}</p>
                <p className="mt-0.5 text-xs text-foreground/65">
                  Elige un nivel del 0 al 5 según lo que te contaron hoy.
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel>Nivel actual</FieldLabel>
                <ScorePicker
                  disabled={disabled}
                  value={subData.score}
                  onChange={(score) => updateSubcategory(sub.id, "score", score)}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel hint="Opcional — una frase corta">
                  Nota del consultor
                </FieldLabel>
                <Textarea
                  rows={2}
                  disabled={disabled}
                  placeholder="Ej: Usan 3 Excels distintos para el mismo dato…"
                  value={subData.notes ?? ""}
                  onChange={(e) => updateSubcategory(sub.id, "notes", e.target.value)}
                />
              </div>

              {hasCriteria && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-foreground/70"
                    onClick={() =>
                      setExpandedCriteria((prev) => ({
                        ...prev,
                        [sub.id]: !criteriaOpen,
                      }))
                    }
                  >
                    {criteriaOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    Checklist opcional ({sub.criteria.length} criterios)
                  </Button>

                  {criteriaOpen && (
                    <ul className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                      {sub.criteria.map((criterion, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                          <Checkbox
                            disabled={disabled}
                            className="mt-0.5"
                            checked={subData.criteriaMet?.[idx] ?? false}
                            onCheckedChange={() =>
                              toggleCriterion(sub.id, idx, sub.criteria.length)
                            }
                          />
                          <span>{criterion}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
