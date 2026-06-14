"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntakeCompletenessBar } from "@/components/assessments/intake/IntakeCompletenessBar";
import { ReportModeSelector } from "@/components/assessments/report/ReportModeSelector";
import { ReportPipelineStepper } from "@/components/assessments/report/ReportPipelineStepper";
import { ReportSectionEditor } from "@/components/assessments/report/ReportSectionEditor";
import { ReportVersionHistory } from "@/components/assessments/report/ReportVersionHistory";
import { ReportHtmlPreview } from "@/components/assessments/report/ReportHtmlPreview";
import { ReportPdfDownload } from "@/components/assessments/report/ReportPdfDownload";
import {
  useCurrentReport,
  useGenerateReport,
  usePatchReport,
  useReport,
  useReportList,
} from "@/hooks/useReport";
import type {
  ApiValidationError,
  IntakeCompleteness,
  PipelineStageId,
  ReportMode,
} from "@/types/assessment";
import { PIPELINE_STAGES } from "@/components/assessments/constants";
import { toast } from "sonner";
import axios from "axios";

interface ReportTabProps {
  assessmentId: string;
  completeness: IntakeCompleteness;
  onNavigatePhase?: (phaseId: string) => void;
}

export function ReportTab({ assessmentId, completeness }: ReportTabProps) {
  const [mode, setMode] = useState<ReportMode>("hybrid");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [activeStage, setActiveStage] = useState<PipelineStageId | null>(null);
  const [completedStages, setCompletedStages] = useState<PipelineStageId[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const { data: reportList } = useReportList(assessmentId);
  const { data: currentReport } = useCurrentReport(assessmentId);
  const generateReport = useGenerateReport(assessmentId);

  const activeId = selectedReportId ?? currentReport?.id ?? reportList?.[0]?.id ?? null;
  const { data: reportDetail } = useReport(assessmentId, activeId);
  const patchReport = usePatchReport(assessmentId, activeId ?? "");

  useEffect(() => {
    if (!selectedReportId && currentReport?.id) {
      setSelectedReportId(currentReport.id);
    }
  }, [currentReport?.id, selectedReportId]);

  const simulatePipeline = useCallback(async (reportMode: ReportMode) => {
    setPipelineRunning(true);
    setCompletedStages([]);
    const stages = PIPELINE_STAGES.map((s) => s.id);
    const skipAi = reportMode === "deterministic";

    for (const stageId of stages) {
      if (stageId === "generate_ai_narratives" && skipAi) {
        setCompletedStages((prev) => [...prev, stageId]);
        continue;
      }
      setActiveStage(stageId);
      const delay = stageId === "generate_ai_narratives" ? 800 : 300;
      await new Promise((r) => setTimeout(r, delay));
      setCompletedStages((prev) => [...prev, stageId]);
    }
    setActiveStage(null);
    setPipelineRunning(false);
  }, []);

  const handleGenerate = async () => {
    if (!completeness.readyForReport) {
      toast.error("Formulario incompleto — completa al menos 55%");
      return;
    }

    setPipelineRunning(true);
    setCompletedStages([]);
    setActiveStage("collect_context");

    try {
      const result = await generateReport.mutateAsync({ mode });
      if (result.pipeline?.stages) {
        for (const stage of result.pipeline.stages) {
          if (stage.status === "done" || stage.status === "skipped") {
            setCompletedStages((prev) => [...prev, stage.id]);
          }
        }
      } else {
        await simulatePipeline(mode);
      }
      setSelectedReportId(result.report.id);
      toast.success(`Informe v${result.report.version} generado`);
    } catch (err) {
      setPipelineRunning(false);
      setActiveStage(null);

      if (axios.isAxiosError(err) && err.response?.data) {
        const payload = err.response.data as { error?: ApiValidationError };
        if (payload.error?.code === "VALIDATION_ERROR") {
          toast.error(payload.error.message);
          return;
        }
        if (err.response.status === 503) {
          toast.error("IA no disponible — intenta mode deterministic");
          return;
        }
      }
      toast.error("Error al generar informe");
    }
  };

  const isReadOnly = reportDetail?.status === "approved";
  const canGenerate = completeness.readyForReport && !pipelineRunning;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generar informe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <IntakeCompletenessBar completeness={completeness} compact />

          <ReportModeSelector
            value={mode}
            onChange={setMode}
            readyForAiNarratives={completeness.readyForAiNarratives}
          />

          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || generateReport.isPending}
          >
            {(generateReport.isPending || pipelineRunning) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Generar informe
            {reportList && reportList.length > 0 && (
              <span className="text-primary-foreground/80">
                v{(Math.max(...reportList.map((r) => r.version)) + 1)}
              </span>
            )}
          </Button>

          {!completeness.readyForReport && (
            <p className="text-xs text-warning">
              Bloqueado: completitud {completeness.percent}% (&lt;55% requerido)
            </p>
          )}

          {(pipelineRunning || completedStages.length > 0) && (
            <ReportPipelineStepper
              activeStageId={activeStage}
              mode={mode}
              isRunning={pipelineRunning}
              completedStages={completedStages}
            />
          )}
        </CardContent>
      </Card>

      {reportList && reportList.length > 0 && (
        <ReportVersionHistory
          reports={reportList}
          activeReportId={activeId ?? undefined}
          onSelect={setSelectedReportId}
        />
      )}

      {reportDetail && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              Informe v{reportDetail.version}
              {isReadOnly && (
                <span className="ml-2 text-xs text-muted-foreground">(solo lectura)</span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Ocultar preview" : "Preview HTML"}
              </Button>
              {activeId && (
                <ReportPdfDownload assessmentId={assessmentId} reportId={activeId} />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showPreview && activeId && (
              <ReportHtmlPreview assessmentId={assessmentId} reportId={activeId} />
            )}

            <ReportSectionEditor
              reportData={reportDetail.reportData}
              disabled={isReadOnly || patchReport.isPending}
              onPatch={(key, value) => {
                patchReport.mutate({ [key]: value });
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
