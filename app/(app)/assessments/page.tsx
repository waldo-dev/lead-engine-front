"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AssessmentCreateModal } from "@/components/assessments/AssessmentCreateModal";
import { useAssessments } from "@/hooks/useAssessments";
import { formatDateTime } from "@/lib/utils";
import { ScoreBadge } from "@/components/companies/ScoreBadge";

export default function AssessmentsPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const { data: assessments, isLoading, isError, refetch } = useAssessments();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Diagnósticos"
        description="Formulario estructurado de diagnóstico + informe ejecutivo"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nuevo diagnóstico
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          Error al cargar diagnósticos.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && assessments?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium">Sin diagnósticos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea un diagnóstico para empezar a rellenar el formulario durante la reunión.
          </p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Crear primer diagnóstico
          </Button>
        </div>
      )}

      {assessments && assessments.length > 0 && (
        <div className="rounded-xl border border-border/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Actualizado</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    {a.companyName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={a.chilsmartScore} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(a.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/assessments/${a.id}`}>Abrir</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssessmentCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => {
          router.push(`/assessments/${id}`);
        }}
      />
    </div>
  );
}
