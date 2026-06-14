export type GanttTaskStatus = "Completado" | "Pendiente" | "Hito";
export type GanttFormat = "png" | "pdf" | "html";

export interface GanttTaskWithDates {
  name: string;
  startDate: string;
  endDate: string;
  status?: GanttTaskStatus;
}

export interface GanttTaskWithBusinessDays {
  name: string;
  businessDays: number;
  status?: GanttTaskStatus;
}

export interface GanttGeneratePayload {
  title: string;
  notes?: string;
  format?: GanttFormat;
  tasks: GanttTaskWithDates[];
}

export interface GanttPlanPayload {
  title: string;
  notes?: string;
  startDate: string;
  overlapLastDay?: boolean;
  format?: GanttFormat;
  tasks: GanttTaskWithBusinessDays[];
}

export interface GanttExamplePayload {
  title: string;
  notes?: string;
  tasks: GanttTaskWithDates[];
}

export type GanttMode = "manual" | "plan";

export const GANTT_STATUSES: GanttTaskStatus[] = ["Pendiente", "Completado", "Hito"];
export const GANTT_FORMATS: GanttFormat[] = ["png", "pdf", "html"];
