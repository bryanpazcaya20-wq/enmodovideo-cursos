import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REPLACED_ERROR, checkSession } from "@/lib/single-session";

const MEMBER_PREFIXES = ["/mis-cursos", "/aprender", "/mi-cuenta", "/comprar"];
const ADMIN_PREFIX = "/admin";
const GUEST_ONLY = ["/ingresar", "/registro"];
// APIs que entregan contenido protegido: también exigen que la sesión sea la vigente.
const PROTECTED_API = ["/api/video", "/api/session", "/api/checkout"];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Refresca la sesión de Supabase en cada request y protege rutas.
// La validación de rol admin y de acceso a cada curso se repite SIEMPRE en el servidor
// (layouts, Server Actions, Route Handlers y RLS); esto es la primera barrera.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname, search } = request.nextUrl;
  const needsAuth = matches(pathname, ADMIN_PREFIX) || MEMBER_PREFIXES.some((p) => matches(pathname, p));

  // Visitante sin cookie de sesión: nada que refrescar (la landing carga sin esperar a Supabase).
  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSessionCookie && !needsAuth) return response;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return response; // sin configurar todavía

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // No poner código entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = "";
    const redirect = NextResponse.redirect(target);
    // conservar cookies de sesión refrescadas
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (needsAuth && !user) {
    const redirect = redirectTo("/ingresar");
    const target = new URL(redirect.headers.get("location")!);
    target.searchParams.set("next", pathname + search);
    redirect.headers.set("location", target.toString());
    return redirect;
  }

  // Una sola sesión a la vez: si la cuenta entró en otro dispositivo, esta sesión se cierra.
  if (user && (needsAuth || PROTECTED_API.some((p) => matches(pathname, p)))) {
    if ((await checkSession(supabase, user.id)) === "replaced") {
      await supabase.auth.signOut({ scope: "local" });
      if (pathname.startsWith("/api/")) {
        const res = NextResponse.json({ error: "Tu cuenta se abrió en otro dispositivo.", reason: REPLACED_ERROR }, { status: 401 });
        response.cookies.getAll().forEach((c) => res.cookies.set(c));
        return res;
      }
      const redirect = redirectTo("/ingresar");
      const target = new URL(redirect.headers.get("location")!);
      target.searchParams.set("error", REPLACED_ERROR);
      redirect.headers.set("location", target.toString());
      return redirect;
    }
  }

  if (matches(pathname, ADMIN_PREFIX) && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return redirectTo("/mis-cursos");
  }

  if (user && GUEST_ONLY.some((p) => matches(pathname, p))) {
    // Ya inició sesión: lo llevamos a donde iba (?next=…), si es una ruta interna.
    const next = request.nextUrl.searchParams.get("next") ?? "";
    const safe = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/mis-cursos";
    const target = new URL(safe, request.nextUrl.origin);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
