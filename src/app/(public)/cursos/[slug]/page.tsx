import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, CreditCard, Infinity as InfinityIcon, Layers, MessageCircle, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { DeviceIcon } from "@/components/courses/course-card";
import { Curriculum } from "@/components/courses/curriculum";
import { PriceTag } from "@/components/courses/price-tag";
import { PublicShell } from "@/components/landing/public-shell";
import { BunnyPlayer } from "@/components/player/bunny-player";
import { LinkButton } from "@/components/ui/button";
import { formatDuration, getCatalog, getPublicCourse } from "@/lib/courses/public";
import { LEVEL_LABEL, currentPrice, formatUsd, saleActive } from "@/lib/pricing";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { SITE, whatsappLink } from "@/lib/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  const courses = await getCatalog();
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cursos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublicCourse(slug);
  if (!course) return { title: "Curso no encontrado" };
  return {
    title: course.title,
    description: course.subtitle ?? undefined,
    openGraph: { title: course.title, description: course.subtitle ?? undefined, images: course.cover_url ? [course.cover_url] : undefined },
  };
}

export default async function CoursePage({ params }: PageProps<"/cursos/[slug]">) {
  const { slug } = await params;
  const course = await getPublicCourse(slug);
  if (!course) notFound();

  const buyHref = `/comprar/${course.slug}`;
  const duration = formatDuration(course.modules.flatMap((m) => m.lessons).reduce((n, l) => n + (l.duration_seconds ?? 0), 0));
  const onSale = saleActive(course);

  return (
    <PublicShell>
      {/* ---------- Encabezado ---------- */}
      <section className="px-4 pb-24 pt-8 sm:pt-14">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <nav className="text-sm text-subtle" aria-label="Ruta">
              <Link href="/#cursos" className="hover:text-text">Cursos</Link> <span aria-hidden>›</span> {course.title}
            </nav>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              {course.device_label && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-soft px-3 py-1 text-violet">
                  <DeviceIcon label={course.device_label} className="size-3.5" /> CapCut {course.device_label}
                </span>
              )}
              <span className="rounded-full bg-surface-2 px-3 py-1 text-muted">Nivel {LEVEL_LABEL[course.level].toLowerCase()}</span>
              {onSale && <span className="rounded-full bg-coral-soft px-3 py-1 text-coral">🔥 En promoción</span>}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">{course.title}</h1>
            {course.subtitle && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{course.subtitle}</p>}
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li className="flex items-center gap-2"><Layers className="size-4 text-coral" /> {course.modules.length} módulos</li>
              <li className="flex items-center gap-2"><PlayCircle className="size-4 text-coral" /> {course.lessons_count} clases</li>
              {duration && <li className="flex items-center gap-2"><Clock className="size-4 text-coral" /> {duration}</li>}
              <li className="flex items-center gap-2"><InfinityIcon className="size-4 text-coral" /> Acceso de por vida</li>
            </ul>

            <div className="mt-8">
              {course.promo_video_id ? (
                <BunnyPlayer endpoint={`/api/video/promo/${course.id}`} title={`Presentación: ${course.title}`} />
              ) : course.cover_url ? (
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-border">
                  <Image src={course.cover_url} alt={course.title} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
                </div>
              ) : null}
            </div>
            <div className="mt-14 min-w-0 space-y-14">
            {course.learn_points.length > 0 && (
              <div className="rounded-[var(--radius-card)] border border-border bg-surface/60 p-6 sm:p-8">
                <h2 className="font-display text-2xl font-semibold">Lo que vas a aprender</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {course.learn_points.map((p) => (
                    <li key={p} className="flex gap-3 text-muted">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-coral" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h2 className="font-display text-2xl font-semibold">Temario del curso</h2>
              <p className="mt-1 text-muted">
                {course.modules.length} módulos · {course.lessons_count} clases · prueba gratis las clases marcadas con ▶
              </p>
              <div className="mt-5">
                <Curriculum modules={course.modules} />
              </div>
            </div>

            {course.description_html && (
              <div>
                <h2 className="font-display text-2xl font-semibold">Sobre este curso</h2>
                <div className="rich mt-4 text-muted" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(course.description_html) }} />
              </div>
            )}

            {course.requirements.length > 0 && (
              <div>
                <h2 className="font-display text-2xl font-semibold">Qué necesitas</h2>
                <ul className="mt-4 space-y-2 text-muted">
                  {course.requirements.map((r) => (
                    <li key={r} className="flex gap-3"><span className="text-coral">•</span> {r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:flex-row sm:items-center">
              <MessageCircle className="size-8 shrink-0 text-[#25d366]" />
              <div className="flex-1">
                <p className="font-semibold">¿Tienes dudas antes de comprar?</p>
                <p className="text-sm text-muted">Escríbenos por WhatsApp al {SITE.whatsappNumber} y te respondemos.</p>
              </div>
              <a
                href={whatsappLink(`${SITE.whatsappSupportText} el curso «${course.title}»`)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#25d366] px-5 py-2.5 text-sm font-semibold text-[#0b2e17] hover:bg-[#3ee07a]"
              >
                Escribir
              </a>
            </div>
          </div>
          </div>

          {/* ---------- Caja de compra ---------- */}
          <aside className="lg:pt-24">
            <div className="sticky top-24 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-2xl">
              {course.cover_url && (
                <div className="relative -mx-6 -mt-6 mb-5 hidden aspect-[16/10] overflow-hidden rounded-t-[var(--radius-card)] lg:block">
                  <Image src={course.cover_url} alt="" fill sizes="380px" className="object-cover" />
                </div>
              )}
              <PriceTag course={course} size="lg" />
              {onSale && course.sale_ends_at && (
                <p className="mt-2 text-sm font-medium text-warning">
                  La promoción termina el {new Date(course.sale_ends_at).toLocaleDateString("es-PE", { day: "numeric", month: "long", timeZone: "America/Lima" })}
                </p>
              )}
              <p className="mt-1 text-sm text-muted">Pago único · sin mensualidades</p>
              <LinkButton href={buyHref} size="lg" className="mt-5 w-full">
                Comprar ahora · {formatUsd(currentPrice(course))}
              </LinkButton>
              <LinkButton href={`${buyHref}?otros=1`} variant="secondary" size="lg" className="mt-3 w-full">
                <CreditCard className="size-5" /> Otros métodos de pago
              </LinkButton>
              <p className="mt-3 text-center text-xs text-subtle">PayPal o tarjeta · Yape, Plin, BCP · Binance, Western Union, Global66</p>
              <ul className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm text-muted">
                <li className="flex gap-2.5"><ShieldCheck className="size-4 shrink-0 text-success" /> Pago seguro con PayPal o tarjeta</li>
                <li className="flex gap-2.5"><Sparkles className="size-4 shrink-0 text-success" /> Acceso inmediato después del pago</li>
                <li className="flex gap-2.5"><InfinityIcon className="size-4 shrink-0 text-success" /> Acceso de por vida y actualizaciones</li>
                <li className="flex gap-2.5"><CreditCard className="size-4 shrink-0 text-success" /> <span>Mira la clase gratis antes de comprar (<Link href="/reembolsos" className="underline hover:text-text">ventas finales</Link>)</span></li>
              </ul>
              <p className="mt-5 text-center text-sm text-muted">
                ¿Ya lo compraste? <Link href="/mis-cursos" className="font-semibold text-coral hover:text-coral-hover">Entra a tus cursos</Link>
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ---------- Barra de compra en celular ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <PriceTag course={course} />
          <LinkButton href={buyHref} className="h-11 px-6">Comprar</LinkButton>
        </div>
      </div>
    </PublicShell>
  );
}
