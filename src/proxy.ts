import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos, imágenes, íconos y webhooks/cron (se autentican solos).
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|api/paypal/webhook|cursos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4)$).*)",
  ],
};
