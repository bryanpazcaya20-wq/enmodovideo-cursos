import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Monitor } from "lucide-react";
import { closeSessionsAction, resetSessionAction, restoreAccessAction, revokeAccessAction, setBlockedAction } from "@/actions/admin-members";
import { ActionButton } from "@/components/admin/action-button";
import { GrantForm } from "@/components/admin/grant-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatUsd } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Alumno" };

const SOURCE: Record<string, string> = { purchase: "Compra", admin: "Dado por admin", migration: "Migrado (web anterior)", free_coupon: "Cupón 100 %" };

export default async function StudentPage({ params }: PageProps<"/admin/alumnos/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const [{ data: p }, { data: enrollments }, { data: orders }, { data: courses }, { data: session }, { data: progress }, { data: lessons }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).maybeSingle(),
    admin.from("enrollments").select("*").eq("user_id", id).order("created_at"),
    admin.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    admin.from("courses").select("id, title").order("sort_order"),
    admin.from("active_sessions").select("*").eq("user_id", id).maybeSingle(),
    admin.from("lesson_progress").select("course_id, completed_at").eq("user_id", id).order("completed_at", { ascending: false }),
    admin.from("lessons").select("course_id"),
  ]);
  if (!p) notFound();
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const total = (cid: string) => (lessons ?? []).filter((l) => l.course_id === cid).length;
  const done = (cid: string) => (progress ?? []).filter((l) => l.course_id === cid).length;
  const lastSeen = progress?.[0]?.completed_at ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <Link href="/admin/alumnos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Alumnos
      </Link>
      <AdminPageHeader
        title={p.full_name || p.email}
        description={`${p.email} · ${p.provider === "google" ? "entra con Google" : "entra con correo"} · cuenta desde ${formatDate(p.created_at)}`}
        actions={
          p.role !== "admin" &&
          (p.blocked_at ? (
            <ActionButton action={setBlockedAction.bind(null, p.id, false, undefined)}>Desbloquear cuenta</ActionButton>
          ) : (
            <ActionButton action={setBlockedAction.bind(null, p.id, true, "Bloqueado desde el panel")} tone="danger" confirm="¿Bloquear esta cuenta? No podrá ver ningún curso y se cerrará su sesión.">
              Bloquear cuenta
            </ActionButton>
          ))
        }
      />
      {p.blocked_at && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          Cuenta bloqueada el {formatDateTime(p.blocked_at)}{p.blocked_reason && `: ${p.blocked_reason}`}
        </p>
      )}

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold">Cursos</h2>
        <ul className="space-y-2">
          {(enrollments ?? []).map((e) => {
            const revoked = !!e.revoked_at;
            const expired = !!e.expires_at && new Date(e.expires_at) <= new Date();
            const t = total(e.course_id);
            const pct = t ? Math.round((done(e.course_id) / t) * 100) : 0;
            return (
              <li key={e.course_id} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3", (revoked || expired) && "opacity-60")}>
                <div>
                  <p className="font-semibold">{title.get(e.course_id)}</p>
                  <p className="text-xs text-muted">
                    {SOURCE[e.source]} · desde {formatDate(e.created_at)} · {e.expires_at ? `hasta ${formatDate(e.expires_at)}` : "de por vida"} · avance {pct}%
                    {revoked && " · ACCESO RETIRADO"}
                    {expired && " · VENCIDO"}
                  </p>
                </div>
                {revoked ? (
                  <ActionButton action={restoreAccessAction.bind(null, p.id, e.course_id)}>Restaurar</ActionButton>
                ) : (
                  <ActionButton action={revokeAccessAction.bind(null, p.id, e.course_id)} tone="ghost" confirm="¿Quitarle el acceso a este curso?">
                    Quitar acceso
                  </ActionButton>
                )}
              </li>
            );
          })}
          {!enrollments?.length && <li className="text-sm text-muted">No tiene cursos.</li>}
        </ul>
        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-semibold">Dar acceso a otro curso</p>
          <GrantForm courses={courses ?? []} fixedEmail={p.email} />
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Monitor className="size-5 text-coral" /> Sesión
        </h2>
        <p className="text-sm text-muted">
          Cada cuenta puede tener una sola sesión abierta: al entrar en un dispositivo nuevo, se cierra la anterior.
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtle">Último inicio de sesión</dt>
            <dd>{session ? formatDateTime(session.updated_at) : "—"}</dd>
          </div>
          <div>
            <dt className="text-subtle">Última clase completada</dt>
            <dd>{formatDateTime(lastSeen)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-subtle">Dispositivo</dt>
            <dd className="break-all text-xs text-muted">{session?.user_agent ?? "—"}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <ActionButton action={closeSessionsAction.bind(null, p.id)} confirm="¿Cerrar su sesión? Tendrá que volver a ingresar.">
            Cerrar su sesión
          </ActionButton>
          <ActionButton action={resetSessionAction.bind(null, p.id)} tone="ghost">
            Reiniciar control de sesión
          </ActionButton>
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold">Compras</h2>
        <ul className="divide-y divide-border text-sm">
          {(orders ?? []).map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                {(o.course_id && title.get(o.course_id)) || "—"} <span className="text-subtle">· {formatDateTime(o.paid_at ?? o.created_at)}</span>
                {o.coupon_code && <span className="text-subtle"> · {o.coupon_code}</span>}
              </span>
              <span className="font-semibold">
                {formatUsd(Number(o.amount))} <span className="text-xs font-normal text-muted">({o.status})</span>
              </span>
            </li>
          ))}
          {!orders?.length && <li className="py-2 text-muted">Sin compras registradas.</li>}
        </ul>
        <Link href="/admin/ventas" className="text-sm text-violet hover:underline">Ir a ventas</Link>
      </section>
    </div>
  );
}
