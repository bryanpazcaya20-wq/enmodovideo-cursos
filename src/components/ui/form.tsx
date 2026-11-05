"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-text">
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

const inputBase =
  "h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-base text-text placeholder:text-subtle transition-colors focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function PasswordInput(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-24" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-3 text-xs font-medium text-muted hover:bg-surface hover:text-text"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText = "Un momento…",
  variant = "primary",
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClasses(variant, "lg", cn("w-full", className))}>
      {pending && <Spinner />}
      {pending ? pendingText : children}
    </button>
  );
}

export function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

export function Alert({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-danger/40 bg-danger/10 text-danger",
    success: "border-success/40 bg-success/10 text-success",
    info: "border-violet/40 bg-violet-soft text-text",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", styles)}>
      {children}
    </div>
  );
}
