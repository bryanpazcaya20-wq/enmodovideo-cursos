import type { ReactNode } from "react";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

/** Cabecera + pie para páginas públicas secundarias (precios, legales). */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-brand-glow flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
