"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commercialService } from "@/services/commercial.service";
import { companyKeys } from "@/hooks/useCompanies";
import type { CreateFollowupPayload, UpdateCommercialPayload } from "@/types/commercial";

export const commercialKeys = {
  all: ["commercial"] as const,
  tracking: (id: string) => [...commercialKeys.all, "tracking", id] as const,
  followups: (id: string) => [...commercialKeys.all, "followups", id] as const,
};

export function useCommercialTracking(companyId: string | null) {
  return useQuery({
    queryKey: commercialKeys.tracking(companyId ?? ""),
    queryFn: () => commercialService.getTracking(companyId!),
    enabled: !!companyId,
    retry: 1,
  });
}

export function useFollowups(companyId: string | null) {
  return useQuery({
    queryKey: commercialKeys.followups(companyId ?? ""),
    queryFn: () => commercialService.getFollowups(companyId!, { take: 50 }),
    enabled: !!companyId,
  });
}

export function useUpdateCommercial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, payload }: { companyId: string; payload: UpdateCommercialPayload }) =>
      commercialService.updateTracking(companyId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(commercialKeys.tracking(data.companyId), data);
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(data.companyId) });
    },
  });
}

export function useCreateFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      payload,
    }: {
      companyId: string;
      payload: CreateFollowupPayload;
    }) => commercialService.createFollowup(companyId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(commercialKeys.tracking(data.tracking.companyId), data.tracking);
      queryClient.invalidateQueries({
        queryKey: commercialKeys.followups(data.tracking.companyId),
      });
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}
