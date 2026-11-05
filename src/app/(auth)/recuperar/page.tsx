import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetRequestForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ResetPage() {
  return (
    <AuthCard title="¿Olvidaste tu contraseña?" subtitle="Escribe tu correo y te enviaremos un enlace para crear una nueva.">
      <ResetRequestForm />
      <p className="text-center text-sm text-muted">
        <Link href="/ingresar" className="font-semibold text-coral hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </AuthCard>
  );
}
