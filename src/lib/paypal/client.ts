import "server-only";
import { env } from "@/lib/env";

// Cliente REST de PayPal. El secreto nunca sale del servidor.
// PAYPAL_MODE=sandbox|live elige el entorno.

export function paypalApiBase() {
  return env.paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

/** Web de PayPal donde el cliente administra sus pagos automáticos. */
export function paypalAutopayUrl() {
  return env.paypalMode === "live" ? "https://www.paypal.com/myaccount/autopay/" : "https://www.sandbox.paypal.com/myaccount/autopay/";
}

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const credentials = Buffer.from(`${env.paypalClientId}:${env.paypalSecret}`).toString("base64");
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new PayPalError("No se pudo autenticar con PayPal. Revisa PAYPAL_CLIENT_ID, PAYPAL_SECRET y PAYPAL_MODE.", res.status);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export async function paypalFetch<T = unknown>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalApiBase()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.idempotencyKey ? { "PayPal-Request-Id": init.idempotencyKey } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message = (data as { message?: string } | undefined)?.message ?? `PayPal respondió con un error (${res.status})`;
    throw new PayPalError(message, res.status, data);
  }
  return data as T;
}
