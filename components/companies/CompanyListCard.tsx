"use client";

import {
  CheckCircle2,
  Copy,
  Eye,
  BrainCircuit,
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
import { StatusBadge } from "@/components/companies/StatusBadge";
import { ScoreBadge } from "@/components/companies/ScoreBadge";
import { formatDate, copyToClipboard } from "@/lib/utils";
import type { Company } from "@/types";
import { toast } from "sonner";

interface CompanyListCardProps {
  company: Company;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (company: Company) => void;
  onProcess: (company: Company) => void;
  onReprocess: (company: Company) => void;
  onMarkContacted: (company: Company) => void;
}

export function CompanyListCard({
  company,
  selected,
  onToggleSelect,
  onView,
  onProcess,
  onReprocess,
  onMarkContacted,
}: CompanyListCardProps) {
  const handleCopy = async () => {
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

  return (
    <TooltipProvider delayDuration={300}>
      <article
        className="rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-soft)] transition-shadow active:bg-muted/20"
        onClick={() => onView(company)}
      >
        <div className="flex gap-3">
          <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(company.id)}
              aria-label={`Seleccionar ${company.name}`}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug break-words">{company.name}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground break-words">
                  {company.industry}
                  {company.city && company.city !== "—" && (
                    <>
                      <span className="mx-1 text-border">·</span>
                      {company.city}
                    </>
                  )}
                </p>
              </div>
              <ScoreBadge score={company.aiScore} size="sm" />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <StatusBadge type="analysis" status={company.analysisStatus} />
              <StatusBadge type="processing" status={company.processingStatus} />
              <StatusBadge type="contact" status={company.contactStatus} />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Alta: {formatDate(company.createdAt)}
            </p>
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-end gap-0.5 border-t border-border/60 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onView(company)}>
                <Eye className="h-4 w-4" />
                <span className="sr-only">Ver análisis</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver análisis</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onProcess(company)}>
                <BrainCircuit className="h-4 w-4" />
                <span className="sr-only">Procesar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Procesar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onReprocess(company)}>
                <RefreshCw className="h-4 w-4" />
                <span className="sr-only">Reprocesar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reprocesar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copiar datos</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copiar datos</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onMarkContacted(company)}>
                <CheckCircle2 className="h-4 w-4" />
                <span className="sr-only">Marcar contactado</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Marcar contactado</TooltipContent>
          </Tooltip>
        </div>
      </article>
    </TooltipProvider>
  );
}
