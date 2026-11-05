import "server-only";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailContent } from "@/lib/email/templates";

export type OutgoingEmail = EmailContent & {
  to: string;
  template: string;
  userId?: string | null;
  /** Si se repite, el correo NO se vuelve a enviar (p. ej. el mismo pago o el mismo tutorial). */
  dedupeKey?: string;
  unsubscribeUrl?: string;
};

const RESEND_URL = "https://api.resend.com";

function payload(e: OutgoingEmail) {
  return {
    from: env.emailFrom,
    to: [e.to],
    subject: e.subject,
    html: e.html,
    text: e.text,
    ...(e.unsubscribeUrl
      ? { headers: { "List-Unsubscribe": `<${e.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
      : {}),
  };
}

/** Reserva el envío en email_log. Devuelve false si ya se envió antes (dedupe). */
async function claim(e: OutgoingEmail): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("email_log").insert({
    user_id: e.userId ?? null,
    to_email: e.to,
    template: e.template,
    dedupe_key: e.dedupeKey ?? null,
  });
  if (error?.code === "23505") return false;
  if (error) console.error("[correo] registro:", error.message);
  return true;
}

async function markError(e: OutgoingEmail, message: string) {
  if (!e.dedupeKey) return;
  const admin = createAdminClient();
  // Liberamos la clave para que un reintento pueda volver a enviarlo.
  await admin.from("email_log").update({ error: message, dedupe_key: null }).eq("dedupe_key", e.dedupeKey);
}

/** Envía un correo con Resend. Nunca lanza error: un correo fallido no debe romper pagos ni publicaciones. */
export async function sendEmail(e: OutgoingEmail): Promise<boolean> {
  try {
    if (!(await claim(e))) return false;
    if (!env.resendApiKey) {
      console.info(`[correo] RESEND_API_KEY no configurada; se omite «${e.subject}» → ${e.to}`);
      return false;
    }
    const res = await fetch(`${RESEND_URL}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload(e)),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[correo] Resend", res.status, body);
      await markError(e, `Resend ${res.status}: ${body.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[correo]", err);
    await markError(e, err instanceof Error ? err.message : String(err)).catch(() => {});
    return false;
  }
}
