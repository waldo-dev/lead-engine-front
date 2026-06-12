"use client";

import {
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  Star,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/companies/ScoreBadge";
import { RankedBarChart } from "@/components/dashboard/RankedBarChart";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorCard } from "@/components/shared/ErrorCard";
import type { DashboardMetrics } from "@/types";

interface DashboardCardsProps {
  metrics?: DashboardMetrics;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

const statCards = [
  { key: "totalCompanies" as const, label: "Total empresas", icon: Building2, tone: "default" as const },
  { key: "analyzed" as const, label: "Analizadas", icon: CheckCircle2, tone: "success" as const },
  { key: "pending" as const, label: "Pendientes", icon: Clock, tone: "warning" as const },
  { key: "failed" as const, label: "Fallidas", icon: XCircle, tone: "destructive" as const },
  { key: "withContact" as const, label: "Con contacto", icon: Mail, tone: "info" as const },
  { key: "withoutContact" as const, label: "Sin contacto", icon: Users, tone: "default" as const },
];

export function DashboardCards({ metrics, isLoading, isError, onRetry }: DashboardCardsProps) {
  if (isLoading) return <LoadingSkeleton type="cards" rows={6} />;
  if (isError || !metrics) return <ErrorCard onRetry={onRetry} />;

  const topIndustries = metrics.topIndustries.slice(0, 10);
  const topCities = metrics.topCities.slice(0, 8);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 sm:gap-4">
        {statCards.map(({ key, label, icon, tone }) => (
          <StatCard key={key} label={label} value={metrics[key]} icon={icon} tone={tone} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <Card className="lg:col-span-3 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Star className="h-4 w-4 shrink-0 text-warning" />
              Score promedio
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Promedio de empresas con análisis IA
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6 sm:py-8 lg:py-10">
            <ScoreBadge score={Math.round(metrics.averageScore)} size="lg" />
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-9 xl:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium sm:text-lg">Top rubros</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Rubros con más empresas en tu base. Pasa el cursor para ver el nombre completo.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 pb-4 sm:pb-6">
            <RankedBarChart data={topIndustries} emptyMessage="Aún no hay rubros registrados" />
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-12 xl:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium sm:text-lg">Top ciudades</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Ciudades con mayor concentración de leads
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 pb-4 sm:pb-6">
            <RankedBarChart data={topCities} emptyMessage="Aún no hay ciudades registradas" />
          </CardContent>
        </Card>
      </div>

      {metrics.topPotential.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium sm:text-lg">
              <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
              Mayor potencial comercial
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Empresas con mejor score de conversión según el análisis IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/80">
              {metrics.topPotential.map((company, i) => (
                <div
                  key={company.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex min-w-0 items-start gap-3 sm:items-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug break-words sm:text-base">
                        {company.name}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground break-words sm:text-sm">
                        <span>{company.industry}</span>
                        {company.city && company.city !== "—" && (
                          <>
                            <span className="mx-1.5 text-border">·</span>
                            <span>{company.city}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 self-start sm:self-center">
                    <ScoreBadge score={company.aiScore} size="md" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
