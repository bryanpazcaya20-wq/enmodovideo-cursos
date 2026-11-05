"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

export function CopyLink({ url, label = "Copiar" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={url}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt("Copia el enlace:", url);
        }
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text"
    >
      {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
      {copied ? "Copiado" : label}
    </button>
  );
}
