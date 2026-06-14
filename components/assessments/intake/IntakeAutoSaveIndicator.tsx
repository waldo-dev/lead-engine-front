"use client";

import { Check, Clock, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntakeAutoSaveIndicatorProps {
  status: "idle" | "pending" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
}

export function IntakeAutoSaveIndicator({ status, lastSavedAt }: IntakeAutoSaveIndicatorProps) {
  if (status === "idle") return null;

  const secondsAgo =
    lastSavedAt ? Math.max(0, Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {status === "pending" && (
        <>
          <Clock className="h-3.5 w-3.5" />
          <span>Cambios pendientes…</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Guardando…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3.5 w-3.5 text-success" />
          <span>
            Guardado{secondsAgo !== null && secondsAgo < 60 ? ` hace ${secondsAgo}s` : ""}
          </span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Error al guardar — se reintentará</span>
        </>
      )}
    </div>
  );
}
