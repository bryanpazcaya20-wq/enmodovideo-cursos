"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Modal accesible basado en <dialog>. En celular se abre como hoja desde abajo. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-3xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Cerrar">
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}
