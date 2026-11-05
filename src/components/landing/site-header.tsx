import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const NAV = [
  { href: "/#cursos", label: "Cursos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#preguntas", label: "Preguntas" },
];

/** Cabecera pública. Es estática: si ya iniciaste sesión, «Ingresar» te lleva directo a Mis cursos. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-bg/70 backdrop-blur-md supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo priority />
        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Secciones">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="rounded-full px-3 py-2 text-muted transition-colors hover:text-text">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/ingresar" className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-text">
            Ingresar
          </Link>
          <span className="hidden sm:block">
            <LinkButton href="/#cursos" className="h-10 px-4">
              Ver cursos
            </LinkButton>
          </span>
        </div>
      </div>
    </header>
  );
}
