import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

// Cliente anónimo SIN cookies: para datos públicos cacheables (landing).
// Al no depender de la sesión, su resultado se puede guardar en caché.
export function createPublicClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}
