// Datos de la marca usados en la web pública.
export const SITE = {
  name: "En Modo Video",
  tagline: "Cursos de edición de video con CapCut",
  whatsappNumber: "+51 906 583 864",
  whatsappUrl: "https://wa.me/51906583864",
  whatsappSupportText: "Hola ENMODOVIDEO 👋 Tengo una consulta sobre",
  tiktokHandle: "@enmodovideo",
  tiktokUrl: "https://www.tiktok.com/@enmodovideo",
  websiteLabel: "www.enmodovideo.com",
  websiteUrl: "https://www.enmodovideo.com",
  contactEmail: "hola@enmodovideo.com",
  /** Otras webs de la marca (aparecen en el pie de página). */
  sisters: [
    { label: "Inicio En Modo Video", href: "https://www.enmodovideo.com" },
    { label: "Tutoriales (membresía)", href: "https://tutos.enmodovideo.com" },
    { label: "Talleres en vivo", href: "https://talleres.enmodovideo.com" },
    { label: "Edito tus reels", href: "https://edicion.enmodovideo.com" },
  ],
} as const;

/** Titular del servicio, usado en las páginas legales. Política: ventas finales, sin reembolsos. */
export const LEGAL = {
  businessName: "ENMODOVIDEO",
  country: "Estados Unidos de América",
  updatedAt: "5 de noviembre de 2026",
} as const;

/** Enlace a WhatsApp con un mensaje ya escrito. */
export function whatsappLink(text: string) {
  return `${SITE.whatsappUrl}?text=${encodeURIComponent(text)}`;
}

/** Ruta del área del alumno después de iniciar sesión. */
export const HOME_MEMBER = "/mis-cursos";
