import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, KeyRound, Receipt, TicketPercent, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDateTime } from "@/lib/format";
import { formatUsd } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Inicio" };

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();

export default async function AdminHome() {
  const admin = createAdminClient();
  const since30 = daysAgo(30);
  const [{ data: daily }, { data: paid }, { data: courses }, { count: students }, { count: pendingGrants }, { data: recent }, { data: enrollments }] = await Promise.all([
    admin.rpc("sales_by_day", { p_days: 30 }),
    admin.from("orders").select("amount, paid_at, course_id, provider").eq("status", "paid"),
    admin.from("courses").select("id, title, status").order("sort_order"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
    admin.from("access_grants").select("id", { count: "exact", head: true }).is("claimed_at", null),
    admin.from("orders").select("id, amount, paid_at, course_id, coupon_code, provider, payer_email, user_id").eq("status", "paid").order("paid_at", { ascending: false }).limit(8),
    admin.from("enrollments").select("course_id").is("revoked_at", null),
  ]);

  const all = paid ?? [];
  const last30 = all.filter((o) => o.paid_at && o.paid_at >= since30);
  const sum = (rows: { amount: number }[]) => rows.reduce((n, o) => n + Number(o.amount), 0);
  const days = daily ?? [];
  const max = Math.max(1, ...days.map((d) => Number(d.revenue)));
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));

  const userIds = [...new Set((recent ?? []).map((o) => o.user_id).filter(Boolean) as string[])];
  const { data: buyers } = userIds.length ? await admin.from("profiles").select("id, email").in("id", userIds) : { data: [] };
  const buyer = new Map((buyers ?? []).map((b) => [b.id, b.email]));

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:py-8">
      <AdminPageHeader title="Panel" description="Resumen de ventas y alumnos." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventas (30 días)" value={formatUsd(sum(last30))} hint={`${last30.length} pedidos`} href="/admin/ventas" />
        <Stat label="Ventas totales" value={formatUsd(sum(all))} hint={`${all.length} pedidos (incluye web anterior)`} href="/admin/ventas" />
        <Stat label="Alumnos con cuenta" value={String(students ?? 0)} hint={`${enrollments?.length ?? 0} inscripciones activas`} href="/admin/alumnos" />
        <Stat label="Accesos por reclamar" value={String(pendingGrants ?? 0)} hint="aún no entran con su correo" href="/admin/accesos" />
      </div>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Ingresos de los últimos 30 días</h2>
          <span className="text-sm text-subtle">USD</span>
        </div>
        <div className="mt-6 flex h-40 items-end gap-1" role="img" aria-label="Gráfico de ingresos por día">
          {days.map((d) => (
            <div key={d.day} className="group relative flex flex-1 flex-col justify-end">
              <div
                className="min-h-[2px] rounded-t bg-gradient-to-t from-coral to-violet opacity-80 transition-opacity group-hover:opacity-100"
                style={{ height: `${(Number(d.revenue) / max) * 100}%` }}
              />
              <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-bg px-2 py-1 text-xs shadow-lg group-hover:block">
                {new Date(`${d.day}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}: {formatUsd(Number(d.revenue))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Últimas ventas</h2>
            <Link href="/admin/ventas" className="text-sm text-violet hover:underline">Ver todas</Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {(recent ?? []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{(o.user_id && buyer.get(o.user_id)) || o.payer_email || "—"}</p>
                  <p className="truncate text-xs text-subtle">
                    {(o.course_id && title.get(o.course_id)) || "Curso"} · {formatDateTime(o.paid_at)}
                    {o.provider === "wordpress" && " · web anterior"}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{Number(o.amount) > 0 ? formatUsd(Number(o.amount)) : "Gratis"}</span>
              </li>
            ))}
            {!recent?.length && <li className="py-6 text-center text-sm text-muted">Todavía no hay ventas.</li>}
          </ul>
        </section>

        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-semibold">Por curso</h2>
          <ul className="mt-3 space-y-3">
            {(courses ?? []).map((c) => {
              const rows = all.filter((o) => o.course_id === c.id);
              const enrolled = (enrollments ?? []).filter((e) => e.course_id === c.id).length;
              return (
                <li key={c.id} className="rounded-xl bg-surface-2 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/admin/cursos/${c.id}`} className="font-semibold hover:text-coral">{c.title}</Link>
                    {c.status === "draft" && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">Borrador</span>}
                  </div>
                  <p className="mt-1 text-muted">
                    {formatUsd(sum(rows))} · {rows.length} ventas · {enrolled} alumnos activos
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Quick href="/admin/cursos" icon={<BookOpen className="size-5" />} label="Editar cursos y clases" />
        <Quick href="/admin/cupones" icon={<TicketPercent className="size-5" />} label="Crear un cupón" />
        <Quick href="/admin/accesos" icon={<KeyRound className="size-5" />} label="Dar acceso a alguien" />
        <Quick href="/admin/ventas" icon={<Receipt className="size-5" />} label="Ver ventas" />
      </div>
      <p className="flex items-center gap-2 text-xs text-subtle">
        <Users className="size-3.5" /> Las ventas «web anterior» son las importadas del WordPress.
      </p>
    </div>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint: string; href: string }) {
  return (
    <Link href={href} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 transition-colors hover:border-violet/50 sm:p-5">
      <p className="text-xs font-medium text-subtle sm:text-sm">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Link>
  );
}

function Quick({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-sm font-semibold hover:border-violet/50">
      <span className="grid size-10 place-items-center rounded-xl bg-violet-soft text-violet">{icon}</span>
      {label}
    </Link>
  );
}
