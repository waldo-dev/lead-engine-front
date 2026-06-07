"use client";

import { useState } from "react";
import {
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  StickyNote,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useCreateFollowup, useFollowups } from "@/hooks/useCommercial";
import { formatDateTime } from "@/lib/utils";
import type { FollowupType } from "@/types/commercial";
import { toast } from "sonner";

const followupIcons: Record<FollowupType, React.ReactNode> = {
  note: <StickyNote className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Video className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  discovery_update: <RefreshCw className="h-4 w-4" />,
  status_change: <Users className="h-4 w-4" />,
};

const followupLabels: Record<FollowupType, string> = {
  note: "Nota",
  call: "Llamada",
  email: "Email",
  meeting: "Reunión",
  whatsapp: "WhatsApp",
  discovery_update: "Discovery",
  status_change: "Cambio estado",
};

interface FollowupTimelineProps {
  companyId: string;
}

export function FollowupTimeline({ companyId }: FollowupTimelineProps) {
  const { data, isLoading } = useFollowups(companyId);
  const createFollowup = useCreateFollowup();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<FollowupType>("call");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [applyUpdates, setApplyUpdates] = useState(false);
  const [updateProblem, setUpdateProblem] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("El contenido es obligatorio");
      return;
    }

    const updates =
      applyUpdates && (updateProblem || updateStatus)
        ? {
            ...(updateProblem ? { businessProblem: updateProblem } : {}),
            ...(updateStatus
              ? {
                  outreachStatus: updateStatus as
                    | "contacted"
                    | "in_progress"
                    | "not_contacted"
                    | "converted"
                    | "rejected",
                }
              : {}),
          }
        : undefined;

    try {
      await createFollowup.mutateAsync({
        companyId,
        payload: {
          type,
          title: title || undefined,
          content,
          updates: updates && Object.keys(updates).length > 0 ? updates : undefined,
        },
      });
      toast.success("Interacción registrada");
      setShowForm(false);
      setTitle("");
      setContent("");
      setUpdateProblem("");
      setUpdateStatus("");
      setApplyUpdates(false);
    } catch {
      toast.error("Error al registrar interacción");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Timeline de seguimiento
        </h4>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          Registrar
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Nueva interacción</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Select value={type} onValueChange={(v) => setType(v as FollowupType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(followupLabels).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Título (opcional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Qué pasó en la interacción..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={applyUpdates}
                  onChange={(e) => setApplyUpdates(e.target.checked)}
                  className="rounded"
                />
                Actualizar campos comerciales con esta interacción
              </label>

              {applyUpdates && (
                <div className="space-y-2 rounded-lg border p-3">
                  <Textarea
                    placeholder="Problema actualizado (opcional)"
                    value={updateProblem}
                    onChange={(e) => setUpdateProblem(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Select value={updateStatus} onValueChange={setUpdateStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado contacto (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contacted">Contactado</SelectItem>
                      <SelectItem value="in_progress">En progreso</SelectItem>
                      <SelectItem value="converted">Convertido</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={createFollowup.isPending}>
                {createFollowup.isPending ? "Guardando..." : "Registrar interacción"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !data?.items.length ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          Sin interacciones registradas
        </p>
      ) : (
        <div className="relative space-y-0">
          {data.items.map((item, i) => (
            <div key={item.id} className="relative flex gap-3 pb-6">
              {i < data.items.length - 1 && (
                <span className="absolute left-[15px] top-8 h-full w-px bg-border" />
              )}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                {followupIcons[item.type]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {followupLabels[item.type]}
                  </Badge>
                  {item.title && <span className="text-sm font-medium">{item.title}</span>}
                  <span className="text-xs text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {item.content}
                </p>
                {item.fieldUpdates && Object.keys(item.fieldUpdates).length > 0 && (
                  <p className="mt-1 text-xs text-primary">
                    Campos actualizados en esta interacción
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
