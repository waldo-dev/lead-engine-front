import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score?: number;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function getScoreRing(score: number) {
  if (score >= 75) return "stroke-success";
  if (score >= 50) return "stroke-warning";
  return "stroke-destructive";
}

export function ScoreBadge({ score, size = "sm" }: ScoreBadgeProps) {
  if (score === undefined || score === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const dimensions = { sm: 36, md: 56, lg: 80 };
  const dim = dimensions[size];
  const radius = (dim - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-muted/40"
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-700", getScoreRing(score))}
        />
      </svg>
      <span
        className={cn(
          "absolute font-semibold tabular-nums",
          getScoreColor(score),
          size === "sm" && "text-[10px]",
          size === "md" && "text-sm",
          size === "lg" && "text-lg",
        )}
      >
        {score}
      </span>
    </div>
  );
}
