"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { scrapingService } from "@/services/scraping.service";

export const scrapingKeys = {
  all: ["scraping"] as const,
  stats: () => [...scrapingKeys.all, "stats"] as const,
  dashboard: () => [...scrapingKeys.all, "dashboard"] as const,
};

export function useScrapingStats() {
  return useQuery({
    queryKey: scrapingKeys.stats(),
    queryFn: () => scrapingService.getStats(),
    refetchInterval: 5000,
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: scrapingKeys.dashboard(),
    queryFn: () => scrapingService.getDashboardMetrics(),
    refetchInterval: 30000,
  });
}

export function useImportScraping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => scrapingService.import(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scrapingKeys.all });
    },
  });
}
