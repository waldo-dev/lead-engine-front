"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiService } from "@/services/ai.service";
import { companyKeys } from "@/hooks/useCompanies";
import { commercialKeys } from "@/hooks/useCommercial";

export const analysisKeys = {
  all: ["analysis"] as const,
  detail: (id: string) => [...analysisKeys.all, id] as const,
  briefing: (id: string) => [...analysisKeys.all, "briefing", id] as const,
};

export function useCompanyAnalysis(id: string | null) {
  return useQuery({
    queryKey: analysisKeys.detail(id ?? ""),
    queryFn: () => aiService.getCompanyAnalysis(id!),
    enabled: !!id,
    retry: 1,
  });
}

export function useBriefing(id: string | null) {
  return useQuery({
    queryKey: analysisKeys.briefing(id ?? ""),
    queryFn: () => aiService.getBriefing(id!),
    enabled: !!id,
    retry: 1,
  });
}

export function useAnalyzeCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiService.analyzeCompany(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: analysisKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: analysisKeys.briefing(id) });
      queryClient.invalidateQueries({ queryKey: commercialKeys.tracking(id) });
    },
  });
}

export function useAnalyzePending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => aiService.analyzePending(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: analysisKeys.all });
      queryClient.invalidateQueries({ queryKey: ["scraping"] });
    },
  });
}

export function useGenerateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiService.generateMessage(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.detail(id) });
    },
  });
}
