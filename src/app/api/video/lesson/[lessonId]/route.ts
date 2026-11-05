import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { signedEmbedUrl } from "@/lib/bunny/sign";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };

// URL firmada (1 h) del video de una lección. RLS decide: clase gratis, alumno inscrito o admin.
export async function GET(_req: Request, ctx: RouteContext<"/api/video/lesson/[lessonId]">) {
  const { lessonId } = await ctx.params;
  if (!z.string().uuid().safeParse(lessonId).success) {
    return NextResponse.json({ error: "Clase no válida" }, { status: 400, headers: NO_STORE });
  }

  const user = await getCurrentUser();
  const key = user ? `video:user:${user.id}` : `video:ip:${await getClientIp()}`;
  if (!(await rateLimit(key, user ? 300 : 60, 60 * 60))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera unos minutos." }, { status: 429, headers: NO_STORE });
  }

  const supabase = await createClient();
  const { data: content } = await supabase.from("lesson_content").select("bunny_video_id").eq("lesson_id", lessonId).maybeSingle();
  if (!content) {
    return user
      ? NextResponse.json({ error: "Esta clase es parte del curso completo." }, { status: 403, headers: NO_STORE })
      : NextResponse.json({ error: "Inicia sesión para ver esta clase." }, { status: 401, headers: NO_STORE });
  }
  if (!content.bunny_video_id) {
    return NextResponse.json({ error: "Esta clase no tiene video." }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json(signedEmbedUrl(content.bunny_video_id), { headers: NO_STORE });
}
