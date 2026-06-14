"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assessmentService } from "@/services/assessment.service";
import type { GenerateReportBody } from "@/types/assessment";

export const reportKeys = {
  all: ["reports"] as const,
  list: (assessmentId: string) => [...reportKeys.all, "list", assessmentId] as const,
  detail: (assessmentId: string, reportId: string) =>
    [...reportKeys.all, "detail", assessmentId, reportId] as const,
  current: (assessmentId: string) => [...reportKeys.all, "current", assessmentId] as const,
};

export function useReportList(assessmentId: string | null) {
  return useQuery({
    queryKey: reportKeys.list(assessmentId ?? ""),
    queryFn: () => assessmentService.listReports(assessmentId!),
    enabled: !!assessmentId,
  });
}

export function useCurrentReport(assessmentId: string | null) {
  return useQuery({
    queryKey: reportKeys.current(assessmentId ?? ""),
    queryFn: () => assessmentService.getCurrentReport(assessmentId!),
    enabled: !!assessmentId,
  });
}

export function useReport(assessmentId: string | null, reportId: string | null) {
  return useQuery({
    queryKey: reportKeys.detail(assessmentId ?? "", reportId ?? ""),
    queryFn: () => assessmentService.getReportById(assessmentId!, reportId!),
    enabled: !!assessmentId && !!reportId,
  });
}

export function useGenerateReport(assessmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: GenerateReportBody) =>
      assessmentService.generateReport(assessmentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.list(assessmentId) });
      queryClient.invalidateQueries({ queryKey: reportKeys.current(assessmentId) });
    },
  });
}

export function usePatchReport(assessmentId: string, reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      assessmentService.patchReport(assessmentId, reportId, patch),
    onSuccess: (data) => {
      queryClient.setQueryData(reportKeys.detail(assessmentId, reportId), data);
      queryClient.invalidateQueries({ queryKey: reportKeys.current(assessmentId) });
      queryClient.invalidateQueries({ queryKey: reportKeys.list(assessmentId) });
    },
  });
}
