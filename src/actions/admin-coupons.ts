"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/actions/admin-courses";
import { adminErrorMessage, assertAdmin, audit } from "@/lib/admin";
import { fromLocalInput } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

const CouponForm = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "El código debe tener de 3 a 30 letras, números, - o _ (sin espacios)."),
    discount_type: z.enum(["percent", "fixed"]),
    amount: z.coerce.number().positive("El descuento debe ser mayor a 0"),
    course_id: z.string().optional(),
    max_uses: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
    starts_at: z.string().optional(),
    expires_at: z.string().optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.discount_type !== "percent" || v.amount <= 100, { message: "Un porcentaje no puede ser mayor a 100." });

export async function saveCouponAction(couponId: string | null, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const parsed = CouponForm.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const f = parsed.data;
    const row = {
      code: f.code,
      discount_type: f.discount_type,
      amount: f.amount,
      course_id: f.course_id && z.string().uuid().safeParse(f.course_id).success ? f.course_id : null,
      max_uses: f.max_uses,
      starts_at: fromLocalInput(f.starts_at),
      expires_at: fromLocalInput(f.expires_at),
      note: f.note || null,
    };
    const admin = createAdminClient();
    const { error } = couponId
      ? await admin.from("coupons").update(row).eq("id", couponId)
      : await admin.from("coupons").insert({ ...row, active: true });
    if (error) return { ok: false, error: error.code === "23505" ? "Ya existe un cupón con ese código." : error.message };
    await audit({ actorId: me.id, action: couponId ? "coupon.update" : "coupon.create", metadata: { code: row.code } });
    revalidatePath("/admin/cupones");
    return { ok: true, message: couponId ? "Cupón guardado." : `Cupón ${row.code} creado.` };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function toggleCouponAction(couponId: string, active: boolean): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const { data, error } = await createAdminClient().from("coupons").update({ active }).eq("id", couponId).select("code").single();
    if (error) return { ok: false, error: error.message };
    await audit({ actorId: me.id, action: "coupon.update", metadata: { code: data.code, active } });
    revalidatePath("/admin/cupones");
    return { ok: true, message: active ? "Cupón activado." : "Cupón pausado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

export async function deleteCouponAction(couponId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    const admin = createAdminClient();
    const { data: c } = await admin.from("coupons").select("code, used_count").eq("id", couponId).maybeSingle();
    if (!c) return { ok: false, error: "No encontrado." };
    if (c.used_count > 0) return { ok: false, error: "Ya se usó en ventas: mejor pausarlo para conservar el historial." };
    await admin.from("coupons").delete().eq("id", couponId);
    await audit({ actorId: me.id, action: "coupon.delete", metadata: { code: c.code } });
    revalidatePath("/admin/cupones");
    return { ok: true, message: "Cupón eliminado." };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}
