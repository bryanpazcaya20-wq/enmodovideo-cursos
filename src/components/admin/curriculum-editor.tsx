"use client";

import { ArrowDown, ArrowUp, Check, Eye, Film, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  addModuleAction,
  deleteLessonAction,
  deleteModuleAction,
  getLessonForEditAction,
  renameModuleAction,
  saveLessonAction,
  saveOrderAction,
} from "@/actions/admin-courses";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, Field, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export type EditorLesson = { id: string; title: string; is_preview: boolean; has_video: boolean };
export type EditorModule = { id: string; title: string; lessons: EditorLesson[] };

type LessonDraft = { moduleId: string; lessonId: string | null };

export function CurriculumEditor({ courseId, initial }: { courseId: string; initial: EditorModule[] }) {
  const router = useRouter();
  const [modules, setModules] = useState(initial);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newModule, setNewModule] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [draft, setDraft] = useState<LessonDraft | null>(null);

  // Si el servidor manda un temario nuevo (tras guardar), lo tomamos.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setModules(initial);
  }

  function persist(next: EditorModule[]) {
    setModules(next);
    startSave(async () => {
      const r = await saveOrderAction(courseId, next.map((m) => ({ id: m.id, lessons: m.lessons.map((l) => l.id) })));
      if (!r.ok) setError(r.error);
    });
  }

  function moveModule(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    const next = [...modules];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  }

  function moveLesson(mi: number, li: number, dir: -1 | 1) {
    const next = modules.map((m) => ({ ...m, lessons: [...m.lessons] }));
    const lessons = next[mi].lessons;
    const j = li + dir;
    if (j >= 0 && j < lessons.length) {
      [lessons[li], lessons[j]] = [lessons[j], lessons[li]];
    } else {
      // Pasar al módulo anterior/siguiente
      const target = next[mi + dir];
      if (!target) return;
      const [lesson] = lessons.splice(li, 1);
      if (dir === -1) target.lessons.push(lesson);
      else target.lessons.unshift(lesson);
    }
    persist(next);
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.error ?? "Error");
    else router.refresh();
    return r.ok;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Usa las flechas para ordenar. Las clases pueden pasar de un módulo a otro.</p>
        {saving && (
          <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
            <Loader2 className="size-3.5 animate-spin" /> Guardando orden…
          </span>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      <ol className="space-y-4">
        {modules.map((m, mi) => (
          <li key={m.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-2/60 px-3 py-2.5">
              <div className="flex">
                <IconBtn label="Subir módulo" onClick={() => moveModule(mi, -1)} disabled={mi === 0}><ArrowUp className="size-4" /></IconBtn>
                <IconBtn label="Bajar módulo" onClick={() => moveModule(mi, 1)} disabled={mi === modules.length - 1}><ArrowDown className="size-4" /></IconBtn>
              </div>
              {renaming?.id === m.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await run(() => renameModuleAction(courseId, m.id, renaming.title))) setRenaming(null);
                  }}
                >
                  <Input value={renaming.title} onChange={(e) => setRenaming({ id: m.id, title: e.target.value })} className="h-9 text-sm" autoFocus />
                  <IconBtn label="Guardar" type="submit"><Check className="size-4" /></IconBtn>
                  <IconBtn label="Cancelar" onClick={() => setRenaming(null)}><X className="size-4" /></IconBtn>
                </form>
              ) : (
                <p className="flex-1 font-semibold">{m.title}</p>
              )}
              <span className="text-xs text-subtle">{m.lessons.length} clases</span>
              <IconBtn label="Renombrar módulo" onClick={() => setRenaming({ id: m.id, title: m.title })}><Pencil className="size-4" /></IconBtn>
              <IconBtn
                label="Eliminar módulo"
                onClick={() => window.confirm(`¿Eliminar el módulo «${m.title}»?`) && run(() => deleteModuleAction(courseId, m.id))}
                className="hover:text-danger"
              >
                <Trash2 className="size-4" />
              </IconBtn>
            </div>

            <ul className="divide-y divide-border/60">
              {m.lessons.map((l, li) => (
                <li key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <div className="flex">
                    <IconBtn label="Subir clase" onClick={() => moveLesson(mi, li, -1)} disabled={mi === 0 && li === 0}><ArrowUp className="size-3.5" /></IconBtn>
                    <IconBtn label="Bajar clase" onClick={() => moveLesson(mi, li, 1)} disabled={mi === modules.length - 1 && li === m.lessons.length - 1}><ArrowDown className="size-3.5" /></IconBtn>
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs text-subtle">{li + 1}.</span>
                  <button type="button" onClick={() => setDraft({ moduleId: m.id, lessonId: l.id })} className="flex-1 truncate text-left hover:text-coral">
                    {l.title}
                  </button>
                  {l.is_preview && <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral">Gratis</span>}
                  <span title={l.has_video ? "Tiene video" : "Sin video"} className={l.has_video ? "text-success" : "text-subtle"}>
                    <Film className="size-4" />
                  </span>
                  <IconBtn label="Editar clase" onClick={() => setDraft({ moduleId: m.id, lessonId: l.id })}><Pencil className="size-4" /></IconBtn>
                  <IconBtn
                    label="Eliminar clase"
                    onClick={() => window.confirm(`¿Eliminar la clase «${l.title}»? El avance de los alumnos en esta clase se perderá.`) && run(() => deleteLessonAction(courseId, l.id))}
                    className="hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </IconBtn>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setDraft({ moduleId: m.id, lessonId: null })}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-violet hover:bg-surface-2"
            >
              <Plus className="size-4" /> Agregar clase a este módulo
            </button>
          </li>
        ))}
      </ol>

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => addModuleAction(courseId, newModule))) setNewModule("");
        }}
      >
        <Input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="Nombre del nuevo módulo (ej. Módulo 12: Extras)" className="h-11" />
        <Button type="submit" variant="secondary" className="h-11 shrink-0" disabled={!newModule.trim()}>
          <Plus className="size-4" /> Módulo
        </Button>
      </form>

      {draft && (
        <LessonDialog
          courseId={courseId}
          draft={draft}
          modules={modules}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function LessonDialog({
  courseId,
  draft,
  modules,
  onClose,
  onSaved,
}: {
  courseId: string;
  draft: LessonDraft;
  modules: EditorModule[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(!!draft.lessonId);
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [video, setVideo] = useState("");
  const [minutes, setMinutes] = useState("");
  const [preview, setPreview] = useState(false);
  const [body, setBody] = useState("");
  const [moduleId, setModuleId] = useState(draft.moduleId);

  useEffect(() => {
    if (!draft.lessonId) return;
    getLessonForEditAction(draft.lessonId).then((l) => {
      if (l) {
        setTitle(l.title);
        setVideo(l.bunny_video_id ?? "");
        setMinutes(l.duration_seconds ? String(Math.round(l.duration_seconds / 60)) : "");
        setPreview(l.is_preview);
        setBody(l.body_html ?? "");
      }
      setLoading(false);
    });
  }, [draft.lessonId]);

  function save() {
    setError(null);
    start(async () => {
      const r = await saveLessonAction(courseId, moduleId, draft.lessonId, {
        title,
        video,
        body_html: body,
        is_preview: preview,
        duration_minutes: minutes === "" ? null : Number(minutes),
      });
      if (!r.ok) return setError(r.error);
      // Si cambió de módulo, lo movemos al final del módulo elegido
      if (draft.lessonId && moduleId !== draft.moduleId) {
        const next = modules.map((m) => ({ id: m.id, lessons: m.lessons.map((l) => l.id).filter((id) => id !== draft.lessonId) }));
        next.find((m) => m.id === moduleId)?.lessons.push(draft.lessonId);
        await saveOrderAction(courseId, next);
      }
      onSaved();
    });
  }

  return (
    <Dialog open onClose={onClose} title={draft.lessonId ? "Editar clase" : "Nueva clase"} className="sm:max-w-2xl">
      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="size-6 animate-spin text-violet" />
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Título de la clase" htmlFor="l-title">
            <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} autoFocus />
          </Field>
          <Field label="Video de Bunny" htmlFor="l-video" hint={<span className="text-xs text-subtle">vacío = clase solo de texto</span>}>
            <Input id="l-video" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="Link de embed, código <iframe> o videoId" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Duración (minutos)" htmlFor="l-min" hint={<span className="text-xs text-subtle">opcional</span>}>
              <Input id="l-min" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^\d.]/g, ""))} />
            </Field>
            <Field label="Módulo" htmlFor="l-mod">
              <select id="l-mod" value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-surface-2 px-3">
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </Field>
          </div>
          <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm", preview ? "border-coral/50 bg-coral-soft" : "border-border")}>
            <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-coral)]" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold"><Eye className="size-4" /> Clase gratis (vista previa)</span>
              <span className="text-muted">Cualquier visitante podrá verla desde la página del curso, sin comprar.</span>
            </span>
          </label>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Texto, enlaces o material de la clase <span className="text-xs text-subtle">(opcional)</span></p>
            <RichTextEditor value={body} onChange={setBody} />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={save} disabled={saving || !title.trim()}>
              {saving && <Loader2 className="size-4 animate-spin" />} Guardar clase
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  type = "button",
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30", className)}
    >
      {children}
    </button>
  );
}
