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
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onView?.(company)}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        {onToggleSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(company.id)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{company.name}</h3>
          <p className="text-sm text-muted-foreground">{company.industry} · {company.city}</p>
        </div>
        <StatusBadge type="processing" status={company.processingStatus} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-destructive">
              {company.error ?? "Error de procesamiento"}
            </p>
            {company.errorReason && (
              <p className="mt-1 text-xs text-muted-foreground">{company.errorReason}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Último intento: {formatDateTime(company.lastAttemptAt ?? company.updatedAt)}</span>
        </div>
        {onRetry && (
          <Button
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(company);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
