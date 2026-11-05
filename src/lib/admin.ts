import "server-only";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { PayPalError } from "@/lib/paypal/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, Profile } from "@/types/database";

export class AdminError extends Error {}

/**
 * Para Server Actions y Route Handlers del panel: valida en el servidor que quien llama es admin.
 * (El proxy y el layout ya filtran, pero cada acción se protege sola.)
 */
export async function assertAdmin(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new AdminError("Tu sesión expiró. Vuelve a ingresar.");
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") throw new AdminError("No tienes permisos de administrador.");
  return profile;
}

/** Registro de auditoría: quién, qué, sobre quién, cuándo y por qué. */
export async function audit(entry: {
  actorId: string | null;
  action: string;
  targetUserId?: string | null;
  targetCourseId?: string | null;
  reason?: string | null;
  metadata?: Json;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_user_id: entry.targetUserId ?? null,
    target_course_id: entry.targetCourseId ?? null,
    reason: entry.reason ?? null,
    metadata: entry.metadata ?? null,
  });
  if (error) console.error("[auditoría]", error.message);
}

export const AUDIT_LABEL: Record<string, string> = {
  "admin.bootstrap": "Primer administrador",
  "admin.grant": "Dio rol de administrador",
  "admin.revoke": "Quitó rol de administrador",
  "course.create": "Creó curso",
  "course.update": "Editó curso",
  "course.publish": "Publicó curso",
  "course.unpublish": "Ocultó curso",
  "course.delete": "Eliminó curso",
  "curriculum.update": "Editó el temario",
  "access.grant": "Dio acceso a un curso",
  "access.revoke": "Quitó acceso a un curso",
  "access.grant_email": "Dio acceso por correo",
  "access.grant_email.delete": "Anuló acceso por correo",
  "member.block": "Bloqueó cuenta",
  "member.unblock": "Desbloqueó cuenta",
  "member.session.close": "Cerró la sesión de un alumno",
  "member.invite": "Envió invitación",
  "coupon.create": "Creó cupón",
  "coupon.update": "Editó cupón",
  "coupon.delete": "Eliminó cupón",
  "order.refund": "Marcó pedido como reembolsado",
};

/** Mensaje de error seguro para mostrar al admin. */
export function adminErrorMessage(e: unknown, fallback = "Ocurrió un error. Inténtalo de nuevo.") {
  if (e instanceof AdminError) return e.message;
  if (e instanceof PayPalError) return `PayPal: ${e.message}`;
  console.error("[admin]", e);
  return fallback;
}
