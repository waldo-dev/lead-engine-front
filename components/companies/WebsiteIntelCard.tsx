import { ExternalLink, Globe, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { WebsiteIntel } from "@/types";

const statusLabels: Record<WebsiteIntel["status"], string> = {
  success: "Contenido extraído",
  partial: "Parcial",
  failed: "Sin contenido útil",
  skipped: "Sin sitio web",
};

const statusVariant: Record<WebsiteIntel["status"], "success" | "warning" | "destructive" | "secondary"> = {
  success: "success",
  partial: "warning",
  failed: "destructive",
  skipped: "secondary",
};

interface WebsiteIntelCardProps {
  intel?: WebsiteIntel | null;
  scrapedAt?: string | null;
}

export function WebsiteIntelCard({ intel, scrapedAt }: WebsiteIntelCardProps) {
  if (!intel) return null;

  const okPages = intel.pages.filter((p) => p.status === "ok" && p.excerpt);

  return (
    <Card className="border-info/30 bg-info-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base font-medium">
          <Globe className="h-4 w-4 text-info" />
          Inteligencia del sitio web
          <Badge variant={statusVariant[intel.status]} className="font-normal">
            {statusLabels[intel.status]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {intel.baseUrl && (
          <a
            href={intel.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            {intel.baseUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {(intel.title || intel.description) && (
          <div className="space-y-1 rounded-lg border border-border/60 bg-card/80 p-3">
            {intel.title && <p className="font-medium">{intel.title}</p>}
            {intel.description && (
              <p className="text-muted-foreground leading-relaxed">{intel.description}</p>
            )}
          </div>
        )}

        {intel.technologies && intel.technologies.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            {intel.technologies.map((tech) => (
              <Badge key={tech} variant="outline" className="font-normal">
                {tech}
              </Badge>
            ))}
          </div>
        )}

        {okPages.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Páginas analizadas ({okPages.length})
            </p>
            {okPages.map((page) => (
              <div
                key={page.url}
                className="rounded-lg border border-border/60 bg-card/80 p-3"
              >
                <p className="text-xs font-medium text-primary">
                  {page.title ?? page.url}
                </p>
                <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                  {page.excerpt}
                </p>
              </div>
            ))}
          </div>
        )}

        {intel.error && intel.status !== "success" && (
          <p className="text-xs text-muted-foreground">{intel.error}</p>
        )}

        {scrapedAt && (
          <p className="text-xs text-muted-foreground">
            Scrapeado: {formatDateTime(scrapedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
