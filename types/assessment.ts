// ─── Assessment core ───

export type AssessmentStatus = "draft" | "in_progress" | "completed";

export interface Assessment {
  id: string;
  companyId: string;
  companyName?: string;
  status: AssessmentStatus;
  chilsmartScore?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateAssessmentPayload {
  companyId: string;
}

// ─── Framework ───

export interface FrameworkSubcategory {
  id: string;
  label: string;
  criteria: string[];
}

export interface FrameworkCategory {
  id: string;
  label: string;
  description?: string;
  subcategories: FrameworkSubcategory[];
}

export interface AssessmentFramework {
  version: string;
  categories: FrameworkCategory[];
}

// ─── Intake ───

export type SystemType =
  | "ERP"
  | "CRM"
  | "Excel"
  | "WhatsApp"
  | "Email"
  | "Software interno"
  | "API"
  | "Otro";

export type DigitalizationLevel = "manual" | "partial" | "digital" | "automated";

export interface AssessmentIntake {
  version: "1.0.0";
  updatedAt?: string;
  general: {
    meetingDate?: string;
    workerCount?: number;
    attendees?: string[];
    decisionMakerName?: string;
    decisionMakerRole?: string;
    consultantNotes?: string;
    meetingTranscript?: string;
  };
  systems: Array<{
    name: string;
    type: SystemType;
    role: string;
    limitations?: string;
    integrationNotes?: string;
  }>;
  processes: Array<{
    name: string;
    description: string;
    owner?: string;
    tools?: string[];
    isManual: boolean;
    bottlenecks?: string;
    digitalizationLevel?: DigitalizationLevel;
  }>;
  categories: Record<
    string,
    {
      observations?: string;
      painPoints?: string[];
      strengths?: string[];
      subcategories?: Record<
        string,
        {
          score?: number;
          notes?: string;
          criteriaMet?: boolean[];
        }
      >;
    }
  >;
  informationFlow?: {
    description?: string;
    dataLossPoints?: string[];
    duplicationPoints?: string[];
    traceabilityGaps?: string[];
    manualSteps?: string[];
  };
  roadmapInputs?: {
    priorities0to30?: string[];
    priorities30to60?: string[];
    priorities60to90?: string[];
    priorities3to6?: string[];
    priorities6to12?: string[];
  };
}

export interface IntakeCompletenessBlock {
  id: string;
  label: string;
  weight: number;
  filled: boolean;
  hint: string;
}

export interface IntakeCompleteness {
  percent: number;
  readyForReport: boolean;
  readyForAiNarratives: boolean;
  blocks: IntakeCompletenessBlock[];
  missingForReport: string[];
}

export interface IntakeResponse {
  intake: AssessmentIntake;
  completeness: IntakeCompleteness;
  schemaVersion: string;
}

export type IntakePhaseId =
  | "general"
  | "systems"
  | "processes"
  | "categories"
  | "information_flow"
  | "findings"
  | "roadmap"
  | "review";

export interface IntakeSchemaPhase {
  id: IntakePhaseId;
  label: string;
  order: number;
}

export interface IntakeSchema {
  version: string;
  phases: IntakeSchemaPhase[];
}

// ─── Findings ───

export type FindingType =
  | "problem"
  | "quick_win"
  | "risk"
  | "process"
  | "recommendation";

export interface Finding {
  id: string;
  type: FindingType;
  title: string;
  description?: string;
  category?: string;
  severity?: "low" | "medium" | "high";
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFindingPayload {
  type: FindingType;
  title: string;
  description?: string;
  category?: string;
  severity?: "low" | "medium" | "high";
}

// ─── Report ───

export type ReportMode = "deterministic" | "hybrid" | "full";
export type ReportStatus = "draft" | "approved";

export interface GenerateReportBody {
  mode?: ReportMode;
}

export type PipelineStageId =
  | "collect_context"
  | "build_deterministic_sections"
  | "generate_ai_narratives"
  | "validate_consistency"
  | "enrich_benchmark_history"
  | "assemble_master_json"
  | "version_and_persist";

export interface ReportPipelineMeta {
  version: string;
  generationMode: ReportMode;
  intakeCompleteness: number;
  aiSectionsGenerated: number;
  validation: {
    errors: string[];
    warnings: string[];
    autoFixes: string[];
  };
}

export interface ReportListItem {
  id: string;
  version: number;
  status: ReportStatus;
  mode: ReportMode;
  createdAt: string;
  updatedAt?: string;
}

export interface MaturityCategory {
  id: string;
  label: string;
  score: number;
  maxScore?: number;
}

export interface ChilSmartReport {
  metadata: {
    pipeline?: ReportPipelineMeta;
    generatedAt?: string;
    [key: string]: unknown;
  };
  company: {
    name: string;
    industry?: string;
    size?: string;
    workerCount?: number;
    systemsUsed?: string[];
    summary?: string;
  };
  executiveSummary: {
    overview?: string;
    mainChallenges?: string[];
    mainRisks?: string[];
    topOpportunity?: string;
    chilsmartScore?: number;
  };
  overallAssessment: {
    narrative?: string;
    operationalMaturity?: string;
    technologicalMaturity?: string;
    [key: string]: unknown;
  };
  digitalMaturity: {
    overallScore?: number;
    categories: MaturityCategory[];
    summary?: string;
  };
  strengths: Array<{ title: string; description?: string }>;
  weaknesses: Array<{ title: string; description?: string }>;
  operationalRisks: Array<{ title: string; description?: string; severity?: string }>;
  keyFindings: Array<{ title: string; description?: string; type?: string }>;
  currentOperation: {
    narrative?: string;
    toolsUsed?: string[];
    bottlenecks?: string[];
    manualWork?: string[];
    [key: string]: unknown;
  };
  processAnalysis: Array<{ name: string; description?: string; issues?: string[] }>;
  systemsAnalysis: Array<{ name: string; role?: string; limitations?: string }>;
  informationFlow: {
    narrative?: string;
    dataLossPoints?: string[];
    duplicationPoints?: string[];
    [key: string]: unknown;
  };
  quickWins: Array<{ title: string; description?: string; effort?: string }>;
  improvementOpportunities: Array<{ title: string; description?: string }>;
  prioritizedRoadmap: {
    days0to30?: string[];
    days30to60?: string[];
    days60to90?: string[];
    months3to6?: string[];
    months6to12?: string[];
  };
  recommendedProjects: Array<{ title: string; description?: string; priority?: string }>;
  chilsmartVision: {
    narrative?: string;
    targetOperatingModel?: string;
    organizationalEvolution?: string;
    [key: string]: unknown;
  };
  estimatedImpact: {
    narrative?: string;
    confidenceLevel?: string;
    recoverableHours?: number;
    [key: string]: unknown;
  };
  nextSteps: Array<{ order: number; action: string; justification?: string; timeframe?: string }>;
  appendix: {
    assumptions?: string[];
    diagnosticLimitations?: string[];
    sourcesUsed?: string[];
    pendingQuestions?: string[];
    [key: string]: unknown;
  };
}

export interface ReportDetail {
  id: string;
  version: number;
  status: ReportStatus;
  mode: ReportMode;
  reportData: ChilSmartReport;
  createdAt: string;
  updatedAt?: string;
}

export interface GenerateReportResponse {
  report: ReportDetail;
  pipeline?: {
    stages: Array<{ id: PipelineStageId; status: "done" | "skipped" | "active" | "pending" }>;
  };
}

// ─── Knowledge ───

export interface BenchmarkData {
  industrySlug: string;
  industryLabel?: string;
  averageScore?: number;
  categoryAverages?: Record<string, number>;
  sampleSize?: number;
}

export interface KnowledgePattern {
  id: string;
  type: string;
  title: string;
  description?: string;
  frequency?: number;
}

export interface SimilarSuggestion {
  text: string;
  score?: number;
  source?: string;
}

// ─── API errors ───

export interface ApiValidationError {
  code: "VALIDATION_ERROR";
  message: string;
  details?: {
    completenessPercent?: number;
    missing?: string[];
  };
}
