// Extrae libraryId y videoId de cualquier formato de enlace de Bunny Stream.
// Acepta: URL de embed, URL de play, código <iframe> completo o solo el videoId.

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAYER_HOSTS = ["iframe.mediadelivery.net", "player.mediadelivery.net", "video.bunnycdn.com"];

export type ParsedBunnyLink = { videoId: string; libraryId: string | null };

export type ParseResult = { ok: true; value: ParsedBunnyLink } | { ok: false; error: string };

export function parseBunnyLink(input: string): ParseResult {
  let raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Pega el link del video de Bunny." };

  // Código <iframe src="..."> copiado completo
  const src = raw.match(/src\s*=\s*["']([^"']+)["']/i);
  if (src) raw = src[1];

  // Solo el videoId
  if (GUID.test(raw)) return { ok: true, value: { videoId: raw.toLowerCase(), libraryId: null } };

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "El link no es válido. Pega la URL de embed o de play del video, o su videoId." };
  }

  if (!PLAYER_HOSTS.includes(url.hostname.toLowerCase())) {
    return { ok: false, error: "Ese link no es de Bunny Stream (debe ser de iframe.mediadelivery.net)." };
  }

  // /embed/{libraryId}/{videoId}  ·  /play/{libraryId}/{videoId}
  const parts = url.pathname.split("/").filter(Boolean);
  const kindIndex = parts.findIndex((p) => p === "embed" || p === "play");
  if (kindIndex === -1 || parts.length < kindIndex + 3) {
    return { ok: false, error: "No encontramos el video en ese link. Usa el link de embed o de play de Bunny." };
  }

  const libraryId = parts[kindIndex + 1];
  const videoId = parts[kindIndex + 2];
  if (!/^\d+$/.test(libraryId) || !GUID.test(videoId)) {
    return { ok: false, error: "El link de Bunny está incompleto o mal copiado." };
  }

  return { ok: true, value: { videoId: videoId.toLowerCase(), libraryId } };
}
