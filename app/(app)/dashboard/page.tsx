"use client";

import { DashboardCards } from "@/components/dashboard/DashboardCards";
import { PageHeader } from "@/components/shared/PageHeader";
import { useDashboardMetrics } from "@/hooks/useScraping";

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen"
        description="Vista general de tu pipeline de leads, análisis y oportunidades comerciales"
      />
      <DashboardCards
        metrics={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
      />
    </div>
  );
}
