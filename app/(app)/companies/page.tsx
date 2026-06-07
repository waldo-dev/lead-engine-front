"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyTable } from "@/components/companies/CompanyTable";
import { CompanyDrawer } from "@/components/companies/CompanyDrawer";
import { CompanyFilters, type CompanyFiltersState } from "@/components/companies/CompanyFilters";
import { SearchInput } from "@/components/shared/SearchInput";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useCompanies, useUpdateCompany } from "@/hooks/useCompanies";
import { useAnalyzeCompany, useAnalyzePending } from "@/hooks/useAnalysis";
import { useUIStore } from "@/stores/ui.store";
import type { Company } from "@/types";
import { toast } from "sonner";

function CompaniesContent() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [filters, setFilters] = useState<CompanyFiltersState>({
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { selectedCompany, setSelectedCompany, selectedIds, toggleSelectedId, setSelectedIds } =
    useUIStore();

  const queryParams = useMemo(
    () => ({
      page,
      limit: 25,
      search: search || undefined,
      ...filters,
    }),
    [page, search, filters]
  );

  const { data, isLoading, isError, refetch } = useCompanies(queryParams);
  const updateCompany = useUpdateCompany();
  const analyzeCompany = useAnalyzeCompany();
  const analyzePending = useAnalyzePending();

  const companies = data?.data ?? [];

  const handleView = useCallback(
    (company: Company) => setSelectedCompany(company),
    [setSelectedCompany]
  );

  const handleProcess = useCallback(
    async (company: Company) => {
      try {
        await analyzeCompany.mutateAsync(company.id);
        toast.success(`Análisis iniciado para ${company.name}`);
      } catch {
        toast.error("Error al procesar empresa");
      }
    },
    [analyzeCompany]
  );

  const handleMarkContacted = useCallback(
    async (company: Company) => {
      try {
        await updateCompany.mutateAsync({
          id: company.id,
          payload: { contactStatus: "contacted" },
        });
        toast.success(`${company.name} marcada como contactada`);
      } catch {
        toast.error("Error al actualizar estado");
      }
    },
    [updateCompany]
  );

  const handleBatchProcess = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      try {
        await analyzeCompany.mutateAsync(id);
      } catch {
        // continue batch
      }
    }
    toast.success(`${selectedIds.length} empresas en cola de procesamiento`);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} empresas en total
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="outline" onClick={handleBatchProcess}>
              <Sparkles className="h-4 w-4" />
              Procesar ({selectedIds.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => analyzePending.mutate()}
            disabled={analyzePending.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${analyzePending.isPending ? "animate-spin" : ""}`} />
            Procesar pendientes
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <CompanyFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
      </div>

      <CompanyTable
        companies={companies}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelectedId}
        onSelectAll={setSelectedIds}
        onView={handleView}
        onProcess={handleProcess}
        onReprocess={handleProcess}
        onMarkContacted={handleMarkContacted}
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Página {page} de {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
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

export default function CompaniesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={10} />}>
      <CompaniesContent />
    </Suspense>
  );
}
