import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Infinity as InfinityIcon, Lock, Sparkles } from "lucide-react";
import { CheckoutBox } from "@/components/checkout/checkout-box";
import { requireUser } from "@/lib/auth";
import { CheckoutError, hasActiveCoupons, isEnrolled, quote } from "@/lib/checkout";
import { getPublicCourse } from "@/lib/courses/public";


export const metadata: Metadata = { title: "Comprar curso", robots: { index: false } };

export default async function BuyPage({ params, searchParams }: PageProps<"/comprar/[slug]">) {
  const { slug } = await params;
  const user = await requireUser(`/comprar/${slug}`);
  const course = await getPublicCourse(slug);
  if (!course) notFound();
  if (await isEnrolled(user.id, course.id)) redirect(`/aprender/${slug}`);

  const base = await quote(slug).catch((e) => {
    if (e instanceof CheckoutError) notFound();
    throw e;
  });
  // Cupón que llega en el enlace (?cupon=XXXX): se valida aquí mismo.
  const cupon = (await searchParams).cupon;
  const initialCoupon = typeof cupon === "string" ? cupon.slice(0, 40).toUpperCase() : undefined;
  let q = base;
  let couponError: string | null = null;
  if (initialCoupon) {
    try {
      q = await quote(slug, initialCoupon);
    } catch (e) {
      couponError = e instanceof CheckoutError ? e.message : "Ese cupón no es válido.";
    }
  }
  const clientId = process.env.PAYPAL_CLIENT_ID || null;
  // El campo de cupón solo aparece si hay algún cupón activo (o si llegó uno en el enlace).
  const couponsEnabled = Boolean(initialCoupon) || (await hasActiveCoupons());

  return (
    <div className="bg-brand-glow min-h-full px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link href={`/cursos/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" /> Volver al curso
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">Finaliza tu compra</h1>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_400px]">
          <section className="space-y-5 rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <div className="flex gap-4">
              {course.cover_url && (
                <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl border border-border">
                  <Image src={course.cover_url} alt="" fill sizes="112px" className="object-cover" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-coral">Curso</p>
                <h2 className="mt-1 font-display text-xl font-semibold leading-tight">{course.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {course.modules.length} módulos · {course.lessons_count} clases
                </p>
              </div>
            </div>
            <ul className="space-y-3 border-t border-border pt-5 text-sm text-muted">
              <li className="flex gap-3"><Sparkles className="size-4 shrink-0 text-success" /> Acceso inmediato al terminar el pago.</li>
              <li className="flex gap-3"><InfinityIcon className="size-4 shrink-0 text-success" /> Pago único: el curso es tuyo de por vida.</li>
              <li className="flex gap-3"><Lock className="size-4 shrink-0 text-success" /> Pago seguro: tus datos de pago los procesa PayPal, nunca pasan por nuestra web.</li>
            </ul>
            <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
              Comprando como <strong className="text-text">{user.email}</strong>. El curso quedará en esta cuenta.
            </p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-2xl">
            <CheckoutBox
              slug={slug}
              clientId={clientId}
              initialCoupon={couponError ? initialCoupon : undefined}
              initialCouponError={couponError}
              couponsEnabled={couponsEnabled}
              initial={{ price: q.price, discount: q.discount, total: q.total, coupon: q.coupon ? { code: q.coupon.code, label: q.coupon.label } : null }}
            />
            <p className="mt-5 text-center text-xs leading-relaxed text-subtle">
              Al pagar aceptas los <Link href="/terminos" className="underline">términos</Link> y la{" "}
              <Link href="/reembolsos" className="underline">política de reembolsos</Link>: al ser contenido digital, la compra es final y no tiene reembolso.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
