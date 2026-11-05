import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { Profile } from "@/types/database";

// Capa de acceso a datos: TODA verificación de sesión/rol pasa por aquí.

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/ingresar?next=${encodeURIComponent(next)}` : "/ingresar");
  return user;
}

export async function requireAdmin() {
  await requireUser("/admin");
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/mis-cursos");
  return profile;
}

/**
 * Convierte en admin la cuenta de ADMIN_EMAIL la primera vez que inicia sesión.
 * Solo si el correo está verificado (evita que alguien se registre con tu correo sin confirmarlo).
 */
export async function ensureAdminBootstrap(user: User) {
  const email = user.email?.toLowerCase();
  if (!email || !user.email_confirmed_at) return;
  let adminEmail: string;
  try {
    adminEmail = env.adminEmail;
  } catch {
    return;
  }
  if (email !== adminEmail) return;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role === "admin") return;

  await admin.from("profiles").update({ role: "admin" }).eq("id", user.id);
  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "admin.bootstrap",
    target_user_id: user.id,
    reason: "Primer administrador (ADMIN_EMAIL)",
  });
}

/** ¿El usuario actual tiene acceso a este curso? Se calcula en Postgres (has_course_access). */
export const getHasCourseAccess = cache(async (courseId: string): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_course_access", { p_course: courseId, uid: user.id });
  return !error && data === true;
});
