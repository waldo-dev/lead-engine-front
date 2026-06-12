import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "success" | "warning" | "info" | "destructive";

const toneStyles: Record<StatTone, string> = {
  default: "bg-accent text-primary",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  info: "bg-info-muted text-info",
  destructive: "bg-destructive/10 text-destructive",
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: StatTone;
  hint?: string;
  iconSpin?: boolean;
}

export function StatCard({ label, value, icon: Icon, tone = "default", hint, iconSpin }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11",
            toneStyles[tone],
          )}
        >
          <Icon className={cn("h-5 w-5", iconSpin && "animate-spin")} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
