import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full [&_svg]:shrink-0 font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-coral text-white hover:bg-coral-hover shadow-[var(--shadow-glow)]",
  secondary: "bg-surface-2 text-text border border-border hover:border-violet/60 hover:bg-surface",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
  icon: "size-11",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
