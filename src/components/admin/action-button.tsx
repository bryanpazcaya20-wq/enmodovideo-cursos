"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/actions/admin-courses";
import { Spinner } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const tones = {
  default: "bg-surface-2 text-text border border-border hover:border-violet/60",
  primary: "bg-coral text-white hover:bg-coral-hover",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
};

/** Botón que ejecuta una Server Action del panel, con confirmación opcional y mensaje de resultado. */
export function ActionButton({
  action,
  children,
  confirm,
  tone = "default",
  className,
  showMessage = true,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  confirm?: string;
  tone?: keyof typeof tones;
  className?: string;
  showMessage?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            setResult(r);
            if (r.ok) router.refresh();
          });
        }}
        className={cn("inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-50", tones[tone], className)}
      >
        {pending && <Spinner />}
        {children}
      </button>
      {showMessage && result && (
        <span className={cn("text-xs", result.ok ? "text-success" : "text-danger")}>{result.ok ? result.message : result.error}</span>
      )}
    </span>
  );
}
