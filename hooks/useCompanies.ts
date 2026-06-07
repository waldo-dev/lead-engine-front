"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companyService } from "@/services/company.service";
import type { CompaniesQueryParams, UpdateCompanyPayload } from "@/types";

export const companyKeys = {
  all: ["companies"] as const,
  lists: () => [...companyKeys.all, "list"] as const,
  list: (params?: CompaniesQueryParams) => [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, "detail"] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};

export function useCompanies(params?: CompaniesQueryParams) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => companyService.getAll(params),
    placeholderData: (prev) => prev,
  });
}

export function useCompany(id: string | null) {
  return useQuery({
    queryKey: companyKeys.detail(id ?? ""),
    queryFn: () => companyService.getById(id!),
    enabled: !!id,
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCompanyPayload }) =>
      companyService.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.setQueryData(companyKeys.detail(data.id), data);
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => companyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}
