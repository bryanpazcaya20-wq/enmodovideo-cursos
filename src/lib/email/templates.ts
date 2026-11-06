// Plantillas de correo (HTML con estilos en línea, compatibles con Gmail/Outlook/Apple Mail).
// Funciones puras: reciben los datos y devuelven { subject, html, text }. 

export type EmailContent = { subject: string; html: string; text: string };

const BRAND = {
  coral: "#f4644e",
  purple: "#53297a",
  ink: "#1f1530",
  muted: "#6b6280",
  bg: "#f4f1f8",
  card: "#ffffff",
  border: "#e8e2f0",
};

const SOCIAL = {
  whatsapp: "https://wa.me/51906583864",
  tiktok: "https://www.tiktok.com/@enmodovideo",
  web: "https://www.enmodovideo.com",
};

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const firstName = (name?: string | null) => (name?.trim().split(/\s+/)[0] ? esc(name.trim().split(/\s+/)[0]) : "");
const hello = (name?: string | null) => (firstName(name) ? `Hola, ${firstName(name)}` : "Hola");

function button(href: string, label: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px"><tr><td style="border-radius:999px;background:${BRAND.coral}">
<a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a>
</td></tr></table>`;
}

function p(html: string) {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.ink}">${html}</p>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;color:${BRAND.ink}">${text}</h1>`;
}

function infoBox(rows: Array<[string, string]>) {
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.muted}">${esc(k)}</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${BRAND.ink};text-align:right">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 16px;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border}">${tr}</table>`;
}

function layout(opts: { siteUrl: string; preheader: string; body: string; unsubscribeUrl?: string; forAdmin?: boolean }) {
  const { siteUrl, preheader, body, unsubscribeUrl, forAdmin } = opts;
  const footer = forAdmin
    ? `Aviso automático del panel de En Modo Video.`
    : `<a href="${SOCIAL.whatsapp}" style="color:${BRAND.purple}">WhatsApp</a> · <a href="${SOCIAL.tiktok}" style="color:${BRAND.purple}">TikTok @enmodovideo</a> · <a href="${SOCIAL.web}" style="color:${BRAND.purple}">www.enmodovideo.com</a>${
        unsubscribeUrl ? `<br><br><a href="${esc(unsubscribeUrl)}" style="color:${BRAND.muted}">Darme de baja</a>` : ""
      }`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>En Modo Video</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
    <tr><td style="padding:0 8px 20px"><a href="${esc(siteUrl)}"><img src="${esc(siteUrl)}/brand/logo-completo.png" alt="En Modo Video" height="36" style="display:block;height:36px;width:auto;border:0"></a></td></tr>
    <tr><td style="background:${BRAND.card};border-radius:20px;padding:36px 32px;border:1px solid ${BRAND.border}">${body}</td></tr>
    <tr><td style="padding:24px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.muted};text-align:center">${footer}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Al alumno
// ---------------------------------------------------------------------------

const usd = (n: number) => `$${n.toFixed(2)} USD`;

export function purchaseEmail(d: { siteUrl: string; name?: string | null; courseTitle: string; amount: number; courseUrl: string }): EmailContent {
  return {
    subject: `¡Ya tienes acceso a ${d.courseTitle}! 🎬`,
    html: layout({
      siteUrl: d.siteUrl,
      preheader: "Tu compra está confirmada. Empieza tu curso cuando quieras.",
      body:
        h1(`${hello(d.name)}, ¡bienvenido al curso! 🎉`) +
        p(`Tu compra de <strong>${esc(d.courseTitle)}</strong> está confirmada. El curso ya está en <strong>Mis cursos</strong> y es tuyo de por vida.`) +
        infoBox([
          ["Curso", d.courseTitle],
          ["Total pagado", d.amount > 0 ? usd(d.amount) : "Gratis (cupón)"],
        ]) +
        button(d.courseUrl, "Empezar el curso") +
        p(
          `<span style="font-size:14px;color:${BRAND.muted}">Entra siempre con este mismo correo (o con Google si es una cuenta de Gmail). ¿Dudas? Escríbenos por <a href="${SOCIAL.whatsapp}" style="color:${BRAND.purple}">WhatsApp</a>.</span>`,
        ),
    }),
    text: `${hello(d.name)}. Tu compra de ${d.courseTitle} está confirmada${d.amount > 0 ? ` (${usd(d.amount)})` : ""}. Empieza aquí: ${d.courseUrl}`,
  };
}

/** Acceso dado por el equipo o migrado desde la web anterior. */
export function accessGrantedEmail(d: { siteUrl: string; name?: string | null; courseTitles: string[]; migrated?: boolean }): EmailContent {
  const list = d.courseTitles.map((t) => `<li style="margin:0 0 6px">${esc(t)}</li>`).join("");
  const loginUrl = `${d.siteUrl}/ingresar`;
  return {
    subject: d.migrated ? "Tu curso ya está en la nueva plataforma de En Modo Video 🎬" : "Te dimos acceso a un curso de En Modo Video 🎬",
    html: layout({
      siteUrl: d.siteUrl,
      preheader: d.migrated ? "Estrenamos plataforma: entra con tu mismo correo y sigue donde te quedaste." : "Ya puedes empezar tu curso.",
      body:
        h1(d.migrated ? `${hello(d.name)}, ¡estrenamos plataforma! 🚀` : `${hello(d.name)}, ¡tienes un curso nuevo! 🎉`) +
        p(
          d.migrated
            ? "Renovamos la web de cursos para que aprendas más cómodo desde el celular o la PC. <strong>Tu compra está a salvo</strong>: ya tienes acceso a:"
            : "Ya tienes acceso de por vida a:",
        ) +
        `<ul style="margin:0 0 16px;padding-left:20px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.ink}">${list}</ul>` +
        p(
          "Para entrar usa <strong>este mismo correo</strong>: con el botón <strong>Continuar con Google</strong> (si es Gmail) o creando tu cuenta con este correo en «Crear cuenta».",
        ) +
        (d.migrated ? p("Tu avance también se migró: verás marcadas las clases que ya completaste.") : "") +
        button(loginUrl, "Entrar a mis cursos"),
    }),
    text: `${hello(d.name)}. Ya tienes acceso a: ${d.courseTitles.join(", ")}. Entra con este mismo correo en ${loginUrl}`,
  };
}

// ---------------------------------------------------------------------------
// Al administrador
// ---------------------------------------------------------------------------

export function adminSaleEmail(d: { siteUrl: string; buyerEmail: string; courseTitle: string; amount: number; coupon?: string | null }): EmailContent {
  const rows: Array<[string, string]> = [
    ["Curso", d.courseTitle],
    ["Alumno", d.buyerEmail],
    ["Monto", usd(d.amount)],
  ];
  if (d.coupon) rows.push(["Cupón", d.coupon]);
  return {
    subject: `💰 Nueva venta: ${d.courseTitle} (${usd(d.amount)})`,
    html: layout({
      siteUrl: d.siteUrl,
      forAdmin: true,
      preheader: `${d.buyerEmail} compró ${d.courseTitle}`,
      body: h1("¡Nueva venta! 💰") + infoBox(rows) + button(`${d.siteUrl}/admin/ventas`, "Ver ventas"),
    }),
    text: `Nueva venta: ${d.courseTitle} · ${d.buyerEmail} · ${usd(d.amount)}`,
  };
}
