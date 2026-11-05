import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { LinkButton } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NewPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AuthCard title="Enlace vencido" subtitle="Para cambiar tu contraseña, abre el enlace más reciente que te enviamos por correo.">
        <LinkButton href="/recuperar" size="lg" className="w-full">
          Pedir un enlace nuevo
        </LinkButton>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crea tu nueva contraseña" subtitle={`Para la cuenta ${user.email}`}>
      <NewPasswordForm />
    </AuthCard>
  );
}
