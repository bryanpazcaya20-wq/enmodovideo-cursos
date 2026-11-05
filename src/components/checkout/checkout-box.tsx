"use client";

import { CheckCircle2, Loader2, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Input } from "@/components/ui/form";
import { formatUsd } from "@/lib/pricing";

type PayPalButtonsInstance = { render: (el: HTMLElement) => Promise<void>; close?: () => Promise<void>; isEligible?: () => boolean };
type PayPalNamespace = {
  FUNDING: { PAYPAL: string; CARD: string };
  Buttons: (opts: {
    fundingSource?: string;
    style?: Record<string, string | number | boolean>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }) => PayPalButtonsInstance;
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const SCRIPT_ID = "paypal-sdk";

function loadSdk(clientId: string): Promise<PayPalNamespace> {
  if (window.paypal) return Promise.resolve(window.paypal);
  return new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons&enable-funding=card&disable-funding=paylater,venmo&locale=es_ES`;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal no cargó"))));
    script.addEventListener("error", () => reject(new Error("No se pudo cargar PayPal. Revisa tu conexión o desactiva el bloqueador de anuncios.")));
  });
}

type Totals = { price: number; discount: number; total: number; coupon: { code: string; label: string } | null };

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Ocurrió un error."), { data });
  return data as T;
}

type Phase = "idle" | "confirming" | "done";

export function CheckoutBox({
  slug,
  initial,
  clientId,
  initialCoupon,
  initialCouponError,
  couponsEnabled = true,
}: {
  slug: string;
  initial: Totals;
  clientId: string | null;
  initialCoupon?: string;
  initialCouponError?: string | null;
  couponsEnabled?: boolean;
}) {
  const router = useRouter();
  const [totals, setTotals] = useState<Totals>(initial);
  const [code, setCode] = useState(initialCoupon ?? "");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(initialCouponError ?? null);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sdkState, setSdkState] = useState<"loading" | "ready" | "error">("loading");
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // El cupón vigente se lee al crear la orden (los botones de PayPal no se vuelven a montar).
  const couponRef = useRef<string | undefined>(initial.coupon?.code);
  useEffect(() => {
    couponRef.current = totals.coupon?.code;
  }, [totals.coupon?.code]);

  const goToCourse = useCallback(() => {
    setPhase("done");
    router.push(`/aprender/${slug}?bienvenida=1`);
    router.refresh();
  }, [router, slug]);

  const applyCode = useCallback(
    async (value: string) => {
      setCouponError(null);
      setCouponBusy(true);
      try {
        const q = await post<Totals>({ action: "quote", slug, coupon: value || undefined });
        setTotals(q);
        if (value && !q.coupon) setCouponError("Ese cupón no es válido.");
      } catch (e) {
        setCouponError(e instanceof Error ? e.message : "Ese cupón no es válido.");
      } finally {
        setCouponBusy(false);
      }
    },
    [slug],
  );

  const isFree = totals.total <= 0;

  useEffect(() => {
    if (!clientId || isFree) return;
    let cancelled = false;
    const instances: PayPalButtonsInstance[] = [];

    loadSdk(clientId)
      .then(async (paypal) => {
        if (cancelled) return;
        const common = {
          async createOrder() {
            setMessage(null);
            try {
              const { id } = await post<{ id: string }>({ action: "create", slug, coupon: couponRef.current });
              return id;
            } catch (e) {
              const err = e as Error & { data?: { enrolled?: boolean } };
              if (err.data?.enrolled) goToCourse();
              setMessage({ tone: "error", text: err.message });
              throw e;
            }
          },
          async onApprove(data: { orderID: string }) {
            setPhase("confirming");
            try {
              await post({ action: "capture", paypalOrderId: data.orderID });
              goToCourse();
            } catch (e) {
              setPhase("idle");
              setMessage({
                tone: "error",
                text: `${e instanceof Error ? e.message : "No pudimos confirmar el pago."} Si se realizó el cobro, tu curso se activará en unos minutos.`,
              });
            }
          },
          onCancel() {
            setMessage({ tone: "info", text: "Cancelaste el pago. Puedes intentarlo cuando quieras." });
          },
          onError(err: unknown) {
            console.error("[paypal]", err);
            setMessage((m) => m ?? { tone: "error", text: "PayPal tuvo un problema. Inténtalo de nuevo en un momento." });
          },
        };
        const targets: Array<[string, HTMLDivElement | null, Record<string, string | number | boolean>]> = [
          [paypal.FUNDING.PAYPAL, paypalRef.current, { shape: "pill", color: "gold", layout: "vertical", label: "pay", height: 50 }],
          [paypal.FUNDING.CARD, cardRef.current, { shape: "pill", color: "black", layout: "vertical", height: 50 }],
        ];
        for (const [fundingSource, el, style] of targets) {
          if (!el) continue;
          const b = paypal.Buttons({ fundingSource, style, ...common });
          if (b.isEligible && !b.isEligible()) continue;
          instances.push(b);
          await b.render(el);
        }
        if (!cancelled) setSdkState("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setSdkState("error");
        setMessage({ tone: "error", text: e instanceof Error ? e.message : "No se pudo cargar PayPal" });
      });

    return () => {
      cancelled = true;
      instances.forEach((b) => b.close?.().catch(() => {}));
    };
  }, [clientId, isFree, slug, goToCourse]);

  async function claimFree() {
    setMessage(null);
    setPhase("confirming");
    try {
      await post({ action: "free", slug, coupon: totals.coupon?.code });
      goToCourse();
    } catch (e) {
      setPhase("idle");
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "No pudimos activar tu curso." });
    }
  }

  return (
    <div className="space-y-5">
      {/* Totales */}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between text-muted">
          <dt>Precio del curso</dt>
          <dd>{formatUsd(totals.price)}</dd>
        </div>
        {totals.coupon && (
          <div className="flex justify-between text-success">
            <dt className="flex items-center gap-1.5">
              <Tag className="size-3.5" /> Cupón {totals.coupon.code} ({totals.coupon.label})
            </dt>
            <dd>-{formatUsd(totals.discount)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-semibold">Total a pagar</dt>
          <dd className="font-display text-3xl font-semibold">
            {formatUsd(totals.total)} <span className="text-xs font-medium text-subtle">USD</span>
          </dd>
        </div>
      </dl>

      {/* Cupón */}
      {totals.coupon ? (
        <button
          type="button"
          disabled={phase !== "idle"}
          onClick={() => {
            setCode("");
            applyCode("");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <X className="size-4" /> Quitar cupón
        </button>
      ) : !couponsEnabled ? null : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) applyCode(code.trim());
          }}
        >
          <label htmlFor="coupon" className="text-sm font-medium">
            ¿Tienes un cupón de descuento?
          </label>
          <div className="flex gap-2">
            <Input
              id="coupon"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej. TIKTOK30"
              autoComplete="off"
              className="h-11 uppercase"
              maxLength={40}
            />
            <Button type="submit" variant="secondary" disabled={couponBusy || !code.trim()} className="h-11 shrink-0">
              {couponBusy ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
            </Button>
          </div>
          {couponError && <p className="text-sm text-danger">{couponError}</p>}
        </form>
      )}

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {phase === "confirming" && (
        <div className="flex h-13 items-center justify-center gap-2 rounded-full bg-surface-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Confirmando tu compra…
        </div>
      )}
      {phase === "done" && (
        <div className="flex h-13 items-center justify-center gap-2 rounded-full bg-success/15 text-sm font-semibold text-success">
          <CheckCircle2 className="size-5" /> ¡Listo! Entrando a tu curso…
        </div>
      )}

      {/* Pago */}
      {isFree ? (
        phase === "idle" && (
          <Button size="lg" className="w-full" onClick={claimFree}>
            Obtener el curso gratis
          </Button>
        )
      ) : !clientId ? (
        <Alert tone="info">Los pagos aún no están configurados. Escríbenos por WhatsApp para comprar.</Alert>
      ) : (
        <>
          {sdkState === "loading" && phase === "idle" && (
            <div className="flex h-13 items-center justify-center gap-2 rounded-full bg-surface-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Cargando métodos de pago…
            </div>
          )}
          {/* Siempre montados (PayPal necesita su contenedor); se ocultan mientras se confirma. */}
          <div
            className={sdkState === "ready" && phase === "idle" ? "space-y-3 [color-scheme:light]" : "h-0 overflow-hidden"}
            aria-label="Métodos de pago"
          >
            <div ref={paypalRef} />
            <div ref={cardRef} />
          </div>
        </>
      )}
    </div>
  );
}
