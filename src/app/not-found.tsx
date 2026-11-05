import { LinkButton } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="bg-brand-glow flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <Logo />
      <p className="font-display text-7xl font-semibold text-gradient">404</p>
      <h1 className="font-display text-2xl font-semibold">Esta página no existe</h1>
      <p className="max-w-sm text-muted">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/">Ir al inicio</LinkButton>
        <LinkButton href="/mis-cursos" variant="secondary">
          Ir a mis cursos
        </LinkButton>
      </div>
    </div>
  );
}
