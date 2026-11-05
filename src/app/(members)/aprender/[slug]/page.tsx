import { notFound, redirect } from "next/navigation";
import { getHasCourseAccess, requireUser } from "@/lib/auth";
import { getLearnCourse, nextLesson } from "@/lib/courses/learn";

// Entrada al curso: lleva a la primera clase sin completar.
export default async function CourseEntry({ params, searchParams }: PageProps<"/aprender/[slug]">) {
  const { slug } = await params;
  const user = await requireUser(`/aprender/${slug}`);
  const course = await getLearnCourse(slug, user.id);
  if (!course) notFound();
  if (!(await getHasCourseAccess(course.id))) redirect(`/cursos/${slug}`);
  const lesson = nextLesson(course);
  if (!lesson) notFound();
  const welcome = (await searchParams).bienvenida ? "?bienvenida=1" : "";
  redirect(`/aprender/${slug}/${lesson.id}${welcome}`);
}
