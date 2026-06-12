import { api } from "@/lib/api";
import { mapDashboardMetrics, mapScrapingStats } from "@/lib/mappers";
import { companyService } from "@/services/company.service";
import type { DashboardMetrics, ScrapingStats } from "@/types";
import axios from "axios";

export type ScrapingSourceType = "google_maps" | "instagram" | "linkedin";

export type ScrapingSourceOption = {
  id: ScrapingSourceType;
  label: string;
  description: string;
  requiresLocation: boolean;
  searchPlaceholder: string;
  locationPlaceholder?: string;
  searchHelp: string;
  analysisHint: string;
  enabled: boolean;
  missingConfig?: string;
};

export type ScrapingQuotaInfo = {
  limits: {
    maxResultsPerRun: number;
    maxRunsPerDay: number;
    maxPlacesPerDay: number;
    maxConcurrentRuns: number;
    estimatedCostPerPlaceUsd: number;
  };
  usage: {
    runsToday: number;
    placesToday: number;
    runningNow: number;
    placesRemaining: number;
    runsRemaining: number;
  };
  canStartRun: boolean;
};

export type ScrapingConfig = {
  provider: string | null;
  configured: boolean;
  apifyReady: boolean;
  webhookReady: boolean;
  sources: ScrapingSourceOption[];
  quota: ScrapingQuotaInfo;
  defaults: {
    searchQuery: string | null;
    location: string | null;
    maxResults: number;
    sourceType: ScrapingSourceType;
  };
  analysisPipeline: {
    summary: string;
    dataUsed: string[];
  };
};

type BackendScrapingStats = {
  totals: { imported: number; duplicated: number; failed: number };
  byIndustry: { industry: string; count: number }[];
  pendingAi: number;
  activeRun?: ScrapingRunStatus | null;
};

export type ScrapingRunStatus = {
  id: string;
  status: string;
  sourceType?: string;
  provider?: string | null;
  searchQuery?: string | null;
  location?: string | null;
  maxResults?: number | null;
  estimatedCostUsd?: number | null;
  fetched: number;
  imported: number;
  duplicated: number;
  failed: number;
  errorMessage?: string | null;
  apifyRunId?: string | null;
  apifyDatasetId?: string | null;
  apifyLinks?: {
    console?: string;
    datasetItems?: string;
    runApi?: string;
  } | null;
  createdAt: string;
  finishedAt?: string | null;
};

export type ScrapingRunStart = {
  runId: string;
  status: string;
  provider: string;
  sourceType: ScrapingSourceType;
  sourceLabel: string;
  searchQuery: string;
  location: string | null;
  maxResults: number;
  estimatedCostUsd: number;
  message: string;
};

type ScrapingRunConsent = {
  token: string;
  expiresAt: number;
};

let activeRunConsent: ScrapingRunConsent | null = null;
const RUN_CONSENT_TTL_MS = 60_000;

/** Solo debe llamarse en el clic de confirmación del usuario (una vez por búsqueda). */
export function createScrapingRunConsent(): string {
  const token = crypto.randomUUID();
  activeRunConsent = { token, expiresAt: Date.now() + RUN_CONSENT_TTL_MS };
  return token;
}

function consumeScrapingRunConsent(consentToken: string) {
  if (
    !activeRunConsent ||
    activeRunConsent.token !== consentToken ||
    Date.now() > activeRunConsent.expiresAt
  ) {
    throw new Error(
      "Scraping bloqueado: debes confirmar la búsqueda manualmente antes de ejecutarla.",
    );
  }
  activeRunConsent = null;
}

export function getScrapingErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.error?.message;
    if (typeof apiMessage === "string") return apiMessage;
    if (error.response?.status === 401) {
      return "Sesión expirada. Vuelve a iniciar sesión.";
    }
    if (error.response?.status === 429) {
      return typeof apiMessage === "string" ? apiMessage : "Límite diario de scraping alcanzado.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Error al ejecutar scraping";
}

export const scrapingService = {
  async getConfig(): Promise<ScrapingConfig> {
    const { data } = await api.get<ScrapingConfig>("/scraping/config");
    return data;
  },

  async run(
    params: {
      sourceType: ScrapingSourceType;
      searchQuery: string;
      location?: string;
      maxResults?: number;
    },
    consentToken: string,
  ): Promise<ScrapingRunStart> {
    consumeScrapingRunConsent(consentToken);

    if (process.env.NODE_ENV === "development") {
      console.info("[scraping] POST /scraping/run autorizado por confirmación del usuario", {
        sourceType: params.sourceType,
        searchQuery: params.searchQuery,
      });
    }

    const { data } = await api.post<ScrapingRunStart>("/scraping/run", params, {
      headers: { "X-Scraping-User-Confirmed": "true" },
    });
    return data;
  },

  async getRun(runId: string): Promise<ScrapingRunStatus> {
    const { data } = await api.get<{ run: ScrapingRunStatus }>(`/scraping/runs/${runId}`);
    return data.run;
  },

  async abortRun(runId: string): Promise<{ runId: string; status: string }> {
    const { data } = await api.post<{ runId: string; status: string }>(
      `/scraping/runs/${runId}/abort`,
    );
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
