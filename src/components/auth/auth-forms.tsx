"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthFormState,
} from "@/actions/auth";
import { Alert, Field, Input, PasswordInput, SubmitButton } from "@/components/ui/form";

const initial: AuthFormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Correo" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} placeholder="tucorreo@gmail.com" />
      </Field>
      <Field
        label="Contraseña"
        htmlFor="password"
        hint={
          <Link href="/recuperar" className="text-xs font-medium text-violet hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        }
      >
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton pendingText="Ingresando…">Ingresar</SubmitButton>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUpAction, initial);
  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-coral-soft text-2xl">📩</div>
        <Alert tone="success">{state.success}</Alert>
        <p className="text-sm text-muted">¿No te llegó? Revisa la carpeta de spam o promociones.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Nombre" htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" required placeholder="Tu nombre" />
      </Field>
      <Field label="Correo" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} placeholder="tucorreo@gmail.com" />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} placeholder="Mínimo 8 caracteres" />
      </Field>
      <SubmitButton pendingText="Creando tu cuenta…">Crear cuenta</SubmitButton>
      <p className="text-center text-xs leading-relaxed text-subtle">
        Al crear tu cuenta aceptas los{" "}
        <Link href="/terminos" className="underline hover:text-muted">
          Términos
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="underline hover:text-muted">
          Política de privacidad
        </Link>
        .
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initial);
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Correo de tu cuenta" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} placeholder="tucorreo@gmail.com" />
      </Field>
      <SubmitButton pendingText="Enviando…">Enviarme el enlace</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Nueva contraseña" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} placeholder="Mínimo 8 caracteres" />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton pendingText="Guardando…">Guardar contraseña</SubmitButton>
    </form>
  );
}
