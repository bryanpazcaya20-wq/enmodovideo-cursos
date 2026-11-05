"use client";

import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, ListVideo, PlayCircle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setLessonDoneAction } from "@/actions/learn";
import { BunnyPlayer } from "@/components/player/bunny-player";
import type { LearnCourse } from "@/lib/courses/learn";
import { cn } from "@/lib/utils";

type Props = {
  course: LearnCourse;
  lessonId: string;
  hasVideo: boolean;
  bodyHtml: string;
  welcome?: boolean;
};

export function LessonView({ course, lessonId, hasVideo, bodyHtml, welcome }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(!!welcome);
  // Avance local optimista (se confirma en el servidor)
  const [doneIds, setDoneIds] = useState(() => new Set(course.flat.filter((l) => l.done).map((l) => l.id)));

  const index = course.flat.findIndex((l) => l.id === lessonId);
  const lesson = course.flat[index];
  const prev = course.flat[index - 1];
  const next = course.flat[index + 1];
  const moduleOf = course.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
  const done = doneIds.has(lessonId);
  const pct = course.flat.length ? Math.round((doneIds.size / course.flat.length) * 100) : 0;

  function setDone(value: boolean, id = lessonId) {
    setDoneIds((s) => {
      const n = new Set(s);
      if (value) n.add(id);
      else n.delete(id);
      return n;
    });
    startTransition(async () => {
      const res = await setLessonDoneAction({ lessonId: id, courseId: course.id, done: value });
      if (!res.ok) {
        setDoneIds((s) => {
          const n = new Set(s);
          if (value) n.delete(id);
          else n.add(id);
          return n;
        });
      }
    });
  }

  function completeAndNext() {
    if (!done) setDone(true);
    if (next) router.push(`/aprender/${course.slug}/${next.id}`);
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <Link href={`/cursos/${course.slug}`} className="font-display text-lg font-semibold leading-tight hover:text-coral">
          {course.title}
        </Link>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-gradient-to-r from-coral to-violet transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-subtle">
          {doneIds.size} de {course.flat.length} clases · {pct}%
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {course.modules.map((m) => (
          <ModuleGroup key={m.id} title={m.title} defaultOpen={m.id === moduleOf?.id}>
            {m.lessons.map((l) => {
              const active = l.id === lessonId;
              const isDone = doneIds.has(l.id);
              return (
                <li key={l.id}>
                  <Link
                    href={`/aprender/${course.slug}/${l.id}`}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-start gap-2.5 px-4 py-2.5 text-sm transition-colors",
                      active ? "bg-violet-soft text-text" : "text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : active ? (
                      <PlayCircle className="mt-0.5 size-4 shrink-0 text-coral" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-subtle" />
                    )}
                    <span className="flex-1">{l.title}</span>
                  </Link>
                </li>
              );
            })}
          </ModuleGroup>
        ))}
      </div>
    </div>
  );

  if (!lesson) return null;

  return (
    <div className="mx-auto flex max-w-[1600px] lg:h-[calc(100dvh-4rem)]">
      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
        {showWelcome && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm">
            <CheckCircle2 className="size-5 shrink-0 text-success" />
            <p className="flex-1">
              <strong>¡Compra confirmada!</strong> El curso ya es tuyo. Te enviamos el comprobante a tu correo. ¡A editar! 🎬
            </p>
            <button type="button" onClick={() => setShowWelcome(false)} aria-label="Cerrar" className="text-muted hover:text-text">
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="mx-auto max-w-5xl">
          {hasVideo ? (
            <BunnyPlayer key={lesson.id} endpoint={`/api/video/lesson/${lesson.id}`} title={lesson.title} onComplete={() => !doneIds.has(lesson.id) && setDone(true, lesson.id)} />
          ) : null}

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-coral">{moduleOf?.title}</p>
              <h1 className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl">{lesson.title}</h1>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDone(!done)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                done ? "border-success/50 bg-success/10 text-success" : "border-border bg-surface-2 text-muted hover:text-text",
              )}
            >
              {done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
              {done ? "Completada" : "Marcar como completada"}
            </button>
          </div>

          {bodyHtml && <div className="rich mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
            {prev ? (
              <Link href={`/aprender/${course.slug}/${prev.id}`} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text">
                <ChevronLeft className="size-4" /> Anterior
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <button
                type="button"
                onClick={completeAndNext}
                className="inline-flex items-center gap-1.5 rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] hover:bg-coral-hover"
              >
                Siguiente clase <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!done) setDone(true);
                  router.push("/mis-cursos");
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-bg hover:bg-success/90"
              >
                <CheckCircle2 className="size-4" /> Terminar curso
              </button>
            )}
          </div>

          {/* Temario en celular */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold lg:hidden"
          >
            <ListVideo className="size-4" /> Ver temario ({doneIds.size}/{course.flat.length})
          </button>
        </div>
      </div>

      <aside className="hidden w-[360px] shrink-0 border-l border-border bg-surface/60 lg:block">{sidebar}</aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Temario">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setMenuOpen(false)} aria-label="Cerrar temario" />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-surface shadow-2xl">
            <button type="button" onClick={() => setMenuOpen(false)} className="absolute right-3 top-3 z-10 rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Cerrar">
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleGroup({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-border/60">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold hover:bg-surface-2">
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
        <span className="flex-1">{title}</span>
      </button>
      {open && <ul className="pb-2">{children}</ul>}
    </div>
  );
}
