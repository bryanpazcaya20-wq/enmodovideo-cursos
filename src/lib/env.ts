import "server-only";

// Lee variables de entorno solo en el servidor. Si falta una, el error dice cuál.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa tu archivo .env.local`);
  }
  return value;
}

export const env = {
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get adminEmail() {
    return required("ADMIN_EMAIL").trim().toLowerCase();
  },
  get bunnyLibraryId() {
    return required("BUNNY_LIBRARY_ID").trim();
  },
  /** Opcional: para leer la duración de los videos desde Bunny. */
  get bunnyApiKey(): string | null {
    return process.env.BUNNY_API_KEY || null;
  },
  get bunnyTokenAuthKey() {
    return required("BUNNY_TOKEN_AUTH_KEY");
  },
  /** Opcional: hostname del CDN de la biblioteca (vz-xxxx.b-cdn.net), para miniaturas. */
  get bunnyCdnHostname(): string | null {
    return process.env.BUNNY_CDN_HOSTNAME?.replace(/^https?:\/\//, "").replace(/\/$/, "") || null;
  },
  get paypalMode(): "sandbox" | "live" {
    return process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
  },
  get paypalClientId() {
    return required("PAYPAL_CLIENT_ID");
  },
  get paypalSecret() {
    return required("PAYPAL_SECRET");
  },
  get paypalWebhookId() {
    return required("PAYPAL_WEBHOOK_ID");
  },
  /** null si no está configurado: los correos se omiten (útil en desarrollo). */
  get resendApiKey(): string | null {
    return process.env.RESEND_API_KEY || null;
  },
  get emailFrom() {
    return process.env.EMAIL_FROM || "En Modo Video <hola@enmodovideo.com>";
  },
  get adminEmailOptional(): string | null {
    return process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  },
};
