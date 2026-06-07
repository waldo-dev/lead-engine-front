import { api } from "@/lib/api";
import {
  mapCompanyAnalysisResponse,
  mapPresalesBriefing,
} from "@/lib/mappers";
import type {
  CompanyAnalysisResponse,
  OutreachMessageResult,
  PresalesBriefing,
} from "@/types";

export const aiService = {
  async analyzeCompany(id: string): Promise<PresalesBriefing> {
    const { data } = await api.post<Record<string, unknown>>(`/ai/analyze-company/${id}`);
    return mapPresalesBriefing(data);
  },

  async analyzePending(): Promise<{ queued: number; completed: number; failed: number }> {
    const { data } = await api.post<{
      processed?: number;
      completed?: number;
      failed?: number;
      queued?: number;
    }>("/ai/analyze-pending", {});
    return {
      queued: data.processed ?? data.queued ?? data.completed ?? 0,
      completed: data.completed ?? 0,
      failed: data.failed ?? 0,
    };
  },

  async generateMessage(id: string): Promise<OutreachMessageResult> {
    const { data } = await api.post<OutreachMessageResult>(`/ai/generate-message/${id}`);
    return data;
  },

  async getCompanyAnalysis(id: string): Promise<CompanyAnalysisResponse> {
    const { data } = await api.get<Record<string, unknown>>(`/ai/company-analysis/${id}`);
    return mapCompanyAnalysisResponse(data);
  },

  async getBriefing(id: string): Promise<PresalesBriefing> {
    const { data } = await api.get<Record<string, unknown>>(`/ai/briefing/${id}`);
    const payload = (data.briefing ?? data) as Record<string, unknown>;
    return mapPresalesBriefing(payload);
  },
};
