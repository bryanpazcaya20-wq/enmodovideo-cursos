// Formatos de fecha en hora de Perú.
const TZ = "America/Lima";

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

/** "2026-11-05T10:00" para <input type="datetime-local"> en hora de Perú. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

/** De <input type="datetime-local"> (hora de Perú, UTC-5) a ISO. */
export function fromLocalInput(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(`${value}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
