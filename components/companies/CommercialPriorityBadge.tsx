import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CommercialPriorityBadgeProps {
  priority: number;
  max?: number;
}

export function CommercialPriorityBadge({ priority, max = 10 }: CommercialPriorityBadgeProps) {
  const level =
    priority >= 8 ? "high" : priority >= 5 ? "medium" : "low";

  return (
    <Badge
      variant={level === "high" ? "destructive" : level === "medium" ? "warning" : "secondary"}
      className={cn("text-sm font-semibold tabular-nums")}
    >
      {priority}/{max}
    </Badge>
  );
}
