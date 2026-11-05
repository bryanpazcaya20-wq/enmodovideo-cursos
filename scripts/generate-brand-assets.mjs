// Genera favicon, íconos y variantes del logo a partir de /LOGO.
// Uso: node scripts/generate-brand-assets.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const LOGO_DIR = path.join(root, "LOGO");
const ICON_SRC = path.join(LOGO_DIR, "LA5444724BJNS-f505251e-b7a4-4bd3-a31d-702013be43c1-cuv.png");
const FULL_SRC = path.join(LOGO_DIR, "LOGO-COMPLETO.png");
const TEXT_SRC = path.join(LOGO_DIR, "LOGOTEXTO.png");

const APP_DIR = path.join(root, "src", "app");
const BRAND_DIR = path.join(root, "public", "brand");
const BG = "#0E0A14"; // fondo oscuro de la marca

// Centra el ícono (vertical) en un lienzo cuadrado con margen.
async function squareIcon(size, { padding = 0.08, background = null } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const icon = await sharp(ICON_SRC).trim().resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toBuffer();
}

// ICO con entradas PNG (soportado por todos los navegadores modernos).
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

// Convierte los píxeles morados del logo en blanco (para modo oscuro).
// startX: fracción del ancho desde donde aplicar (para no tocar el ícono del logo completo).
async function purpleToWhite(src, startX = 0) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const minX = Math.round(info.width * startX);
  for (let i = 0; i < data.length; i += 4) {
    if ((i / 4) % info.width < minX) continue;
    const [r, b] = [data[i], data[i + 2]];
    // morado de la marca ≈ rgb(83,41,122): azul > rojo y rojo bajo
    if (b > r && r < 160) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  return sharp(data, { raw: info }).trim().png().toBuffer();
}

await mkdir(BRAND_DIR, { recursive: true });

// Favicon + íconos de app (Next.js los detecta en src/app)
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(icoSizes.map(async (size) => ({ size, data: await squareIcon(size, { padding: 0.02 }) })));
await writeFile(path.join(APP_DIR, "favicon.ico"), buildIco(icoPngs));
await writeFile(path.join(APP_DIR, "icon.png"), await squareIcon(512, { padding: 0.06 }));
await writeFile(path.join(APP_DIR, "apple-icon.png"), await squareIcon(180, { padding: 0.12, background: BG }));

// Logos para la web
await writeFile(path.join(BRAND_DIR, "logo-icono.png"), await sharp(ICON_SRC).trim().resize({ height: 256 }).png().toBuffer());
await writeFile(path.join(BRAND_DIR, "logo-completo.png"), await sharp(FULL_SRC).trim().resize({ height: 160 }).png().toBuffer());
await writeFile(
  path.join(BRAND_DIR, "logo-completo-blanco.png"),
  await sharp(await purpleToWhite(FULL_SRC, 0.165)).resize({ height: 160 }).png().toBuffer(),
);
await writeFile(
  path.join(BRAND_DIR, "logo-texto-blanco.png"),
  await sharp(await purpleToWhite(TEXT_SRC)).resize({ height: 120 }).png().toBuffer(),
);

console.log("✓ Favicon, íconos y logos generados");
