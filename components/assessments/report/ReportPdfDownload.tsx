"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { assessmentService } from "@/services/assessment.service";
import { toast } from "sonner";

interface ReportPdfDownloadProps {
  assessmentId: string;
  reportId: string;
}

export function ReportPdfDownload({ assessmentId, reportId }: ReportPdfDownloadProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await assessmentService.fetchReportRender(assessmentId, reportId, "pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe-${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF descargado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("503")) {
        toast.error("PDF no disponible — usa preview HTML e imprime");
      } else {
        toast.error("Error al descargar PDF");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Descargar PDF
    </Button>
  );
}
