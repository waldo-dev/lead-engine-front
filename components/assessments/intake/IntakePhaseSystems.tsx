"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/assessments/shared/FormFields";
import { SYSTEM_TYPES } from "@/components/assessments/constants";
import type { AssessmentIntake, SystemType } from "@/types/assessment";

interface Props {
  intake: AssessmentIntake;
  disabled?: boolean;
  onChange: (patch: Partial<AssessmentIntake>) => void;
}

const emptySystem = (): AssessmentIntake["systems"][0] => ({
  name: "",
  type: "Excel",
  role: "",
});

export function IntakePhaseSystems({ intake, disabled, onChange }: Props) {
  const systems = intake.systems ?? [];

  const updateSystems = (next: AssessmentIntake["systems"]) => {
    onChange({ systems: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/75">
        Anota las herramientas que mencionen — Excel, WhatsApp y email cuentan.
      </p>

      {systems.map((sys, idx) => (
        <div key={idx} className="rounded-lg border border-border/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Sistema {idx + 1}</p>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => updateSystems(systems.filter((_, i) => i !== idx))}
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
                value={sys.name}
                onChange={(e) => {
                  const next = [...systems];
                  next[idx] = { ...sys, name: e.target.value };
                  updateSystems(next);
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Tipo</FieldLabel>
              <Select
                disabled={disabled}
                value={sys.type}
                onValueChange={(v) => {
                  const next = [...systems];
                  next[idx] = { ...sys, type: v as SystemType };
                  updateSystems(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel>Rol en la operación</FieldLabel>
            <Input
              disabled={disabled}
              value={sys.role}
              onChange={(e) => {
                const next = [...systems];
                next[idx] = { ...sys, role: e.target.value };
                updateSystems(next);
              }}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Limitaciones</FieldLabel>
            <Textarea
              rows={2}
              disabled={disabled}
              value={sys.limitations ?? ""}
              onChange={(e) => {
                const next = [...systems];
                next[idx] = { ...sys, limitations: e.target.value };
                updateSystems(next);
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
          onClick={() => updateSystems([...systems, emptySystem()])}
        >
          <Plus className="h-4 w-4" />
          Agregar sistema
        </Button>
      )}
    </div>
  );
}
