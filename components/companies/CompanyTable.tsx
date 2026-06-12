"use client";

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  BrainCircuit,
  Building2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompanyListCard } from "@/components/companies/CompanyListCard";
import { StatusBadge } from "@/components/companies/StatusBadge";
import { ScoreBadge } from "@/components/companies/ScoreBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorCard } from "@/components/shared/ErrorCard";
import { formatDate, copyToClipboard } from "@/lib/utils";
import type { Company } from "@/types";
import { toast } from "sonner";

interface CompanyTableProps {
  companies: Company[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onView: (company: Company) => void;
  onProcess: (company: Company) => void;
  onReprocess: (company: Company) => void;
  onMarkContacted: (company: Company) => void;
}

export function CompanyTable({
  companies,
  isLoading,
  isError,
  onRetry,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onView,
  onProcess,
  onReprocess,
  onMarkContacted,
}: CompanyTableProps) {
  const allSelected = companies.length > 0 && selectedIds.length === companies.length;

  const handleCopy = async (company: Company) => {
    const text = [
      company.name,
      company.industry,
      company.city,
      company.website,
      company.contacts?.emails?.[0],
      company.contacts?.phones?.[0],
    ]
      .filter(Boolean)
      .join(" | ");
    const ok = await copyToClipboard(text);
    if (ok) toast.success("Datos copiados");
  };

  if (isLoading) return <LoadingSkeleton rows={10} />;
  if (isError) return <ErrorCard onRetry={onRetry} />;

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-card py-20 text-center shadow-[var(--shadow-soft)]">
        <Building2 className="mb-4 h-10 w-10 text-muted-foreground" />
        <h3 className="font-semibold">No hay empresas</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajusta los filtros o importa nuevos leads desde scraping.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() =>
                onSelectAll(allSelected ? [] : companies.map((c) => c.id))
              }
            />
            Seleccionar todas
          </label>
          {selectedIds.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {selectedIds.length} seleccionada{selectedIds.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {companies.map((company) => (
          <CompanyListCard
            key={company.id}
            company={company}
            selected={selectedIds.includes(company.id)}
            onToggleSelect={onToggleSelect}
            onView={onView}
            onProcess={onProcess}
            onReprocess={onReprocess}
            onMarkContacted={onMarkContacted}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/80 bg-card shadow-[var(--shadow-soft)] md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() =>
                    onSelectAll(allSelected ? [] : companies.map((c) => c.id))
                  }
                />
              </th>
              <th className="px-3 py-3 text-left font-medium">Empresa</th>
              <th className="hidden px-3 py-3 text-left font-medium md:table-cell">Rubro</th>
              <th className="hidden px-3 py-3 text-left font-medium lg:table-cell">Ciudad</th>
              <th className="hidden px-3 py-3 text-left font-medium xl:table-cell">Web</th>
              <th className="px-3 py-3 text-left font-medium">Análisis</th>
              <th className="hidden px-3 py-3 text-left font-medium sm:table-cell">Proceso</th>
              <th className="hidden px-3 py-3 text-left font-medium lg:table-cell">Fecha</th>
              <th className="px-3 py-3 text-center font-medium">Score</th>
              <th className="hidden px-3 py-3 text-left font-medium md:table-cell">Contacto</th>
              <th className="px-3 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                className="group border-b transition-colors hover:bg-muted/30 cursor-pointer"
                onClick={() => onView(company)}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(company.id)}
                    onCheckedChange={() => onToggleSelect(company.id)}
                  />
                </td>
                <td className="max-w-[12rem] px-3 py-2 font-medium lg:max-w-[16rem]">
                  <span className="line-clamp-2 break-words">{company.name}</span>
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                  {company.industry}
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                  {company.city}
                </td>
                <td className="hidden px-3 py-2 xl:table-cell" onClick={(e) => e.stopPropagation()}>
                  {company.website ? (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <span className="max-w-[120px] truncate">{company.website}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge type="analysis" status={company.analysisStatus} />
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <StatusBadge type="processing" status={company.processingStatus} />
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                  {formatDate(company.createdAt)}
                </td>
                <td className="px-3 py-2 text-center">
                  <ScoreBadge score={company.aiScore} />
                </td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <StatusBadge type="contact" status={company.contactStatus} />
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(company)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver análisis</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onProcess(company)}>
                          <BrainCircuit className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Procesar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReprocess(company)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reprocesar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(company)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar datos</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMarkContacted(company)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Marcar contactado</TooltipContent>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
