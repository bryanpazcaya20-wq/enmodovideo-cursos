import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { deleteCourseAction, setCourseStatusAction } from "@/actions/admin-courses";
import { ActionButton } from "@/components/admin/action-button";
import { CourseForm } from "@/components/admin/course-form";
import { CurriculumEditor, type EditorModule } from "@/components/admin/curriculum-editor";
import { AdminPageHeader } from "@/components/admin/page-header";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Editar curso" };

export default async function EditCoursePage({ params }: PageProps<"/admin/cursos/[id]">) {
  const { id } = await params;
  if (id === "nuevo") return <NewCourse />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const [{ data: course }, { data: modules }, { data: lessons }] = await Promise.all([
    admin.from("courses").select("*").eq("id", id).maybeSingle(),
    admin.from("course_modules").select("id, title, sort_order").eq("course_id", id).order("sort_order"),
    admin.from("lessons").select("id, module_id, title, sort_order, is_preview").eq("course_id", id).order("sort_order"),
  ]);
  if (!course) notFound();
  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: contents } = lessonIds.length
    ? await admin.from("lesson_content").select("lesson_id, bunny_video_id").in("lesson_id", lessonIds)
    : { data: [] };
  const withVideo = new Set((contents ?? []).filter((c) => c.bunny_video_id).map((c) => c.lesson_id));

  const editorModules: EditorModule[] = (modules ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    lessons: (lessons ?? [])
      .filter((l) => l.module_id === m.id)
      .map((l) => ({ id: l.id, title: l.title, is_preview: l.is_preview, has_video: withVideo.has(l.id) })),
  }));
  const published = course.status === "published";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:py-8">
      <Link href="/admin/cursos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Cursos
      </Link>
      <AdminPageHeader
        title={course.title}
        description={
          <span className="inline-flex items-center gap-2">
            <span className={published ? "text-success" : "text-warning"}>{published ? "● Publicado" : "● Borrador (no visible)"}</span>
            {published && (
              <a href={`/cursos/${course.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet hover:underline">
                Ver en la web <ExternalLink className="size-3.5" />
              </a>
            )}
          </span>
        }
        actions={
          <>
            <ActionButton action={setCourseStatusAction.bind(null, course.id, published ? "draft" : "published")} tone={published ? "default" : "primary"}>
              {published ? "Ocultar (borrador)" : "Publicar curso"}
            </ActionButton>
            <ActionButton action={deleteCourseAction.bind(null, course.id)} tone="danger" confirm={`¿Eliminar «${course.title}» con todo su temario? No se puede deshacer.`}>
              Eliminar
            </ActionButton>
          </>
        }
      />

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface/60 p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">Temario y clases</h2>
        <CurriculumEditor courseId={course.id} initial={editorModules} />
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface/60 p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">Datos de venta</h2>
        <CourseForm course={course} />
      </section>
    </div>
  );
}

function NewCourse() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <Link href="/admin/cursos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Cursos
      </Link>
      <AdminPageHeader title="Nuevo curso" description="Primero los datos de venta; después armas el temario. Se crea como borrador." />
      <section className="rounded-[var(--radius-card)] border border-border bg-surface/60 p-5 sm:p-6">
        <CourseForm course={null} />
      </section>
    </div>
  );
}
