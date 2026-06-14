import { api } from "@/lib/api";
import type { BenchmarkData, KnowledgePattern, SimilarSuggestion } from "@/types/assessment";

export const knowledgeService = {
  async getBenchmark(industrySlug: string): Promise<BenchmarkData> {
    const { data } = await api.get<BenchmarkData>("/knowledge/benchmark", {
      params: { industrySlug },
    });
    return data;
  },

  async getPatterns(industrySlug: string): Promise<KnowledgePattern[]> {
    const { data } = await api.get<KnowledgePattern[]>("/knowledge/patterns", {
      params: { industrySlug },
    });
    return data;
  },

  async getSimilar(q: string): Promise<SimilarSuggestion[]> {
    const { data } = await api.get<SimilarSuggestion[]>("/knowledge/similar", {
      params: { q },
    });
    return data;
  },

  async listByType(type: string): Promise<KnowledgePattern[]> {
    const { data } = await api.get<KnowledgePattern[]>("/knowledge", {
      params: { type },
    });
    return data;
  },
};
