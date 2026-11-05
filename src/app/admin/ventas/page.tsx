import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { refundOrderAction } from "@/actions/admin-members";
import { ActionButton } from "@/components/admin/action-button";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDateTime } from "@/lib/format";
import { formatUsd } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

export const metadata: Metadata = { title: "Ventas" };

const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  paid: { label: "Pagado", className: "bg-success/15 text-success" },
  refunded: { label: "Reembolsado", className: "bg-surface-2 text-muted" },
  pending: { label: "Sin pagar", className: "bg-warning/15 text-warning" },
  failed: { label: "Fallido", className: "bg-danger/15 text-danger" },
  cancelled: { label: "Cancelado", className: "bg-surface-2 text-muted" },
};
const FILTERS = [
  { key: "paid", label: "Pagados" },
  { key: "refunded", label: "Reembolsados" },
  { key: "pending", label: "Sin pagar" },
  { key: "all", label: "Todos" },
] as const;
const PROVIDER: Record<string, string> = { paypal: "PayPal", free: "Cupón 100 %", wordpress: "Web anterior" };

export default async function SalesPage({ searchParams }: PageProps<"/admin/ventas">) {
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.key === sp.estado)?.key ?? "paid") as (typeof FILTERS)[number]["key"];
  const courseFilter = typeof sp.curso === "string" ? sp.curso : "";

  const admin = createAdminClient();
  let query = admin.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
  if (filter !== "all") query = query.eq("status", filter);
  if (courseFilter) query = query.eq("course_id", courseFilter);
  const [{ data: orders }, { data: courses }] = await Promise.all([query, admin.from("courses").select("id, title").order("sort_order")]);

  const userIds = [...new Set((orders ?? []).map((o) => o.user_id).filter(Boolean) as string[])];
  const { data: people } = userIds.length ? await admin.from("profiles").select("id, email, full_name").in("id", userIds) : { data: [] };
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const total = (orders ?? []).filter((o) => o.status === "paid").reduce((n, o) => n + Number(o.amount), 0);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ estado: filter, ...(courseFilter ? { curso: courseFilter } : {}), ...patch });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `?${p}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
      <AdminPageHeader
        title="Ventas"
        description={`${orders?.length ?? 0} pedidos · ${formatUsd(total)} cobrados en esta vista`}
        actions={
          <a href={`/api/admin/ventas.csv${qs({})}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-2 px-4 text-sm font-medium hover:border-violet/60">
            <Download className="size-4" /> Exportar CSV
          </a>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={qs({ estado: f.key })} className={cn("rounded-full px-4 py-2 text-sm font-medium", filter === f.key ? "bg-surface-2 text-text" : "text-muted hover:text-text")}>
            {f.label}
          </Link>
        ))}
        <span className="mx-2 w-px bg-border" />
        <Link href={qs({ curso: "" })} className={cn("rounded-full px-4 py-2 text-sm", !courseFilter ? "bg-surface-2 text-text" : "text-muted hover:text-text")}>
          Todos los cursos
        </Link>
        {(courses ?? []).map((c) => (
          <Link key={c.id} href={qs({ curso: c.id })} className={cn("rounded-full px-4 py-2 text-sm", courseFilter === c.id ? "bg-surface-2 text-text" : "text-muted hover:text-text")}>
            {c.title}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Alumno</th>
              <th className="px-4 py-3">Curso</th>
              <th className="px-4 py-3">Cupón</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(orders ?? []).map((o) => {
              const p = o.user_id ? person.get(o.user_id) : null;
              const s = STATUS[o.status];
              return (
                <tr key={o.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(o.paid_at ?? o.created_at)}</td>
                  <td className="px-4 py-3">
                    {p ? (
                      <Link href={`/admin/alumnos/${p.id}`} className="font-medium hover:text-coral">{p.full_name || p.email}</Link>
                    ) : (
                      <span className="font-medium">{o.payer_email ?? "—"}</span>
                    )}
                    <p className="text-xs text-subtle">
                      {p?.email !== o.payer_email && o.payer_email ? `PayPal: ${o.payer_email} · ` : ""}
                      {PROVIDER[o.provider] ?? o.provider}
                    </p>
                  </td>
                  <td className="px-4 py-3">{(o.course_id && title.get(o.course_id)) || "—"}</td>
                  <td className="px-4 py-3 text-muted">{o.coupon_code ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    {formatUsd(Number(o.amount))}
                    {Number(o.discount) > 0 && <p className="text-xs font-normal text-subtle">-{formatUsd(Number(o.discount))}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className)}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.status === "paid" && Number(o.amount) > 0 && (
                      o.provider === "paypal" && o.paypal_capture_id ? (
                        <ActionButton
                          action={refundOrderAction.bind(null, o.id, true)}
                          tone="ghost"
                          confirm={`¿Reembolsar ${formatUsd(Number(o.amount))} por PayPal? Se devolverá el dinero y se quitará el acceso al curso.`}
                        >
                          Reembolsar
                        </ActionButton>
                      ) : (
                        <ActionButton
                          action={refundOrderAction.bind(null, o.id, false)}
                          tone="ghost"
                          confirm="Este pedido no se cobró desde esta web. Primero devuelve el dinero en PayPal; esto solo lo marca como reembolsado y quita el acceso. ¿Continuar?"
                        >
                          Marcar reembolso
                        </ActionButton>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
            {!orders?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">No hay pedidos en esta vista.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
