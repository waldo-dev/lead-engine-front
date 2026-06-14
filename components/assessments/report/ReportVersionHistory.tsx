"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ReportListItem } from "@/types/assessment";
import { formatDateTime } from "@/lib/utils";

interface ReportVersionHistoryProps {
  reports: ReportListItem[];
  activeReportId?: string;
  onSelect: (reportId: string) => void;
}

export function ReportVersionHistory({
  reports,
  activeReportId,
  onSelect,
}: ReportVersionHistoryProps) {
  const sorted = [...reports].sort((a, b) => b.version - a.version);

  if (sorted.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((r) => {
        const isActive = r.id === activeReportId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted/50",
            )}
          >
            <span className="font-medium">v{r.version}</span>
            <Badge
              variant={r.status === "approved" ? "success" : "secondary"}
              className="text-[10px]"
            >
              {r.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(r.createdAt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
