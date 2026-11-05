"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { AdminError, adminErrorMessage, assertAdmin, audit } from "@/lib/admin";
import { parseBunnyLink } from "@/lib/bunny/parse-link";
import { COURSES_TAG } from "@/lib/courses/public";
import { fromLocalInput } from "@/lib/format";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

function refresh(courseId?: string) {
  updateTag(COURSES_TAG);
  revalidatePath("/admin/cursos");
  if (courseId) revalidatePath(`/admin/cursos/${courseId}`);
}

const uuid = z.string().uuid();

// ---------------------------------------------------------------------------
// Curso
// ---------------------------------------------------------------------------

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

const money = z.preprocess((v) => (v === "" || v === null ? null : Number(String(v).replace(",", "."))), z.number().min(0).max(10000).nullable());

const CourseForm = z.object({
  title: z.string().trim().min(3, "Escribe el título").max(120),
  slug: z.string().trim().max(80).optional(),
  subtitle: z.string().trim().max(240).optional(),
  device_label: z.string().trim().max(30).optional(),
  level: z.enum(["basico", "intermedio", "avanzado"]),
  price_usd: money.refine((v) => v !== null, "Escribe el precio"),
  sale_price_usd: money,
  sale_ends_at: z.string().optional(),
  cover_url: z.string().trim().max(500).optional(),
  promo_video: z.string().trim().max(500).optional(),
  description_html: z.string().max(20000).optional(),
});

export async function saveCourseAction(courseId: string | null, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const parsed = CourseForm.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const f = parsed.data;
    if (f.sale_price_usd !== null && f.sale_price_usd >= (f.price_usd ?? 0)) {
      return { ok: false, error: "El precio de promoción debe ser menor que el precio normal." };
    }

    let promoId: string | null = null;
    if (f.promo_video) {
      const link = parseBunnyLink(f.promo_video);
      if (!link.ok) return { ok: false, error: `Video de presentación: ${link.error}` };
      promoId = link.value.videoId;
    }

    const row = {
      title: f.title,
      slug: slugify(f.slug || f.title),
      subtitle: f.subtitle || null,
      device_label: f.device_label || null,
      level: f.level,
      price_usd: f.price_usd!,
      sale_price_usd: f.sale_price_usd,
      sale_ends_at: f.sale_price_usd !== null ? fromLocalInput(f.sale_ends_at) : null,
      cover_url: f.cover_url || null,
      promo_video_id: promoId,
      description_html: sanitizeRichHtml(f.description_html) || null,
      learn_points: lines(formData.get("learn_points")),
      requirements: lines(formData.get("requirements")),
    };

    const admin = createAdminClient();
    if (courseId) {
      if (!uuid.safeParse(courseId).success) throw new AdminError("Curso no válido");
      const { error } = await admin.from("courses").update(row).eq("id", courseId);
      if (error) return { ok: false, error: error.code === "23505" ? "Ya existe otro curso con esa URL (slug)." : error.message };
      await audit({ actorId: me.id, action: "course.update", targetCourseId: courseId, metadata: { title: row.title } });
      refresh(courseId);
      return { ok: true, message: "Cambios guardados." };
    }

    const { data: last } = await admin.from("courses").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await admin
      .from("courses")
      .insert({ ...row, status: "draft", sort_order: (last?.sort_order ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.code === "23505" ? "Ya existe un curso con esa URL (slug)." : error.message };
    await audit({ actorId: me.id, action: "course.create", targetCourseId: data.id, metadata: { title: row.title } });
    refresh(data.id);
    return { ok: true, id: data.id, message: "Curso creado. Ahora arma el temario." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function setCourseStatusAction(courseId: string, status: "draft" | "published"): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const admin = createAdminClient();
    if (status === "published") {
      const { count } = await admin.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId);
      if (!count) return { ok: false, error: "Agrega al menos una clase antes de publicar." };
    }
    const { error } = await admin.from("courses").update({ status }).eq("id", courseId);
    if (error) return { ok: false, error: error.message };
    await audit({ actorId: me.id, action: status === "published" ? "course.publish" : "course.unpublish", targetCourseId: courseId });
    refresh(courseId);
    return { ok: true, message: status === "published" ? "Curso publicado." : "Curso oculto (borrador)." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function deleteCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const admin = createAdminClient();
    const { count } = await admin.from("enrollments").select("user_id", { count: "exact", head: true }).eq("course_id", courseId);
    if (count) return { ok: false, error: `No se puede eliminar: tiene ${count} alumno(s). Ocúltalo (borrador) en su lugar.` };
    const { data: course } = await admin.from("courses").select("title").eq("id", courseId).maybeSingle();
    const { error } = await admin.from("courses").delete().eq("id", courseId);
    if (error) return { ok: false, error: error.message };
    await audit({ actorId: me.id, action: "course.delete", metadata: { title: course?.title ?? null } });
    refresh();
    return { ok: true, message: "Curso eliminado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function reorderCoursesAction(ids: string[]): Promise<ActionResult> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    await Promise.all(ids.map((id, i) => admin.from("courses").update({ sort_order: i + 1 }).eq("id", id)));
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Temario: módulos y clases
// ---------------------------------------------------------------------------

export async function addModuleAction(courseId: string, title: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const t = title.trim().slice(0, 120);
    if (!t) return { ok: false, error: "Escribe el nombre del módulo." };
    const admin = createAdminClient();
    const { data: last } = await admin.from("course_modules").select("sort_order").eq("course_id", courseId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await admin.from("course_modules").insert({ course_id: courseId, title: t, sort_order: (last?.sort_order ?? 0) + 1 }).select("id").single();
    if (error) return { ok: false, error: error.message };
    await audit({ actorId: me.id, action: "curriculum.update", targetCourseId: courseId, metadata: { add_module: t } });
    refresh(courseId);
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function renameModuleAction(courseId: string, moduleId: string, title: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const t = title.trim().slice(0, 120);
    if (!t) return { ok: false, error: "El nombre no puede quedar vacío." };
    const { error } = await createAdminClient().from("course_modules").update({ title: t }).eq("id", moduleId).eq("course_id", courseId);
    if (error) return { ok: false, error: error.message };
    refresh(courseId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function deleteModuleAction(courseId: string, moduleId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const admin = createAdminClient();
    const { count } = await admin.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
    if (count) return { ok: false, error: "Primero elimina o mueve las clases de este módulo." };
    const { error } = await admin.from("course_modules").delete().eq("id", moduleId).eq("course_id", courseId);
    if (error) return { ok: false, error: error.message };
    await audit({ actorId: me.id, action: "curriculum.update", targetCourseId: courseId, metadata: { delete_module: moduleId } });
    refresh(courseId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

/** Guarda el orden de módulos y clases (y a qué módulo pertenece cada clase) tras arrastrar. */
export async function saveOrderAction(courseId: string, modules: { id: string; lessons: string[] }[]): Promise<ActionResult> {
  try {
    await assertAdmin();
    const parsed = z.array(z.object({ id: uuid, lessons: z.array(uuid) })).max(200).safeParse(modules);
    if (!parsed.success) return { ok: false, error: "Orden no válido" };
    const admin = createAdminClient();
    const updates: PromiseLike<unknown>[] = [];
    parsed.data.forEach((m, mi) => {
      updates.push(admin.from("course_modules").update({ sort_order: mi + 1 }).eq("id", m.id).eq("course_id", courseId));
      m.lessons.forEach((lid, li) => {
        updates.push(admin.from("lessons").update({ module_id: m.id, sort_order: li + 1 }).eq("id", lid).eq("course_id", courseId));
      });
    });
    await Promise.all(updates);
    refresh(courseId);
    return { ok: true, message: "Orden guardado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

const LessonForm = z.object({
  title: z.string().trim().min(1, "Escribe el título de la clase").max(160),
  video: z.string().trim().max(1000).optional(),
  body_html: z.string().max(20000).optional(),
  is_preview: z.boolean(),
  duration_minutes: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(1000).nullable()),
});

/** Crea (lessonId = null) o edita una clase. El video se acepta como link de Bunny, código iframe o videoId. */
export async function saveLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string | null,
  input: z.input<typeof LessonForm>,
): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const parsed = LessonForm.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const f = parsed.data;

    let videoId: string | null = null;
    if (f.video) {
      // También acepta las URLs del WordPress anterior: …b-cdn.net/<videoId>/playlist.m3u8
      const hls = f.video.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/playlist\.m3u8/i);
      if (hls) videoId = hls[1].toLowerCase();
      else {
        const link = parseBunnyLink(f.video);
        if (!link.ok) return { ok: false, error: link.error };
        videoId = link.value.videoId;
      }
    }

    const admin = createAdminClient();
    const base = {
      title: f.title,
      is_preview: f.is_preview,
      duration_seconds: f.duration_minutes !== null ? Math.round(f.duration_minutes * 60) : null,
    };
    const content = { bunny_video_id: videoId, body_html: sanitizeRichHtml(f.body_html) || null };

    let id = lessonId;
    if (id) {
      const { error } = await admin.from("lessons").update(base).eq("id", id).eq("course_id", courseId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data: last } = await admin.from("lessons").select("sort_order").eq("module_id", moduleId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await admin
        .from("lessons")
        .insert({ ...base, course_id: courseId, module_id: moduleId, sort_order: (last?.sort_order ?? 0) + 1 })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      id = data.id;
    }
    const { error: cErr } = await admin.from("lesson_content").upsert({ lesson_id: id!, ...content }, { onConflict: "lesson_id" });
    if (cErr) return { ok: false, error: cErr.message };

    await audit({ actorId: me.id, action: "curriculum.update", targetCourseId: courseId, metadata: { lesson: f.title, created: !lessonId } });
    refresh(courseId);
    return { ok: true, id: id!, message: lessonId ? "Clase guardada." : "Clase agregada." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function deleteLessonAction(courseId: string, lessonId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const admin = createAdminClient();
    const { data: lesson } = await admin.from("lessons").select("title").eq("id", lessonId).maybeSingle();
    const { error } = await admin.from("lessons").delete().eq("id", lessonId).eq("course_id", courseId);
    if (error) return { ok: false, error: error.message };
    await audit({ actorId: me.id, action: "curriculum.update", targetCourseId: courseId, metadata: { delete_lesson: lesson?.title ?? lessonId } });
    refresh(courseId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

/** Datos completos de una clase para el editor (incluye el contenido protegido). */
export async function getLessonForEditAction(lessonId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const [{ data: lesson }, { data: content }] = await Promise.all([
    admin.from("lessons").select("id, title, is_preview, duration_seconds").eq("id", lessonId).maybeSingle(),
    admin.from("lesson_content").select("bunny_video_id, body_html").eq("lesson_id", lessonId).maybeSingle(),
  ]);
  return lesson ? { ...lesson, bunny_video_id: content?.bunny_video_id ?? null, body_html: content?.body_html ?? "" } : null;
}

// ---------------------------------------------------------------------------
// Imágenes (portadas)
// ---------------------------------------------------------------------------

const UploadInput = z.object({ type: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().max(5 * 1024 * 1024, "La imagen pesa más de 5 MB") });

/** URL firmada para que el navegador suba la imagen directo a Supabase Storage. */
export async function createUploadUrlAction(input: z.input<typeof UploadInput>) {
  try {
    await assertAdmin();
    const parsed = UploadInput.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[parsed.data.type];
    const path = `covers/${crypto.randomUUID()}.${ext}`;
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from("course-media").createSignedUploadUrl(path);
    if (error || !data) return { ok: false as const, error: "No se pudo preparar la subida." };
    const { data: pub } = admin.storage.from("course-media").getPublicUrl(path);
    return { ok: true as const, uploadUrl: data.signedUrl, path, publicUrl: pub.publicUrl };
  } catch (e) {
    return { ok: false as const, error: adminErrorMessage(e) };
  }
}
