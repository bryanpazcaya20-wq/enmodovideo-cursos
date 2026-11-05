import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getClientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconocida";
}

/**
 * Devuelve true si la acción está permitida.
 * Si la base de datos falla, se permite (para no bloquear a todos por un error temporal).
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit]", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("[rate-limit]", e);
    return true;
  }
}
