"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ganttService } from "@/services/gantt.service";
import type { GanttGeneratePayload, GanttPlanPayload } from "@/types/gantt";

export const ganttKeys = {
  all: ["gantt"] as const,
  example: () => [...ganttKeys.all, "example"] as const,
};

export function useGanttExample(enabled = false) {
  return useQuery({
    queryKey: ganttKeys.example(),
    queryFn: () => ganttService.getExample(),
    enabled,
    staleTime: Infinity,
  });
}

export function useGenerateGantt() {
  return useMutation({
    mutationFn: (payload: GanttGeneratePayload) => ganttService.generate(payload),
  });
}

export function usePlanGantt() {
  return useMutation({
    mutationFn: (payload: GanttPlanPayload) => ganttService.plan(payload),
  });
}
