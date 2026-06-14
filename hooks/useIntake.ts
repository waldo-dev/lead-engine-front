"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assessmentService } from "@/services/assessment.service";
import { assessmentKeys } from "@/hooks/useAssessments";
import type { AssessmentIntake } from "@/types/assessment";

export const intakeKeys = {
  all: ["intake"] as const,
  detail: (assessmentId: string) => [...intakeKeys.all, assessmentId] as const,
};

export function useIntake(assessmentId: string | null) {
  return useQuery({
    queryKey: intakeKeys.detail(assessmentId ?? ""),
    queryFn: () => assessmentService.getIntake(assessmentId!),
    enabled: !!assessmentId,
  });
}

export function usePatchIntake(assessmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<AssessmentIntake>) =>
      assessmentService.patchIntake(assessmentId, patch),
    onSuccess: (data) => {
      queryClient.setQueryData(intakeKeys.detail(assessmentId), data);
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(assessmentId) });
    },
  });
}

type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function useIntakeAutoSave(assessmentId: string, debounceMs = 1500) {
  const patchIntake = usePatchIntake(assessmentId);
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<AssessmentIntake> | null>(null);

  const flush = useCallback(async () => {
    const patch = pendingPatchRef.current;
    if (!patch) return;

    pendingPatchRef.current = null;
    setStatus("saving");

    try {
      await patchIntake.mutateAsync(patch);
      setStatus("saved");
      setLastSavedAt(new Date());
    } catch {
      setStatus("error");
      pendingPatchRef.current = patch;
    }
  }, [patchIntake]);

  const queueSave = useCallback(
    (patch: Partial<AssessmentIntake>) => {
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      setStatus("pending");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flush(), debounceMs);
    },
    [debounceMs, flush],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { queueSave, status, lastSavedAt, flush, isSaving: status === "saving" };
}
