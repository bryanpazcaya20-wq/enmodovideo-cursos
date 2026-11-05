import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAdminBootstrap } from "@/lib/auth";
import { claimSession } from "@/lib/single-session";
import { safeNext } from "@/lib/utils";

// Retorno de Google OAuth (flujo PKCE): intercambia el código por una sesión.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/mis-cursos");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureAdminBootstrap(data.user);
      await claimSession(supabase, data.user.id, request.headers.get("user-agent"));
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/ingresar?error=google`);
}
