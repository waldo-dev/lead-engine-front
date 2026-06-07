"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/companies/ScoreBadge";
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
  { key: "totalCompanies" as const, label: "Total empresas", icon: Building2 },
  { key: "analyzed" as const, label: "Analizadas", icon: CheckCircle2 },
  { key: "pending" as const, label: "Pendientes", icon: Clock },
  { key: "failed" as const, label: "Fallidas", icon: XCircle },
  { key: "withContact" as const, label: "Con contacto", icon: Mail },
  { key: "withoutContact" as const, label: "Sin contacto", icon: Users },
];

export function DashboardCards({ metrics, isLoading, isError, onRetry }: DashboardCardsProps) {
  if (isLoading) return <LoadingSkeleton type="cards" rows={6} />;
  if (isError || !metrics) return <ErrorCard onRetry={onRetry} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics[key]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4" />
              Score promedio
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <ScoreBadge score={Math.round(metrics.averageScore)} size="lg" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Top rubros</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.topIndustries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Top ciudades</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.topCities}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {metrics.topPotential.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Mayor potencial comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {metrics.topPotential.map((company, i) => (
                <div key={company.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.industry} · {company.city}
                      </p>
                    </div>
                  </div>
                  <ScoreBadge score={company.aiScore} size="md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
