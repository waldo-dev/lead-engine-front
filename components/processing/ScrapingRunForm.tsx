"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getScrapingErrorMessage,
  scrapingKeys,
  useRunScraping,
  useScrapingConfig,
  useScrapingRun,
} from "@/hooks/useScraping";
import { createScrapingRunConsent, scrapingService } from "@/services/scraping.service";
import { useQueryClient } from "@tanstack/react-query";
import type { ScrapingSourceType } from "@/services/scraping.service";
import { toast } from "sonner";

interface ScrapingRunFormProps {
  enabled?: boolean;
  onRunStarted?: (runId: string) => void;
  onRunFinished?: () => void;
}

export function ScrapingRunForm({
  enabled = true,
  onRunStarted,
  onRunFinished,
}: ScrapingRunFormProps) {
  const { data: config, isLoading: configLoading } = useScrapingConfig({ enabled });
  const [sourceType, setSourceType] = useState<ScrapingSourceType>("google_maps");
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState("20");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const queryClient = useQueryClient();
  const runScraping = useRunScraping();
  const { data: activeRun } = useScrapingRun(activeRunId);
  const [aborting, setAborting] = useState(false);

  const selectedSource = useMemo(
    () => config?.sources.find((s) => s.id === sourceType),
    [config?.sources, sourceType],
  );

  const maxAllowed = config?.quota.limits.maxResultsPerRun ?? 50;
  const placesRemaining = config?.quota.usage.placesRemaining ?? 0;
  const effectiveMax = Math.min(maxAllowed, placesRemaining);

  useEffect(() => {
    if (!config) return;
    setSourceType(config.defaults.sourceType ?? "google_maps");
    setMaxResults(String(Math.min(config.defaults.maxResults ?? 20, effectiveMax || 20)));
  }, [config, effectiveMax]);

  const onRunFinishedRef = useRef(onRunFinished);
  onRunFinishedRef.current = onRunFinished;
  const notifiedRunRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeRun) return;
    if (notifiedRunRef.current === activeRun.id) return;

    if (activeRun.status === "completed") {
      notifiedRunRef.current = activeRun.id;
      toast.success(
        `Listo: ${activeRun.fetched} encontradas, ${activeRun.imported} importadas, ${activeRun.duplicated} duplicadas`,
      );
      setActiveRunId(null);
      onRunFinishedRef.current?.();
    } else if (activeRun.status === "failed") {
      notifiedRunRef.current = activeRun.id;
      toast.error(activeRun.errorMessage ?? "El scraping falló");
      setActiveRunId(null);
      onRunFinishedRef.current?.();
    }
  }, [activeRun]);

  const isRunning = runScraping.isPending || activeRun?.status === "running";
  const canRun = config?.quota.canStartRun && selectedSource?.enabled && !isRunning;

  const estimatedCost = useMemo(() => {
    const n = Number(maxResults) || 0;
    const rate = config?.quota.limits.estimatedCostPerPlaceUsd ?? 0.004;
    return Math.round(n * rate * 1000) / 1000;
  }, [maxResults, config?.quota.limits.estimatedCostPerPlaceUsd]);

  const validateForm = () => {
    if (!searchQuery.trim()) {
      toast.error("Indica qué quieres buscar");
      return false;
    }
    if (selectedSource?.requiresLocation && !location.trim()) {
      toast.error("Indica la ubicación");
      return false;
    }
    return true;
  };

  const handlePrepareRun = () => {
    if (!validateForm()) return;
    setShowConfirm(true);
  };

  const handleAbort = async () => {
    if (!activeRunId) return;
    setAborting(true);
    try {
      await scrapingService.abortRun(activeRunId);
      toast.info("Scraping cancelado en Apify");
      setActiveRunId(null);
      queryClient.invalidateQueries({ queryKey: scrapingKeys.stats() });
      onRunFinishedRef.current?.();
    } catch (error) {
      toast.error(getScrapingErrorMessage(error));
    } finally {
      setAborting(false);
    }
  };

  const handleConfirmRun = async () => {
    setShowConfirm(false);

    try {
      const consentToken = createScrapingRunConsent();
      const result = await runScraping.mutateAsync({
        consentToken,
        sourceType,
        searchQuery: searchQuery.trim(),
        location: selectedSource?.requiresLocation ? location.trim() : undefined,
        maxResults: Math.min(Number(maxResults) || 20, effectiveMax),
      });
      setActiveRunId(result.runId);
      onRunStarted?.(result.runId);
      toast.info(`${result.sourceLabel}: scraping iniciado (~$${result.estimatedCostUsd} USD est.)`);
    } catch (error) {
      toast.error(getScrapingErrorMessage(error));
    }
  };

  if (configLoading) {
    return <p className="text-sm text-muted-foreground">Cargando configuración de scraping...</p>;
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Buscar e importar empresas</h2>
        {config?.apifyReady && <Badge variant="default">Apify conectado</Badge>}
        {!config?.configured && <Badge variant="destructive">Sin proveedor</Badge>}
      </div>

      {config?.quota && (
        <div className="grid gap-2 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Ejecuciones hoy: </span>
            <strong>
              {config.quota.usage.runsToday}/{config.quota.limits.maxRunsPerDay}
            </strong>
          </div>
          <div>
            <span className="text-muted-foreground">Resultados hoy: </span>
            <strong>
              {config.quota.usage.placesToday}/{config.quota.limits.maxPlacesPerDay}
            </strong>
          </div>
          <div>
            <span className="text-muted-foreground">Disponibles: </span>
            <strong>{placesRemaining} resultados</strong>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Fuente</label>
          <Select
            value={sourceType}
            onValueChange={(v) => setSourceType(v as ScrapingSourceType)}
            disabled={isRunning}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config?.sources.map((source) => (
                <SelectItem key={source.id} value={source.id} disabled={!source.enabled}>
                  {source.label}
                  {!source.enabled ? " (no configurada)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSource && (
            <p className="mt-1 text-xs text-muted-foreground">{selectedSource.description}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Máx. resultados</label>
          <Input
            type="number"
            min={1}
            max={effectiveMax}
            value={maxResults}
            onChange={(e) => setMaxResults(e.target.value)}
            className="mt-1"
            disabled={isRunning}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Máx. {effectiveMax} por ejecución · costo est. ~${estimatedCost} USD
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Qué buscar</label>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={selectedSource?.searchPlaceholder}
            className="mt-1"
            disabled={isRunning}
          />
          <p className="mt-1 text-xs text-muted-foreground">{selectedSource?.searchHelp}</p>
        </div>
        {selectedSource?.requiresLocation && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Ubicación</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={selectedSource.locationPlaceholder ?? config?.defaults.location ?? "Ej. Santiago, Chile"}
              className="mt-1"
              disabled={isRunning}
            />
          </div>
        )}
      </div>

      {isRunning && activeRun && (
        <div className="space-y-2 rounded-md border border-dashed p-3 text-sm">
          <p className="text-muted-foreground">
            En progreso ({activeRun.sourceType ?? sourceType}): {activeRun.searchQuery}
            {activeRun.location ? ` · ${activeRun.location}` : ""} — importadas {activeRun.imported}
          </p>
          {activeRun.apifyLinks?.console && (
            <a
              href={activeRun.apifyLinks.console}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Ver run en Apify Console
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="rounded-lg border border-warning/40 bg-warning-muted/40 p-4 space-y-3">
          <p className="text-sm font-medium">¿Confirmar búsqueda de scraping?</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Fuente:</span>{" "}
              {selectedSource?.label ?? sourceType}
            </li>
            <li>
              <span className="font-medium text-foreground">Búsqueda:</span> {searchQuery.trim()}
            </li>
            {selectedSource?.requiresLocation && location.trim() && (
              <li>
                <span className="font-medium text-foreground">Ubicación:</span> {location.trim()}
              </li>
            )}
            <li>
              <span className="font-medium text-foreground">Resultados:</span>{" "}
              {Math.min(Number(maxResults) || 20, effectiveMax)} · costo est. ~${estimatedCost} USD
            </li>
          </ul>
          <div className="flex gap-2">
            <Button onClick={handleConfirmRun} disabled={!canRun}>
              <Download className="h-4 w-4" />
              Sí, ejecutar búsqueda
            </Button>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isRunning}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePrepareRun} disabled={!canRun || showConfirm}>
          <Download className={`h-4 w-4 ${isRunning ? "animate-pulse" : ""}`} />
          {isRunning ? "Scraping en curso..." : "Ejecutar búsqueda"}
        </Button>
        {isRunning && activeRunId && (
          <Button variant="outline" onClick={handleAbort} disabled={aborting}>
            <XCircle className="h-4 w-4" />
            {aborting ? "Cancelando..." : "Cancelar en Apify"}
          </Button>
        )}
      </div>

      {!config?.quota.canStartRun && (
        <p className="text-sm text-destructive">
          Límite diario alcanzado o hay un scraping en curso. Vuelve mañana o espera a que termine.
        </p>
      )}

      {selectedSource && !selectedSource.enabled && (
        <p className="text-sm text-warning">
          Configura {selectedSource.missingConfig} en el .env del backend y reinicia el servidor.
        </p>
      )}

      {config?.analysisPipeline && (
        <details className="rounded-md border p-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <Info className="h-4 w-4" />
            ¿Cómo se usa esto en el análisis IA?
          </summary>
          <p className="mt-2 text-muted-foreground">{config.analysisPipeline.summary}</p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">Datos que consume la IA:</p>
          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
            {config.analysisPipeline.dataUsed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {selectedSource?.analysisHint && (
            <p className="mt-2 text-xs text-muted-foreground">{selectedSource.analysisHint}</p>
          )}
        </details>
      )}
    </div>
  );
}
