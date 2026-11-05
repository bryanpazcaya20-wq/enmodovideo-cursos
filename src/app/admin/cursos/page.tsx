import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PriceTag } from "@/components/courses/price-tag";
import { LinkButton } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Cursos" };

export default async function AdminCourses() {
  const admin = createAdminClient();
  const [{ data: courses }, { data: lessons }, { data: enrollments }] = await Promise.all([
    admin.from("courses").select("*").order("sort_order"),
    admin.from("lessons").select("course_id"),
    admin.from("enrollments").select("course_id").is("revoked_at", null),
  ]);
  const count = (rows: { course_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.course_id === id).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <AdminPageHeader
        title="Cursos"
        description="Edita los datos de venta, el temario y las clases de cada curso."
        actions={
          <LinkButton href="/admin/cursos/nuevo">
            <Plus className="size-4" /> Nuevo curso
          </LinkButton>
        }
      />
      <ul className="space-y-3">
        {(courses ?? []).map((c) => (
          <li key={c.id}>
            <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:flex-row sm:items-center">
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-36">
                {c.cover_url && <Image src={c.cover_url} alt="" fill sizes="144px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/cursos/${c.id}`} className="font-display text-xl font-semibold hover:text-coral">
                    {c.title}
                  </Link>
                  <span className={c.status === "published" ? "rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success" : "rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning"}>
                    {c.status === "published" ? "Publicado" : "Borrador"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {count(lessons, c.id)} clases · {count(enrollments, c.id)} alumnos · /cursos/{c.slug}
                </p>
                <PriceTag course={c} className="mt-2" />
              </div>
              <div className="flex gap-2">
                <LinkButton href={`/admin/cursos/${c.id}`} variant="secondary" className="h-10">Editar</LinkButton>
                {c.status === "published" && (
                  <a href={`/cursos/${c.slug}`} target="_blank" rel="noopener noreferrer" className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text" aria-label="Ver en la web">
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
        {!courses?.length && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-muted">
            Aún no hay cursos. Ejecuta el archivo de migración o crea uno nuevo.
          </li>
        )}
      </ul>
    </div>
  );
}
