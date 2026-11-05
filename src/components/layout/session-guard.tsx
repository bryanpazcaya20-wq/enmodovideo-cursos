"use client";

import { MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";

const EVERY_MS = 45_000;

/**
 * Revisa cada 45 s (y al volver a la pestaña) que esta sesión siga siendo la única.
 * Si la cuenta se abrió en otro dispositivo, detiene el video y pide volver a ingresar.
 */
export function SessionGuard() {
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    let stopped = false;
    async function check() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (res.status === 401) {
          stopped = true;
          document.querySelectorAll("iframe").forEach((f) => f.remove());
          setKicked(true);
        }
      } catch {
        // Sin conexión: se vuelve a intentar en el siguiente latido.
      }
    }
    const timer = setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!kicked) return null;

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="kicked-title" className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-surface p-6 text-center shadow-2xl">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-coral-soft text-coral">
          <MonitorSmartphone className="size-7" />
        </span>
        <h2 id="kicked-title" className="font-display text-xl font-semibold">
          Tu cuenta se abrió en otro dispositivo
        </h2>
        <p className="text-sm text-muted">Solo se permite una sesión a la vez, así que cerramos esta. Si no fuiste tú, cambia tu contraseña.</p>
        <a
          href="/ingresar?error=otro-dispositivo"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-coral font-semibold text-white hover:bg-coral/90"
        >
          Volver a ingresar
        </a>
      </div>
    </div>
  );
}
