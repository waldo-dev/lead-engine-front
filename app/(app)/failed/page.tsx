"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { CompanyDrawer } from "@/components/companies/CompanyDrawer";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorCard } from "@/components/shared/ErrorCard";
import { useCompanies } from "@/hooks/useCompanies";
import { useAnalyzeCompany } from "@/hooks/useAnalysis";
import { useUIStore } from "@/stores/ui.store";
import type { Company } from "@/types";
import { toast } from "sonner";

export default function FailedPage() {
  const { selectedCompany, selectedIds, toggleSelectedId, setSelectedIds, setSelectedCompany } =
    useUIStore();
  const { data, isLoading, isError, refetch } = useCompanies({
    processingStatus: "failed",
    limit: 50,
  });
  const analyzeCompany = useAnalyzeCompany();

  const companies = data?.data ?? [];

  const handleRetry = async (company: Company) => {
    try {
      await analyzeCompany.mutateAsync(company.id);
      toast.success(`Reintento iniciado para ${company.name}`);
    } catch {
      toast.error("Error al reintentar");
    }
  };

  const handleBatchRetry = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos una empresa");
      return;
    }
    for (const id of selectedIds) {
      try {
        await analyzeCompany.mutateAsync(id);
      } catch {
        // continue
      }
    }
    toast.success(`${selectedIds.length} empresas en cola de reprocesamiento`);
    setSelectedIds([]);
    refetch();
  };

  if (isLoading) return <LoadingSkeleton type="cards" rows={6} />;
  if (isError) return <ErrorCard onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fallidas</h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} empresas con errores de procesamiento
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={handleBatchRetry} disabled={analyzeCompany.isPending}>
            <RefreshCw className={`h-4 w-4 ${analyzeCompany.isPending ? "animate-spin" : ""}`} />
            Reintentar ({selectedIds.length})
          </Button>
        )}
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="mb-4 h-10 w-10 text-emerald-500" />
          <h3 className="font-semibold">Sin errores</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas las empresas se procesaron correctamente.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              selected={selectedIds.includes(company.id)}
              onToggleSelect={toggleSelectedId}
              onRetry={handleRetry}
              onView={setSelectedCompany}
            />
          ))}
        </div>
      )}

      <CompanyDrawer
        company={selectedCompany}
        open={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />
    </div>
  );
}
