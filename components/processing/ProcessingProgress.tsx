"use client";

import { Activity, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorCard } from "@/components/shared/ErrorCard";
import { formatDateTime } from "@/lib/utils";
import type { ScrapingStats } from "@/types";

interface ProcessingProgressProps {
  stats?: ScrapingStats;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

const indicators = [
  { key: "pending" as const, label: "Pendientes", icon: Clock, tone: "warning" as const },
  { key: "processing" as const, label: "Procesando", icon: Loader2, tone: "info" as const, iconSpin: true },
  { key: "analyzed" as const, label: "Analizadas", icon: CheckCircle2, tone: "success" as const },
  { key: "failed" as const, label: "Fallidas", icon: XCircle, tone: "destructive" as const },
];

export function ProcessingProgress({ stats, isLoading, isError, onRetry }: ProcessingProgressProps) {
  if (isLoading) return <LoadingSkeleton type="cards" rows={4} />;
  if (isError || !stats) return <ErrorCard onRetry={onRetry} />;

  const progress = stats.total > 0 ? Math.round((stats.analyzed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {indicators.map(({ key, label, icon, tone, iconSpin }) => (
          <StatCard
            key={key}
            label={label}
            value={stats[key]}
            icon={icon}
            tone={tone}
            iconSpin={iconSpin}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Activity className="h-4 w-4 text-primary" />
            Progreso general
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {stats.analyzed} de {stats.total} empresas analizadas
            </span>
            <span className="font-semibold tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </CardContent>
      </Card>

      {stats.queue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Cola de ejecución</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.queue.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                      {item.position}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.companyName}</p>
                      {item.startedAt && (
                        <p className="text-xs text-muted-foreground">
                          Iniciado: {formatDateTime(item.startedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={item.status === "processing" ? "info" : "warning"}>
                    {item.status === "processing" ? "Procesando" : "En cola"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
