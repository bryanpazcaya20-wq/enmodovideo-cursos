import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = { href?: string; className?: string; variant?: "full" | "icon"; priority?: boolean };

export function Logo({ href = "/", className, variant = "full", priority }: Props) {
  const img =
    variant === "icon" ? (
      <Image src="/brand/logo-icono.png" alt="En Modo Video" width={167} height={256} priority={priority} className="h-9 w-auto" />
    ) : (
      <Image
        src="/brand/logo-completo-blanco.png"
        alt="En Modo Video"
        width={817}
        height={160}
        priority={priority}
        className="h-8 w-auto sm:h-9"
      />
    );
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label="En Modo Video — inicio">
      {img}
    </Link>
  );
}
