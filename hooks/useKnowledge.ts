"use client";

import { useQuery } from "@tanstack/react-query";
import { knowledgeService } from "@/services/knowledge.service";

export const knowledgeKeys = {
  all: ["knowledge"] as const,
  benchmark: (slug: string) => [...knowledgeKeys.all, "benchmark", slug] as const,
  patterns: (slug: string) => [...knowledgeKeys.all, "patterns", slug] as const,
  similar: (q: string) => [...knowledgeKeys.all, "similar", q] as const,
};

export function useBenchmark(industrySlug: string | null) {
  return useQuery({
    queryKey: knowledgeKeys.benchmark(industrySlug ?? ""),
    queryFn: () => knowledgeService.getBenchmark(industrySlug!),
    enabled: !!industrySlug,
  });
}

export function useKnowledgePatterns(industrySlug: string | null) {
  return useQuery({
    queryKey: knowledgeKeys.patterns(industrySlug ?? ""),
    queryFn: () => knowledgeService.getPatterns(industrySlug!),
    enabled: !!industrySlug,
  });
}

export function useSimilarSuggestions(q: string) {
  return useQuery({
    queryKey: knowledgeKeys.similar(q),
    queryFn: () => knowledgeService.getSimilar(q),
    enabled: q.length >= 3,
  });
}
