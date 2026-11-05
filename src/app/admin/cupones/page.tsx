import type { Metadata } from "next";
import Link from "next/link";
import { deleteCouponAction, toggleCouponAction } from "@/actions/admin-coupons";
import { ActionButton } from "@/components/admin/action-button";
import { CopyLink } from "@/components/admin/copy-link";
import { CouponForm } from "@/components/admin/coupon-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PriceTag } from "@/components/courses/price-tag";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { formatUsd, saleActive } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cupones y promociones" };

export default async function CouponsPage() {
  const admin = createAdminClient();
  const [{ data: coupons }, { data: courses }] = await Promise.all([
    admin.from("coupons").select("*").order("created_at", { ascending: false }),
    admin.from("courses").select("id, title, slug, price_usd, sale_price_usd, sale_ends_at").order("sort_order"),
  ]);
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:py-8">
      <AdminPageHeader title="Cupones y promociones" description="Los cupones se escriben al pagar. Las promociones bajan el precio para todos." />

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Promociones activas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(courses ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-4">
              <div>
                <p className="font-semibold">{c.title}</p>
                <PriceTag course={c} className="mt-1" />
                <p className="mt-1 text-xs text-subtle">
                  {saleActive(c) ? (c.sale_ends_at ? `Termina el ${formatDate(c.sale_ends_at)}` : "Sin fecha de fin") : "Sin promoción"}
                </p>
              </div>
              <Link href={`/admin/cursos/${c.id}#precio`} className="shrink-0 text-sm font-medium text-violet hover:underline">
                Cambiar precio
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Nuevo cupón</h2>
        <CouponForm courses={(courses ?? []).map((c) => ({ id: c.id, title: c.title }))} />
      </section>

      <section className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descuento</th>
              <th className="px-4 py-3">Curso</th>
              <th className="px-4 py-3">Usos</th>
              <th className="px-4 py-3">Vigencia</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(coupons ?? []).map((c) => {
              const expired = !!c.expires_at && new Date(c.expires_at) <= now;
              const exhausted = c.max_uses !== null && c.used_count >= c.max_uses;
              const status = !c.active ? ["Pausado", "bg-surface-2 text-muted"] : expired ? ["Vencido", "bg-danger/15 text-danger"] : exhausted ? ["Agotado", "bg-warning/15 text-warning"] : ["Activo", "bg-success/15 text-success"];
              const course = c.course_id ? (courses ?? []).find((x) => x.id === c.course_id) : (courses ?? [])[0];
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold uppercase">{c.code}</p>
                    {c.note && <p className="text-xs text-subtle">{c.note}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold">{c.discount_type === "percent" ? `${Number(c.amount)}%` : formatUsd(Number(c.amount))}</td>
                  <td className="px-4 py-3 text-muted">{c.course_id ? title.get(c.course_id) : "Todos"}</td>
                  <td className="px-4 py-3">
                    {c.used_count}
                    {c.max_uses !== null && <span className="text-subtle"> / {c.max_uses}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.starts_at || c.expires_at ? `${c.starts_at ? formatDate(c.starts_at) : "ya"} → ${c.expires_at ? formatDate(c.expires_at) : "sin fin"}` : "Siempre"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status[1])}>{status[0]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {course && <CopyLink url={`${env.siteUrl}/comprar/${course.slug}?cupon=${c.code.toUpperCase()}`} label="Copiar link" />}
                      <ActionButton action={toggleCouponAction.bind(null, c.id, !c.active)} tone="ghost" showMessage={false}>
                        {c.active ? "Pausar" : "Activar"}
                      </ActionButton>
                      <ActionButton action={deleteCouponAction.bind(null, c.id)} tone="ghost" confirm={`¿Eliminar el cupón ${c.code.toUpperCase()}?`}>
                        Eliminar
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!coupons?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">Aún no hay cupones.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-subtle">
        «Copiar link» genera un enlace de compra con el cupón ya aplicado, ideal para TikTok o WhatsApp.
      </p>
    </div>
  );
}
