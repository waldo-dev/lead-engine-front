"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getScrapingErrorMessage,
  scrapingService,
  type ScrapingRunStart,
  type ScrapingRunStatus,
} from "@/services/scraping.service";

export const scrapingKeys = {
  all: ["scraping"] as const,
  config: () => [...scrapingKeys.all, "config"] as const,
  stats: () => [...scrapingKeys.all, "stats"] as const,
  dashboard: () => [...scrapingKeys.all, "dashboard"] as const,
  run: (id: string) => [...scrapingKeys.all, "run", id] as const,
};

type ScrapingConfigOptions = {
  /** Evita GET /scraping/config hasta que el usuario abra el formulario */
  enabled?: boolean;
};

export function useScrapingConfig(options?: ScrapingConfigOptions) {
  return useQuery({
    queryKey: scrapingKeys.config(),
    queryFn: () => scrapingService.getConfig(),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

type ScrapingStatsOptions = {
  /** Solo en /processing: refresca cada 3s mientras hay un scraping en curso */
  pollWhileActive?: boolean;
};

export function useScrapingStats(options?: ScrapingStatsOptions) {
  return useQuery({
    queryKey: scrapingKeys.stats(),
    queryFn: () => scrapingService.getStats(),
    staleTime: 30_000,
    refetchInterval: options?.pollWhileActive
      ? (query) => (query.state.data?.activeRun?.status === "running" ? 3000 : false)
      : false,
  });
}

export function useScrapingRun(runId: string | null) {
  return useQuery({
    queryKey: scrapingKeys.run(runId ?? ""),
    queryFn: () => scrapingService.getRun(runId!),
    enabled: !!runId,
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 3000 : false,
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: scrapingKeys.dashboard(),
    queryFn: () => scrapingService.getDashboardMetrics(),
    refetchInterval: 30000,
  });
}

export function useRunScraping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      consentToken: string;
      sourceType: import("@/services/scraping.service").ScrapingSourceType;
      searchQuery: string;
      location?: string;
      maxResults?: number;
    }) => {
      const { consentToken, ...runParams } = params;
      return scrapingService.run(runParams, consentToken);
    },
    onSuccess: (data: ScrapingRunStart) => {
      queryClient.invalidateQueries({ queryKey: scrapingKeys.stats() });
      queryClient.setQueryData(scrapingKeys.run(data.runId), {
        id: data.runId,
        status: data.status,
        provider: data.provider,
        searchQuery: data.searchQuery,
        location: data.location,
        fetched: 0,
        imported: 0,
        duplicated: 0,
        failed: 0,
        createdAt: new Date().toISOString(),
      } satisfies ScrapingRunStatus);
    },
  });
}

export { getScrapingErrorMessage };
