"use client";

import { Loader2, Lock, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Endpoint que devuelve { url, expiresAt } firmados: /api/video/lesson/<id> o /api/video/promo/<courseId>. */
  endpoint: string;
  title: string;
  /** Se llama una vez al llegar al 90 % del video o al final. */
  onComplete?: () => void;
  className?: string;
};

const PLAYER_ORIGIN = "https://iframe.mediadelivery.net";
const COMPLETE_RATIO = 0.9;

type Signed = { ok: true; url: string; expiresAt: number } | { ok: false; message: string; locked: boolean };

/** Pide al servidor la URL firmada del video. */
async function fetchSigned(endpoint: string): Promise<Signed> {
  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const fallback = res.status >= 500 ? "El video no está disponible en este momento. Inténtalo en unos minutos." : "No se pudo cargar el video";
      return { ok: false, message: data.error ?? fallback, locked: res.status === 401 || res.status === 403 };
    }
    return { ok: true, url: data.url, expiresAt: data.expiresAt };
  } catch {
    return { ok: false, message: "No se pudo cargar el video. Revisa tu conexión.", locked: false };
  }
}

/**
 * Reproductor de Bunny en iframe. La URL firmada (1 h) la entrega el servidor solo a quien tiene acceso.
 * Si la pestaña queda abierta más tiempo, se pide una URL nueva al volver.
 */
export function BunnyPlayer({ endpoint, title, onComplete, className }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const [src, setSrc] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [error, setError] = useState<{ message: string; locked: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((r: Signed) => {
    setLoading(false);
    if (r.ok) {
      setError(null);
      setSrc(r.url);
      setExpiresAt(r.expiresAt);
    } else {
      setError({ message: r.message, locked: r.locked });
    }
  }, []);

  const load = useCallback(() => fetchSigned(endpoint).then(apply), [endpoint, apply]);

  const retry = () => {
    setError(null);
    setLoading(true);
    load();
  };

  useEffect(() => {
    let cancelled = false;
    completed.current = false;
    fetchSigned(endpoint).then((r) => !cancelled && apply(r));
    return () => {
      cancelled = true;
    };
  }, [endpoint, apply]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && expiresAt && Date.now() > expiresAt - 60_000) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [expiresAt, load]);

  // Bunny habla el protocolo player.js por postMessage: pedimos los eventos de avance y fin.
  useEffect(() => {
    const send = (method: string, value?: string) =>
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ context: "player.js", version: "0.0.11", method, value, listener: value }),
        PLAYER_ORIGIN,
      );
    const complete = () => {
      if (completed.current) return;
      completed.current = true;
      onCompleteRef.current?.();
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== PLAYER_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      let data: { context?: string; event?: string; value?: { seconds?: number; duration?: number } };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (data?.context !== "player.js") return;
      if (data.event === "ready") {
        send("addEventListener", "timeupdate");
        send("addEventListener", "ended");
      } else if (data.event === "ended") {
        complete();
      } else if (data.event === "timeupdate") {
        const { seconds = 0, duration = 0 } = data.value ?? {};
        if (duration > 0 && seconds / duration >= COMPLETE_RATIO) complete();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [src]);

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-2xl", className)}>
      {src && !error ? (
        <iframe
          ref={iframeRef}
          key={src}
          src={src}
          title={title}
          loading="eager"
          className="absolute inset-0 size-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-surface text-center">
          {loading ? (
            <Loader2 className="size-8 animate-spin text-violet" />
          ) : (
            <div className="space-y-3 px-6">
              {error?.locked && <Lock className="mx-auto size-7 text-muted" />}
              <p className="font-semibold">{error?.message ?? "No se pudo cargar el video"}</p>
              {!error?.locked && (
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-medium hover:bg-border"
                >
                  <RefreshCw className="size-4" /> Reintentar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
