import { api } from "@/lib/api";
import type {
  GanttExamplePayload,
  GanttFormat,
  GanttGeneratePayload,
  GanttPlanPayload,
} from "@/types/gantt";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5008").replace(/\/$/, "");

export interface GanttChartResult {
  blob: Blob;
  format: GanttFormat;
}

async function fetchGanttChart(
  path: string,
  body: GanttGeneratePayload | GanttPlanPayload,
): Promise<GanttChartResult> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const format = body.format ?? "png";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Error al generar carta Gantt (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.error?.message) message = payload.error.message;
    } catch {
      // respuesta no JSON
    }
    throw new Error(message);
  }

  return { blob: await response.blob(), format };
}

export const ganttService = {
  async getExample(): Promise<GanttExamplePayload> {
    const { data } = await api.get<GanttExamplePayload>("/gantt/example");
    return data;
  },

  async generate(payload: GanttGeneratePayload): Promise<GanttChartResult> {
    return fetchGanttChart("/gantt/generate", payload);
  },

  async plan(payload: GanttPlanPayload): Promise<GanttChartResult> {
    return fetchGanttChart("/gantt/plan", payload);
  },
};
