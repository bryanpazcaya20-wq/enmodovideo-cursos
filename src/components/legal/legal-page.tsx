import type { ReactNode } from "react";
import { PublicShell } from "@/components/landing/public-shell";
import { LEGAL, SITE } from "@/lib/site";

/** Estructura común de Términos y Privacidad. */
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-subtle">Última actualización: {LEGAL.updatedAt}</p>
        <div className="mt-6 leading-relaxed text-muted">{intro}</div>
        <div className="mt-10 space-y-10">{children}</div>
      </article>
    </PublicShell>
  );
}

export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 leading-relaxed text-muted [&_li]:pl-1 [&_strong]:text-text [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      <h2 className="font-display text-xl font-semibold text-text">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

export function ContactLink() {
  return (
    <a href={`mailto:${SITE.contactEmail}`} className="font-medium text-coral hover:text-coral-hover">
      {SITE.contactEmail}
    </a>
  );
}
