import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/auth-forms";
import { Divider, GoogleButton } from "@/components/auth/google-button";
import { Alert } from "@/components/ui/form";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Ingresar" };

const ERRORS: Record<string, string> = {
  google: "No pudimos ingresar con Google. Inténtalo de nuevo.",
  enlace: "El enlace no es válido o ya venció. Pide uno nuevo.",
  "otro-dispositivo":
    "Cerramos tu sesión porque tu cuenta se abrió en otro dispositivo. Solo se permite una sesión a la vez. Si no fuiste tú, cambia tu contraseña.",
};

export default async function LoginPage({ searchParams }: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNext(params.next) : undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const confirmed = params.confirmado === "1";
  const buying = next?.startsWith("/comprar/");

  return (
    <AuthCard title={buying ? "Ingresa para comprar" : "Hola de nuevo 👋"} subtitle={buying ? "Tu curso quedará guardado en tu cuenta." : "Ingresa para ver tus cursos."}>
      {error && <Alert tone="error">{error}</Alert>}
      {confirmed && <Alert tone="success">¡Tu correo está confirmado! Ingresa con tu correo y contraseña.</Alert>}
      <GoogleButton next={next} />
      <Divider />
      <LoginForm next={next} />
      <p className="text-center text-sm text-muted">
        ¿Aún no tienes cuenta?{" "}
        <Link href={next ? `/registro?next=${encodeURIComponent(next)}` : "/registro"} className="font-semibold text-coral hover:underline">
          Crea una aquí
        </Link>
      </p>
      <p className="rounded-xl bg-surface-2 p-3 text-center text-xs leading-relaxed text-muted">
        ¿Compraste en nuestra web anterior? Entra con el mismo correo (con Google si es Gmail, o creando tu cuenta con ese correo) y tus
        cursos aparecerán solos.
      </p>
    </AuthCard>
  );
}
