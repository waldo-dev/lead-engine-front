"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { IntakeWizard } from "@/components/assessments/intake/IntakeWizard";
import { IntakePhaseGeneral } from "@/components/assessments/intake/IntakePhaseGeneral";
import { IntakePhaseSystems } from "@/components/assessments/intake/IntakePhaseSystems";
import { IntakePhaseProcesses } from "@/components/assessments/intake/IntakePhaseProcesses";
import { IntakePhaseCategories } from "@/components/assessments/intake/IntakePhaseCategories";
import { IntakePhaseInformationFlow } from "@/components/assessments/intake/IntakePhaseInformationFlow";
import { IntakePhaseRoadmap } from "@/components/assessments/intake/IntakePhaseRoadmap";
import { IntakePhaseReview } from "@/components/assessments/intake/IntakePhaseReview";
import { IntakeAutoSaveIndicator } from "@/components/assessments/intake/IntakeAutoSaveIndicator";
import { FindingsPanel } from "@/components/assessments/findings/FindingsPanel";
import { ScorePanel } from "@/components/assessments/score/ScorePanel";
import { KnowledgeHintsSidebar } from "@/components/assessments/knowledge/KnowledgeHintsSidebar";
import { ReportTab } from "@/components/assessments/report/ReportTab";
import {
  useAssessment,
  useAssessmentFramework,
  useCompleteAssessment,
  useIntakeSchema,
} from "@/hooks/useAssessments";
import { useIntake, useIntakeAutoSave } from "@/hooks/useIntake";
import { useFindings } from "@/hooks/useFindings";
import { useCompany } from "@/hooks/useCompanies";
import { IntakePhaseNav } from "@/components/assessments/intake/IntakePhaseNav";
import { PhaseHeader } from "@/components/assessments/shared/PhaseHeader";
import { PHASE_GUIDANCE } from "@/components/assessments/intake/phase-guidance";
import { DEFAULT_INTAKE_PHASES } from "@/components/assessments/constants";
import type { AssessmentIntake, IntakePhaseId } from "@/types/assessment";

import { toast } from "sonner";

interface AssessmentWorkspaceProps {
  assessmentId: string;
}

const EMPTY_INTAKE: AssessmentIntake = {
  version: "1.0.0",
  general: {},
  systems: [],
  processes: [],
  categories: {},
};

export function AssessmentWorkspace({ assessmentId }: AssessmentWorkspaceProps) {
  const [activePhase, setActivePhase] = useState<IntakePhaseId>("general");
  const [localIntake, setLocalIntake] = useState<AssessmentIntake | null>(null);

  const { data: assessment, isLoading: loadingAssessment } = useAssessment(assessmentId);
  const { data: intakeData, isLoading: loadingIntake } = useIntake(assessmentId);
  const { data: framework } = useAssessmentFramework();
  const { data: schema } = useIntakeSchema();
  const { data: findings = [] } = useFindings(assessmentId);
  const { data: company } = useCompany(assessment?.companyId ?? null);
  const completeAssessment = useCompleteAssessment();
  const { queueSave, status: saveStatus, lastSavedAt } = useIntakeAutoSave(assessmentId);

  const intake = localIntake ?? intakeData?.intake ?? EMPTY_INTAKE;
  const completeness = intakeData?.completeness;
  const phases = schema?.phases ?? DEFAULT_INTAKE_PHASES;

  const completedPhases = useMemo(() => {
    if (!completeness?.blocks) return new Set<IntakePhaseId>();
    const set = new Set<IntakePhaseId>();
    for (const block of completeness.blocks) {
      if (block.filled) {
        const phase = block.id.replace(/_context$/, "").replace(/general_context/, "general") as IntakePhaseId;
        if (phases.some((p) => p.id === phase)) set.add(phase);
      }
    }
    return set;
  }, [completeness?.blocks, phases]);

  const industrySlug = company?.industry?.toLowerCase().replace(/\s+/g, "-") ?? undefined;

  const handleIntakeChange = (patch: Partial<AssessmentIntake>) => {
    const merged = { ...intake, ...patch };
    if (patch.general) merged.general = { ...intake.general, ...patch.general };
    if (patch.informationFlow) {
      merged.informationFlow = { ...intake.informationFlow, ...patch.informationFlow };
    }
    if (patch.roadmapInputs) {
      merged.roadmapInputs = { ...intake.roadmapInputs, ...patch.roadmapInputs };
    }
    if (patch.categories) {
      merged.categories = { ...intake.categories, ...patch.categories };
    }
    setLocalIntake(merged);
    queueSave(patch);
  };

  const handleComplete = async () => {
    try {
      await completeAssessment.mutateAsync(assessmentId);
      toast.success("Diagnóstico completado — formulario bloqueado");
    } catch {
      toast.error("Error al completar diagnóstico");
    }
  };

  if (loadingAssessment || loadingIntake) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!assessment || !intakeData) {
    return <p className="text-muted-foreground">Diagnóstico no encontrado.</p>;
  }

  const phaseLabel = phases.find((p) => p.id === activePhase)?.label ?? activePhase;
  const formDisabled = assessment.status === "completed";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
            <Link href="/assessments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {assessment.companyName ?? company?.name ?? "Diagnóstico"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Diagnóstico · {assessment.status}
              {assessment.chilsmartScore != null && (
                <> · Score {assessment.chilsmartScore}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {completeness && (
            <div className="flex items-center gap-3 w-full sm:w-64">
              <Progress value={completeness.percent} className="h-2 flex-1" />
              <span className="text-sm font-semibold tabular-nums shrink-0">
                {completeness.percent}%
              </span>
            </div>
          )}
          <IntakeAutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
        </div>
      </div>

      {/* Main workspace: wizard | form | findings */}
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,240px)_1fr_260px] xl:grid-cols-[minmax(240px,260px)_1fr_280px]">
        <div className="rounded-xl border border-border/80 bg-card p-3">
          <IntakeWizard
            activePhase={activePhase}
            onPhaseChange={setActivePhase}
            phases={phases}
            completedPhases={completedPhases}
          />
        </div>

        <div className="rounded-xl border border-border/80 bg-card">
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
            <h2 className="text-sm font-semibold">{phaseLabel}</h2>
            <IntakeAutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
          </div>

          <div className="p-4">
            <PhaseHeader guidance={PHASE_GUIDANCE[activePhase]} />

            {activePhase === "general" && (
              <IntakePhaseGeneral
                intake={intake}
                disabled={formDisabled}
                onChange={handleIntakeChange}
              />
            )}
            {activePhase === "systems" && (
              <IntakePhaseSystems
                intake={intake}
                disabled={formDisabled}
                onChange={handleIntakeChange}
              />
            )}
            {activePhase === "processes" && (
              <IntakePhaseProcesses
                intake={intake}
                disabled={formDisabled}
                onChange={handleIntakeChange}
              />
            )}
            {activePhase === "categories" && (
              <IntakePhaseCategories
                intake={intake}
                framework={framework}
                disabled={formDisabled}
                onChange={handleIntakeChange}
              />
            )}
            {activePhase === "information_flow" && (
              <IntakePhaseInformationFlow
                intake={intake}
                disabled={formDisabled}
                onChange={handleIntakeChange}
              />
            )}
            {activePhase === "findings" && (
              <p className="text-sm text-muted-foreground">
                Usa el panel lateral derecho para registrar hallazgos durante la reunión.
              </p>
            )}
            {activePhase === "roadmap" && (
              <IntakePhaseRoadmap
                intake={intake}
                disabled={formDisabled}
                onChange={handleIntakeChange}
              />
            )}
            {activePhase === "review" && completeness && (
              <IntakePhaseReview
                assessment={assessment}
                completeness={completeness}
                onNavigatePhase={setActivePhase}
              />
            )}

            <IntakePhaseNav
              phases={phases}
              activePhase={activePhase}
              onPhaseChange={setActivePhase}
            />
          </div>

          {industrySlug && activePhase === "categories" && (
            <div className="border-t border-border/80 px-4 py-3">
              <KnowledgeHintsSidebar industrySlug={industrySlug} />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/80 bg-card flex flex-col min-h-[320px] lg:min-h-0">
          <FindingsPanel
            assessmentId={assessmentId}
            findings={findings}
            disabled={formDisabled}
          />
        </div>
      </div>

      {/* Bottom tabs */}
      <Tabs defaultValue="score" className="mt-2">
        <TabsList>
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="report">Informe</TabsTrigger>
          <TabsTrigger value="evolution">Evolución</TabsTrigger>
        </TabsList>

        <TabsContent value="score" className="mt-4">
          <ScorePanel
            assessment={assessment}
            intake={intake}
            framework={framework}
            industrySlug={industrySlug}
          />
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          {completeness && (
            <ReportTab
              assessmentId={assessmentId}
              completeness={completeness}
              onNavigatePhase={(id) => setActivePhase(id as IntakePhaseId)}
            />
          )}
        </TabsContent>

        <TabsContent value="evolution" className="mt-4">
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Comparación histórica de diagnósticos — disponible en Sprint 3.
          </div>
        </TabsContent>
      </Tabs>

      {assessment.status !== "completed" && (
        <div className="flex justify-end border-t border-border/80 pt-4">
          <Button
            variant="outline"
            onClick={handleComplete}
            disabled={completeAssessment.isPending}
          >
            <CheckCircle className="h-4 w-4" />
            Completar diagnóstico
          </Button>
        </div>
      )}
    </div>
  );
}
