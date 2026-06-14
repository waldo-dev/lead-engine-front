"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FieldLabel } from "@/components/assessments/shared/FormFields";
import { useCreateFinding } from "@/hooks/useFindings";
import type { CreateFindingPayload, Finding, FindingType } from "@/types/assessment";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FINDING_TYPES: Array<{ value: FindingType; label: string; variant: "destructive" | "success" | "warning" | "info" | "secondary" }> = [
  { value: "problem", label: "Problema", variant: "destructive" },
  { value: "quick_win", label: "Quick win", variant: "success" },
  { value: "risk", label: "Riesgo", variant: "warning" },
  { value: "process", label: "Proceso", variant: "info" },
  { value: "recommendation", label: "Recomendación", variant: "secondary" },
];

interface FindingsPanelProps {
  assessmentId: string;
  findings: Finding[];
  disabled?: boolean;
}

export function FindingsPanel({ assessmentId, findings, disabled }: FindingsPanelProps) {
  const createFinding = useCreateFinding(assessmentId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFindingPayload>({
    type: "problem",
    title: "",
    description: "",
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    try {
      await createFinding.mutateAsync(form);
      toast.success("Hallazgo registrado");
      setForm({ type: "problem", title: "", description: "" });
      setShowForm(false);
    } catch {
      toast.error("Error al registrar hallazgo");
    }
  };

  const typeMeta = (type: FindingType) =>
    FINDING_TYPES.find((t) => t.value === type) ?? FINDING_TYPES[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
        <h3 className="text-sm font-semibold">Hallazgos</h3>
        {!disabled && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        )}
      </div>

      {showForm && !disabled && (
        <div className="border-b border-border/80 p-4 space-y-3">
          <div className="space-y-2">
            <FieldLabel>Tipo</FieldLabel>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as FindingType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINDING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <FieldLabel>Título</FieldLabel>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Descripción</FieldLabel>
            <Textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createFinding.isPending}
          >
            {createFinding.isPending ? "Guardando…" : "Registrar"}
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {findings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Registra problemas, quick wins y riesgos durante la reunión.
            </p>
          )}
          {findings.map((f) => {
            const meta = typeMeta(f.type);
            return (
              <div
                key={f.id}
                className="rounded-lg border border-border/80 p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={meta.variant} className="text-[10px]">
                    {meta.label}
                  </Badge>
                  {f.severity && (
                    <span className={cn("text-[10px] text-muted-foreground")}>
                      {f.severity}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{f.title}</p>
                {f.description && (
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
