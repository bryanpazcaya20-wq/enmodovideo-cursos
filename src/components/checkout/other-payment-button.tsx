"use client";

import { Check, CreditCard, LogIn, UserPlus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { WhatsAppIcon } from "@/components/landing/brand-icons";
import { Button, LinkButton, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatUsd } from "@/lib/pricing";
import { LEGAL, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    title: "Perú",
    methods: [
      { id: "yape", label: "Yape", hint: "Pago en soles" },
      { id: "plin", label: "Plin", hint: "Pago en soles" },
      { id: "bcp", label: "Cuenta BCP", hint: "Transferencia o depósito" },
    ],
  },
  {
    title: "Otros países",
    methods: [
      { id: "binance", label: "Binance", hint: "USDT u otra cripto" },
      { id: "western", label: "Western Union", hint: "Envío internacional" },
      { id: "global66", label: "Global66", hint: "Transferencia internacional" },
    ],
  },
] as const;

type MethodId = (typeof GROUPS)[number]["methods"][number]["id"];
const ALL = GROUPS.flatMap((g) => g.methods.map((m) => ({ ...m, group: g.title })));

type Props = {
  courseTitle: string;
  slug: string;
  /** Total a pagar en USD (con promoción o cupón ya aplicados). */
  total: number;
  coupon?: string | null;
  /** Correo de la cuenta; null si no inició sesión. */
  email: string | null;
  name?: string | null;
  /** Abrir la ventana apenas carga la página (al volver del inicio de sesión). */
  initialOpen?: boolean;
  className?: string;
};

/**
 * Para quien no tiene PayPal: guía en 3 pasos (cuenta, método, resumen)
 * que termina en un mensaje de WhatsApp para cerrar la venta a mano.
 * El acceso se activa desde el panel: Admin → Dar acceso.
 */
export function OtherPaymentButton({ courseTitle, slug, total, coupon, email, name, initialOpen, className }: Props) {
  const [open, setOpen] = useState(Boolean(initialOpen));
  const [method, setMethod] = useState<MethodId | null>(null);
  const selected = ALL.find((m) => m.id === method);
  const ready = Boolean(email && selected);
  const back = `/comprar/${slug}?otros=1`;

  const message = [
    `Hola ${LEGAL.businessName} 👋 Quiero comprar un curso con otro método de pago.`,
    "",
    `• Curso: ${courseTitle}`,
    `• Total: ${formatUsd(total)} USD${coupon ? ` (cupón ${coupon})` : ""}`,
    `• Método de pago: ${selected ? `${selected.label} (${selected.group})` : "-"}`,
    `• Correo de mi cuenta: ${email ?? "-"}`,
    ...(name ? [`• Nombre: ${name}`] : []),
    "",
    "¿Me indican cómo realizar el pago?",
  ].join("\n");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses("secondary", "lg", cn("w-full", className))}>
        <CreditCard className="size-5" /> Otros métodos de pago
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Pagar con otro método" className="sm:max-w-lg">
        <p className="text-sm text-muted">
          ¿No tienes PayPal? Sigue estos pasos y terminamos tu compra de <strong className="text-text">{courseTitle}</strong> por WhatsApp.
        </p>

        <ol className="mt-5 space-y-6">
          <Step n={1} title="Tu cuenta" done={Boolean(email)}>
            {email ? (
              <p className="text-sm text-muted">
                Activaremos el curso en tu cuenta <strong className="break-all text-text">{email}</strong>.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">Crea tu cuenta gratis o ingresa. Ahí activaremos tu curso cuando confirmemos el pago.</p>
                <div className="grid grid-cols-2 gap-2">
                  <LinkButton href={`/registro?next=${encodeURIComponent(back)}`} className="w-full px-3">
                    <UserPlus className="size-4" /> Crear cuenta
                  </LinkButton>
                  <LinkButton href={`/ingresar?next=${encodeURIComponent(back)}`} variant="secondary" className="w-full px-3">
                    <LogIn className="size-4" /> Ya tengo cuenta
                  </LinkButton>
                </div>
              </div>
            )}
          </Step>

          <Step n={2} title="Elige cómo quieres pagar" done={Boolean(selected)}>
            <div className="space-y-4">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">{g.title}</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={`Métodos de pago: ${g.title}`}>
                    {g.methods.map((m) => (
                      <Choice key={m.id} selected={method === m.id} onClick={() => setMethod(m.id)}>
                        <span className="block font-semibold leading-tight">{m.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-tight text-subtle">{m.hint}</span>
                      </Choice>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Step>

          <Step n={3} title="Confirma tu compra" done={ready}>
            <div className="flex items-baseline justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              <span className="text-sm text-muted">{courseTitle}</span>
              <span className="shrink-0 font-display text-2xl font-semibold">{formatUsd(total)} USD</span>
            </div>
            {coupon && <p className="mt-2 text-xs text-success">Incluye el cupón {coupon}.</p>}
          </Step>
        </ol>

        <div className="mt-6 space-y-2">
          {ready ? (
            <a
              href={whatsappLink(message)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("primary", "lg", "w-full bg-[#25d366] text-[#0b2e17] shadow-none hover:bg-[#3ee07a]")}
            >
              <WhatsAppIcon /> Continuar por WhatsApp
            </a>
          ) : (
            <Button size="lg" disabled className="w-full">
              <WhatsAppIcon /> Continuar por WhatsApp
            </Button>
          )}
          <p className="text-center text-xs text-subtle">
            {!email
              ? "Primero crea tu cuenta o inicia sesión."
              : !selected
                ? "Elige un método de pago para continuar."
                : "Te enviaremos los datos para pagar y activaremos tu curso apenas lo confirmemos."}
          </p>
        </div>
      </Dialog>
    </>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold",
          done ? "bg-success text-bg" : "bg-surface-2 text-muted",
        )}
        aria-hidden
      >
        {done ? <Check className="size-4" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-2 font-semibold">{title}</p>
        {children}
      </div>
    </li>
  );
}

function Choice({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
        selected ? "border-coral bg-coral-soft" : "border-border bg-surface-2 hover:border-violet/60",
        className,
      )}
    >
      {children}
    </button>
  );
}
