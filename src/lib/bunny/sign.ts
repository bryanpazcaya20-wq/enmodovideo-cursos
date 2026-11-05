import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/** Duración de las URLs firmadas del reproductor. */
export const EMBED_TTL_SECONDS = 60 * 60;

/**
 * URL del reproductor de Bunny con Token Authentication.
 * token = SHA256_HEX(token_auth_key + video_id + expires)
 */
export function signedEmbedUrl(videoId: string, libraryId = env.bunnyLibraryId, ttlSeconds = EMBED_TTL_SECONDS) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = createHash("sha256").update(env.bunnyTokenAuthKey + videoId + expires).digest("hex");
  const params = new URLSearchParams({
    token,
    expires: String(expires),
    autoplay: "false",
    preload: "true",
    responsive: "true",
    loop: "false",
    muted: "false",
  });
  return {
    url: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`,
    expiresAt: expires * 1000,
  };
}
