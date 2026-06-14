import type { IntakePhaseId } from "@/types/assessment";

export interface PhaseGuidance {
  title: string;
  subtitle: string;
  /** Preguntas listas para leer en la reunión */
  askClient: string[];
  tip: string;
}

export const PHASE_GUIDANCE: Record<IntakePhaseId, PhaseGuidance> = {
  general: {
    title: "Contexto de la reunión",
    subtitle: "Datos básicos que puedes confirmar en los primeros 5 minutos.",
    askClient: [
      "¿Cuántas personas trabajan en la operación día a día?",
      "¿Quién decide sobre cambios de sistemas o procesos?",
      "¿Quién más participó hoy en la reunión?",
    ],
    tip: "No necesitas respuestas perfectas — anota lo que sepas y completa después.",
  },
  systems: {
    title: "Herramientas que usan hoy",
    subtitle: "Lista lo que la empresa usa para operar (aunque sea Excel o WhatsApp).",
    askClient: [
      "¿Dónde guardan la información de ventas, stock o clientes?",
      "¿Qué programa abren más seguido en el día?",
      "¿Qué herramienta les gusta y cuál les frustra?",
    ],
    tip: "Empieza con 1–2 herramientas principales; puedes agregar más después.",
  },
  processes: {
    title: "Cómo trabajan día a día",
    subtitle: "Describe 2 procesos que repiten seguido (venta, despacho, cobranza, etc.).",
    askClient: [
      "Cuéntame paso a paso qué pasa cuando llega un pedido.",
      "¿Qué parte del proceso es más lenta o manual?",
      "¿Quién es responsable de cada paso?",
    ],
    tip: "Piensa en un ejemplo real de esta semana, no en el proceso ideal.",
  },
  categories: {
    title: "Evaluación por área",
    subtitle: "Recorre cada área del framework. Solo necesitas una nota y una frase por área.",
    askClient: [
      "En esta área, ¿qué está funcionando bien?",
      "¿Qué les duele o les preocupa más?",
      "Si tuvieran que puntuar del 0 al 5, ¿dónde están hoy?",
    ],
    tip: "El checklist es opcional — marca solo lo que reconozcan sin dudar.",
  },
  information_flow: {
    title: "Cómo se mueve la información",
    subtitle: "Una sola descripción vale; el detalle extra es opcional.",
    askClient: [
      "Cuando un dato entra a la empresa, ¿cómo llega hasta quien lo necesita?",
      "¿En qué momento se pierde o se duplica información?",
      "¿Qué pasos son 100% manuales (papel, WhatsApp, Excel)?",
    ],
    tip: "Si no saben responder, describe lo que observaste en la reunión.",
  },
  findings: {
    title: "Hallazgos en vivo",
    subtitle: "Registra problemas, quick wins y riesgos mientras conversan.",
    askClient: [],
    tip: "Usa el panel derecho: no hace falta formulario largo aquí.",
  },
  roadmap: {
    title: "Qué harían primero",
    subtitle: "Prioridades sugeridas — puedes dejar vacío lo que no hayan definido.",
    askClient: [
      "Si tuvieran que arreglar una cosa este mes, ¿cuál sería?",
      "¿Qué proyecto les gustaría ver en 3–6 meses?",
    ],
    tip: "Solo el bloque de 0–30 días suele ser suficiente para el informe.",
  },
  review: {
    title: "Revisión final",
    subtitle: "Verifica completitud y score antes de generar el informe.",
    askClient: [],
    tip: "Puedes generar el informe desde el tab Informe cuando llegues a ≥55%.",
  },
};

/** Preguntas guía por categoría del framework (ids comunes del backend) */
export const CATEGORY_CLIENT_PROMPTS: Record<string, string[]> = {
  datos: [
    "¿Dónde está la información hoy: Excel, varios archivos, un sistema?",
    "¿Confían en los números que ven en reportes?",
  ],
  procesos: [
    "¿Qué procesos dependen de una sola persona?",
    "¿Hay pasos que se repiten sin automatizar?",
  ],
  tecnologia: [
    "¿Los sistemas hablan entre sí o hay copiar-pegar?",
    "¿Tienen respaldo o soporte cuando algo falla?",
  ],
  personas: [
    "¿El equipo está capacitado en las herramientas actuales?",
    "¿Hay resistencia al cambio o falta de tiempo?",
  ],
  gobernanza: [
    "¿Quién define reglas y quién las cumple?",
    "¿Hay políticas claras de datos y accesos?",
  ],
};

export const DEFAULT_CATEGORY_PROMPTS = [
  "¿Qué funciona bien en esta área?",
  "¿Qué les preocupa o les frena?",
];

export const SCORE_LEVELS = [
  { value: 0, label: "0", description: "No existe / crítico" },
  { value: 1, label: "1", description: "Muy deficiente" },
  { value: 2, label: "2", description: "Bajo" },
  { value: 3, label: "3", description: "Aceptable" },
  { value: 4, label: "4", description: "Bueno" },
  { value: 5, label: "5", description: "Excelente" },
] as const;
