/**
 * El API guarda tickets en campos `*Usd` pero los valores representan miles de pesos chilenos
 * (ej. 3500 → $3.500.000 CLP). Valores ≥ 100.000 se asumen ya en pesos completos.
 */
const FULL_CLP_THRESHOLD = 100_000;
const THOUSANDS_MULTIPLIER = 1_000;

export function ticketToClp(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  if (raw >= FULL_CLP_THRESHOLD) return Math.round(raw);
  return Math.round(raw * THOUSANDS_MULTIPLIER);
}

/** Convierte pesos chilenos completos al formato almacenado en el API. */
export function clpToTicketStorage(clp: number | null | undefined): number | null {
  if (clp == null || !Number.isFinite(clp)) return null;
  if (clp >= FULL_CLP_THRESHOLD) return Math.round(clp / THOUSANDS_MULTIPLIER);
  return Math.round(clp);
}

export function formatClp(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

export function formatTicketRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  const minClp = ticketToClp(min);
  const maxClp = ticketToClp(max);

  if (minClp == null && maxClp == null) return "—";
  if (minClp != null && maxClp != null) return `${formatClp(minClp)} – ${formatClp(maxClp)}`;
  if (minClp != null) return `Desde ${formatClp(minClp)}`;
  return `Hasta ${formatClp(maxClp)}`;
}

export function clpInputValue(raw: number | null | undefined): string {
  const clp = ticketToClp(raw);
  return clp != null ? String(clp) : "";
}
