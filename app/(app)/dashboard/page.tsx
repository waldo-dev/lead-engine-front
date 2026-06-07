"use client";

import { DashboardCards } from "@/components/dashboard/DashboardCards";
import { useDashboardMetrics } from "@/hooks/useScraping";

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vista general de tu pipeline de leads y oportunidades comerciales
        </p>
      </div>
      <DashboardCards
        metrics={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
      />
    </div>
  );
}
