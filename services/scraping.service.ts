import { api } from "@/lib/api";
import { mapCompany, mapDashboardMetrics, mapScrapingStats } from "@/lib/mappers";
import { companyService } from "@/services/company.service";
import type { DashboardMetrics, ScrapingStats } from "@/types";

type BackendScrapingStats = {
  totals: { imported: number; duplicated: number; failed: number };
  byIndustry: { industry: string; count: number }[];
  pendingAi: number;
};

export const scrapingService = {
  async import(): Promise<{ imported: number }> {
    const { data } = await api.post<{ imported: number }>("/scraping/import", { items: [] });
    return data;
  },

  async getStats(): Promise<ScrapingStats> {
    const { data } = await api.get<BackendScrapingStats>("/scraping/stats");
    return mapScrapingStats(data);
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [stats, companies] = await Promise.all([
      api.get<BackendScrapingStats>("/scraping/stats"),
      companyService.getAll({ limit: 100 }),
    ]);
    return mapDashboardMetrics(stats.data, companies.data);
  },
};
