"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalysisStatus, ContactStatus, ProcessingStatus } from "@/types";

export interface CompanyFiltersState {
  analysisStatus?: AnalysisStatus;
  processingStatus?: ProcessingStatus;
  contactStatus?: ContactStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface CompanyFiltersProps {
  filters: CompanyFiltersState;
  onChange: (filters: CompanyFiltersState) => void;
}

export function CompanyFilters({ filters, onChange }: CompanyFiltersProps) {
  const update = (key: keyof CompanyFiltersState, value: string) => {
    onChange({ ...filters, [key]: value === "all" ? undefined : value });
  };

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
      <Select
        value={filters.analysisStatus ?? "all"}
        onValueChange={(v) => update("analysisStatus", v)}
      >
        <SelectTrigger className="w-full min-w-0 sm:w-[9.5rem]">
          <SelectValue placeholder="Análisis" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos análisis</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="analyzing">Analizando</SelectItem>
          <SelectItem value="completed">Completado</SelectItem>
          <SelectItem value="failed">Fallido</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.processingStatus ?? "all"}
        onValueChange={(v) => update("processingStatus", v)}
      >
        <SelectTrigger className="w-full min-w-0 sm:w-[10rem]">
          <SelectValue placeholder="Procesamiento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos procesos</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="processing">Procesando</SelectItem>
          <SelectItem value="completed">Completado</SelectItem>
          <SelectItem value="failed">Fallido</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.contactStatus ?? "all"}
        onValueChange={(v) => update("contactStatus", v)}
      >
        <SelectTrigger className="w-full min-w-0 sm:w-[9.5rem]">
          <SelectValue placeholder="Contacto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos contactos</SelectItem>
          <SelectItem value="not_contacted">Sin contacto</SelectItem>
          <SelectItem value="contacted">Contactado</SelectItem>
          <SelectItem value="in_progress">En progreso</SelectItem>
          <SelectItem value="converted">Convertido</SelectItem>
          <SelectItem value="rejected">Rechazado</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sortBy ?? "createdAt"}
        onValueChange={(v) => update("sortBy", v)}
      >
        <SelectTrigger className="w-full min-w-0 sm:w-[8.75rem]">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">Fecha</SelectItem>
          <SelectItem value="aiScore">Score IA</SelectItem>
          <SelectItem value="name">Nombre</SelectItem>
          <SelectItem value="city">Ciudad</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sortOrder ?? "desc"}
        onValueChange={(v) => update("sortOrder", v as "asc" | "desc")}
      >
        <SelectTrigger className="w-full min-w-0 sm:w-[7.5rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">Desc</SelectItem>
          <SelectItem value="asc">Asc</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
