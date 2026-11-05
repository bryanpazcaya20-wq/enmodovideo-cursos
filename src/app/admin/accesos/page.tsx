import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { deleteGrantAction, inviteMigratedAction } from "@/actions/admin-members";
import { ActionButton } from "@/components/admin/action-button";
import { GrantForm } from "@/components/admin/grant-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dar acceso" };

export default async function AccessPage({ searchParams }: PageProps<"/admin/accesos">) {
  const sp = await searchParams;
  const view = sp.ver === "reclamados" ? "claimed" : "pending";
  const admin = createAdminClient();
  const grantsQuery = admin.from("access_grants").select("*").order("created_at", { ascending: false }).limit(500);
  const [{ data: courses }, { data: grants }, { count: migratedPending }] = await Promise.all([
    admin.from("courses").select("id, title").order("sort_order"),
    view === "pending" ? grantsQuery.is("claimed_at", null) : grantsQuery.not("claimed_at", "is", null),
    admin.from("access_grants").select("id", { count: "exact", head: true }).eq("source", "migration").is("claimed_at", null),
  ]);
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <AdminPageHeader title="Dar acceso" description="Regala un curso, registra un pago por otro medio (Yape, transferencia) o activa cortesías." />

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">
        <GrantForm courses={courses ?? []} />
        <p className="text-xs text-subtle">
          Si la persona aún no tiene cuenta, el acceso queda guardado con su correo y se activa solo cuando entre con Google o se registre con ese correo.
        </p>
      </section>

      {(migratedPending ?? 0) > 0 && (
        <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-violet/40 bg-violet-soft p-5 sm:flex-row sm:items-center">
          <Mail className="size-8 shrink-0 text-violet" />
          <div className="flex-1">
            <p className="font-semibold">{migratedPending} accesos migrados del WordPress aún no se reclaman</p>
            <p className="text-sm text-muted">
              Envía a esos alumnos el aviso «tu curso ya está en la nueva plataforma». A cada persona se le envía una sola vez.
            </p>
          </div>
          <ActionButton action={inviteMigratedAction} tone="primary" confirm="¿Enviar el correo de bienvenida a la nueva plataforma a los alumnos migrados que aún no entran?">
            Enviar aviso
          </ActionButton>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex gap-2">
          <Link href="?ver=pendientes" className={cn("rounded-full px-4 py-2 text-sm font-medium", view === "pending" ? "bg-surface-2 text-text" : "text-muted hover:text-text")}>
            Pendientes (sin cuenta)
          </Link>
          <Link href="?ver=reclamados" className={cn("rounded-full px-4 py-2 text-sm font-medium", view === "claimed" ? "bg-surface-2 text-text" : "text-muted hover:text-text")}>
            Ya reclamados
          </Link>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {(grants ?? []).map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{g.email}</p>
                <p className="text-xs text-muted">
                  {title.get(g.course_id)} · {g.source === "migration" ? "migrado" : "dado por admin"} · {formatDate(g.created_at)}
                  {g.note && ` · ${g.note}`}
                  {g.claimed_at && ` · reclamado el ${formatDate(g.claimed_at)}`}
                </p>
              </div>
              {g.claimed_by ? (
                <Link href={`/admin/alumnos/${g.claimed_by}`} className="text-sm text-violet hover:underline">Ver alumno</Link>
              ) : (
                <ActionButton action={deleteGrantAction.bind(null, g.id)} tone="ghost" confirm={`¿Anular el acceso pendiente de ${g.email}?`}>
                  Anular
                </ActionButton>
              )}
            </li>
          ))}
          {!grants?.length && <li className="px-4 py-10 text-center text-muted">No hay accesos en esta lista.</li>}
        </ul>
      </section>
    </div>
  );
}
