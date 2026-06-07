import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score?: number;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreRing(score: number) {
  if (score >= 75) return "stroke-emerald-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
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
          className="text-muted/30"
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
          "absolute font-semibold",
          getScoreColor(score),
          size === "sm" && "text-[10px]",
          size === "md" && "text-sm",
          size === "lg" && "text-lg"
        )}
      >
        {score}
      </span>
    </div>
  );
}
