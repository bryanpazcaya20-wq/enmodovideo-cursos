"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/actions/admin-courses";
import { adminErrorMessage, assertAdmin, audit } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";
import { accessGrantedEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { fromLocalInput } from "@/lib/format";
import { paypalFetch } from "@/lib/paypal/client";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();
const email = z.string().trim().toLowerCase().email("Correo no válido");

function refreshMember(userId?: string) {
  revalidatePath("/admin/alumnos");
  revalidatePath("/admin/accesos");
  if (userId) revalidatePath(`/admin/alumnos/${userId}`);
}

// ---------------------------------------------------------------------------
// Acceso a cursos
// ---------------------------------------------------------------------------

/**
 * Da acceso a un curso por correo. Si la cuenta existe, se inscribe al instante;
 * si no, queda guardado y se activa cuando la persona entre con ese correo.
 */
export async function grantAccessByEmailAction(input: { email: string; courseId: string; expiresAt?: string; notify: boolean; note?: string }): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const e = email.safeParse(input.email);
    if (!e.success) return { ok: false, error: e.error.issues[0].message };
    if (!uuid.safeParse(input.courseId).success) return { ok: false, error: "Elige un curso." };
    const admin = createAdminClient();
    const [{ data: profile }, { data: course }] = await Promise.all([
      admin.from("profiles").select("id, full_name").eq("email", e.data).maybeSingle(),
      admin.from("courses").select("title").eq("id", input.courseId).maybeSingle(),
    ]);
    if (!course) return { ok: false, error: "Curso no encontrado." };
    const expires = fromLocalInput(input.expiresAt);

    if (profile) {
      const { error } = await admin
        .from("enrollments")
        .upsert(
          { user_id: profile.id, course_id: input.courseId, source: "admin", granted_by: me.id, revoked_at: null, expires_at: expires },
          { onConflict: "user_id,course_id" },
        );
      if (error) return { ok: false, error: error.message };
      await audit({ actorId: me.id, action: "access.grant", targetUserId: profile.id, targetCourseId: input.courseId, reason: input.note ?? null });
    } else {
      const { error } = await admin
        .from("access_grants")
        .upsert(
          { email: e.data, course_id: input.courseId, source: "admin", granted_by: me.id, note: input.note || null, claimed_at: null, claimed_by: null },
          { onConflict: "email,course_id" },
        );
      if (error) return { ok: false, error: error.message };
      await audit({ actorId: me.id, action: "access.grant_email", targetCourseId: input.courseId, metadata: { email: e.data } });
    }

    if (input.notify) {
      await sendEmail({
        to: e.data,
        userId: profile?.id ?? null,
        template: "access_granted",
        dedupeKey: `access:${e.data}:${input.courseId}:${Date.now()}`,
        ...accessGrantedEmail({ siteUrl: env.siteUrl, name: profile?.full_name, courseTitles: [course.title] }),
      });
    }
    refreshMember(profile?.id);
    return {
      ok: true,
      message: profile
        ? `Listo: ${e.data} ya tiene acceso a «${course.title}».`
        : `${e.data} aún no tiene cuenta: el acceso se activará cuando entre con ese correo.`,
    };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function revokeAccessAction(userId: string, courseId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const { error } = await createAdminClient()
      .from("enrollments")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("course_id", courseId);
    if (error) return { ok: false, error: error.message };
    await audit({ actorId: me.id, action: "access.revoke", targetUserId: userId, targetCourseId: courseId });
    refreshMember(userId);
    return { ok: true, message: "Acceso retirado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function restoreAccessAction(userId: string, courseId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const { error } = await createAdminClient().from("enrollments").update({ revoked_at: null }).eq("user_id", userId).eq("course_id", courseId);
    if (error) return { ok: false, error: error.message };
    await audit({ actorId: me.id, action: "access.grant", targetUserId: userId, targetCourseId: courseId, reason: "Restaurado" });
    refreshMember(userId);
    return { ok: true, message: "Acceso restaurado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function deleteGrantAction(grantId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const admin = createAdminClient();
    const { data: g } = await admin.from("access_grants").select("email, course_id, claimed_at").eq("id", grantId).maybeSingle();
    if (!g) return { ok: false, error: "No encontrado." };
    if (g.claimed_at) return { ok: false, error: "Ya fue usado: quita el acceso desde la ficha del alumno." };
    await admin.from("access_grants").delete().eq("id", grantId);
    await audit({ actorId: me.id, action: "access.grant_email.delete", targetCourseId: g.course_id, metadata: { email: g.email } });
    refreshMember();
    return { ok: true, message: "Acceso anulado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

/** Envía el correo "tu curso está en la nueva plataforma" a los migrados que aún no entran. */
export async function inviteMigratedAction(): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const admin = createAdminClient();
    const [{ data: grants }, { data: courses }] = await Promise.all([
      admin.from("access_grants").select("email, course_id").eq("source", "migration").is("claimed_at", null),
      admin.from("courses").select("id, title"),
    ]);
    const title = new Map((courses ?? []).map((c) => [c.id, c.title]));
    const byEmail = new Map<string, string[]>();
    for (const g of grants ?? []) byEmail.set(g.email, [...(byEmail.get(g.email) ?? []), title.get(g.course_id) ?? "Curso"]);

    let sent = 0;
    for (const [to, titles] of byEmail) {
      const ok = await sendEmail({
        to,
        template: "migration_invite",
        dedupeKey: `migration_invite:${to}`, // una sola vez por persona
        ...accessGrantedEmail({ siteUrl: env.siteUrl, courseTitles: titles, migrated: true }),
      });
      if (ok) sent++;
    }
    await audit({ actorId: me.id, action: "member.invite", metadata: { migrated: byEmail.size, sent } });
    return {
      ok: true,
      message: env.resendApiKey
        ? `Correos enviados: ${sent} de ${byEmail.size} (a quien ya se le envió antes no se le repite).`
        : `Falta configurar RESEND_API_KEY: no se envió ningún correo (${byEmail.size} pendientes).`,
    };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Cuenta del alumno
// ---------------------------------------------------------------------------

export async function setBlockedAction(userId: string, blocked: boolean, reason?: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    if (userId === me.id) return { ok: false, error: "No puedes bloquear tu propia cuenta." };
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ blocked_at: blocked ? new Date().toISOString() : null, blocked_reason: blocked ? reason?.slice(0, 300) || null : null })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    if (blocked) await closeSessions(userId);
    await audit({ actorId: me.id, action: blocked ? "member.block" : "member.unblock", targetUserId: userId, reason: reason ?? null });
    refreshMember(userId);
    return { ok: true, message: blocked ? "Cuenta bloqueada: ya no puede ver sus cursos." : "Cuenta desbloqueada." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

/** Cierra la sesión del alumno en todos sus dispositivos (deberá volver a ingresar). */
async function closeSessions(userId: string) {
  const admin = createAdminClient();
  // Cambiar la sesión vigente hace que el proxy cierre cualquier sesión abierta.
  await admin.from("active_sessions").upsert({ user_id: userId, session_id: crypto.randomUUID(), user_agent: "cerrada por admin" }, { onConflict: "user_id" });
}

export async function closeSessionsAction(userId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    await closeSessions(userId);
    await audit({ actorId: me.id, action: "member.session.close", targetUserId: userId });
    refreshMember(userId);
    return { ok: true, message: "Sesión cerrada en todos sus dispositivos." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

/** Permite que el alumno vuelva a iniciar sesión en un dispositivo nuevo sin cerrar el actual (borra el registro). */
export async function resetSessionAction(userId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    await createAdminClient().from("active_sessions").delete().eq("user_id", userId);
    await audit({ actorId: me.id, action: "member.session.close", targetUserId: userId, reason: "Reinicio del control de sesión" });
    refreshMember(userId);
    return { ok: true, message: "Control de sesión reiniciado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Administradores
// ---------------------------------------------------------------------------

export type MemberActionState = { ok?: boolean; error?: string; message?: string };

export async function addAdminAction(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  try {
    const me = await assertAdmin();
    const parsed = email.safeParse(formData.get("email"));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("id, role").eq("email", parsed.data).maybeSingle();
    if (!profile) return { error: "No hay ninguna cuenta con ese correo. Primero debe registrarse." };
    if (profile.role === "admin") return { error: "Esa persona ya es administradora." };
    await admin.from("profiles").update({ role: "admin" }).eq("id", profile.id);
    await audit({ actorId: me.id, action: "admin.grant", targetUserId: profile.id });
    revalidatePath("/admin/administradores");
    return { ok: true, message: `${parsed.data} ahora es administrador.` };
  } catch (e) {
    return { error: adminErrorMessage(e) };
  }
}

export async function removeAdminAction(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  try {
    const me = await assertAdmin();
    const userId = String(formData.get("userId") ?? "");
    if (!uuid.safeParse(userId).success) return { error: "Usuario no válido." };
    if (userId === me.id) return { error: "No puedes quitarte tu propio rol." };
    await createAdminClient().from("profiles").update({ role: "member" }).eq("id", userId);
    await audit({ actorId: me.id, action: "admin.revoke", targetUserId: userId });
    revalidatePath("/admin/administradores");
    return { ok: true };
  } catch (e) {
    return { error: adminErrorMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Ventas
// ---------------------------------------------------------------------------

/**
 * Reembolsa un pedido: si se pagó por PayPal desde esta web, ordena el reembolso a PayPal;
 * en todos los casos marca el pedido como reembolsado y quita el acceso al curso.
 */
export async function refundOrderAction(orderId: string, viaPayPal: boolean): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const admin = createAdminClient();
    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return { ok: false, error: "Pedido no encontrado." };
    if (order.status !== "paid") return { ok: false, error: "Solo se pueden reembolsar pedidos pagados." };

    if (viaPayPal) {
      if (order.provider !== "paypal" || !order.paypal_capture_id) {
        return { ok: false, error: "Este pedido no se cobró por PayPal desde esta web: reembólsalo directo en PayPal y márcalo aquí." };
      }
      await paypalFetch(`/v2/payments/captures/${order.paypal_capture_id}/refund`, { method: "POST", idempotencyKey: `refund-${order.id}`, body: {} });
    }

    await admin.from("orders").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", order.id);
    if (order.user_id && order.course_id) {
      await admin.from("enrollments").update({ revoked_at: new Date().toISOString() }).eq("user_id", order.user_id).eq("course_id", order.course_id);
    }
    await audit({ actorId: me.id, action: "order.refund", targetUserId: order.user_id, targetCourseId: order.course_id, metadata: { order: order.id, amount: order.amount, viaPayPal } });
    revalidatePath("/admin/ventas");
    revalidatePath("/admin");
    refreshMember(order.user_id ?? undefined);
    return { ok: true, message: viaPayPal ? "Reembolso enviado a PayPal y acceso retirado." : "Pedido marcado como reembolsado y acceso retirado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}
