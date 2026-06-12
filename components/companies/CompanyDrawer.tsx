"use client";

import { useState } from "react";
import { Ban, ExternalLink, Globe, MapPin, RefreshCw, ShieldOff } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CompanyAnalysis } from "@/components/companies/CompanyAnalysis";
import { ContactCard } from "@/components/companies/ContactCard";
import { StatusBadge } from "@/components/companies/StatusBadge";
import { ScoreBadge } from "@/components/companies/ScoreBadge";
import { CommercialBriefingView } from "@/components/commercial/CommercialBriefingView";
import { CommercialEditForm } from "@/components/commercial/CommercialEditForm";
import { FollowupTimeline } from "@/components/commercial/FollowupTimeline";
import { useBanCompany, useUnbanCompany } from "@/hooks/useCompanies";
import { useAnalyzeCompany, useCompanyAnalysis } from "@/hooks/useAnalysis";
import { useCommercialTracking } from "@/hooks/useCommercial";
import { formatDateTime } from "@/lib/utils";
import type { Company } from "@/types";
import { toast } from "sonner";

interface CompanyDrawerProps {
  company: Company | null;
  open: boolean;
  onClose: () => void;
}

export function CompanyDrawer({ company, open, onClose }: CompanyDrawerProps) {
  const [banReason, setBanReason] = useState("");
  const companyId = open && company ? company.id : null;
  const { data: commercial, isLoading, refetch } = useCommercialTracking(companyId);
  const { data: analysisData } = useCompanyAnalysis(companyId);
  const analyzeCompany = useAnalyzeCompany();
  const banCompany = useBanCompany();
  const unbanCompany = useUnbanCompany();

  if (!company) return null;

  const aiBriefing = commercial?.aiBriefing ?? null;
  const score = aiBriefing?.score ?? company.aiScore;
  const contactStatus = commercial?.outreachStatus ?? company.contactStatus;

  const handleReanalyze = async () => {
    try {
      await analyzeCompany.mutateAsync(company.id);
      toast.success("Briefing IA regenerado");
      refetch();
    } catch {
      toast.error("Error al generar briefing");
    }
  };

  const handleBan = async () => {
    try {
      await banCompany.mutateAsync({
        id: company.id,
        reason: banReason.trim() || undefined,
      });
      toast.success("Empresa excluida del sistema");
      setBanReason("");
      onClose();
    } catch {
      toast.error("No se pudo excluir la empresa");
    }
  };

  const handleUnban = async () => {
    try {
      await unbanCompany.mutateAsync(company.id);
      toast.success("Empresa restaurada");
      refetch();
    } catch {
      toast.error("No se pudo restaurar la empresa");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col p-0">
        <div className="border-b px-6 py-5">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {commercial?.companyName ?? company.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{company.industry}</p>
            </div>
            <ScoreBadge score={score ?? undefined} size="md" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge type="analysis" status={company.analysisStatus} />
            <StatusBadge type="contact" status={contactStatus} />
            {commercial?.meta.followupsCount != null && commercial.meta.followupsCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {commercial.meta.followupsCount} interacciones
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={handleReanalyze}
              disabled={analyzeCompany.isPending}
            >
              <RefreshCw className={`h-3 w-3 ${analyzeCompany.isPending ? "animate-spin" : ""}`} />
              {aiBriefing ? "Re-analizar IA" : "Generar briefing"}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Información básica
              </h3>
              <div className="space-y-2 text-sm">
                {company.website && (
                  <a
                    href={
                      company.website.startsWith("http")
                        ? company.website
                        : `https://${company.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {company.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {company.address && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {company.address}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {[company.city, company.country].filter(Boolean).join(", ")}
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Seguimiento comercial
              </h3>

              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando seguimiento...</p>
              ) : commercial ? (
                <Tabs defaultValue="effective" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="effective">Vista actual</TabsTrigger>
                    <TabsTrigger value="ai">Análisis IA</TabsTrigger>
                    <TabsTrigger value="seller">Validado</TabsTrigger>
                  </TabsList>

                  <TabsContent value="effective">
                    <CommercialBriefingView
                      effective={commercial.effective}
                      mode="effective"
                    />
                  </TabsContent>

                  <TabsContent value="ai">
                    <CompanyAnalysis
                      briefing={aiBriefing}
                      websiteIntel={analysisData?.websiteIntel}
                      meta={analysisData?.meta}
                      isLoading={false}
                    />
                  </TabsContent>

                  <TabsContent value="seller" className="space-y-4">
                    <CommercialBriefingView
                      sellerOverrides={commercial.sellerOverrides}
                      mode="seller"
                    />
                    <CommercialEditForm
                      companyId={company.id}
                      overrides={commercial.sellerOverrides}
                      outreachStatus={commercial.outreachStatus}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <CompanyAnalysis briefing={null} isLoading={false} />
              )}
            </section>

            <Separator />

            <ContactCard contacts={company.contacts} socialMedia={company.socialMedia} />

            <Separator />

            {companyId && <FollowupTimeline companyId={companyId} />}

            <Separator />

            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Exclusión
              </h3>
              {company.isBanned ? (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">
                    Esta empresa está excluida y no aparece en búsquedas ni análisis.
                  </p>
                  {company.banReason && (
                    <p className="text-sm text-muted-foreground">
                      Motivo: {company.banReason}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnban}
                    disabled={unbanCompany.isPending}
                  >
                    <ShieldOff className="h-4 w-4" />
                    Restaurar empresa
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Excluye empresas que bloquearon contacto o no deben aparecer en el CRM.
                  </p>
                  <Textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Motivo (opcional): nos bloqueó en Instagram..."
                    rows={2}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBan}
                    disabled={banCompany.isPending}
                  >
                    <Ban className="h-4 w-4" />
                    Excluir empresa
                  </Button>
                </div>
              )}
            </section>

            <Separator />

            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Historial
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scraping</span>
                  <span>{formatDateTime(company.history?.scrapedAt ?? company.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Último contacto</span>
                  <span>{formatDateTime(commercial?.meta.lastContactAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actualizado</span>
                  <span>{formatDateTime(commercial?.meta.updatedAt)}</span>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
