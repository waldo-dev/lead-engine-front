import { MessageCircle, Lightbulb } from "lucide-react";
import type { PhaseGuidance } from "@/components/assessments/intake/phase-guidance";

export function PhaseHeader({ guidance }: { guidance: PhaseGuidance }) {
  return (
    <div className="mb-6 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{guidance.title}</h3>
        <p className="mt-1 text-sm text-foreground/80">{guidance.subtitle}</p>
      </div>

      {guidance.askClient.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/70">
            <MessageCircle className="h-3.5 w-3.5" />
            Puedes preguntar así
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {guidance.askClient.map((q) => (
              <li key={q} className="flex gap-2">
                <span className="text-primary shrink-0">•</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-foreground/70">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
        {guidance.tip}
      </p>
    </div>
  );
}
