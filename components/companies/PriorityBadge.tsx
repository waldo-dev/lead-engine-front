import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { Priority } from "@/types";

const config: Record<Priority, { label: string; variant: "destructive" | "warning" | "secondary"; icon: React.ReactNode }> = {
  high: { label: "Alta", variant: "destructive", icon: <ArrowUp className="h-3 w-3" /> },
  medium: { label: "Media", variant: "warning", icon: <Minus className="h-3 w-3" /> },
  low: { label: "Baja", variant: "secondary", icon: <ArrowDown className="h-3 w-3" /> },
};

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { label, variant, icon } = config[priority];
  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {label}
    </Badge>
  );
}
