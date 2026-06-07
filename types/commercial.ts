import type {
  ContactStatus,
  LikelyObjection,
  PresalesBriefing,
  RecommendedService,
} from "@/types";

export type FollowupType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "whatsapp"
  | "discovery_update"
  | "status_change";

export type EffectiveSource = "seller" | "ai" | "mixed";

export interface SellerOverrides {
  outreachStatus: ContactStatus | null;
  businessProblem: string | null;
  proposedSolution: string | null;
  estimatedImpact: string | null;
  decisionMakerName: string | null;
  decisionMakerRole: string | null;
  commercialPriority: number | null;
  conversionProbability: number | null;
  ticketMinUsd: number | null;
  ticketMaxUsd: number | null;
  recommendedServices: RecommendedService[] | null;
  likelyObjections: LikelyObjection[] | null;
  firstConversationTopic: string | null;
  nextAction: string | null;
  nextActionDueDate: string | null;
  internalNotes: string | null;
  lastContactAt: string | null;
}

export interface EffectiveBriefing {
  source: EffectiveSource;
  businessProblem: string | null;
  proposedSolution: string | null;
  estimatedImpact: string | null;
  decisionMaker: { name: string | null; role: string | null };
  commercialPriority: number | null;
  conversionProbability: number | null;
  estimatedTicket: { minUsd: number | null; maxUsd: number | null; currency: string };
  recommendedServices: RecommendedService[];
  likelyObjections: LikelyObjection[];
  firstConversationTopic: string | null;
}

export interface CommercialMeta {
  lastContactAt: string | null;
  updatedAt: string | null;
  updatedByUserId: string | null;
  followupsCount: number;
}

export interface CommercialTrackingView {
  companyId: string;
  companyName: string;
  outreachStatus: ContactStatus;
  aiBriefing: PresalesBriefing | null;
  sellerOverrides: SellerOverrides;
  effective: EffectiveBriefing;
  meta: CommercialMeta;
}

export interface CommercialFollowup {
  id: string;
  companyId: string;
  userId: string | null;
  type: FollowupType;
  title: string | null;
  content: string;
  fieldUpdates: Record<string, unknown> | null;
  createdAt: string;
}

export interface UpdateCommercialPayload {
  outreachStatus?: ContactStatus;
  businessProblem?: string | null;
  proposedSolution?: string | null;
  estimatedImpact?: string | null;
  decisionMakerName?: string | null;
  decisionMakerRole?: string | null;
  commercialPriority?: number | null;
  conversionProbability?: number | null;
  ticketMinUsd?: number | null;
  ticketMaxUsd?: number | null;
  recommendedServices?: RecommendedService[] | null;
  likelyObjections?: LikelyObjection[] | null;
  firstConversationTopic?: string | null;
  nextAction?: string | null;
  nextActionDueDate?: string | null;
  internalNotes?: string | null;
  lastContactAt?: string | null;
}

export interface CreateFollowupPayload {
  type: FollowupType;
  title?: string;
  content: string;
  updates?: UpdateCommercialPayload;
}
