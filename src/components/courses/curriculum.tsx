"use client";

import { ChevronDown, Lock, PlayCircle } from "lucide-react";
import { useState } from "react";
import { BunnyPlayer } from "@/components/player/bunny-player";
import { Dialog } from "@/components/ui/dialog";
import type { CurriculumModule } from "@/lib/courses/public";
import { cleanTitle, isComingSoon } from "@/lib/courses/coming-soon";
import { cn } from "@/lib/utils";

/** Temario del curso en acordeón. Las clases gratis se pueden ver en un modal. */
export function Curriculum({ modules }: { modules: CurriculumModule[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(modules[0] ? [modules[0].id] : []));
  const [preview, setPreview] = useState<{ id: string; title: string } | null>(null);
  const allOpen = open.size === modules.length;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(modules.map((m) => m.id)))}
          className="text-sm font-medium text-violet hover:underline"
        >
          {allOpen ? "Contraer todo" : "Expandir todo"}
        </button>
      </div>
      <ol className="overflow-hidden rounded-2xl border border-border">
        {modules.map((m, i) => {
          const isOpen = open.has(m.id);
          return (
            <li key={m.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(m.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 bg-surface px-4 py-4 text-left hover:bg-surface-2 sm:px-5"
              >
                <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
                <span className="flex-1 font-semibold">{m.title || `Módulo ${i + 1}`}</span>
                {m.lessons.length === 0 ? (
                  <ProntoBadge />
                ) : (
                  <span className="shrink-0 text-xs text-subtle">{m.lessons.length} {m.lessons.length === 1 ? "clase" : "clases"}</span>
                )}
              </button>
              {isOpen && m.lessons.length === 0 && (
                <p className="bg-surface-2/50 px-4 py-3 text-sm text-muted sm:px-5 sm:pl-12">Estamos preparando este módulo. Se agregará al curso sin costo extra.</p>
              )}
              {isOpen && m.lessons.length > 0 && (
                <ul className="bg-surface-2/50 py-1">
                  {m.lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5 sm:pl-12">
                      {l.is_preview ? <PlayCircle className="size-4 shrink-0 text-coral" /> : <Lock className="size-4 shrink-0 text-subtle" />}
                      <span className={cn("flex-1", l.is_preview ? "text-text" : "text-muted")}>{cleanTitle(l.title)}</span>
                      {isComingSoon(l.title) && <ProntoBadge />}
                      {l.is_preview && (
                        <button
                          type="button"
                          onClick={() => setPreview({ id: l.id, title: l.title })}
                          className="shrink-0 rounded-full bg-coral-soft px-3 py-1 text-xs font-semibold text-coral hover:bg-coral/25"
                        >
                          Ver gratis
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <Dialog open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? "Clase gratis"} className="sm:max-w-3xl">
        {preview && <BunnyPlayer endpoint={`/api/video/lesson/${preview.id}`} title={preview.title} />}
        <p className="mt-4 text-sm text-muted">Esta es una clase de muestra. Compra el curso para ver todas las clases.</p>
      </Dialog>
    </div>
  );
}

export function ProntoBadge() {
  return <span className="shrink-0 rounded-full bg-violet-soft px-2.5 py-0.5 text-xs font-semibold text-violet">Pronto</span>;
}
