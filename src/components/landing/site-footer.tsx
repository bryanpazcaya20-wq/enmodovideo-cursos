import Link from "next/link";
import { Globe } from "lucide-react";
import { TikTokIcon, WhatsAppIcon } from "@/components/landing/brand-icons";
import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/site";

const SOCIAL = [
  { href: SITE.whatsappUrl, label: `WhatsApp ${SITE.whatsappNumber}`, icon: <WhatsAppIcon /> },
  { href: SITE.tiktokUrl, label: `TikTok ${SITE.tiktokHandle}`, icon: <TikTokIcon /> },
];

const LEGAL_LINKS = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/reembolsos", label: "Política de reembolsos" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40 pb-28 pt-12 lg:pb-12">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Cursos de edición de video con CapCut, para celular y PC. Aprende a tu ritmo, con acceso de por vida.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-subtle">Contacto</p>
          <ul className="mt-4 space-y-3">
            {SOCIAL.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-sm text-muted transition-colors hover:text-text"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-text">{s.icon}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-subtle">En Modo Video</p>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li><Link href="/#cursos" className="hover:text-text">Cursos</Link></li>
            <li><Link href="/ingresar" className="hover:text-text">Ingresar</Link></li>
            {SITE.sisters.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-text">
                  <Globe className="size-3.5" /> {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-subtle">Legal</p>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="hover:text-text">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl px-4 text-xs text-subtle">
        © {new Date().getFullYear()} {SITE.name}. Todos los derechos reservados. Pagos procesados de forma segura por PayPal.
      </p>
    </footer>
  );
}
