"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { GanttBuilder } from "@/components/gantt/GanttBuilder";

export default function GanttPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Carta Gantt"
        description="Crea y exporta cartas Gantt con fechas manuales o planificación por días hábiles"
      />
      <GanttBuilder />
    </div>
  );
}
