import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureAdminBootstrap } from "@/lib/auth";
import { claimSession } from "@/lib/single-session";
import { safeNext } from "@/lib/utils";

const TYPES: EmailOtpType[] = ["signup", "recovery", "email", "email_change", "invite", "magiclink"];

// Enlaces de los correos de Supabase (confirmar cuenta, recuperar contraseña).
// Usa token_hash, así funciona aunque el correo se abra en otro navegador o app.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"), "/mis-cursos");

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) {
      await ensureAdminBootstrap(data.user);
      await claimSession(supabase, data.user.id, request.headers.get("user-agent"));
      const destination = type === "recovery" ? "/nueva-contrasena" : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Plantillas originales de Supabase ({{ .ConfirmationURL }}): Supabase ya verificó el correo
  // y nos devuelve un ?code= (flujo PKCE) que solo funciona en el mismo navegador.
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureAdminBootstrap(data.user);
      await claimSession(supabase, data.user.id, request.headers.get("user-agent"));
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Abierto en otro navegador/app: el correo ya quedó confirmado, solo falta iniciar sesión.
    if (next === "/nueva-contrasena") return NextResponse.redirect(`${origin}/ingresar?error=enlace`);
    return NextResponse.redirect(`${origin}/ingresar?confirmado=1&next=${encodeURIComponent(next)}`);
  }

  return NextResponse.redirect(`${origin}/ingresar?error=enlace`);
}
