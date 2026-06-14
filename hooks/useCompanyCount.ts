"use client";

import { useQuery } from "@tanstack/react-query";
import { companyService } from "@/services/company.service";
import { companyKeys } from "@/hooks/useCompanies";
import { useAuthSession } from "@/stores/auth.store";

export function useCompanyCount() {
  const { isReady, isAuthenticated } = useAuthSession();

  return useQuery({
    queryKey: [...companyKeys.lists(), "count"] as const,
    queryFn: async () => {
      const result = await companyService.getAll({ page: 1, limit: 1 });
      return result.total;
    },
    staleTime: 60_000,
    enabled: isReady && isAuthenticated,
  });
}
