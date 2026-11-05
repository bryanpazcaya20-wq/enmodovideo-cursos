import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { buttonClasses } from "@/components/ui/button";
import { AUDIT_LABEL } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Auditoría" };

const PAGE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.pagina) || 1);
  const admin = createAdminClient();

  const { data: rows, count } = await admin
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);

  const ids = [...new Set((rows ?? []).flatMap((r) => [r.actor_id, r.target_user_id]).filter(Boolean) as string[])];
  const courseIds = [...new Set((rows ?? []).map((r) => r.target_course_id).filter(Boolean) as string[])];
  const [{ data: people }, { data: courses }] = await Promise.all([
    ids.length ? admin.from("profiles").select("id, email, full_name").in("id", ids) : Promise.resolve({ data: [] }),
    courseIds.length ? admin.from("courses").select("id, title").in("id", courseIds) : Promise.resolve({ data: [] }),
  ]);
  const person = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email]));
  const course = new Map((courses ?? []).map((t) => [t.id, t.title]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
      <AdminPageHeader title="Registro de auditoría" description="Cada acción de un administrador: quién, qué, sobre quién, cuándo y por qué." />

      {(rows ?? []).length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-muted">Todavía no hay acciones registradas.</p>
      ) : (
        <ol className="space-y-2">
          {(rows ?? []).map((r) => {
            const meta = (r.metadata ?? {}) as Record<string, unknown>;
            const courseTitle = (r.target_course_id && course.get(r.target_course_id)) || (typeof meta.title === "string" ? meta.title : null);
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-semibold">{AUDIT_LABEL[r.action] ?? r.action}</p>
                  <p className="text-xs text-subtle">{formatDateTime(r.created_at)}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Por <strong className="text-text">{(r.actor_id && person.get(r.actor_id)) || "Sistema"}</strong>
                  {r.target_user_id && (
                    <>
                      {" · sobre "}
                      <Link href={`/admin/alumnos/${r.target_user_id}`} className="text-violet hover:underline">
                        {person.get(r.target_user_id) ?? "alumno"}
                      </Link>
                    </>
                  )}
                  {courseTitle && <> · «{courseTitle}»</>}
                </p>
                {r.reason && <p className="mt-1 text-sm">Motivo: «{r.reason}»</p>}
                {typeof meta.email === "string" && <p className="mt-1 text-sm text-muted">Correo: {meta.email}</p>}
                {typeof meta.code === "string" && <p className="mt-1 text-sm text-muted">Cupón: {meta.code}</p>}
              </li>
            );
          })}
        </ol>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Paginación">
          <Link href={`?pagina=${page - 1}`} aria-disabled={page <= 1} className={cn(buttonClasses("secondary", "icon"), page <= 1 && "pointer-events-none opacity-40")}>
            <ChevronLeft className="size-5" />
          </Link>
          <span className="text-sm text-muted">
            Página {page} de {pages}
          </span>
          <Link href={`?pagina=${page + 1}`} aria-disabled={page >= pages} className={cn(buttonClasses("secondary", "icon"), page >= pages && "pointer-events-none opacity-40")}>
            <ChevronRight className="size-5" />
          </Link>
        </nav>
      )}
    </div>
  );
}
