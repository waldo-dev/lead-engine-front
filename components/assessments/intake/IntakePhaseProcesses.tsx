"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel, TagInput } from "@/components/assessments/shared/FormFields";
import { DIGITALIZATION_LEVELS } from "@/components/assessments/constants";
import type { AssessmentIntake, DigitalizationLevel } from "@/types/assessment";

interface Props {
  intake: AssessmentIntake;
  disabled?: boolean;
  onChange: (patch: Partial<AssessmentIntake>) => void;
}

const emptyProcess = (): AssessmentIntake["processes"][0] => ({
  name: "",
  description: "",
  isManual: true,
});

export function IntakePhaseProcesses({ intake, disabled, onChange }: Props) {
  const processes = intake.processes ?? [];

  const updateProcesses = (next: AssessmentIntake["processes"]) => {
    onChange({ processes: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/75">
        Describe al menos 2 procesos del día a día (venta, despacho, cobranza…).
      </p>

      {processes.map((proc, idx) => (
        <div key={idx} className="rounded-lg border border-border/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Proceso {idx + 1}</p>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateProcesses(processes.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>Nombre</FieldLabel>
              <Input
                disabled={disabled}
                value={proc.name}
                onChange={(e) => {
                  const next = [...processes];
                  next[idx] = { ...proc, name: e.target.value };
                  updateProcesses(next);
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Responsable</FieldLabel>
              <Input
                disabled={disabled}
                value={proc.owner ?? ""}
                onChange={(e) => {
                  const next = [...processes];
                  next[idx] = { ...proc, owner: e.target.value };
                  updateProcesses(next);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel>Descripción</FieldLabel>
            <Textarea
              rows={3}
              disabled={disabled}
              value={proc.description}
              onChange={(e) => {
                const next = [...processes];
                next[idx] = { ...proc, description: e.target.value };
                updateProcesses(next);
              }}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Herramientas usadas</FieldLabel>
            <TagInput
              disabled={disabled}
              value={proc.tools ?? []}
              onChange={(v) => {
                const next = [...processes];
                next[idx] = { ...proc, tools: v };
                updateProcesses(next);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                disabled={disabled}
                checked={proc.isManual}
                onCheckedChange={(c) => {
                  const next = [...processes];
                  next[idx] = { ...proc, isManual: c === true };
                  updateProcesses(next);
                }}
              />
              Proceso manual
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Digitalización:</span>
              <Select
                disabled={disabled}
                value={proc.digitalizationLevel ?? ""}
                onValueChange={(v) => {
                  const next = [...processes];
                  next[idx] = {
                    ...proc,
                    digitalizationLevel: v as DigitalizationLevel,
                  };
                  updateProcesses(next);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  {DIGITALIZATION_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel>Cuellos de botella</FieldLabel>
            <Textarea
              rows={2}
              disabled={disabled}
              value={proc.bottlenecks ?? ""}
              onChange={(e) => {
                const next = [...processes];
                next[idx] = { ...proc, bottlenecks: e.target.value };
                updateProcesses(next);
              }}
            />
          </div>
        </div>
      ))}

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateProcesses([...processes, emptyProcess()])}
        >
          <Plus className="h-4 w-4" />
          Agregar proceso
        </Button>
      )}
    </div>
  );
}
