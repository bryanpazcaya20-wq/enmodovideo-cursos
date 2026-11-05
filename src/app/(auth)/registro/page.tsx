import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/auth-forms";
import { Divider, GoogleButton } from "@/components/auth/google-button";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignUpPage({ searchParams }: PageProps<"/registro">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNext(params.next) : undefined;
  const buying = next?.startsWith("/comprar/");

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle={
        buying
          ? "Crea tu cuenta gratis para terminar tu compra. Tu curso quedará guardado en ella."
          : "Crea tu cuenta gratis. Si ya compraste en nuestra web anterior, usa el mismo correo y verás tus cursos."
      }
    >
      <GoogleButton next={next} label="Registrarme con Google" />
      <Divider />
      <SignUpForm next={next} />
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href={next ? `/ingresar?next=${encodeURIComponent(next)}` : "/ingresar"} className="font-semibold text-coral hover:underline">
          Ingresa
        </Link>
      </p>
    </AuthCard>
  );
}
