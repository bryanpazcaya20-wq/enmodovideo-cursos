import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Alumnos" };

export default async function StudentsPage({ searchParams }: PageProps<"/admin/alumnos">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const curso = typeof sp.curso === "string" ? sp.curso : "";

  const admin = createAdminClient();
  let query = admin.from("profiles").select("id, email, full_name, provider, role, blocked_at, created_at").order("created_at", { ascending: false }).limit(300);
  if (q) query = query.or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,full_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data: people }, { data: enrollments }, { data: courses }] = await Promise.all([
    query,
    admin.from("enrollments").select("user_id, course_id, revoked_at"),
    admin.from("courses").select("id, title").order("sort_order"),
  ]);
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const coursesOf = (id: string) => (enrollments ?? []).filter((e) => e.user_id === id && !e.revoked_at).map((e) => e.course_id);
  const rows = (people ?? []).filter((p) => !curso || coursesOf(p.id).includes(curso));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
      <AdminPageHeader title="Alumnos" description={`${rows.length} cuentas${q ? ` que coinciden con «${q}»` : ""}`} />

      <form className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por correo o nombre"
            className="h-11 w-full rounded-full border border-border bg-surface-2 pl-11 pr-4 text-sm focus:border-violet focus:outline-none"
          />
        </div>
        <select name="curso" defaultValue={curso} className="h-11 rounded-full border border-border bg-surface-2 px-4 text-sm">
          <option value="">Todos los cursos</option>
          {(courses ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-full bg-surface-2 px-5 text-sm font-semibold hover:bg-border">Buscar</button>
      </form>

      <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        {rows.map((p) => {
          const mine = coursesOf(p.id);
          return (
            <li key={p.id}>
              <Link href={`/admin/alumnos/${p.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.full_name || p.email}
                    {p.role === "admin" && <span className="ml-2 rounded-full bg-violet-soft px-2 py-0.5 text-[11px] text-violet">admin</span>}
                    {p.blocked_at && <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] text-danger">bloqueado</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{p.email} · {p.provider === "google" ? "Google" : "correo"} · desde {formatDate(p.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mine.length ? (
                    mine.map((id) => (
                      <span key={id} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">{title.get(id)}</span>
                    ))
                  ) : (
                    <span className="text-xs text-subtle">Sin cursos</span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
        {!rows.length && <li className="px-4 py-10 text-center text-muted">No se encontraron alumnos.</li>}
      </ul>
      <p className="text-xs text-subtle">
        ¿Buscas a alguien migrado que aún no entra? Míralo en <Link href="/admin/accesos" className="underline">Dar acceso → pendientes</Link>.
      </p>
    </div>
  );
}
