"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveCourseAction, type ActionResult } from "@/actions/admin-courses";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Alert, Field, Input, SubmitButton } from "@/components/ui/form";
import { toLocalInput } from "@/lib/format";
import { uploadImage } from "@/lib/upload-client";
import type { Course } from "@/types/database";

const textarea =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-base text-text placeholder:text-subtle focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/30";

export function CourseForm({ course }: { course: Course | null }) {
  const router = useRouter();
  const [state, action] = useActionState<ActionResult | null, FormData>(saveCourseAction.bind(null, course?.id ?? null), null);
  const [cover, setCover] = useState(course?.cover_url ?? "");
  const [description, setDescription] = useState(course?.description_html ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok && state.id && !course) router.push(`/admin/cursos/${state.id}`);
  }, [state, course, router]);

  async function onFile(file?: File) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      setCover((await uploadImage(file)).publicUrl);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="cover_url" value={cover} />
      <input type="hidden" name="description_html" value={description} />

      <div className="grid gap-5 md:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          <Field label="Título" htmlFor="title">
            <Input id="title" name="title" required defaultValue={course?.title} maxLength={120} />
          </Field>
          <Field label="Subtítulo (frase de venta)" htmlFor="subtitle">
            <Input id="subtitle" name="subtitle" defaultValue={course?.subtitle ?? ""} maxLength={240} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="URL" htmlFor="slug" hint={<span className="text-xs text-subtle">/cursos/…</span>}>
              <Input id="slug" name="slug" defaultValue={course?.slug} placeholder="se genera del título" />
            </Field>
            <Field label="Dispositivo" htmlFor="device_label">
              <Input id="device_label" name="device_label" defaultValue={course?.device_label ?? ""} placeholder="Celular, PC…" />
            </Field>
            <Field label="Nivel" htmlFor="level">
              <select id="level" name="level" defaultValue={course?.level ?? "basico"} className="h-12 w-full rounded-xl border border-border bg-surface-2 px-3">
                <option value="basico">Básico</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Portada</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface-2 text-sm text-muted hover:border-violet"
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="Portada" className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2">
                <ImagePlus className="size-6" /> Subir imagen
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 grid place-items-center bg-black/60">
                <Loader2 className="size-6 animate-spin" />
              </span>
            )}
          </button>
          <p className="text-xs text-subtle">JPG, PNG o WEBP · máx. 5 MB · horizontal 4:3</p>
          {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>

      <fieldset id="precio" className="grid scroll-mt-32 gap-4 rounded-2xl border border-border p-4 sm:grid-cols-3">
        <legend className="px-2 text-sm font-semibold">Precio y promoción (USD)</legend>
        <Field label="Precio normal" htmlFor="price_usd">
          <Input id="price_usd" name="price_usd" inputMode="decimal" required defaultValue={course?.price_usd ?? ""} placeholder="34.90" />
        </Field>
        <Field label="Precio de promoción" htmlFor="sale_price_usd" hint={<span className="text-xs text-subtle">opcional</span>}>
          <Input id="sale_price_usd" name="sale_price_usd" inputMode="decimal" defaultValue={course?.sale_price_usd ?? ""} placeholder="vacío = sin promo" />
        </Field>
        <Field label="La promo termina" htmlFor="sale_ends_at" hint={<span className="text-xs text-subtle">hora de Perú</span>}>
          <Input id="sale_ends_at" name="sale_ends_at" type="datetime-local" defaultValue={toLocalInput(course?.sale_ends_at)} />
        </Field>
        <p className="text-xs text-subtle sm:col-span-3">
          Con promoción, la web muestra el precio normal tachado y el % de descuento. Si no pones fecha de fin, dura hasta que la quites.
        </p>
      </fieldset>

      <Field label="Video de presentación (Bunny)" htmlFor="promo_video" hint={<span className="text-xs text-subtle">opcional · público</span>}>
        <Input id="promo_video" name="promo_video" defaultValue={course?.promo_video_id ?? ""} placeholder="Link de embed de Bunny o videoId" />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Lo que aprenderás (uno por línea)" htmlFor="learn_points">
          <textarea id="learn_points" name="learn_points" rows={6} defaultValue={course?.learn_points.join("\n")} className={textarea} />
        </Field>
        <Field label="Qué necesitas (uno por línea)" htmlFor="requirements">
          <textarea id="requirements" name="requirements" rows={6} defaultValue={course?.requirements.join("\n")} className={textarea} />
        </Field>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Descripción</p>
        <RichTextEditor value={description} onChange={setDescription} />
      </div>

      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="sm:w-60">
        <SubmitButton pendingText="Guardando…">{course ? "Guardar cambios" : "Crear curso"}</SubmitButton>
      </div>
    </form>
  );
}
