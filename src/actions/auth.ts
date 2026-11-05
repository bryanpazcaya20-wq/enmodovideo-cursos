"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { claimSession } from "@/lib/single-session";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureAdminBootstrap } from "@/lib/auth";
import { env } from "@/lib/env";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/utils";

export type AuthFormState = {
  error?: string;
  success?: string;
  email?: string;
};

const emailSchema = z.string().trim().toLowerCase().email("Escribe un correo válido");
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga");

const TOO_MANY = "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Primero confirma tu correo: revisa tu bandeja de entrada (y spam).";
  if (m.includes("already registered")) return "Ese correo ya tiene una cuenta. Inicia sesión.";
  if (m.includes("rate limit") || m.includes("too many")) return TOO_MANY;
  if (m.includes("weak") || m.includes("pwned")) return "Esa contraseña es muy fácil de adivinar. Elige otra.";
  if (m.includes("same") && m.includes("password")) return "La nueva contraseña debe ser distinta a la anterior.";
  return "Ocurrió un error. Inténtalo de nuevo.";
}

// ---------- Registro ----------
export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Escribe tu nombre").max(80),
      email: emailSchema,
      password: passwordSchema,
    })
    .safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const ip = await getClientIp();
  if (!(await rateLimit(`signup:ip:${ip}`, 5, 60 * 60))) return { error: TOO_MANY, email };

  const next = safeNext(formData.get("next"), "/mis-cursos");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: translateAuthError(error.message), email };

  // Si la confirmación por correo está desactivada, ya hay sesión.
  if (data.session) redirect(next);

  return {
    success: `Te enviamos un correo a ${parsed.data.email}. Abre el enlace para activar tu cuenta.`,
    email,
  };
}

// ---------- Inicio de sesión ----------
export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Escribe tu contraseña") })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const ip = await getClientIp();
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 20, 15 * 60),
    rateLimit(`login:email:${parsed.data.email}`, 6, 15 * 60),
  ]);
  if (!ipOk || !emailOk) return { error: TOO_MANY, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translateAuthError(error.message), email };

  await ensureAdminBootstrap(data.user);
  await claimSession(supabase, data.user.id, (await headers()).get("user-agent"));
  redirect(safeNext(formData.get("next"), "/mis-cursos"));
}

// ---------- Google ----------
export async function signInWithGoogleAction(formData: FormData) {
  const next = safeNext(formData.get("next"), "/mis-cursos");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/ingresar?error=google");
  redirect(data.url);
}

// ---------- Recuperar contraseña ----------
export async function requestPasswordResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const ip = await getClientIp();
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`reset:ip:${ip}`, 10, 60 * 60),
    rateLimit(`reset:email:${parsed.data}`, 3, 60 * 60),
  ]);
  if (!ipOk || !emailOk) return { error: TOO_MANY, email };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/nueva-contrasena`,
  });

  // Mismo mensaje exista o no la cuenta (no revelamos qué correos están registrados).
  return {
    success: "Si hay una cuenta con ese correo, te llegará un enlace para crear una nueva contraseña.",
    email,
  };
}

// ---------- Nueva contraseña ----------
export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden" })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "El enlace venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?»." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: translateAuthError(error.message) };

  redirect("/mis-cursos?clave=actualizada");
}

// ---------- Cerrar sesión ----------
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
