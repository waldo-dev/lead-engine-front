import type { IntakePhaseId } from "@/types/assessment";

export const DEFAULT_INTAKE_PHASES: Array<{ id: IntakePhaseId; label: string; order: number }> = [
  { id: "general", label: "Contexto", order: 1 },
  { id: "systems", label: "Herramientas", order: 2 },
  { id: "processes", label: "Procesos", order: 3 },
  { id: "categories", label: "Áreas", order: 4 },
  { id: "information_flow", label: "Flujo de datos", order: 5 },
  { id: "findings", label: "Hallazgos", order: 6 },
  { id: "roadmap", label: "Prioridades", order: 7 },
  { id: "review", label: "Revisión", order: 8 },
];

export const BLOCK_TO_PHASE: Record<string, IntakePhaseId> = {
  general_context: "general",
  general: "general",
  systems: "systems",
  processes: "processes",
  categories: "categories",
  information_flow: "information_flow",
  findings: "findings",
  roadmap: "roadmap",
  review: "review",
};

export const SYSTEM_TYPES = [
  "ERP",
  "CRM",
  "Excel",
  "WhatsApp",
  "Email",
  "Software interno",
  "API",
  "Otro",
] as const;

export const DIGITALIZATION_LEVELS = [
  { value: "manual", label: "Manual" },
  { value: "partial", label: "Parcial" },
  { value: "digital", label: "Digital" },
  { value: "automated", label: "Automatizado" },
] as const;

export const REPORT_MODES = [
  {
    value: "deterministic" as const,
    label: "Determinístico",
    aiCalls: 0,
    description: "0 llamadas IA — informe rápido desde formulario",
  },
  {
    value: "hybrid" as const,
    label: "Híbrido",
    aiCalls: 5,
    description: "5 narrativas IA — calidad consultiva optimizada",
    default: true,
  },
  {
    value: "full" as const,
    label: "Completo",
    aiCalls: 19,
    description: "19 secciones IA — solo si se necesita máximo detalle",
  },
];

export const PIPELINE_STAGES = [
  { id: "collect_context", label: "Recolectando contexto", usesAi: false },
  { id: "build_deterministic_sections", label: "Construyendo desde formulario", usesAi: false },
  { id: "generate_ai_narratives", label: "Redactando narrativas", usesAi: true },
  { id: "validate_consistency", label: "Validando consistencia", usesAi: false },
  { id: "enrich_benchmark_history", label: "Benchmark + historial", usesAi: false },
  { id: "assemble_master_json", label: "Ensamblando informe", usesAi: false },
  { id: "version_and_persist", label: "Guardando versión", usesAi: false },
] as const;

export const REPORT_SECTIONS = [
  { key: "executiveSummary", label: "Resumen ejecutivo" },
  { key: "overallAssessment", label: "Evaluación general" },
  { key: "digitalMaturity", label: "Madurez digital" },
  { key: "strengths", label: "Fortalezas" },
  { key: "weaknesses", label: "Debilidades" },
  { key: "operationalRisks", label: "Riesgos operacionales" },
  { key: "keyFindings", label: "Hallazgos clave" },
  { key: "currentOperation", label: "Operación actual" },
  { key: "processAnalysis", label: "Análisis de procesos" },
  { key: "systemsAnalysis", label: "Análisis de sistemas" },
  { key: "informationFlow", label: "Flujo de información" },
  { key: "quickWins", label: "Quick wins" },
  { key: "improvementOpportunities", label: "Oportunidades" },
  { key: "prioritizedRoadmap", label: "Roadmap" },
  { key: "recommendedProjects", label: "Proyectos recomendados" },
  { key: "chilsmartVision", label: "Visión ChilSmart" },
  { key: "estimatedImpact", label: "Impacto estimado" },
  { key: "nextSteps", label: "Próximos pasos" },
  { key: "appendix", label: "Apéndice" },
] as const;
