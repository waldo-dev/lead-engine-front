"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { useCreateAssessment } from "@/hooks/useAssessments";
import { toast } from "sonner";

interface AssessmentCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (assessmentId: string) => void;
  defaultCompanyId?: string;
}

export function AssessmentCreateModal({
  open,
  onClose,
  onCreated,
  defaultCompanyId,
}: AssessmentCreateModalProps) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const { data: companiesData } = useCompanies({ limit: 100 }, { enabled: open });
  const createAssessment = useCreateAssessment();

  if (!open) return null;

  const companies = companiesData?.data ?? [];

  const handleCreate = async () => {
    if (!companyId) {
      toast.error("Selecciona una empresa");
      return;
    }
    try {
      const assessment = await createAssessment.mutateAsync({ companyId });
      toast.success("Diagnóstico creado");
      onCreated(assessment.id);
      onClose();
    } catch {
      toast.error("Error al crear diagnóstico");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold">Nuevo diagnóstico</h2>
        <p className="text-sm text-muted-foreground">
          Crea un diagnóstico estructurado para una empresa. El consultor rellenará el formulario
          durante la reunión.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Empresa</label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar empresa…" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={createAssessment.isPending}>
            {createAssessment.isPending ? "Creando…" : "Crear diagnóstico"}
          </Button>
        </div>
      </div>
    </div>
  );
}
