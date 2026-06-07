"use client";

import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProcessingProgress } from "@/components/processing/ProcessingProgress";
import { useScrapingStats, useImportScraping } from "@/hooks/useScraping";
import { useAnalyzePending } from "@/hooks/useAnalysis";
import { toast } from "sonner";

export default function ProcessingPage() {
  const { data, isLoading, isError, refetch } = useScrapingStats();
  const importScraping = useImportScraping();
  const analyzePending = useAnalyzePending();

  const handleImport = async () => {
    try {
      const result = await importScraping.mutateAsync();
      toast.success(`${result.imported} empresas importadas`);
    } catch {
      toast.error("Error al importar desde scraping");
    }
  };

  const handleProcessPending = async () => {
    try {
      const result = await analyzePending.mutateAsync();
      toast.success(`${result.queued} empresas en cola`);
    } catch {
      toast.error("Error al procesar pendientes");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procesamiento</h1>
          <p className="text-sm text-muted-foreground">
            Estado en tiempo real del pipeline de análisis IA
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleImport}
            disabled={importScraping.isPending}
          >
            <Download className={`h-4 w-4 ${importScraping.isPending ? "animate-pulse" : ""}`} />
            Importar scraping
          </Button>
          <Button onClick={handleProcessPending} disabled={analyzePending.isPending}>
            <RefreshCw className={`h-4 w-4 ${analyzePending.isPending ? "animate-spin" : ""}`} />
            Procesar pendientes
          </Button>
        </div>
      </div>

      <ProcessingProgress
        stats={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
      />
    </div>
  );
}
