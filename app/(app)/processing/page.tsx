"use client";

import { useCallback, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScrapingRunForm } from "@/components/processing/ScrapingRunForm";
import { ProcessingProgress } from "@/components/processing/ProcessingProgress";
import { useScrapingStats } from "@/hooks/useScraping";
import { useAnalyzePending } from "@/hooks/useAnalysis";
import { toast } from "sonner";

export default function ProcessingPage() {
  const [searchFormOpen, setSearchFormOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useScrapingStats({ pollWhileActive: true });
  const analyzePending = useAnalyzePending();
  const handleRunFinished = useCallback(() => {
    refetch();
  }, [refetch]);

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
      <PageHeader
        title="Procesamiento"
        description="Importa leads desde Apify, controla cuotas diarias y ejecuta el análisis comercial"
        actions={
          <Button onClick={handleProcessPending} disabled={analyzePending.isPending}>
            <RefreshCw className={`h-4 w-4 ${analyzePending.isPending ? "animate-spin" : ""}`} />
            Procesar pendientes
          </Button>
        }
      />

      {searchFormOpen ? (
        <ScrapingRunForm enabled onRunFinished={handleRunFinished} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Búsqueda de leads (Apify)</CardTitle>
            <CardDescription>
              El scraping no se ejecuta automáticamente. Solo corre cuando tú defines la búsqueda y
              confirmas explícitamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setSearchFormOpen(true)}>
              <Search className="h-4 w-4" />
              Iniciar búsqueda manual
            </Button>
          </CardContent>
        </Card>
      )}

      <ProcessingProgress
        stats={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
      />
    </div>
  );
}
