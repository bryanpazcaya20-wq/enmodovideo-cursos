import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlayCircle, Sparkles } from "lucide-react";
import { CourseCard } from "@/components/courses/course-card";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/form";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { getMyCourses } from "@/lib/courses/learn";
import { getCatalog } from "@/lib/courses/public";

export const metadata: Metadata = { title: "Mis cursos" };

export default async function MyCoursesPage({ searchParams }: PageProps<"/mis-cursos">) {
  const user = await requireUser("/mis-cursos");
  const [profile, mine, catalog, sp] = await Promise.all([getCurrentProfile(), getMyCourses(user.id), getCatalog(), searchParams]);
  const owned = new Set(mine.map((c) => c.id));
  const others = catalog.filter((c) => !owned.has(c.id));
  const name = profile?.full_name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      {sp.clave === "actualizada" && (
        <div className="mb-6">
          <Alert tone="success">Tu contraseña se actualizó.</Alert>
        </div>
      )}
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">{name ? `Hola, ${name} 👋` : "Mis cursos"}</h1>
      <p className="mt-1 text-muted">{mine.length ? "Sigue donde te quedaste." : "Aún no tienes cursos en esta cuenta."}</p>

      {mine.length > 0 ? (
        <section className="mt-10" aria-labelledby="adquiridos">
          <h2 id="adquiridos" className="flex items-center gap-3 font-display text-xl font-semibold sm:text-2xl">
            Cursos adquiridos
            <span className="rounded-full bg-coral-soft px-2.5 py-0.5 font-sans text-sm font-semibold text-coral">{mine.length}</span>
            <span className="h-px flex-1 bg-border" />
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {mine.map((c) => {
              const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
              const href = `/aprender/${c.slug}`;
              return (
                <Link
                  key={c.id}
                  href={href}
                  className="group flex gap-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-violet/50"
                >
                  <div className="relative aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-40">
                    {c.cover_url && <Image src={c.cover_url} alt="" fill sizes="160px" className="object-cover" />}
                    <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <PlayCircle className="size-10 text-white" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="font-display text-xl font-semibold leading-tight">{c.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {c.done} de {c.total} clases
                    </p>
                    <div className="mt-auto pt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-gradient-to-r from-coral to-violet" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-subtle">{pct}% completado</span>
                        <span className="font-semibold text-coral">{pct === 0 ? "Empezar" : pct === 100 ? "Repasar" : "Continuar"} →</span>
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center">
          <Sparkles className="mx-auto size-8 text-coral" />
          <p className="mt-3 font-semibold">¿Compraste un curso en nuestra web anterior?</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Entra con el <strong className="text-text">mismo correo</strong> con el que compraste. Si usas otro, escríbenos por WhatsApp y lo
            pasamos a esta cuenta.
          </p>
          <p className="mt-3 text-sm text-subtle">Cuenta actual: {user.email}</p>
          <LinkButton href="/#cursos" className="mt-6">
            Ver los cursos
          </LinkButton>
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-20 rounded-[1.75rem] border border-border bg-surface-2/60 px-5 py-8 sm:mt-24 sm:px-8 sm:py-10" aria-labelledby="disponibles">
          <p className="text-sm font-semibold uppercase tracking-wider text-coral">{mine.length ? "Sigue aprendiendo" : "Empieza hoy"}</p>
          <h2 id="disponibles" className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            {mine.length ? "Más cursos que puedes adquirir" : "Cursos disponibles"}
          </h2>
          <p className="mt-2 text-muted">Pago único y acceso de por vida, igual que tus otros cursos.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
