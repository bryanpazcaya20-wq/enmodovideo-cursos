import "server-only";
import { env } from "@/lib/env";
import { paypalFetch } from "@/lib/paypal/client";

/**
 * Verifica la firma de un webhook con la API oficial de PayPal.
 * Si falta alguna cabecera o PayPal no confirma, se rechaza.
 */
export async function verifyPayPalWebhook(headers: Headers, event: unknown): Promise<boolean> {
  const get = (name: string) => headers.get(name);
  const required = {
    auth_algo: get("paypal-auth-algo"),
    cert_url: get("paypal-cert-url"),
    transmission_id: get("paypal-transmission-id"),
    transmission_sig: get("paypal-transmission-sig"),
    transmission_time: get("paypal-transmission-time"),
  };
  if (Object.values(required).some((v) => !v)) return false;

  try {
    const res = await paypalFetch<{ verification_status: "SUCCESS" | "FAILURE" }>("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: { ...required, webhook_id: env.paypalWebhookId, webhook_event: event },
    });
    return res.verification_status === "SUCCESS";
  } catch (e) {
    console.error("[paypal webhook] error al verificar firma:", e);
    return false;
  }
}
