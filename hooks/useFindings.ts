"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assessmentService } from "@/services/assessment.service";
import type { CreateFindingPayload } from "@/types/assessment";

export const findingKeys = {
  all: ["findings"] as const,
  list: (assessmentId: string) => [...findingKeys.all, assessmentId] as const,
};

export function useFindings(assessmentId: string | null) {
  return useQuery({
    queryKey: findingKeys.list(assessmentId ?? ""),
    queryFn: () => assessmentService.listFindings(assessmentId!),
    enabled: !!assessmentId,
  });
}

export function useCreateFinding(assessmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFindingPayload) =>
      assessmentService.createFinding(assessmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: findingKeys.list(assessmentId) });
    },
  });
}

export function useUpdateFinding(assessmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      findingId,
      payload,
    }: {
      findingId: string;
      payload: Partial<CreateFindingPayload>;
    }) => assessmentService.updateFinding(assessmentId, findingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: findingKeys.list(assessmentId) });
    },
  });
}
