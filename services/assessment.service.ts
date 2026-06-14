import { api } from "@/lib/api";
import type {
  Assessment,
  AssessmentFramework,
  AssessmentIntake,
  CreateAssessmentPayload,
  CreateFindingPayload,
  Finding,
  GenerateReportBody,
  GenerateReportResponse,
  IntakeResponse,
  IntakeSchema,
  ReportDetail,
  ReportListItem,
} from "@/types/assessment";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5008").replace(/\/$/, "");

export const assessmentService = {
  async getFramework(): Promise<AssessmentFramework> {
    const { data } = await api.get<AssessmentFramework>("/assessments/framework");
    return data;
  },

  async list(companyId?: string): Promise<Assessment[]> {
    const { data } = await api.get<Assessment[]>("/assessments", {
      params: companyId ? { companyId } : undefined,
    });
    return data;
  },

  async create(payload: CreateAssessmentPayload): Promise<Assessment> {
    const { data } = await api.post<Assessment>("/assessments", payload);
    return data;
  },

  async getById(id: string): Promise<Assessment> {
    const { data } = await api.get<Assessment>(`/assessments/${id}`);
    return data;
  },

  async update(id: string, payload: Partial<Assessment>): Promise<Assessment> {
    const { data } = await api.patch<Assessment>(`/assessments/${id}`, payload);
    return data;
  },

  async complete(id: string): Promise<Assessment> {
    const { data } = await api.post<Assessment>(`/assessments/${id}/complete`);
    return data;
  },

  async getIntakeSchema(): Promise<IntakeSchema> {
    const { data } = await api.get<IntakeSchema>("/assessments/intake/schema");
    return data;
  },

  async getIntake(id: string): Promise<IntakeResponse> {
    const { data } = await api.get<IntakeResponse>(`/assessments/${id}/intake`);
    return data;
  },

  async patchIntake(id: string, patch: Partial<AssessmentIntake>): Promise<IntakeResponse> {
    const { data } = await api.patch<IntakeResponse>(`/assessments/${id}/intake`, patch);
    return data;
  },

  async listFindings(id: string): Promise<Finding[]> {
    const { data } = await api.get<Finding[]>(`/assessments/${id}/findings`);
    return data;
  },

  async createFinding(id: string, payload: CreateFindingPayload): Promise<Finding> {
    const { data } = await api.post<Finding>(`/assessments/${id}/findings`, payload);
    return data;
  },

  async updateFinding(
    id: string,
    findingId: string,
    payload: Partial<CreateFindingPayload>,
  ): Promise<Finding> {
    const { data } = await api.patch<Finding>(
      `/assessments/${id}/findings/${findingId}`,
      payload,
    );
    return data;
  },

  async generateReport(id: string, body: GenerateReportBody): Promise<GenerateReportResponse> {
    const { data } = await api.post<GenerateReportResponse>(
      `/assessments/${id}/report/generate`,
      body,
    );
    return data;
  },

  async getCurrentReport(id: string): Promise<ReportDetail | null> {
    const { data } = await api.get<ReportDetail | null>(`/assessments/${id}/report`);
    return data;
  },

  async listReports(id: string): Promise<ReportListItem[]> {
    const { data } = await api.get<ReportListItem[]>(`/assessments/${id}/reports`);
    return data;
  },

  async getReportById(id: string, reportId: string): Promise<ReportDetail> {
    const { data } = await api.get<ReportDetail>(`/assessments/${id}/reports/${reportId}`);
    return data;
  },

  async patchReport(
    id: string,
    reportId: string,
    patch: Record<string, unknown>,
  ): Promise<ReportDetail> {
    const { data } = await api.patch<ReportDetail>(
      `/assessments/${id}/reports/${reportId}`,
      patch,
    );
    return data;
  },

  async fetchReportRender(
    assessmentId: string,
    reportId: string,
    format: "html" | "pdf",
  ): Promise<Blob> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_URL}/assessments/${assessmentId}/reports/${reportId}/render?format=${format}`;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Error al renderizar informe (${response.status})`);
    }
    return response.blob();
  },
};
