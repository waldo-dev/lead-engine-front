"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/companies/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import type { Company } from "@/types";

interface CompanyCardProps {
  company: Company;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onRetry?: (company: Company) => void;
  onView?: (company: Company) => void;
}

export function CompanyCard({
  company,
  selected,
  onToggleSelect,
  onRetry,
  onView,
}: CompanyCardProps) {
  return (
    <Card
      className="flex h-full cursor-pointer flex-col transition-shadow hover:shadow-md"
      onClick={() => onView?.(company)}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(company.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Seleccionar ${company.name}`}
              className="mt-0.5 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-snug break-words">{company.name}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground break-words">
              {company.industry}
              {company.city && company.city !== "—" && (
                <>
                  <span className="mx-1 text-border">·</span>
                  {company.city}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-start">
          <StatusBadge type="processing" status={company.processingStatus} />
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="flex items-start gap-2 rounded-lg bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug text-destructive break-words">
              {company.error ?? "Error de procesamiento"}
            </p>
            {company.errorReason && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words">
                {company.errorReason}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground break-words">
          Último intento: {formatDateTime(company.lastAttemptAt ?? company.updatedAt)}
        </p>
        {onRetry && (
          <Button
            className="w-full"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(company);
            }}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            Reintentar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
