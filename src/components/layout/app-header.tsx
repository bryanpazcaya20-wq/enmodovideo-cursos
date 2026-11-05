import Link from "next/link";
import { Compass, GraduationCap } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/ui/logo";
import type { Profile } from "@/types/database";

const navItem = "flex items-center gap-1.5 rounded-full px-2.5 py-2 text-muted hover:bg-surface-2 hover:text-text sm:px-3";

export function AppHeader({ profile }: { profile: Profile | null }) {
  const name = profile?.full_name?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "";
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Logo href="/mis-cursos" />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/mis-cursos" className={navItem} aria-label="Mis cursos">
            <GraduationCap className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Mis cursos</span>
          </Link>
          <Link href="/#cursos" className={navItem} aria-label="Ver todos los cursos">
            <Compass className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Explorar</span>
          </Link>
          {profile?.role === "admin" && (
            <Link href="/admin" className="rounded-full bg-violet-soft px-3 py-2 font-medium text-violet hover:bg-violet/25">
              Admin
            </Link>
          )}
          <Link href="/mi-cuenta" className="flex items-center gap-2 rounded-full px-3 py-2 text-muted hover:bg-surface-2 hover:text-text">
            <span className="grid size-7 place-items-center rounded-full bg-coral text-xs font-bold uppercase text-white">
              {name.charAt(0) || "?"}
            </span>
            <span className="hidden sm:inline">Mi cuenta</span>
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="rounded-full px-3 py-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Cerrar sesión">
              Salir
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
