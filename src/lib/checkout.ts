import "server-only";
import { sendEmail } from "@/lib/email/send";
import { adminSaleEmail, purchaseEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { paypalFetch } from "@/lib/paypal/client";
import { applyCoupon, currentPrice, round2 } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Course, Json } from "@/types/database";

export class CheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type Quote = {
  course: Pick<Course, "id" | "slug" | "title" | "price_usd" | "sale_price_usd" | "sale_ends_at">;
  price: number;
  discount: number;
  total: number;
  coupon: { id: string; code: string; label: string } | null;
};

/** Calcula el precio final en el servidor (nunca se confía en el navegador). */
export async function quote(slug: string, couponCode?: string | null): Promise<Quote> {
  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, slug, title, price_usd, sale_price_usd, sale_ends_at, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!course || course.status !== "published") throw new CheckoutError("Este curso no está disponible.", 404);

  const price = currentPrice(course);
  const code = couponCode?.trim();
  if (!code) return { course, price, discount: 0, total: price, coupon: null };

  const { data: coupon } = await admin.from("coupons").select("*").eq("code", code).maybeSingle();
  const check = applyCoupon(coupon, course.id, price);
  if (!check.ok) throw new CheckoutError(check.error);
  return { course, price, discount: check.discount, total: check.total, coupon: { id: coupon!.id, code: coupon!.code.toUpperCase(), label: check.label } };
}

/** ¿Hay algún cupón activo y vigente? (para mostrar o no el campo de cupón al pagar) */
export async function hasActiveCoupons() {
  const now = new Date().toISOString();
  const { count } = await createAdminClient()
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`);
  return (count ?? 0) > 0;
}

export async function isEnrolled(userId: string, courseId: string) {
  const admin = createAdminClient();
  const { data } = await admin.rpc("has_course_access", { p_course: courseId, uid: userId });
  return data === true;
}

/** Crea el pedido pendiente en la base y la orden en PayPal. Devuelve el id de la orden de PayPal. */
export async function createPayPalOrder(userId: string, q: Quote): Promise<string> {
  if (q.total <= 0) throw new CheckoutError("Este pedido es gratis: no necesita PayPal.");
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      course_id: q.course.id,
      coupon_id: q.coupon?.id ?? null,
      coupon_code: q.coupon?.code ?? null,
      list_price: q.price,
      discount: q.discount,
      amount: q.total,
      provider: "paypal",
    })
    .select("id")
    .single();
  if (error || !order) throw new CheckoutError("No pudimos crear tu pedido. Inténtalo de nuevo.", 500);

  const value = q.total.toFixed(2);
  const pp = await paypalFetch<{ id: string }>("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: order.id,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: q.course.id,
          custom_id: order.id,
          invoice_id: `EMV-${order.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
          description: `Curso: ${q.course.title}`.slice(0, 127),
          amount: {
            currency_code: "USD",
            value,
            breakdown: {
              item_total: { currency_code: "USD", value: q.price.toFixed(2) },
              discount: { currency_code: "USD", value: q.discount.toFixed(2) },
            },
          },
          items: [
            {
              name: q.course.title.slice(0, 127),
              quantity: "1",
              category: "DIGITAL_GOODS",
              unit_amount: { currency_code: "USD", value: q.price.toFixed(2) },
            },
          ],
        },
      ],
      application_context: {
        brand_name: "En Modo Video",
        locale: "es-PE",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    },
  });

  await admin.from("orders").update({ paypal_order_id: pp.id }).eq("id", order.id);
  return pp.id;
}

type Capture = { id: string; status: string; amount: { value: string; currency_code: string }; custom_id?: string };
type PayPalOrder = {
  id: string;
  status: string;
  payer?: { email_address?: string };
  purchase_units: { custom_id?: string; payments?: { captures?: Capture[] } }[];
};

/**
 * Cobra la orden aprobada por el comprador y entrega el curso.
 * Es seguro llamarla dos veces (navegador + webhook): fulfill_order es idempotente.
 */
export async function capturePayPalOrder(paypalOrderId: string, userId?: string) {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("paypal_order_id", paypalOrderId).maybeSingle();
  if (!order) throw new CheckoutError("No encontramos tu pedido.", 404);
  if (userId && order.user_id !== userId) throw new CheckoutError("Este pedido no es tuyo.", 403);
  if (order.status === "paid") return { orderId: order.id, courseId: order.course_id, alreadyPaid: true };

  let result: PayPalOrder;
  try {
    result = await paypalFetch<PayPalOrder>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      idempotencyKey: `capture-${order.id}`,
      body: {},
    });
  } catch (e) {
    // Ya cobrada (p. ej. por el webhook o un doble clic): leemos su estado real.
    result = await paypalFetch<PayPalOrder>(`/v2/checkout/orders/${paypalOrderId}`).catch(() => {
      throw e;
    });
  }

  const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
  if (result.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
    await admin.from("orders").update({ status: "failed", raw: result as unknown as Json }).eq("id", order.id);
    throw new CheckoutError("PayPal no completó el pago. No se realizó ningún cobro.", 402);
  }
  if (capture.amount.currency_code !== "USD" || round2(Number(capture.amount.value)) !== round2(Number(order.amount))) {
    await admin.from("orders").update({ raw: result as unknown as Json }).eq("id", order.id);
    console.error("[checkout] monto no coincide", order.id, capture.amount);
    throw new CheckoutError("El monto cobrado no coincide con el pedido. Escríbenos por WhatsApp.", 409);
  }

  await fulfill(order.id, capture.id, result.payer?.email_address ?? null, result as unknown as Json);
  return { orderId: order.id, courseId: order.course_id, alreadyPaid: false };
}

/** Curso gratis (cupón del 100 % o curso de precio 0). */
export async function enrollFree(userId: string, q: Quote) {
  if (q.total > 0) throw new CheckoutError("Este pedido tiene costo.");
  if (!q.coupon && q.price > 0) throw new CheckoutError("Necesitas un cupón para obtener el curso gratis.");
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      course_id: q.course.id,
      coupon_id: q.coupon?.id ?? null,
      coupon_code: q.coupon?.code ?? null,
      list_price: q.price,
      discount: q.discount,
      amount: 0,
      provider: "free",
    })
    .select("id")
    .single();
  if (error || !order) throw new CheckoutError("No pudimos activar tu curso. Inténtalo de nuevo.", 500);
  await fulfill(order.id, null, null, null);
  return { orderId: order.id };
}

/** Marca pagado + inscripción + uso de cupón (en Postgres, atómico) y envía el correo una sola vez. */
export async function fulfill(orderId: string, captureId: string | null, payerEmail: string | null, raw: Json | null) {
  const admin = createAdminClient();
  const { data: firstTime, error } = await admin.rpc("fulfill_order", {
    p_order: orderId,
    p_capture_id: captureId,
    p_payer_email: payerEmail,
    p_raw: raw,
  });
  if (error) throw new CheckoutError(`No pudimos activar tu curso: ${error.message}`, 500);
  if (!firstTime) return;

  const { data: order } = await admin.from("orders").select("user_id, course_id, amount, coupon_code").eq("id", orderId).single();
  const [{ data: profile }, { data: course }] = await Promise.all([
    admin.from("profiles").select("email, full_name").eq("id", order!.user_id!).single(),
    admin.from("courses").select("title, slug").eq("id", order!.course_id!).single(),
  ]);
  if (profile && course) {
    await sendEmail({
      to: profile.email,
      userId: order!.user_id,
      template: "purchase",
      dedupeKey: `purchase:${orderId}`,
      ...purchaseEmail({
        siteUrl: env.siteUrl,
        name: profile.full_name,
        courseTitle: course.title,
        amount: Number(order!.amount),
        courseUrl: `${env.siteUrl}/aprender/${course.slug}`,
      }),
    });
    const adminEmail = env.adminEmailOptional;
    if (adminEmail && Number(order!.amount) > 0) {
      await sendEmail({
        to: adminEmail,
        template: "admin_sale",
        dedupeKey: `admin_sale:${orderId}`,
        ...adminSaleEmail({ siteUrl: env.siteUrl, buyerEmail: profile.email, courseTitle: course.title, amount: Number(order!.amount), coupon: order!.coupon_code }),
      });
    }
  }
}
