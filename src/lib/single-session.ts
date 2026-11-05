// Una sola sesión activa por cuenta: la última que inició sesión es la válida.
// Se usa desde el proxy, los Route Handlers y las acciones de login (todo en el servidor).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Motivo en /ingresar?error=… cuando se cierra la sesión por entrar en otro dispositivo. */
export const REPLACED_ERROR = "otro-dispositivo";

type AnyClient = Pick<SupabaseClient, "auth">;

function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** session_id del JWT. Llamar solo después de getUser(), que ya validó el token con Supabase. */
export async function currentSessionId(supabase: AnyClient): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const payload = session?.access_token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { session_id?: string };
    return json.session_id ?? null;
  } catch {
    return null;
  }
}

async function isAdmin(db: SupabaseClient, userId: string) {
  const { data } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}

/**
 * Al iniciar sesión: esta pasa a ser la sesión válida de la cuenta y se cierran las demás.
 * (Los admins pueden tener varias sesiones abiertas.)
 */
export async function claimSession(supabase: AnyClient, userId: string, userAgent?: string | null) {
  try {
    const db = serviceClient();
    const sessionId = await currentSessionId(supabase);
    if (!db || !sessionId) return;
    await db
      .from("active_sessions")
      .upsert({ user_id: userId, session_id: sessionId, user_agent: userAgent?.slice(0, 300) ?? null }, { onConflict: "user_id" });
    if (!(await isAdmin(db, userId))) await supabase.auth.signOut({ scope: "others" });
  } catch (e) {
    console.error("[sesión única] al iniciar sesión:", e);
  }
}

/**
 * ¿Esta sesión sigue siendo la válida? "replaced" si la cuenta inició sesión en otro dispositivo.
 * Si falla la base de datos se permite el acceso (no bloquear a todos por un error temporal).
 */
export async function checkSession(supabase: AnyClient, userId: string): Promise<"ok" | "replaced"> {
  try {
    const db = serviceClient();
    const sessionId = await currentSessionId(supabase);
    if (!db || !sessionId) return "ok";

    const { data, error } = await db.from("active_sessions").select("session_id").eq("user_id", userId).maybeSingle();
    if (error) return "ok";
    if (!data) {
      // Sesiones abiertas antes de activar esta función: la primera que se ve queda como válida.
      await db.from("active_sessions").upsert({ user_id: userId, session_id: sessionId }, { onConflict: "user_id", ignoreDuplicates: true });
      return "ok";
    }
    if (data.session_id === sessionId) return "ok";
    return (await isAdmin(db, userId)) ? "ok" : "replaced";
  } catch (e) {
    console.error("[sesión única]", e);
    return "ok";
  }
}
