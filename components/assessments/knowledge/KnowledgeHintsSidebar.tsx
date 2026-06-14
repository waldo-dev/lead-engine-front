"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useKnowledgePatterns } from "@/hooks/useKnowledge";

interface KnowledgeHintsSidebarProps {
  industrySlug?: string;
}

export function KnowledgeHintsSidebar({ industrySlug }: KnowledgeHintsSidebarProps) {
  const { data: patterns, isLoading } = useKnowledgePatterns(industrySlug ?? null);

  if (!industrySlug) {
    return (
      <p className="text-xs text-muted-foreground p-3">
        Patrones del rubro disponibles cuando la empresa tiene industria definida.
      </p>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-32 m-3" />;
  }

  if (!patterns?.length) {
    return (
      <p className="text-xs text-muted-foreground p-3">
        Sin patrones históricos para este rubro.
      </p>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Patrones Knowledge
        </p>
        {patterns.slice(0, 8).map((p) => (
          <div key={p.id} className="rounded-md border border-border/60 p-2">
            <p className="text-xs font-medium leading-snug">{p.title}</p>
            {p.description && (
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                {p.description}
              </p>
            )}
            {p.frequency != null && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Frecuencia: {p.frequency}%
              </p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
