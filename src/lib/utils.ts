import { twMerge } from "tailwind-merge";

/** Une clases CSS; si dos clases de Tailwind chocan (p. ej. h-11 y h-10), gana la última. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}

/** Solo permite redirecciones internas (evita "open redirect" a otros sitios). */
export function safeNext(value: FormDataEntryValue | string | null | undefined, fallback = "/mis-cursos") {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
