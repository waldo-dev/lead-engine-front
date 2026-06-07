"use client";

import {
  AlertTriangle,
  DollarSign,
  MessageCircle,
  Shield,
  Target,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommercialPriorityBadge } from "@/components/companies/CommercialPriorityBadge";
import type { EffectiveBriefing, SellerOverrides } from "@/types/commercial";

function formatTicket(min: number | null, max: number | null, currency: string) {
  if (min == null && max == null) return "—";
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  return min != null ? fmt(min) : max != null ? fmt(max) : "—";
}

const sourceLabels = {
  ai: "Solo IA",
  seller: "Solo vendedor",
  mixed: "IA + vendedor",
};

interface CommercialBriefingViewProps {
  effective?: EffectiveBriefing;
  sellerOverrides?: SellerOverrides;
  mode: "effective" | "seller";
}

export function CommercialBriefingView({
  effective,
  sellerOverrides,
  mode,
}: CommercialBriefingViewProps) {
  if (mode === "seller" && sellerOverrides) {
    const hasData = Object.values(sellerOverrides).some(
      (v) => v !== null && v !== undefined && v !== ""
    );
    if (!hasData) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Sin validaciones del vendedor. Usa el formulario de edición o registra un followup.
          </CardContent>
        </Card>
      );
    }
  }

  const data = mode === "effective" ? effective : null;
  if (mode === "effective" && !data) return null;

  const problem =
    mode === "effective" ? data!.businessProblem : sellerOverrides?.businessProblem;
  const solution =
    mode === "effective" ? data!.proposedSolution : sellerOverrides?.proposedSolution;
  const impact =
    mode === "effective" ? data!.estimatedImpact : sellerOverrides?.estimatedImpact;
  const priority =
    mode === "effective" ? data!.commercialPriority : sellerOverrides?.commercialPriority;
  const conversion =
    mode === "effective"
      ? data!.conversionProbability
      : sellerOverrides?.conversionProbability;
  const topic =
    mode === "effective"
      ? data!.firstConversationTopic
      : sellerOverrides?.firstConversationTopic;
  const services =
    mode === "effective" ? data!.recommendedServices : sellerOverrides?.recommendedServices ?? [];
  const objections =
    mode === "effective" ? data!.likelyObjections : sellerOverrides?.likelyObjections ?? [];
  const dmName =
    mode === "effective" ? data!.decisionMaker.name : sellerOverrides?.decisionMakerName;
  const dmRole =
    mode === "effective" ? data!.decisionMaker.role : sellerOverrides?.decisionMakerRole;
  const ticketMin =
    mode === "effective" ? data!.estimatedTicket.minUsd : sellerOverrides?.ticketMinUsd;
  const ticketMax =
    mode === "effective" ? data!.estimatedTicket.maxUsd : sellerOverrides?.ticketMaxUsd;
  const currency =
    mode === "effective" ? data!.estimatedTicket.currency : "USD";
  const nextAction = sellerOverrides?.nextAction;
  const nextActionDue = sellerOverrides?.nextActionDueDate;
  const internalNotes = sellerOverrides?.internalNotes;

  return (
    <div className="space-y-4">
      {mode === "effective" && data && (
        <Badge variant="outline" className="text-xs">
          Fuente: {sourceLabels[data.source]}
        </Badge>
      )}

      {(priority != null || conversion != null) && (
        <div className="grid grid-cols-2 gap-3">
          {priority != null && (
            <Card className="flex flex-col items-center py-4">
              <p className="mb-2 text-xs text-muted-foreground">Prioridad</p>
              <CommercialPriorityBadge priority={priority} />
            </Card>
          )}
          {conversion != null && (
            <Card className="flex flex-col items-center py-4">
              <p className="mb-2 text-xs text-muted-foreground">Prob. conversión</p>
              <span className="text-xl font-bold text-primary">{conversion}%</span>
            </Card>
          )}
        </div>
      )}

      {problem && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Problema detectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{problem}</p>
          </CardContent>
        </Card>
      )}

      {impact && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Impacto estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{impact}</p>
          </CardContent>
        </Card>
      )}

      {solution && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              Solución propuesta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{solution}</p>
          </CardContent>
        </Card>
      )}

      {(dmName || dmRole) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserRound className="h-4 w-4" />
              Decisor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dmName && <p className="font-medium text-sm">{dmName}</p>}
            {dmRole && <p className="text-sm text-muted-foreground">{dmRole}</p>}
          </CardContent>
        </Card>
      )}

      {(ticketMin != null || ticketMax != null) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              Ticket estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{formatTicket(ticketMin ?? null, ticketMax ?? null, currency)}</p>
          </CardContent>
        </Card>
      )}

      {services && services.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              Servicios recomendados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {services.map((svc) => (
              <div key={svc.service} className="rounded-lg border p-2 text-sm">
                <p className="font-medium">{svc.service}</p>
                <p className="text-muted-foreground">{svc.fit}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {objections && objections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              Objeciones probables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {objections.map((obj) => (
              <div key={obj.objection} className="rounded-lg border p-2 text-sm">
                <p className="font-medium">&ldquo;{obj.objection}&rdquo;</p>
                <p className="mt-1 text-muted-foreground">{obj.response}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {topic && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4" />
              Primer tema de conversación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{topic}</p>
          </CardContent>
        </Card>
      )}

      {mode === "seller" && nextAction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Próxima acción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{nextAction}</p>
            {nextActionDue && (
              <p className="mt-1 text-xs text-muted-foreground">
                Vence: {new Date(nextActionDue).toLocaleDateString("es-CL")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "seller" && internalNotes && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Notas internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{internalNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
