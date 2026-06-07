import { Badge } from "@/components/ui/badge";
import type { AnalysisStatus, ContactStatus, ProcessingStatus } from "@/types";

const analysisLabels: Record<AnalysisStatus, string> = {
  pending: "Pendiente",
  analyzing: "Analizando",
  completed: "Completado",
  failed: "Fallido",
};

const processingLabels: Record<ProcessingStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
};

const contactLabels: Record<ContactStatus, string> = {
  not_contacted: "Sin contacto",
  contacted: "Contactado",
  in_progress: "En progreso",
  converted: "Convertido",
  rejected: "Rechazado",
};

const analysisVariants: Record<AnalysisStatus, "warning" | "info" | "success" | "destructive"> = {
  pending: "warning",
  analyzing: "info",
  completed: "success",
  failed: "destructive",
};

const processingVariants: Record<ProcessingStatus, "warning" | "info" | "success" | "destructive"> = {
  pending: "warning",
  processing: "info",
  completed: "success",
  failed: "destructive",
};

const contactVariants: Record<ContactStatus, "secondary" | "info" | "success" | "warning" | "destructive"> = {
  not_contacted: "secondary",
  contacted: "info",
  in_progress: "warning",
  converted: "success",
  rejected: "destructive",
};

interface StatusBadgeProps {
  type: "analysis" | "processing" | "contact";
  status: AnalysisStatus | ProcessingStatus | ContactStatus;
}

export function StatusBadge({ type, status }: StatusBadgeProps) {
  if (type === "analysis") {
    const s = status as AnalysisStatus;
    return <Badge variant={analysisVariants[s]}>{analysisLabels[s]}</Badge>;
  }
  if (type === "processing") {
    const s = status as ProcessingStatus;
    return <Badge variant={processingVariants[s]}>{processingLabels[s]}</Badge>;
  }
  const s = status as ContactStatus;
  return <Badge variant={contactVariants[s]}>{contactLabels[s]}</Badge>;
}
