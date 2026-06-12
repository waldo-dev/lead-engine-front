"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrainCircuit, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
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
    <div className="space-y-5">
      <PageHeader
        title="Empresas"
        description={`${data?.total ?? 0} empresas en tu base de prospección`}
        actions={
          <>
            {selectedIds.length > 0 && (
              <Button variant="outline" onClick={handleBatchProcess} className="px-3 sm:px-4">
                <BrainCircuit className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Analizar </span>
                <span className="tabular-nums">({selectedIds.length})</span>
                <span className="sr-only sm:hidden"> empresas seleccionadas</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => analyzePending.mutate()}
              disabled={analyzePending.isPending}
              className="px-3 sm:px-4"
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${analyzePending.isPending ? "animate-spin" : ""}`} />
              <span className="hidden min-[400px]:inline">Pendientes</span>
              <span className="sr-only min-[400px]:hidden">Procesar pendientes</span>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          className="w-full lg:max-w-sm"
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
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            Página {page} de {data.totalPages}
          </p>
          <div className="flex gap-2 sm:justify-end">
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
