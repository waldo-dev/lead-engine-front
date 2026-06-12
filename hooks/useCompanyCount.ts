"use client";

import { useQuery } from "@tanstack/react-query";
import { companyService } from "@/services/company.service";
import { companyKeys } from "@/hooks/useCompanies";

export function useCompanyCount() {
  return useQuery({
    queryKey: [...companyKeys.lists(), "count"] as const,
    queryFn: async () => {
      const result = await companyService.getAll({ page: 1, limit: 1 });
      return result.total;
    },
    staleTime: 60_000,
  });
}
