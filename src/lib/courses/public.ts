import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient, isSupabaseConfigured } from "@/lib/supabase/public";
import type { Course, CourseModule, Lesson } from "@/types/database";

/** Etiqueta de caché del catálogo: se invalida al guardar cualquier curso, módulo o lección. */
export const COURSES_TAG = "courses";

export type CourseCard = Pick<
  Course,
  | "id" | "slug" | "title" | "subtitle" | "device_label" | "level" | "cover_url"
  | "price_usd" | "sale_price_usd" | "sale_ends_at" | "sort_order"
> & { lessons_count: number; modules_count: number };

export type CurriculumLesson = Pick<Lesson, "id" | "title" | "sort_order" | "is_preview" | "duration_seconds">;
export type CurriculumModule = Pick<CourseModule, "id" | "title" | "sort_order"> & { lessons: CurriculumLesson[] };
export type CourseDetail = Course & { modules: CurriculumModule[]; lessons_count: number };

// Vista previa local: sin Supabase configurado y fuera de producción, se usa el temario migrado (sin datos personales).
const isDemoMode = () => !isSupabaseConfigured() && process.env.NODE_ENV !== "production";
async function demo() {
  return (await import("./demo-data.json")).default as unknown as { courses: Course[]; modules: (CourseModule & { course_id: string })[]; lessons: (Lesson & { module_id: string })[] };
}

const CARD = "id, slug, title, subtitle, device_label, level, cover_url, price_usd, sale_price_usd, sale_ends_at, sort_order";

async function fetchCatalog(): Promise<CourseCard[]> {
  if (isDemoMode()) {
    const d = await demo();
    return d.courses.map((c) => ({
      ...c,
      lessons_count: d.lessons.filter((l) => l.course_id === c.id).length,
      modules_count: d.modules.filter((m) => m.course_id === c.id).length,
    }));
  }
  if (!isSupabaseConfigured()) return [];
  const supabase = createPublicClient();
  const [{ data: courses, error }, { data: lessons }, { data: modules }] = await Promise.all([
    supabase.from("courses").select(CARD).eq("status", "published").order("sort_order"),
    supabase.from("lessons").select("course_id"),
    supabase.from("course_modules").select("course_id"),
  ]);
  if (error) {
    console.error("[catálogo]", error.message);
    return [];
  }
  const count = (rows: { course_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.course_id === id).length;
  return (courses ?? []).map((c) => ({ ...c, lessons_count: count(lessons, c.id), modules_count: count(modules, c.id) }));
}

async function fetchCourse(slug: string): Promise<CourseDetail | null> {
  if (isDemoMode()) {
    const d = await demo();
    const c = d.courses.find((x) => x.slug === slug);
    if (!c) return null;
    const lessons = d.lessons.filter((l) => l.course_id === c.id);
    return {
      ...c,
      lessons_count: lessons.length,
      modules: d.modules
        .filter((m) => m.course_id === c.id)
        .map((m) => ({
          id: m.id,
          title: m.title,
          sort_order: m.sort_order,
          lessons: lessons.filter((l) => l.module_id === m.id).map((l) => ({ id: l.id, title: l.title, sort_order: l.sort_order, is_preview: l.is_preview, duration_seconds: l.duration_seconds })),
        })),
    };
  }
  if (!isSupabaseConfigured()) return null;
  const supabase = createPublicClient();
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!course) return null;
  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("course_modules").select("id, title, sort_order").eq("course_id", course.id).order("sort_order"),
    supabase.from("lessons").select("id, module_id, title, sort_order, is_preview, duration_seconds").eq("course_id", course.id).order("sort_order"),
  ]);
  return {
    ...course,
    lessons_count: lessons?.length ?? 0,
    modules: (modules ?? []).map((m) => ({
      ...m,
      lessons: (lessons ?? [])
        .filter((l) => l.module_id === m.id)
        .map((l) => ({ id: l.id, title: l.title, sort_order: l.sort_order, is_preview: l.is_preview, duration_seconds: l.duration_seconds })),
    })),
  };
}

export const getCatalog = unstable_cache(fetchCatalog, ["catalog"], { tags: [COURSES_TAG], revalidate: 3600 });
export const getPublicCourse = (slug: string) =>
  unstable_cache(() => fetchCourse(slug), ["course", slug], { tags: [COURSES_TAG], revalidate: 3600 })();

/** "1 h 20 min" a partir de segundos. */
export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
