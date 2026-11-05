import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutError, capturePayPalOrder, createPayPalOrder, enrollFree, isEnrolled, quote } from "@/lib/checkout";
import { PayPalError } from "@/lib/paypal/client";
import { rateLimit } from "@/lib/rate-limit";

const NO_STORE = { "Cache-Control": "private, no-store" };

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("quote"), slug: z.string().min(1).max(120), coupon: z.string().trim().max(40).optional() }),
  z.object({ action: z.literal("create"), slug: z.string().min(1).max(120), coupon: z.string().trim().max(40).optional() }),
  z.object({ action: z.literal("capture"), paypalOrderId: z.string().min(5).max(64) }),
  z.object({ action: z.literal("free"), slug: z.string().min(1).max(120), coupon: z.string().trim().max(40).optional() }),
]);

/**
 * Pago de un curso, todo calculado en el servidor:
 *  quote   → precio final con cupón (para mostrarlo)
 *  create  → pedido pendiente + orden de PayPal
 *  capture → cobra la orden aprobada y entrega el curso
 *  free    → curso gratis con cupón del 100 %
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para comprar." }, { status: 401, headers: NO_STORE });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400, headers: NO_STORE });
  const body = parsed.data;

  const limits = { quote: 30, create: 15, capture: 20, free: 10 } as const;
  if (!(await rateLimit(`checkout:${body.action}:${user.id}`, limits[body.action], 15 * 60))) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429, headers: NO_STORE });
  }

  try {
    if (body.action === "capture") {
      const result = await capturePayPalOrder(body.paypalOrderId, user.id);
      return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
    }

    const q = await quote(body.slug, body.coupon);
    if (body.action === "quote") {
      return NextResponse.json({ price: q.price, discount: q.discount, total: q.total, coupon: q.coupon }, { headers: NO_STORE });
    }
    if (await isEnrolled(user.id, q.course.id)) {
      return NextResponse.json({ error: "Ya tienes este curso.", enrolled: true }, { status: 409, headers: NO_STORE });
    }
    if (body.action === "free") {
      const result = await enrollFree(user.id, q);
      return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
    }
    const id = await createPayPalOrder(user.id, q);
    return NextResponse.json({ id }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: e.status, headers: NO_STORE });
    if (e instanceof PayPalError) {
      console.error("[checkout] PayPal", e.status, e.details);
      return NextResponse.json({ error: "PayPal no respondió. Inténtalo de nuevo en un momento." }, { status: 502, headers: NO_STORE });
    }
    console.error("[checkout]", e);
    return NextResponse.json({ error: "Ocurrió un error. Inténtalo de nuevo." }, { status: 500, headers: NO_STORE });
  }
}
