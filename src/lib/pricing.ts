// Cálculo de precios: precio de promoción y cupones. Sin dependencias de servidor
// (se usa en la página del curso y, con los mismos números, en el servidor al cobrar).
import type { Coupon, Course } from "@/types/database";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function formatUsd(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

type PriceFields = Pick<Course, "price_usd" | "sale_price_usd" | "sale_ends_at">;

/** ¿La promoción del curso está vigente? */
export function saleActive(course: PriceFields, now = new Date()) {
  return (
    course.sale_price_usd !== null &&
    Number(course.sale_price_usd) < Number(course.price_usd) &&
    (!course.sale_ends_at || new Date(course.sale_ends_at) > now)
  );
}

/** Precio que se cobra hoy (con promoción si está vigente). */
export function currentPrice(course: PriceFields, now = new Date()) {
  return round2(Number(saleActive(course, now) ? course.sale_price_usd : course.price_usd));
}

/** % de ahorro de la promoción (para la etiqueta "-30 %"). */
export function salePercent(course: PriceFields) {
  if (!saleActive(course)) return 0;
  return Math.round((1 - Number(course.sale_price_usd) / Number(course.price_usd)) * 100);
}

export type CouponCheck =
  | { ok: true; discount: number; total: number; label: string }
  | { ok: false; error: string };

/** Aplica un cupón a un precio. Valida vigencia, usos y curso. */
export function applyCoupon(coupon: Coupon | null, courseId: string, price: number, now = new Date()): CouponCheck {
  if (!coupon || !coupon.active) return { ok: false, error: "Ese cupón no existe o ya no está activo." };
  if (coupon.course_id && coupon.course_id !== courseId) return { ok: false, error: "Ese cupón no es válido para este curso." };
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return { ok: false, error: "Ese cupón todavía no está disponible." };
  if (coupon.expires_at && new Date(coupon.expires_at) <= now) return { ok: false, error: "Ese cupón ya venció." };
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return { ok: false, error: "Ese cupón ya alcanzó su límite de usos." };

  const amount = Number(coupon.amount);
  const discount = round2(Math.min(price, coupon.discount_type === "percent" ? (price * amount) / 100 : amount));
  const label = coupon.discount_type === "percent" ? `-${amount}%` : `-${formatUsd(amount)}`;
  return { ok: true, discount, total: round2(price - discount), label };
}

export const LEVEL_LABEL = { basico: "Básico", intermedio: "Intermedio", avanzado: "Avanzado" } as const;
