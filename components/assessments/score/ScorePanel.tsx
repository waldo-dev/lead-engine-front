"use client";

import { ScoreBadge } from "@/components/companies/ScoreBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BenchmarkComparison } from "@/components/assessments/score/BenchmarkComparison";
import type { Assessment, AssessmentFramework } from "@/types/assessment";
import type { AssessmentIntake } from "@/types/assessment";

interface ScorePanelProps {
  assessment: Assessment;
  intake: AssessmentIntake;
  framework?: AssessmentFramework;
  industrySlug?: string;
}

export function ScorePanel({
  assessment,
  intake,
  framework,
  industrySlug,
}: ScorePanelProps) {
  const score = assessment.chilsmartScore;
  const categories = framework?.categories ?? [];

  const categoryScores = categories.map((cat) => {
    const catData = intake.categories?.[cat.id];
    const subs = catData?.subcategories ?? {};
    const scores = Object.values(subs)
      .map((s) => s.score)
      .filter((s): s is number => s != null);
    const avg =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { id: cat.id, label: cat.label, avg, max: 5 };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <ScoreBadge score={score} size="lg" />
          <p className="text-sm font-semibold">ChilSmart Score</p>
          <p className="text-xs text-muted-foreground text-center max-w-[140px]">
            Actualizado al guardar subcategorías
          </p>
        </div>

        {industrySlug && (
          <div className="flex-1">
            <BenchmarkComparison industrySlug={industrySlug} companyScore={score} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Score por categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryScores.map((cat) => (
            <div key={cat.id} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{cat.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {cat.avg != null ? `${cat.avg.toFixed(1)} / ${cat.max}` : "—"}
                </span>
              </div>
              {cat.avg != null && (
                <Progress value={(cat.avg / cat.max) * 100} className="h-1.5" />
              )}
            </div>
          ))}
          {categoryScores.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Completa la evaluación por categoría para ver el desglose.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
