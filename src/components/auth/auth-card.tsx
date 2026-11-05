import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface/80 p-6 shadow-2xl backdrop-blur sm:p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}
