"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBenchmark } from "@/hooks/useKnowledge";

interface BenchmarkComparisonProps {
  industrySlug: string;
  companyScore?: number;
}

export function BenchmarkComparison({ industrySlug, companyScore }: BenchmarkComparisonProps) {
  const { data, isLoading } = useBenchmark(industrySlug);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!data) return null;

  const avg = data.averageScore;
  const diff = companyScore != null && avg != null ? companyScore - avg : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Benchmark sectorial
          {data.industryLabel && (
            <span className="text-muted-foreground font-normal"> · {data.industryLabel}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {avg != null && (
          <p>
            Media del rubro: <strong className="tabular-nums">{avg.toFixed(0)}</strong>
            {data.sampleSize != null && (
              <span className="text-muted-foreground"> (n={data.sampleSize})</span>
            )}
          </p>
        )}
        {diff != null && (
          <p className="text-muted-foreground">
            Tu empresa:{" "}
            <strong className="text-foreground tabular-nums">
              {diff >= 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}
            </strong>
            {" "}vs media sectorial
          </p>
        )}
      </CardContent>
    </Card>
  );
}
