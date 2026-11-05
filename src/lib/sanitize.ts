import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Limpia el HTML de descripciones y lecciones: solo formato básico, enlaces e imágenes https.
 * Se aplica al guardar (panel admin) y otra vez al mostrar, por seguridad.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "ol", "ul", "li", "a", "img", "blockquote", "code", "pre", "hr", "mark"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      ol: ["start"],
    },
    allowedSchemes: ["https", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
    },
  });
}

/** ¿El HTML tiene contenido real (no solo etiquetas vacías)? */
export function hasRichContent(html: string | null | undefined) {
  if (!html) return false;
  return /<img/i.test(html) || sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim().length > 0;
}
