export type AnalysisStatus = "pending" | "analyzing" | "completed" | "failed";
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";
export type ContactStatus = "not_contacted" | "contacted" | "in_progress" | "converted" | "rejected";
export type Priority = "high" | "medium" | "low";
export type CompanySize = "small" | "medium" | "large";
export type ServicePriority = "primary" | "secondary" | "optional";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CompanyContact {
  phones: string[];
  emails: string[];
  linkedin?: string;
  facebook?: string;
  instagram?: string;
}

export interface LikelyDecisionMaker {
  role: string;
  rationale: string;
}

export interface EstimatedTicket {
  minUsd: number;
  maxUsd: number;
  currency: string;
  rationale: string;
}

export interface RecommendedService {
  service: string;
  fit: string;
  priority: ServicePriority;
}

export interface LikelyObjection {
  objection: string;
  response: string;
}

export interface PublicEvidence {
  evidence: string;
  source?: string;
}

/** Briefing completo del Consultor IA de preventa */
export interface PresalesBriefing {
  summary: string;
  businessProblem: string;
  proposedSolution: string;
  painPoints: string[];
  opportunities: string[];
  likelyDecisionMaker: LikelyDecisionMaker;
  publicEvidence: PublicEvidence[];
  conversationStarter: string;
  conversionProbability: number;
  estimatedTicket: EstimatedTicket;
  recommendedServices: RecommendedService[];
  recommendedService: string;
  likelyObjections: LikelyObjection[];
  firstConversationTopic: string;
  estimatedImpact: string;
  commercialPriority: number;
  score: number;
  reasoning: string;
}

export interface AnalysisMeta {
  analyzedAt: string | null;
  modelName: string | null;
}

export interface CompanyAnalysisResponse {
  company: {
    id: string;
    name: string;
    industry: string | null;
    website: string | null;
    aiStatus: string | null;
    score: number | null;
    idealSolution: string | null;
    painPoints: string | null;
    lastContactAt: string | null;
  };
  briefing: PresalesBriefing | null;
  analysis: PresalesBriefing | null;
  outreachMessage: string | null;
  meta: AnalysisMeta;
}

/** @deprecated Usar PresalesBriefing — mantenido para compatibilidad en listados */
export interface CompanyAnalysis {
  summary: string;
  problems: string[];
  opportunities: string[];
  commercialPotential: number;
  priority: Priority;
  estimatedSize: CompanySize;
  recommendation: string;
  analyzedAt?: string;
}

export interface CompanyHistory {
  scrapedAt?: string;
  analyzedAt?: string;
  reprocessedAt?: string;
  notes?: string;
  commercialStatus?: ContactStatus;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  city: string;
  country?: string;
  address?: string;
  website?: string;
  socialMedia?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  analysisStatus: AnalysisStatus;
  processingStatus: ProcessingStatus;
  contactStatus: ContactStatus;
  aiScore?: number;
  createdAt: string;
  updatedAt?: string;
  contacts?: CompanyContact;
  analysis?: CompanyAnalysis;
  history?: CompanyHistory;
  error?: string;
  errorReason?: string;
  lastAttemptAt?: string;
}

export interface CompaniesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  analysisStatus?: AnalysisStatus;
  processingStatus?: ProcessingStatus;
  contactStatus?: ContactStatus;
  industry?: string;
  city?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  minScore?: number;
  maxScore?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScrapingStats {
  pending: number;
  processing: number;
  analyzed: number;
  failed: number;
  total: number;
  queue: QueueItem[];
}

export interface QueueItem {
  id: string;
  companyId: string;
  companyName: string;
  status: ProcessingStatus;
  startedAt?: string;
  position: number;
}

export interface DashboardMetrics {
  totalCompanies: number;
  analyzed: number;
  pending: number;
  failed: number;
  withContact: number;
  withoutContact: number;
  averageScore: number;
  topIndustries: { name: string; count: number }[];
  topCities: { name: string; count: number }[];
  topPotential: Company[];
}

export interface UpdateCompanyPayload {
  contactStatus?: ContactStatus;
  notes?: string;
  idealSolution?: string;
  lastContactAt?: string;
  commercialStatus?: ContactStatus;
}

export interface OutreachMessageResult {
  messageId: string;
  channel: string;
  subject?: string;
  message: string;
  html?: string;
  reasoning?: string;
}
