import type { Metadata } from "next";
import { AddAdminForm, RemoveAdminButton } from "@/components/admin/admin-forms";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Administradores" };

export default async function AdminsPage() {
  const [me, { data: admins }] = await Promise.all([
    getCurrentUser(),
    createAdminClient().from("profiles").select("id, email, full_name, created_at").eq("role", "admin").order("created_at"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
      <AdminPageHeader title="Administradores" description="Pueden editar cursos, ver ventas, crear cupones y dar accesos." />

      <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-semibold">Agregar administrador</h2>
        <p className="text-sm text-muted">La persona debe haber creado su cuenta antes. Escribe el correo con el que se registró.</p>
        <AddAdminForm />
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface">
        <ul className="divide-y divide-border">
          {(admins ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {a.full_name || a.email} {a.id === me?.id && <span className="text-xs font-normal text-subtle">(tú)</span>}
                </p>
                <p className="truncate text-sm text-muted">
                  {a.email} · desde {formatDate(a.created_at)}
                </p>
              </div>
              {a.id !== me?.id && <RemoveAdminButton userId={a.id} email={a.email} />}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
