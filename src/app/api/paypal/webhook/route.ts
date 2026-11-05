import { NextResponse } from "next/server";
import { capturePayPalOrder, fulfill } from "@/lib/checkout";
import { round2 } from "@/lib/pricing";
import { verifyPayPalWebhook } from "@/lib/paypal/webhook-verify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type Resource = {
  id?: string;
  status?: string;
  custom_id?: string;
  amount?: { value?: string; currency_code?: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
  purchase_units?: { custom_id?: string }[];
  links?: { rel?: string; href?: string }[];
};
type PayPalEvent = { id: string; event_type: string; resource: Resource };

/**
 * Respaldo del pago: si el comprador cerró la ventana antes de volver, PayPal avisa aquí.
 * Eventos: CHECKOUT.ORDER.APPROVED (cobrar), PAYMENT.CAPTURE.COMPLETED (entregar),
 * PAYMENT.CAPTURE.REFUNDED / REVERSED (quitar el acceso).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let event: PayPalEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }
  if (!(await verifyPayPalWebhook(req.headers, event))) {
    return NextResponse.json({ error: "Firma no válida" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error: dupe } = await admin
    .from("webhook_events")
    .insert({ provider: "paypal", event_id: event.id, event_type: event.event_type, payload: event as unknown as Json });
  if (dupe?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });

  try {
    const r = event.resource ?? {};
    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED": {
        if (r.id) await capturePayPalOrder(r.id).catch((e) => console.warn("[paypal webhook] captura:", e.message));
        break;
      }
      case "PAYMENT.CAPTURE.COMPLETED": {
        const orderId = r.custom_id;
        if (!orderId) break;
        const { data: order } = await admin.from("orders").select("id, status, amount").eq("id", orderId).maybeSingle();
        if (!order || order.status === "paid") break;
        if (r.amount?.currency_code !== "USD" || round2(Number(r.amount?.value)) !== round2(Number(order.amount))) {
          // No se entrega el curso; queda registrado para revisarlo a mano (no tiene sentido que PayPal reintente).
          console.error(`[paypal webhook] monto no coincide en pedido ${orderId}`, r.amount);
          await admin.from("orders").update({ raw: event as unknown as Json }).eq("id", order.id);
          break;
        }
        await fulfill(order.id, r.id ?? null, null, event as unknown as Json);
        break;
      }
      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED": {
        // En un reembolso, resource es el "refund": el id de la captura viene en el enlace rel="up".
        const upHref = r.links?.find((l) => l.rel === "up")?.href;
        const captureId = event.event_type === "PAYMENT.CAPTURE.REVERSED" ? r.id : upHref?.split("/").filter(Boolean).pop();
        const orderId = r.custom_id;
        const query = admin.from("orders").select("id, user_id, course_id");
        const { data: order } = orderId
          ? await query.eq("id", orderId).maybeSingle()
          : captureId
            ? await query.eq("paypal_capture_id", captureId).maybeSingle()
            : { data: null };
        if (!order) break;
        await admin.from("orders").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", order.id);
        if (order.user_id && order.course_id) {
          await admin
            .from("enrollments")
            .update({ revoked_at: new Date().toISOString() })
            .eq("user_id", order.user_id)
            .eq("course_id", order.course_id)
            .eq("order_id", order.id);
        }
        break;
      }
    }
    await admin.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("provider", "paypal").eq("event_id", event.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[paypal webhook]", message);
    // Liberamos el evento para que el reintento de PayPal lo procese de nuevo.
    await admin.from("webhook_events").delete().eq("provider", "paypal").eq("event_id", event.id);
    return NextResponse.json({ error: "Error al procesar" }, { status: 500 });
  }
}
