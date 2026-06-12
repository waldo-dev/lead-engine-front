import { api } from "@/lib/api";
import { mapCompany, mapCompanyList } from "@/lib/mappers";
import type {
  CompaniesQueryParams,
  Company,
  PaginatedResponse,
  UpdateCompanyPayload,
} from "@/types";

export const companyService = {
  async getAll(params?: CompaniesQueryParams): Promise<PaginatedResponse<Company>> {
    const limit = params?.limit ?? 25;
    const page = params?.page ?? 1;

    const { data } = await api.get<{
      items: Parameters<typeof mapCompany>[0][];
      total: number;
      take: number;
      skip: number;
    }>("/companies", {
      params: {
        q: params?.search || undefined,
        take: limit,
        skip: (page - 1) * limit,
        onlyBanned: params?.onlyBanned || undefined,
        includeBanned: params?.includeBanned || undefined,
      },
    });

    let mapped = mapCompanyList(data, page, limit);

    if (params?.analysisStatus) {
      mapped = {
        ...mapped,
        data: mapped.data.filter((c) => c.analysisStatus === params.analysisStatus),
      };
    }
    if (params?.processingStatus) {
      mapped = {
        ...mapped,
        data: mapped.data.filter((c) => c.processingStatus === params.processingStatus),
      };
    }
    if (params?.contactStatus) {
      mapped = {
        ...mapped,
        data: mapped.data.filter((c) => c.contactStatus === params.contactStatus),
      };
    }

    return mapped;
  },

  async getById(id: string): Promise<Company> {
    const { data } = await api.get<Parameters<typeof mapCompany>[0]>(`/companies/${id}`);
    return mapCompany(data);
  },

  async create(company: Partial<Company>): Promise<Company> {
    const { data } = await api.post<Parameters<typeof mapCompany>[0]>("/companies", company);
    return mapCompany(data);
  },

  async update(id: string, payload: UpdateCompanyPayload): Promise<Company> {
    const body: Record<string, unknown> = {};
    if (payload.contactStatus) body.outreachStatus = payload.contactStatus;
    if (payload.notes) body.painPoints = payload.notes;
    if (payload.idealSolution) body.idealSolution = payload.idealSolution;
    if (payload.lastContactAt) body.lastContactAt = payload.lastContactAt;

    const { data } = await api.patch<Parameters<typeof mapCompany>[0]>(`/companies/${id}`, body);
    return mapCompany(data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/companies/${id}`);
  },

  async ban(id: string, reason?: string): Promise<Company> {
    const { data } = await api.post<{ company: Parameters<typeof mapCompany>[0] }>(
      `/companies/${id}/ban`,
      { reason: reason || undefined },
    );
    return mapCompany(data.company);
  },

  async unban(id: string): Promise<Company> {
    const { data } = await api.post<{ company: Parameters<typeof mapCompany>[0] }>(
      `/companies/${id}/unban`,
    );
    return mapCompany(data.company);
  },
};
