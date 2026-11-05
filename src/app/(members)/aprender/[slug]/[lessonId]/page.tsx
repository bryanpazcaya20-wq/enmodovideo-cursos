import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { LessonView } from "@/components/learn/lesson-view";
import { getHasCourseAccess, requireUser } from "@/lib/auth";
import { getLearnCourse } from "@/lib/courses/learn";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/aprender/[slug]/[lessonId]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " "), robots: { index: false } };
}

export default async function LessonPage({ params, searchParams }: PageProps<"/aprender/[slug]/[lessonId]">) {
  const { slug, lessonId } = await params;
  if (!z.string().uuid().safeParse(lessonId).success) notFound();
  const user = await requireUser(`/aprender/${slug}/${lessonId}`);
  const course = await getLearnCourse(slug, user.id);
  if (!course || !course.flat.some((l) => l.id === lessonId)) notFound();
  if (!(await getHasCourseAccess(course.id))) redirect(`/cursos/${slug}`);

  // RLS: solo entrega el contenido a inscritos (o admins).
  const supabase = await createClient();
  const { data: content } = await supabase.from("lesson_content").select("bunny_video_id, body_html").eq("lesson_id", lessonId).maybeSingle();

  return (
    <LessonView
      course={course}
      lessonId={lessonId}
      hasVideo={!!content?.bunny_video_id}
      bodyHtml={sanitizeRichHtml(content?.body_html)}
      welcome={!!(await searchParams).bienvenida}
    />
  );
}
