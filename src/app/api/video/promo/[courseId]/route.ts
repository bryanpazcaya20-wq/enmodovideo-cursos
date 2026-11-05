import { NextResponse } from "next/server";
import { z } from "zod";
import { signedEmbedUrl } from "@/lib/bunny/sign";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";

const NO_STORE = { "Cache-Control": "private, no-store" };

// URL firmada del video de presentación de un curso publicado (público).
export async function GET(_req: Request, ctx: RouteContext<"/api/video/promo/[courseId]">) {
  const { courseId } = await ctx.params;
  if (!z.string().uuid().safeParse(courseId).success) {
    return NextResponse.json({ error: "Curso no válido" }, { status: 400, headers: NO_STORE });
  }
  if (!(await rateLimit(`promo:ip:${await getClientIp()}`, 60, 60 * 60))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera unos minutos." }, { status: 429, headers: NO_STORE });
  }
  const { data } = await createPublicClient().from("courses").select("promo_video_id").eq("id", courseId).eq("status", "published").maybeSingle();
  if (!data?.promo_video_id) return NextResponse.json({ error: "Este curso no tiene video de presentación." }, { status: 404, headers: NO_STORE });
  return NextResponse.json(signedEmbedUrl(data.promo_video_id), { headers: NO_STORE });
}
