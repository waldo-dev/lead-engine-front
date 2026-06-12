"use client";

import {
  AlertTriangle,
  Briefcase,
  DollarSign,
  FileSearch,
  Lightbulb,
  MessageCircle,
  Shield,
  FileText,
  Target,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/companies/ScoreBadge";
import { CommercialPriorityBadge } from "@/components/companies/CommercialPriorityBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { formatTicketRange } from "@/lib/currency";
import type { AnalysisMeta, PresalesBriefing, ServicePriority } from "@/types";

const servicePriorityLabels: Record<ServicePriority, string> = {
  primary: "Principal",
  secondary: "Secundario",
  optional: "Opcional",
};

const servicePriorityVariant: Record<ServicePriority, "default" | "secondary" | "outline"> = {
  primary: "default",
  secondary: "secondary",
  optional: "outline",
};

interface CompanyAnalysisProps {
  briefing?: PresalesBriefing | null;
  meta?: AnalysisMeta;
  outreachMessage?: string | null;
  isLoading?: boolean;
}

export function CompanyAnalysis({
  briefing,
  meta,
  outreachMessage,
  isLoading,
}: CompanyAnalysisProps) {
  if (isLoading) return <LoadingSkeleton type="detail" rows={6} />;

  if (!briefing) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Sin briefing de preventa. Usa &quot;Procesar&quot; para generar el análisis consultivo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {meta?.analyzedAt && (
        <p className="text-xs text-muted-foreground">
          Analizado {new Date(meta.analyzedAt).toLocaleString("es-CL")}
          {meta.modelName ? ` · ${meta.modelName}` : ""}
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4 text-primary" />
            Resumen ejecutivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{briefing.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="flex flex-col items-center justify-center py-4">
          <p className="mb-2 text-xs text-muted-foreground">Score IA</p>
          <ScoreBadge score={briefing.score} size="md" />
        </Card>
        <Card className="flex flex-col items-center justify-center py-4">
          <p className="mb-2 text-xs text-muted-foreground">Prioridad</p>
          <CommercialPriorityBadge priority={briefing.commercialPriority} />
        </Card>
        <Card className="flex flex-col items-center justify-center py-4">
          <p className="mb-2 text-xs text-muted-foreground">Prob. conversión</p>
          <span className="text-xl font-bold text-primary">{briefing.conversionProbability}%</span>
        </Card>
        <Card className="flex flex-col items-center justify-center py-4 px-2 text-center">
          <p className="mb-2 text-xs text-muted-foreground">Ticket estimado</p>
          <span className="text-xs font-semibold leading-tight">
            {formatTicketRange(
              briefing.estimatedTicket.minUsd,
              briefing.estimatedTicket.maxUsd,
            )}
          </span>
        </Card>
      </div>

      <Card className="border-warning/30 bg-warning-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Problema detectado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{briefing.businessProblem}</p>
        </CardContent>
      </Card>

      <Card className="border-success/30 bg-success-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-success" />
            Impacto estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{briefing.estimatedImpact}</p>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Solución propuesta · Chilsmart
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm leading-relaxed">{briefing.proposedSolution}</p>
          <Badge variant="outline" className="font-normal">
            {briefing.recommendedService}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Pain points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {briefing.painPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-success" />
              Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {briefing.opportunities.map((opp) => (
                <li key={opp} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  {opp}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {briefing.recommendedServices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Servicios recomendados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {briefing.recommendedServices.map((svc) => (
              <div key={svc.service} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{svc.service}</p>
                  <Badge variant={servicePriorityVariant[svc.priority]}>
                    {servicePriorityLabels[svc.priority]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{svc.fit}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {briefing.likelyObjections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Objeciones probables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {briefing.likelyObjections.map((obj) => (
              <div key={obj.objection} className="rounded-lg border p-3">
                <p className="text-sm font-medium text-destructive/90">
                  &ldquo;{obj.objection}&rdquo;
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Cómo responder: </span>
                  {obj.response}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4" />
            Decisor probable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium text-sm">{briefing.likelyDecisionMaker.role}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {briefing.likelyDecisionMaker.rationale}
          </p>
        </CardContent>
      </Card>

      {briefing.publicEvidence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-4 w-4" />
              Evidencia pública
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {briefing.publicEvidence.map((ev) => (
              <div key={ev.evidence} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p>{ev.evidence}</p>
                  {ev.source && (
                    <p className="text-xs text-muted-foreground">Fuente: {ev.source}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-primary" />
            Cómo iniciar la conversación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed italic">&ldquo;{briefing.conversationStarter}&rdquo;</p>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Primer tema de reunión
            </p>
            <p className="mt-1 text-sm">{briefing.firstConversationTopic}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Ticket estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {formatTicketRange(
              briefing.estimatedTicket.minUsd,
              briefing.estimatedTicket.maxUsd,
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{briefing.estimatedTicket.rationale}</p>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Razonamiento y límites del análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs leading-relaxed text-muted-foreground">{briefing.reasoning}</p>
        </CardContent>
      </Card>

      {outreachMessage && (
        <Card className="border-dashed opacity-80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Mensaje de outreach (opcional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{outreachMessage}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
