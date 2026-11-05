"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/landing/brand-icons";
import { SITE, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Botón flotante de soporte por WhatsApp en toda la web (menos el panel). */
export function WhatsAppSupport() {
  const pathname = usePathname();
  // En el panel y dentro de las clases no se muestra (estorba al reproductor).
  if (pathname.startsWith("/admin") || pathname.startsWith("/aprender")) return null;

  return (
    <a
      href={whatsappLink(`${SITE.whatsappSupportText} `)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte por WhatsApp"
      className={cn(
        "group fixed right-4 z-50 flex items-center gap-2 rounded-full bg-[#25d366] p-3.5 text-[#0b2e17] shadow-[0_10px_30px_-8px_#25d36699] transition-all hover:scale-105 hover:bg-[#3ee07a] sm:right-6 sm:bottom-6 sm:pr-5",
        // En la página de un curso hay una barra de compra fija abajo (celular): el botón va por encima.
        pathname.startsWith("/cursos/") ? "bottom-24 lg:bottom-6" : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      <WhatsAppIcon className="size-6" />
      <span className="hidden text-sm font-semibold sm:inline">Soporte</span>
    </a>
  );
}
