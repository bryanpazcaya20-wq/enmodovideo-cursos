import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { REPLACED_ERROR, checkSession } from "@/lib/single-session";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "no-store" };

/** Latido del navegador: ¿esta sesión sigue siendo la vigente? (El proxy ya lo revisa; aquí se repite.) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE });
  const supabase = await createClient();
  if ((await checkSession(supabase, user.id)) === "replaced") {
    return NextResponse.json({ ok: false, reason: REPLACED_ERROR }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
