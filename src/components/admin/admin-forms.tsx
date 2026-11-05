"use client";

import { useActionState } from "react";
import { addAdminAction, removeAdminAction, type MemberActionState } from "@/actions/admin-members";
import { Alert, Input, SubmitButton } from "@/components/ui/form";

export function AddAdminForm() {
  const [state, action] = useActionState<MemberActionState, FormData>(addAdminAction, {});
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input name="email" type="email" required placeholder="correo@ejemplo.com" aria-label="Correo del nuevo administrador" className="flex-1" />
        <div className="sm:w-48">
          <SubmitButton pendingText="Agregando…">Hacer admin</SubmitButton>
        </div>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
    </form>
  );
}

export function RemoveAdminButton({ userId, email }: { userId: string; email: string }) {
  const [state, action] = useActionState<MemberActionState, FormData>(removeAdminAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`¿Quitar el rol de administrador a ${email}?`)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className="rounded-full px-3 py-2 text-sm font-medium text-danger hover:bg-danger/15">
        Quitar admin
      </button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
