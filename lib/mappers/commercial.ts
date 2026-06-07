import { mapPresalesBriefing } from "@/lib/mappers";
import type {
  CommercialFollowup,
  CommercialTrackingView,
  EffectiveBriefing,
  SellerOverrides,
} from "@/types/commercial";
import type { LikelyObjection, RecommendedService } from "@/types";

function mapRecommendedServices(value: unknown): RecommendedService[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const s = item as Record<string, unknown>;
    const priority = s.priority as RecommendedService["priority"];
    return {
      service: String(s.service ?? ""),
      fit: String(s.fit ?? ""),
      priority: priority === "secondary" || priority === "optional" ? priority : "primary",
    };
  });
}

function mapLikelyObjections(value: unknown): LikelyObjection[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      objection: String(o.objection ?? ""),
      response: String(o.response ?? ""),
    };
  });
}

function mapSellerOverrides(raw: Record<string, unknown>): SellerOverrides {
  return {
    outreachStatus: (raw.outreachStatus as SellerOverrides["outreachStatus"]) ?? null,
    businessProblem: raw.businessProblem != null ? String(raw.businessProblem) : null,
    proposedSolution: raw.proposedSolution != null ? String(raw.proposedSolution) : null,
    estimatedImpact: raw.estimatedImpact != null ? String(raw.estimatedImpact) : null,
    decisionMakerName: raw.decisionMakerName != null ? String(raw.decisionMakerName) : null,
    decisionMakerRole: raw.decisionMakerRole != null ? String(raw.decisionMakerRole) : null,
    commercialPriority: raw.commercialPriority != null ? Number(raw.commercialPriority) : null,
    conversionProbability:
      raw.conversionProbability != null ? Number(raw.conversionProbability) : null,
    ticketMinUsd: raw.ticketMinUsd != null ? Number(raw.ticketMinUsd) : null,
    ticketMaxUsd: raw.ticketMaxUsd != null ? Number(raw.ticketMaxUsd) : null,
    recommendedServices: raw.recommendedServices
      ? mapRecommendedServices(raw.recommendedServices)
      : null,
    likelyObjections: raw.likelyObjections ? mapLikelyObjections(raw.likelyObjections) : null,
    firstConversationTopic:
      raw.firstConversationTopic != null ? String(raw.firstConversationTopic) : null,
    nextAction: raw.nextAction != null ? String(raw.nextAction) : null,
    nextActionDueDate: raw.nextActionDueDate != null ? String(raw.nextActionDueDate) : null,
    internalNotes: raw.internalNotes != null ? String(raw.internalNotes) : null,
    lastContactAt: raw.lastContactAt != null ? String(raw.lastContactAt) : null,
  };
}

function mapEffective(raw: Record<string, unknown>): EffectiveBriefing {
  const ticket = (raw.estimatedTicket ?? {}) as Record<string, unknown>;
  const dm = (raw.decisionMaker ?? {}) as Record<string, unknown>;

  return {
    source: (raw.source as EffectiveBriefing["source"]) ?? "ai",
    businessProblem: raw.businessProblem != null ? String(raw.businessProblem) : null,
    proposedSolution: raw.proposedSolution != null ? String(raw.proposedSolution) : null,
    estimatedImpact: raw.estimatedImpact != null ? String(raw.estimatedImpact) : null,
    decisionMaker: {
      name: dm.name != null ? String(dm.name) : null,
      role: dm.role != null ? String(dm.role) : null,
    },
    commercialPriority: raw.commercialPriority != null ? Number(raw.commercialPriority) : null,
    conversionProbability:
      raw.conversionProbability != null ? Number(raw.conversionProbability) : null,
    estimatedTicket: {
      minUsd: ticket.minUsd != null ? Number(ticket.minUsd) : null,
      maxUsd: ticket.maxUsd != null ? Number(ticket.maxUsd) : null,
      currency: String(ticket.currency ?? "USD"),
    },
    recommendedServices: mapRecommendedServices(raw.recommendedServices),
    likelyObjections: mapLikelyObjections(raw.likelyObjections),
    firstConversationTopic:
      raw.firstConversationTopic != null ? String(raw.firstConversationTopic) : null,
  };
}

export function mapCommercialTracking(raw: Record<string, unknown>): CommercialTrackingView {
  const meta = (raw.meta ?? {}) as Record<string, unknown>;

  return {
    companyId: String(raw.companyId ?? ""),
    companyName: String(raw.companyName ?? ""),
    outreachStatus: (raw.outreachStatus as CommercialTrackingView["outreachStatus"]) ?? "not_contacted",
    aiBriefing: raw.aiBriefing
      ? mapPresalesBriefing(raw.aiBriefing as Record<string, unknown>)
      : null,
    sellerOverrides: mapSellerOverrides((raw.sellerOverrides ?? {}) as Record<string, unknown>),
    effective: mapEffective((raw.effective ?? {}) as Record<string, unknown>),
    meta: {
      lastContactAt: meta.lastContactAt != null ? String(meta.lastContactAt) : null,
      updatedAt: meta.updatedAt != null ? String(meta.updatedAt) : null,
      updatedByUserId: meta.updatedByUserId != null ? String(meta.updatedByUserId) : null,
      followupsCount: Number(meta.followupsCount ?? 0),
    },
  };
}

export function mapFollowup(raw: Record<string, unknown>): CommercialFollowup {
  return {
    id: String(raw.id ?? ""),
    companyId: String(raw.companyId ?? ""),
    userId: raw.userId != null ? String(raw.userId) : null,
    type: raw.type as CommercialFollowup["type"],
    title: raw.title != null ? String(raw.title) : null,
    content: String(raw.content ?? ""),
    fieldUpdates: (raw.fieldUpdates as Record<string, unknown>) ?? null,
    createdAt: String(raw.createdAt ?? ""),
  };
}

export function hasSellerOverrides(overrides: SellerOverrides): boolean {
  return Object.entries(overrides).some(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );
}
