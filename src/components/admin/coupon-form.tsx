"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/actions/admin-courses";
import { saveCouponAction } from "@/actions/admin-coupons";
import { Alert, Field, Input, SubmitButton } from "@/components/ui/form";

export function CouponForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveCouponAction.bind(null, null), null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Código" htmlFor="code">
          <Input id="code" name="code" required placeholder="BLACKFRIDAY" className="uppercase" maxLength={30} />
        </Field>
        <Field label="Tipo" htmlFor="discount_type">
          <select id="discount_type" name="discount_type" className="h-12 w-full rounded-xl border border-border bg-surface-2 px-3">
            <option value="percent">Porcentaje (%)</option>
            <option value="fixed">Monto fijo (USD)</option>
          </select>
        </Field>
        <Field label="Descuento" htmlFor="amount">
          <Input id="amount" name="amount" inputMode="decimal" required placeholder="30" />
        </Field>
        <Field label="Curso" htmlFor="course_id">
          <select id="course_id" name="course_id" className="h-12 w-full rounded-xl border border-border bg-surface-2 px-3">
            <option value="">Todos los cursos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Usos máximos" htmlFor="max_uses" hint={<span className="text-xs text-subtle">vacío = ilimitado</span>}>
          <Input id="max_uses" name="max_uses" inputMode="numeric" placeholder="100" />
        </Field>
        <Field label="Desde" htmlFor="starts_at" hint={<span className="text-xs text-subtle">opcional</span>}>
          <Input id="starts_at" name="starts_at" type="datetime-local" />
        </Field>
        <Field label="Hasta" htmlFor="expires_at" hint={<span className="text-xs text-subtle">opcional</span>}>
          <Input id="expires_at" name="expires_at" type="datetime-local" />
        </Field>
        <Field label="Nota interna" htmlFor="note">
          <Input id="note" name="note" placeholder="Campaña TikTok" maxLength={200} />
        </Field>
      </div>
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="sm:w-56">
        <SubmitButton pendingText="Creando…">Crear cupón</SubmitButton>
      </div>
    </form>
  );
}
