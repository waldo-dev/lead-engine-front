"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateCommercial } from "@/hooks/useCommercial";
import type { ContactStatus } from "@/types";
import type { SellerOverrides, UpdateCommercialPayload } from "@/types/commercial";
import { toast } from "sonner";

interface CommercialEditFormProps {
  companyId: string;
  overrides: SellerOverrides;
  outreachStatus: ContactStatus;
}

export function CommercialEditForm({
  companyId,
  overrides,
  outreachStatus,
}: CommercialEditFormProps) {
  const updateCommercial = useUpdateCommercial();
  const [form, setForm] = useState({
    outreachStatus: outreachStatus,
    businessProblem: overrides.businessProblem ?? "",
    proposedSolution: overrides.proposedSolution ?? "",
    estimatedImpact: overrides.estimatedImpact ?? "",
    decisionMakerName: overrides.decisionMakerName ?? "",
    decisionMakerRole: overrides.decisionMakerRole ?? "",
    commercialPriority: overrides.commercialPriority?.toString() ?? "",
    conversionProbability: overrides.conversionProbability?.toString() ?? "",
    ticketMinUsd: overrides.ticketMinUsd?.toString() ?? "",
    ticketMaxUsd: overrides.ticketMaxUsd?.toString() ?? "",
    firstConversationTopic: overrides.firstConversationTopic ?? "",
    nextAction: overrides.nextAction ?? "",
    nextActionDueDate: overrides.nextActionDueDate
      ? overrides.nextActionDueDate.slice(0, 10)
      : "",
    internalNotes: overrides.internalNotes ?? "",
  });

  useEffect(() => {
    setForm({
      outreachStatus,
      businessProblem: overrides.businessProblem ?? "",
      proposedSolution: overrides.proposedSolution ?? "",
      estimatedImpact: overrides.estimatedImpact ?? "",
      decisionMakerName: overrides.decisionMakerName ?? "",
      decisionMakerRole: overrides.decisionMakerRole ?? "",
      commercialPriority: overrides.commercialPriority?.toString() ?? "",
      conversionProbability: overrides.conversionProbability?.toString() ?? "",
      ticketMinUsd: overrides.ticketMinUsd?.toString() ?? "",
      ticketMaxUsd: overrides.ticketMaxUsd?.toString() ?? "",
      firstConversationTopic: overrides.firstConversationTopic ?? "",
      nextAction: overrides.nextAction ?? "",
      nextActionDueDate: overrides.nextActionDueDate
        ? overrides.nextActionDueDate.slice(0, 10)
        : "",
      internalNotes: overrides.internalNotes ?? "",
    });
  }, [overrides, outreachStatus]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateCommercialPayload = {
      outreachStatus: form.outreachStatus,
      businessProblem: form.businessProblem || null,
      proposedSolution: form.proposedSolution || null,
      estimatedImpact: form.estimatedImpact || null,
      decisionMakerName: form.decisionMakerName || null,
      decisionMakerRole: form.decisionMakerRole || null,
      commercialPriority: form.commercialPriority ? Number(form.commercialPriority) : null,
      conversionProbability: form.conversionProbability
        ? Number(form.conversionProbability)
        : null,
      ticketMinUsd: form.ticketMinUsd ? Number(form.ticketMinUsd) : null,
      ticketMaxUsd: form.ticketMaxUsd ? Number(form.ticketMaxUsd) : null,
      firstConversationTopic: form.firstConversationTopic || null,
      nextAction: form.nextAction || null,
      nextActionDueDate: form.nextActionDueDate
        ? new Date(form.nextActionDueDate).toISOString()
        : null,
      internalNotes: form.internalNotes || null,
    };

    try {
      await updateCommercial.mutateAsync({ companyId, payload });
      toast.success("Seguimiento comercial actualizado");
    } catch {
      toast.error("Error al guardar cambios");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Validar / corregir campos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Estado contacto</label>
            <Select
              value={form.outreachStatus}
              onValueChange={(v) => set("outreachStatus", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_contacted">Sin contacto</SelectItem>
                <SelectItem value="contacted">Contactado</SelectItem>
                <SelectItem value="in_progress">En progreso</SelectItem>
                <SelectItem value="converted">Convertido</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Field label="Problema detectado" value={form.businessProblem} onChange={(v) => set("businessProblem", v)} multiline />
          <Field label="Solución propuesta" value={form.proposedSolution} onChange={(v) => set("proposedSolution", v)} multiline />
          <Field label="Impacto estimado" value={form.estimatedImpact} onChange={(v) => set("estimatedImpact", v)} multiline />

          <div className="grid grid-cols-2 gap-2">
            <Field label="Decisor (nombre)" value={form.decisionMakerName} onChange={(v) => set("decisionMakerName", v)} />
            <Field label="Decisor (cargo)" value={form.decisionMakerRole} onChange={(v) => set("decisionMakerRole", v)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Prioridad (1-10)" value={form.commercialPriority} onChange={(v) => set("commercialPriority", v)} type="number" />
            <Field label="Prob. conversión %" value={form.conversionProbability} onChange={(v) => set("conversionProbability", v)} type="number" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Ticket min USD" value={form.ticketMinUsd} onChange={(v) => set("ticketMinUsd", v)} type="number" />
            <Field label="Ticket max USD" value={form.ticketMaxUsd} onChange={(v) => set("ticketMaxUsd", v)} type="number" />
          </div>

          <Field label="Primer tema de conversación" value={form.firstConversationTopic} onChange={(v) => set("firstConversationTopic", v)} multiline />
          <Field label="Próxima acción" value={form.nextAction} onChange={(v) => set("nextAction", v)} />
          <Field label="Vence" value={form.nextActionDueDate} onChange={(v) => set("nextActionDueDate", v)} type="date" />
          <Field label="Notas internas" value={form.internalNotes} onChange={(v) => set("internalNotes", v)} multiline />

          <Button type="submit" className="w-full" disabled={updateCommercial.isPending}>
            <Save className="h-4 w-4" />
            {updateCommercial.isPending ? "Guardando..." : "Guardar validación"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-[72px]" />
      ) : (
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      )}
    </div>
  );
}
