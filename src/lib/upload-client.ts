"use client";

import { createUploadUrlAction } from "@/actions/admin-courses";

export type UploadedFile = { path: string; publicUrl: string; name: string; size: number };

/**
 * Sube una imagen directo a Supabase Storage con una URL firmada que genera el servidor
 * (solo para admins). Así el archivo no pasa por Vercel.
 */
export async function uploadImage(file: File, onProgress?: (pct: number) => void): Promise<UploadedFile> {
  const ticket = await createUploadUrlAction({ type: file.type as "image/jpeg", size: file.size });
  if (!ticket.ok) throw new Error(ticket.error);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.uploadUrl);
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`La subida falló (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Se cortó la conexión durante la subida."));
    xhr.send(file);
  });

  return { path: ticket.path, publicUrl: ticket.publicUrl, name: file.name, size: file.size };
}
