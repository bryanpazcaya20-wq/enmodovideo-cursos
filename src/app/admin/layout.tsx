import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel · En Modo Video" }, robots: { index: false } };

// Segunda barrera (la primera es el proxy): valida el rol admin en el servidor.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin();
  return (
    <>
      <AppHeader profile={profile} />
      <AdminNav />
      <main className="min-w-0 flex-1">{children}</main>
    </>
  );
}
