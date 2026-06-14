"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assessmentService } from "@/services/assessment.service";
import type { CreateAssessmentPayload } from "@/types/assessment";

export const assessmentKeys = {
  all: ["assessments"] as const,
  lists: () => [...assessmentKeys.all, "list"] as const,
  list: (companyId?: string) => [...assessmentKeys.lists(), companyId] as const,
  details: () => [...assessmentKeys.all, "detail"] as const,
  detail: (id: string) => [...assessmentKeys.details(), id] as const,
  framework: () => [...assessmentKeys.all, "framework"] as const,
  intakeSchema: () => [...assessmentKeys.all, "intake-schema"] as const,
};

export function useAssessments(companyId?: string) {
  return useQuery({
    queryKey: assessmentKeys.list(companyId),
    queryFn: () => assessmentService.list(companyId),
  });
}

export function useAssessment(id: string | null) {
  return useQuery({
    queryKey: assessmentKeys.detail(id ?? ""),
    queryFn: () => assessmentService.getById(id!),
    enabled: !!id,
  });
}

export function useAssessmentFramework() {
  return useQuery({
    queryKey: assessmentKeys.framework(),
    queryFn: () => assessmentService.getFramework(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIntakeSchema() {
  return useQuery({
    queryKey: assessmentKeys.intakeSchema(),
    queryFn: () => assessmentService.getIntakeSchema(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssessmentPayload) => assessmentService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
  });
}

export function useCompleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assessmentService.complete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      queryClient.setQueryData(assessmentKeys.detail(data.id), data);
    },
  });
}
