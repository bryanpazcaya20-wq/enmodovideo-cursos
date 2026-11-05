import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, LogOut, MessageCircle, Receipt, UserRound } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { LinkButton } from "@/components/ui/button";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { formatUsd } from "@/lib/pricing";
import { SITE, whatsappLink } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi cuenta" };

const STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Pagado", className: "bg-success/15 text-success" },
  refunded: { label: "Reembolsado", className: "bg-surface-2 text-muted" },
  pending: { label: "Pendiente", className: "bg-warning/15 text-warning" },
  failed: { label: "Fallido", className: "bg-danger/15 text-danger" },
  cancelled: { label: "Cancelado", className: "bg-surface-2 text-muted" },
};

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }) : "—";

export default async function AccountPage() {
  const user = await requireUser("/mi-cuenta");
  const supabase = await createClient();
  const [profile, { data: orders }, { data: courses }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("orders").select("id, course_id, amount, status, paid_at, created_at, coupon_code, provider").eq("user_id", user.id).in("status", ["paid", "refunded"]).order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title"),
  ]);
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Mi cuenta</h1>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <UserRound className="size-5 text-coral" /> Tus datos
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtle">Nombre</dt>
            <dd className="font-medium">{profile?.full_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-subtle">Correo</dt>
            <dd className="break-all font-medium">{profile?.email}</dd>
          </div>
          <div>
            <dt className="text-subtle">Acceso con</dt>
            <dd className="font-medium">{profile?.provider === "google" ? "Google" : "Correo y contraseña"}</dd>
          </div>
          <div>
            <dt className="text-subtle">Miembro desde</dt>
            <dd className="font-medium">{date(profile?.created_at ?? null)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2 pt-2">
          <LinkButton href="/nueva-contrasena" variant="secondary" className="h-10">
            <KeyRound className="size-4" /> {profile?.provider === "google" ? "Crear una contraseña" : "Cambiar contraseña"}
          </LinkButton>
          <form action={signOutAction}>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text">
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Receipt className="size-5 text-coral" /> Tus compras
        </h2>
        {orders?.length ? (
          <ul className="divide-y divide-border">
            {orders.map((o) => {
              const s = STATUS[o.status] ?? STATUS.pending;
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{(o.course_id && title.get(o.course_id)) || "Curso"}</p>
                    <p className="text-xs text-subtle">
                      {date(o.paid_at ?? o.created_at)}
                      {o.coupon_code && ` · cupón ${o.coupon_code}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{Number(o.amount) > 0 ? formatUsd(Number(o.amount)) : "Gratis"}</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className)}>{s.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Aún no hay compras en esta cuenta. Los cursos que te dimos de regalo o que migramos de la web anterior están en{" "}
            <Link href="/mis-cursos" className="font-semibold text-coral">Mis cursos</Link>.
          </p>
        )}
        <p className="text-xs text-subtle">
          ¿Te cobramos dos veces o por error? Escríbenos por WhatsApp. <Link href="/reembolsos" className="underline">Política de reembolsos</Link>.
        </p>
      </section>

      <section className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <MessageCircle className="size-7 shrink-0 text-[#25d366]" />
        <div className="flex-1">
          <p className="font-semibold">¿Necesitas ayuda?</p>
          <p className="text-sm text-muted">Escríbenos por WhatsApp al {SITE.whatsappNumber}.</p>
        </div>
        <a
          href={whatsappLink(`${SITE.whatsappSupportText} mi cuenta (${user.email})`)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#25d366] px-5 py-2.5 text-sm font-semibold text-[#0b2e17] hover:bg-[#3ee07a]"
        >
          Abrir WhatsApp
        </a>
      </section>
    </div>
  );
}
