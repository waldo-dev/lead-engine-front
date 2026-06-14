"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileImage,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateGantt, usePlanGantt } from "@/hooks/useGantt";
import { ganttService } from "@/services/gantt.service";
import type {
  GanttFormat,
  GanttMode,
  GanttTaskStatus,
  GanttTaskWithBusinessDays,
  GanttTaskWithDates,
} from "@/types/gantt";
import { GANTT_FORMATS, GANTT_STATUSES } from "@/types/gantt";
import { toast } from "sonner";

const DEFAULT_MANUAL_TASK: GanttTaskWithDates = {
  name: "",
  startDate: "",
  endDate: "",
  status: "Pendiente",
};

const DEFAULT_PLAN_TASK: GanttTaskWithBusinessDays = {
  name: "",
  businessDays: 1,
  status: "Pendiente",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface GanttBuilderProps {
  initialTitle?: string;
  initialNotes?: string;
  initialManualTasks?: GanttTaskWithDates[];
  initialPlanTasks?: GanttTaskWithBusinessDays[];
  initialStartDate?: string;
}

export function GanttBuilder({
  initialTitle = "Carta Gantt",
  initialNotes = "",
  initialManualTasks,
  initialPlanTasks,
  initialStartDate = new Date().toISOString().slice(0, 10),
}: GanttBuilderProps) {
  const [mode, setMode] = useState<GanttMode>("manual");
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes);
  const [format, setFormat] = useState<GanttFormat>("png");
  const [startDate, setStartDate] = useState(initialStartDate);
  const [overlapLastDay, setOverlapLastDay] = useState(true);
  const [manualTasks, setManualTasks] = useState<GanttTaskWithDates[]>(
    initialManualTasks?.length
      ? initialManualTasks
      : [{ ...DEFAULT_MANUAL_TASK, name: "Nueva tarea" }],
  );
  const [planTasks, setPlanTasks] = useState<GanttTaskWithBusinessDays[]>(
    initialPlanTasks?.length
      ? initialPlanTasks
      : [{ ...DEFAULT_PLAN_TASK, name: "Nueva tarea", businessDays: 3 }],
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingExample, setLoadingExample] = useState(false);

  const generateGantt = useGenerateGantt();
  const planGantt = usePlanGantt();
  const isGenerating = generateGantt.isPending || planGantt.isPending;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canGenerate = useMemo(() => {
    if (!title.trim()) return false;
    if (mode === "manual") {
      return manualTasks.some(
        (task) => task.name.trim() && task.startDate && task.endDate,
      );
    }
    return (
      !!startDate &&
      planTasks.some((task) => task.name.trim() && task.businessDays > 0)
    );
  }, [title, mode, manualTasks, planTasks, startDate]);

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewHtml(null);
  };

  const handleResult = async (result: { blob: Blob; format: GanttFormat }) => {
    clearPreview();

    if (result.format === "pdf") {
      downloadBlob(result.blob, `${slugify(title) || "carta-gantt"}.pdf`);
      toast.success("PDF descargado");
      return;
    }

    if (result.format === "html") {
      const html = await result.blob.text();
      setPreviewHtml(html);
      toast.success("Vista previa HTML generada");
      return;
    }

    const url = URL.createObjectURL(result.blob);
    setPreviewUrl(url);
    toast.success("Carta Gantt generada");
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error("Completa título y al menos una tarea válida");
      return;
    }

    try {
      if (mode === "manual") {
        const tasks = manualTasks.filter(
          (task) => task.name.trim() && task.startDate && task.endDate,
        );
        const result = await generateGantt.mutateAsync({
          title: title.trim(),
          notes: notes.trim() || undefined,
          format,
          tasks,
        });
        await handleResult(result);
        return;
      }

      const tasks = planTasks.filter(
        (task) => task.name.trim() && task.businessDays > 0,
      );
      const result = await planGantt.mutateAsync({
        title: title.trim(),
        notes: notes.trim() || undefined,
        startDate,
        overlapLastDay,
        format,
        tasks,
      });
      await handleResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al generar";
      toast.error(message);
    }
  };

  const handleLoadExample = async () => {
    setLoadingExample(true);
    try {
      const example = await ganttService.getExample();
      setTitle(example.title);
      setNotes(example.notes ?? "");
      setManualTasks(example.tasks.length ? example.tasks : [{ ...DEFAULT_MANUAL_TASK }]);
      setPlanTasks(
        example.tasks.map((task) => ({
          name: task.name,
          businessDays: 3,
          status: task.status ?? "Pendiente",
        })),
      );
      if (example.tasks[0]?.startDate) {
        setStartDate(example.tasks[0].startDate);
      }
      setMode("manual");
      clearPreview();
      toast.success("Ejemplo cargado");
    } catch {
      toast.error("No se pudo cargar el ejemplo");
    } finally {
      setLoadingExample(false);
    }
  };

  const updateManualTask = (
    index: number,
    patch: Partial<GanttTaskWithDates>,
  ) => {
    setManualTasks((current) =>
      current.map((task, i) => (i === index ? { ...task, ...patch } : task)),
    );
  };

  const updatePlanTask = (
    index: number,
    patch: Partial<GanttTaskWithBusinessDays>,
  ) => {
    setPlanTasks((current) =>
      current.map((task, i) => (i === index ? { ...task, ...patch } : task)),
    );
  };

  const renderStatusSelect = (
    value: GanttTaskStatus | undefined,
    onChange: (status: GanttTaskStatus) => void,
  ) => (
    <Select value={value ?? "Pendiente"} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GANTT_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Datos de la carta</CardTitle>
              <CardDescription>
                Exporta tu cronograma en PNG, PDF o HTML
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadExample}
              disabled={loadingExample}
            >
              {loadingExample ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Cargar ejemplo
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Título</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Notas</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Cronograma actualizado al 11 de junio."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Formato</label>
                <Select value={format} onValueChange={(v) => setFormat(v as GanttFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GANTT_FORMATS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tareas</CardTitle>
            <CardDescription>
              Fechas manuales o planificación automática por días hábiles (lun–vie)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(value) => setMode(value as GanttMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Fechas manuales</TabsTrigger>
                <TabsTrigger value="plan">Días hábiles</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-3">
                {manualTasks.map((task, index) => (
                  <div
                    key={`manual-${index}`}
                    className="grid gap-2 rounded-lg border border-border/80 p-3 sm:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.8fr))_minmax(0,0.9fr)_auto]"
                  >
                    <Input
                      value={task.name}
                      onChange={(e) => updateManualTask(index, { name: e.target.value })}
                      placeholder="Nombre de la tarea"
                    />
                    <Input
                      type="date"
                      value={task.startDate}
                      onChange={(e) => updateManualTask(index, { startDate: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={task.endDate}
                      onChange={(e) => updateManualTask(index, { endDate: e.target.value })}
                    />
                    {renderStatusSelect(task.status, (status) =>
                      updateManualTask(index, { status }),
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() =>
                        setManualTasks((current) => current.filter((_, i) => i !== index))
                      }
                      disabled={manualTasks.length === 1}
                      aria-label="Eliminar tarea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManualTasks((current) => [...current, { ...DEFAULT_MANUAL_TASK }])}
                >
                  <Plus className="h-4 w-4" />
                  Agregar tarea
                </Button>
              </TabsContent>

              <TabsContent value="plan" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha de inicio</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-7 text-sm">
                    <Checkbox
                      checked={overlapLastDay}
                      onCheckedChange={(checked) => setOverlapLastDay(checked === true)}
                    />
                    Overlap último día con la siguiente tarea
                  </label>
                </div>

                {planTasks.map((task, index) => (
                  <div
                    key={`plan-${index}`}
                    className="grid gap-2 rounded-lg border border-border/80 p-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_auto]"
                  >
                    <Input
                      value={task.name}
                      onChange={(e) => updatePlanTask(index, { name: e.target.value })}
                      placeholder="Nombre de la tarea"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={task.businessDays}
                      onChange={(e) =>
                        updatePlanTask(index, {
                          businessDays: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                    {renderStatusSelect(task.status, (status) =>
                      updatePlanTask(index, { status }),
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() =>
                        setPlanTasks((current) => current.filter((_, i) => i !== index))
                      }
                      disabled={planTasks.length === 1}
                      aria-label="Eliminar tarea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlanTasks((current) => [...current, { ...DEFAULT_PLAN_TASK }])}
                >
                  <Plus className="h-4 w-4" />
                  Agregar tarea
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileImage className="h-4 w-4" />
                )}
                {format === "pdf" ? "Generar y descargar PDF" : "Generar carta"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle className="text-base">Vista previa</CardTitle>
          <CardDescription>
            PNG y HTML se muestran aquí. PDF se descarga directamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!previewUrl && !previewHtml && (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/30 px-6 text-center text-sm text-muted-foreground">
              Genera una carta para ver la vista previa
            </div>
          )}

          {previewUrl && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={`Carta Gantt: ${title}`}
                className="w-full rounded-lg border border-border/80 bg-white"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const response = await fetch(previewUrl);
                  downloadBlob(await response.blob(), `${slugify(title) || "carta-gantt"}.png`);
                  toast.success("PNG descargado");
                }}
              >
                <Download className="h-4 w-4" />
                Descargar PNG
              </Button>
            </div>
          )}

          {previewHtml && (
            <div className="overflow-hidden rounded-lg border border-border/80 bg-white">
              <iframe
                title={`Carta Gantt HTML: ${title}`}
                srcDoc={previewHtml}
                className="h-[520px] w-full"
                sandbox=""
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
