import type {
  AnalysisStatus,
  Company,
  CompanyAnalysis,
  CompanyAnalysisResponse,
  ContactStatus,
  DashboardMetrics,
  PaginatedResponse,
  PresalesBriefing,
  ProcessingStatus,
  ScrapingStats,
  User,
} from "@/types";

type BackendUser = {
  id: string;
  email: string;
  name: string | null;
  role?: string;
  createdAt: string;
  updatedAt?: string;
};

type BackendCompany = {
  id: string;
  name: string;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  phone?: string | null;
  email?: string | null;
  estimatedSize?: string | null;
  aiStatus?: string | null;
  outreachStatus?: string | null;
  score?: number | null;
  aiSummary?: string | null;
  aiOpportunities?: string | null;
  painPoints?: string | null;
  idealSolution?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type BackendCompanyList = {
  items: BackendCompany[];
  total: number;
  take: number;
  skip: number;
};

type BackendScrapingStats = {
  totals: { imported: number; duplicated: number; failed: number };
  byIndustry: { industry: string; count: number }[];
  pendingAi: number;
};

export function mapUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0],
    createdAt: user.createdAt,
  };
}

function mapAnalysisStatus(status?: string | null): AnalysisStatus {
  if (status === "completed" || status === "analyzing" || status === "failed") {
    return status;
  }
  return "pending";
}

function mapContactStatus(status?: string | null): ContactStatus {
  const valid: ContactStatus[] = [
    "not_contacted",
    "contacted",
    "in_progress",
    "converted",
    "rejected",
  ];
  if (status && valid.includes(status as ContactStatus)) {
    return status as ContactStatus;
  }
  return "not_contacted";
}

export function mapCompany(company: BackendCompany): Company {
  const analysisStatus = mapAnalysisStatus(company.aiStatus);
  const processingStatus: ProcessingStatus =
    analysisStatus === "failed"
      ? "failed"
      : analysisStatus === "analyzing"
        ? "processing"
        : analysisStatus === "completed"
          ? "completed"
          : "pending";

  return {
    id: company.id,
    name: company.name,
    industry: company.industry ?? "—",
    city: company.city ?? "—",
    country: company.country ?? undefined,
    website: company.website ?? undefined,
    socialMedia: {
      linkedin: company.linkedin ?? undefined,
      instagram: company.instagram ?? undefined,
    },
    analysisStatus,
    processingStatus,
    contactStatus: mapContactStatus(company.outreachStatus),
    aiScore: company.score ?? undefined,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    contacts: {
      phones: company.phone ? [company.phone] : [],
      emails: company.email ? [company.email] : [],
      linkedin: company.linkedin ?? undefined,
      instagram: company.instagram ?? undefined,
    },
    analysis: company.aiSummary
      ? {
          summary: company.aiSummary,
          problems: company.painPoints
            ? company.painPoints.split("\n").filter(Boolean)
            : [],
          opportunities: company.aiOpportunities
            ? company.aiOpportunities.split("\n").filter(Boolean)
            : [],
          commercialPotential: company.score ?? 0,
          priority: (company.score ?? 0) >= 70 ? "high" : (company.score ?? 0) >= 40 ? "medium" : "low",
          estimatedSize:
            company.estimatedSize === "large"
              ? "large"
              : company.estimatedSize === "medium"
                ? "medium"
                : "small",
          recommendation: company.idealSolution ?? "",
        }
      : undefined,
    error: analysisStatus === "failed" ? "Error en análisis IA" : undefined,
  };
}

export function mapCompanyList(
  result: BackendCompanyList,
  page: number,
  limit: number
): PaginatedResponse<Company> {
  return {
    data: result.items.map(mapCompany),
    total: result.total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(result.total / limit)),
  };
}

export function mapScrapingStats(stats: BackendScrapingStats): ScrapingStats {
  const total = stats.totals.imported;
  const failed = stats.totals.failed;
  const pending = stats.pendingAi;
  const analyzed = Math.max(0, total - pending - failed);

  return {
    pending,
    processing: 0,
    analyzed,
    failed,
    total,
    queue: [],
  };
}

export function mapDashboardMetrics(
  stats: BackendScrapingStats,
  companies: Company[]
): DashboardMetrics {
  const analyzed = companies.filter((c) => c.analysisStatus === "completed").length;
  const pending = companies.filter((c) => c.analysisStatus === "pending").length;
  const failed = companies.filter((c) => c.analysisStatus === "failed").length;
  const withContact = companies.filter((c) => c.contactStatus !== "not_contacted").length;

  const cityMap = new Map<string, number>();
  for (const c of companies) {
    if (c.city && c.city !== "—") {
      cityMap.set(c.city, (cityMap.get(c.city) ?? 0) + 1);
    }
  }

  const scores = companies.map((c) => c.aiScore ?? 0).filter((s) => s > 0);

  return {
    totalCompanies: companies.length || stats.totals.imported,
    analyzed,
    pending: pending || stats.pendingAi,
    failed,
    withContact,
    withoutContact: companies.length - withContact,
    averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    topIndustries: stats.byIndustry.map((i) => ({ name: i.industry, count: i.count })),
    topCities: Array.from(cityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topPotential: [...companies]
      .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
      .slice(0, 5),
  };
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split("\n").filter(Boolean);
  return [];
}

function scoreToPriority(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function mapPresalesBriefing(raw: Record<string, unknown>): PresalesBriefing {
  const ticket = (raw.estimatedTicket ?? {}) as Record<string, unknown>;
  const decisionMaker = (raw.likelyDecisionMaker ?? {}) as Record<string, unknown>;

  return {
    summary: String(raw.summary ?? ""),
    businessProblem: String(raw.businessProblem ?? ""),
    proposedSolution: String(raw.proposedSolution ?? raw.recommendedService ?? ""),
    painPoints: asStringArray(raw.painPoints),
    opportunities: asStringArray(raw.opportunities),
    likelyDecisionMaker: {
      role: String(decisionMaker.role ?? "Por confirmar"),
      rationale: String(decisionMaker.rationale ?? ""),
    },
    publicEvidence: Array.isArray(raw.publicEvidence)
      ? raw.publicEvidence.map((item) => {
          const e = item as Record<string, unknown>;
          return {
            evidence: String(e.evidence ?? ""),
            source: e.source ? String(e.source) : undefined,
          };
        })
      : [],
    conversationStarter: String(raw.conversationStarter ?? ""),
    conversionProbability: Number(raw.conversionProbability ?? 0),
    estimatedTicket: {
      minUsd: Number(ticket.minUsd ?? 0),
      maxUsd: Number(ticket.maxUsd ?? 0),
      currency: String(ticket.currency ?? "USD"),
      rationale: String(ticket.rationale ?? ""),
    },
    recommendedServices: Array.isArray(raw.recommendedServices)
      ? raw.recommendedServices.map((item) => {
          const s = item as Record<string, unknown>;
          const priority = s.priority as PresalesBriefing["recommendedServices"][0]["priority"];
          return {
            service: String(s.service ?? ""),
            fit: String(s.fit ?? ""),
            priority: priority === "secondary" || priority === "optional" ? priority : "primary",
          };
        })
      : [],
    recommendedService: String(raw.recommendedService ?? ""),
    likelyObjections: Array.isArray(raw.likelyObjections)
      ? raw.likelyObjections.map((item) => {
          const o = item as Record<string, unknown>;
          return {
            objection: String(o.objection ?? ""),
            response: String(o.response ?? ""),
          };
        })
      : [],
    firstConversationTopic: String(raw.firstConversationTopic ?? ""),
    estimatedImpact: String(raw.estimatedImpact ?? ""),
    commercialPriority: Number(raw.commercialPriority ?? 0),
    score: Number(raw.score ?? 0),
    reasoning: String(raw.reasoning ?? ""),
  };
}

export function mapCompanyAnalysisResponse(
  raw: Record<string, unknown>
): CompanyAnalysisResponse {
  const briefingRaw = (raw.briefing ?? raw.analysis) as Record<string, unknown> | null;
  const meta = (raw.meta ?? {}) as Record<string, unknown>;
  const company = (raw.company ?? {}) as Record<string, unknown>;

  const briefing = briefingRaw ? mapPresalesBriefing(briefingRaw) : null;

  return {
    company: {
      id: String(company.id ?? ""),
      name: String(company.name ?? ""),
      industry: company.industry != null ? String(company.industry) : null,
      website: company.website != null ? String(company.website) : null,
      aiStatus: company.aiStatus != null ? String(company.aiStatus) : null,
      score: company.score != null ? Number(company.score) : null,
      idealSolution: company.idealSolution != null ? String(company.idealSolution) : null,
      painPoints: company.painPoints != null ? String(company.painPoints) : null,
      lastContactAt: company.lastContactAt != null ? String(company.lastContactAt) : null,
    },
    briefing,
    analysis: briefing,
    outreachMessage: raw.outreachMessage != null ? String(raw.outreachMessage) : null,
    meta: {
      analyzedAt: meta.analyzedAt != null ? String(meta.analyzedAt) : null,
      modelName: meta.modelName != null ? String(meta.modelName) : null,
    },
  };
}

/** Compatibilidad con shape plano / legacy */
export function mapCompanyAnalysis(raw: Record<string, unknown>): CompanyAnalysis {
  if (raw.briefing || raw.businessProblem) {
    const briefing = mapPresalesBriefing((raw.briefing ?? raw) as Record<string, unknown>);
    return {
      summary: briefing.summary,
      problems: briefing.painPoints,
      opportunities: briefing.opportunities,
      commercialPotential: briefing.score,
      priority: scoreToPriority(briefing.score),
      estimatedSize: "medium",
      recommendation: briefing.proposedSolution,
      analyzedAt: undefined,
    };
  }

  const result = (raw.analysisResult ?? raw) as Record<string, unknown>;
  const score = Number(result.score ?? raw.score ?? 0);

  return {
    summary: String(result.summary ?? raw.aiSummary ?? ""),
    problems: asStringArray(result.problems ?? result.painPoints ?? raw.painPoints),
    opportunities: asStringArray(result.opportunities ?? raw.aiOpportunities),
    commercialPotential: score,
    priority: scoreToPriority(score),
    estimatedSize:
      result.estimatedSize === "large" || result.estimatedSize === "medium"
        ? result.estimatedSize
        : "small",
    recommendation: String(
      result.recommendation ?? result.proposedSolution ?? raw.idealSolution ?? ""
    ),
    analyzedAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}
