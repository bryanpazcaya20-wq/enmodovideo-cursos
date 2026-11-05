"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/actions/admin-courses";
import { grantAccessByEmailAction } from "@/actions/admin-members";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Spinner } from "@/components/ui/form";

/** Dar acceso a un curso por correo (con o sin cuenta). */
export function GrantForm({ courses, fixedEmail }: { courses: { id: string; title: string }[]; fixedEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(fixedEmail ?? "");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await grantAccessByEmailAction({ email, courseId, expiresAt, notify, note });
          setResult(r);
          if (r.ok) {
            if (!fixedEmail) setEmail("");
            setNote("");
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!fixedEmail && (
          <Field label="Correo del alumno" htmlFor="g-email">
            <Input id="g-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alumno@gmail.com" />
          </Field>
        )}
        <Field label="Curso" htmlFor="g-course">
          <select id="g-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-surface-2 px-3">
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Acceso hasta" htmlFor="g-exp" hint={<span className="text-xs text-subtle">vacío = de por vida</span>}>
          <Input id="g-exp" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
        <Field label="Motivo (interno)" htmlFor="g-note">
          <Input id="g-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pago por Yape, sorteo, cortesía…" maxLength={200} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-[var(--color-coral)]" />
        Enviarle un correo avisando que ya tiene acceso
      </label>
      {result && (result.ok ? <Alert tone="success">{result.message}</Alert> : <Alert tone="error">{result.error}</Alert>)}
      <Button type="submit" disabled={pending || !courseId}>
        {pending && <Spinner />} Dar acceso
      </Button>
    </form>
  );
}
