import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Course, CourseModule, Lesson } from "@/types/database";

export type MyCourse = Pick<Course, "id" | "slug" | "title" | "subtitle" | "cover_url" | "device_label"> & {
  total: number;
  done: number;
  lastLessonId: string | null;
  enrolledAt: string;
};

/** Cursos del alumno con su avance. (RLS: solo devuelve sus inscripciones.) */
export async function getMyCourses(userId: string): Promise<MyCourse[]> {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, created_at, expires_at, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  const active = (enrollments ?? []).filter((e) => !e.expires_at || new Date(e.expires_at) > new Date());
  if (!active.length) return [];
  const ids = active.map((e) => e.course_id);

  const [{ data: courses }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("courses").select("id, slug, title, subtitle, cover_url, device_label").in("id", ids),
    supabase.from("lessons").select("id, course_id").in("course_id", ids),
    supabase.from("lesson_progress").select("lesson_id, course_id, completed_at").eq("user_id", userId).in("course_id", ids).order("completed_at", { ascending: false }),
  ]);

  return active
    .map((e): MyCourse | null => {
      const c = courses?.find((x) => x.id === e.course_id);
      if (!c) return null;
      const mine = (progress ?? []).filter((p) => p.course_id === c.id);
      return {
        ...c,
        total: (lessons ?? []).filter((l) => l.course_id === c.id).length,
        done: mine.length,
        lastLessonId: mine[0]?.lesson_id ?? null,
        enrolledAt: e.created_at,
      };
    })
    .filter((c): c is MyCourse => c !== null);
}

export type LearnLesson = Pick<Lesson, "id" | "title" | "sort_order" | "is_preview" | "duration_seconds"> & { done: boolean };
export type LearnModule = Pick<CourseModule, "id" | "title" | "sort_order"> & { lessons: LearnLesson[] };
export type LearnCourse = Pick<Course, "id" | "slug" | "title"> & { modules: LearnModule[]; flat: LearnLesson[]; done: number };

/** Temario completo con el avance del alumno, en orden. */
export const getLearnCourse = cache(async (slug: string, userId: string): Promise<LearnCourse | null> => {
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, slug, title").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const [{ data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("course_modules").select("id, title, sort_order").eq("course_id", course.id).order("sort_order"),
    supabase.from("lessons").select("id, module_id, title, sort_order, is_preview, duration_seconds").eq("course_id", course.id).order("sort_order"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId).eq("course_id", course.id),
  ]);
  const doneSet = new Set((progress ?? []).map((p) => p.lesson_id));
  const mods: LearnModule[] = (modules ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? [])
      .filter((l) => l.module_id === m.id)
      .map((l) => ({ id: l.id, title: l.title, sort_order: l.sort_order, is_preview: l.is_preview, duration_seconds: l.duration_seconds, done: doneSet.has(l.id) })),
  }));
  const flat = mods.flatMap((m) => m.lessons);
  return { ...course, modules: mods, flat, done: flat.filter((l) => l.done).length };
});

/** Siguiente clase por ver: la primera sin completar (o la primera del curso). */
export function nextLesson(course: LearnCourse) {
  return course.flat.find((l) => !l.done) ?? course.flat[0] ?? null;
}
