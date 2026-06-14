"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assessmentService } from "@/services/assessment.service";

interface ReportHtmlPreviewProps {
  assessmentId: string;
  reportId: string;
}

export function ReportHtmlPreview({ assessmentId, reportId }: ReportHtmlPreviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await assessmentService.fetchReportRender(assessmentId, reportId, "html");
      const text = await blob.text();
      setHtml(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assessmentId, reportId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando preview…</p>;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const blob = new Blob([html ?? ""], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          }}
        >
          <ExternalLink className="h-4 w-4" />
          Abrir en nueva pestaña
        </Button>
      </div>
      <iframe
        title="Preview informe"
        srcDoc={html ?? ""}
        className="w-full min-h-[480px] rounded-lg border border-border bg-white"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
