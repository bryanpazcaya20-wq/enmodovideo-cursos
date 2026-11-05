import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-brand-glow flex min-h-dvh flex-col px-4 py-6 sm:py-10">
      <header className="mx-auto flex w-full max-w-md items-center justify-between">
        <Logo priority />
        <Link href="/" className="text-sm text-muted hover:text-text">
          ← Volver
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">{children}</main>
    </div>
  );
}
