"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, KeyRound, LayoutDashboard, Receipt, ScrollText, ShieldCheck, TicketPercent, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/admin/cursos", label: "Cursos", icon: BookOpen },
  { href: "/admin/ventas", label: "Ventas", icon: Receipt },
  { href: "/admin/cupones", label: "Cupones y promos", icon: TicketPercent },
  { href: "/admin/alumnos", label: "Alumnos", icon: Users },
  { href: "/admin/accesos", label: "Dar acceso", icon: KeyRound },
  { href: "/admin/administradores", label: "Admins", icon: ShieldCheck },
  { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel de administración" className="sticky top-16 z-30 border-b border-border/60 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active ? "bg-surface-2 text-text" : "text-muted hover:text-text",
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
