"use client";

import { Activity, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  { key: "pending" as const, label: "Pendientes", icon: Clock, color: "text-amber-500" },
  { key: "processing" as const, label: "Procesando", icon: Loader2, color: "text-blue-500" },
  { key: "analyzed" as const, label: "Analizadas", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "failed" as const, label: "Fallidas", icon: XCircle, color: "text-red-500" },
];

export function ProcessingProgress({ stats, isLoading, isError, onRetry }: ProcessingProgressProps) {
  if (isLoading) return <LoadingSkeleton type="cards" rows={4} />;
  if (isError || !stats) return <ErrorCard onRetry={onRetry} />;

  const progress = stats.total > 0 ? Math.round((stats.analyzed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicators.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${color}`}>
                <Icon className={`h-5 w-5 ${key === "processing" ? "animate-spin" : ""}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats[key]}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Progreso general
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {stats.analyzed} de {stats.total} empresas analizadas
            </span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {stats.queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cola de ejecución</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {item.position}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.companyName}</p>
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
