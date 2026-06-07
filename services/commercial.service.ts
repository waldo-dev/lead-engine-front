import { api } from "@/lib/api";
import { mapCommercialTracking, mapFollowup } from "@/lib/mappers/commercial";
import type {
  CommercialFollowup,
  CommercialTrackingView,
  CreateFollowupPayload,
  UpdateCommercialPayload,
} from "@/types/commercial";

export const commercialService = {
  async getTracking(companyId: string): Promise<CommercialTrackingView> {
    const { data } = await api.get<Record<string, unknown>>(`/commercial/${companyId}`);
    return mapCommercialTracking(data);
  },

  async updateTracking(
    companyId: string,
    payload: UpdateCommercialPayload
  ): Promise<CommercialTrackingView> {
    const { data } = await api.patch<Record<string, unknown>>(
      `/commercial/${companyId}`,
      payload
    );
    return mapCommercialTracking(data);
  },

  async getFollowups(
    companyId: string,
    params?: { take?: number; skip?: number }
  ): Promise<{ items: CommercialFollowup[]; total: number }> {
    const { data } = await api.get<{
      items?: Record<string, unknown>[];
      total?: number;
    }>(`/commercial/${companyId}/followups`, { params });

    const items = (data.items ?? []).map(mapFollowup);
    return { items, total: data.total ?? items.length };
  },

  async createFollowup(
    companyId: string,
    payload: CreateFollowupPayload
  ): Promise<{ followup: CommercialFollowup; tracking: CommercialTrackingView }> {
    const { data } = await api.post<Record<string, unknown>>(
      `/commercial/${companyId}/followups`,
      payload
    );

    return {
      followup: mapFollowup(data.followup as Record<string, unknown>),
      tracking: mapCommercialTracking(data.tracking as Record<string, unknown>),
    };
  },
};
