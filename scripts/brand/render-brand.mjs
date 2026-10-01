// Marca de PandaJR: del logo maestro a los recursos de la app (procedencia: DESIGN.md › Components › Marca (§4.2)).
//
//   node scripts/brand/render-brand.mjs
//     → public/brand/panda-mark-{128,384}.png   (la mascota recortada, fondo transparente, para PandaMark y PandaStory)
//     → public/icons/icon-{192,512}.png, public/icons/icon-maskable-{192,512}.png, src/app/apple-icon.png
//     → src/app/icon.png                          (favicon: azulejo alabastro redondeado con filete line-strong)
//
// Fuente: scripts/brand/panda-mark-source.png — el logo final que entregó el equipo el 2026-09-30 (PNG RGBA
// 1394×1673, sin fondo; blanco, azul carbón y gris claro). Sustituye al trazado vectorial automático
// (panda-paths.json, sacado del JPEG menta original), que suavizaba las formas y bajaba la calidad.
// Determinista: solo redimensiona y compone con sharp; nunca redibuja el logo.
// El og-image (1200×630) se captura aparte: ver scripts/brand/og-page.tsx.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = join(ROOT, "scripts/brand/panda-mark-source.png");

// Tokens claros de DESIGN.md §1.1: suelo alabastro y filete line-strong.
const GROUND = "#faf9f5";
const LINE_STRONG = "#d8d0c1";

/** La mascota recortada a su contenido (sin el margen transparente del archivo). */
async function trimmedMark() {
  return sharp(SOURCE).trim({ threshold: 1 }).png().toBuffer();
}

/** La mascota a una altura dada (px), conservando la proporción y la transparencia. */
async function markAtHeight(mark, height) {
  return sharp(mark).resize({ height, fit: "inside", kernel: "lanczos3" }).png().toBuffer();
}

/** Azulejo cuadrado de alabastro con la mascota centrada; `scale` = alto de la mascota / lado. */
async function tile(mark, size, scale, { rounded = false } = {}) {
  const art = await markAtHeight(mark, Math.round(size * scale));
  const meta = await sharp(art).metadata();
  const radius = Math.round(size * 0.22);
  const stroke = Math.max(1, Math.round(size * 0.02));
  const base = rounded
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="${stroke / 2}" y="${stroke / 2}" width="${size - stroke}" height="${size - stroke}" rx="${radius}" fill="${GROUND}" stroke="${LINE_STRONG}" stroke-width="${stroke}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${GROUND}"/></svg>`;
  return sharp(Buffer.from(base))
    .composite([{ input: art, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const mark = await trimmedMark();
  mkdirSync(join(ROOT, "public/brand"), { recursive: true });
  mkdirSync(join(ROOT, "public/icons"), { recursive: true });

  // Mascota sola, para la UI (cabecera 28–34 px, bienvenida 88 px, og 124 px) y la tarjeta de PandaStory.
  for (const h of [128, 384]) {
    const out = join(ROOT, `public/brand/panda-mark-${h}.png`);
    await sharp(await markAtHeight(mark, h)).png({ compressionLevel: 9, palette: false }).toFile(out);
    console.log("png →", out);
  }

  // Iconos: "any" con la mascota al 84 % del lado; "maskable" dentro de la zona segura (círculo del 80 %): 68 %.
  const jobs = [
    ["public/icons/icon-192.png", 192, 0.84, false],
    ["public/icons/icon-512.png", 512, 0.84, false],
    ["public/icons/icon-maskable-192.png", 192, 0.68, false],
    ["public/icons/icon-maskable-512.png", 512, 0.68, false],
    ["src/app/apple-icon.png", 180, 0.8, false],
    ["src/app/icon.png", 192, 0.78, true],
  ];
  for (const [rel, size, scale, rounded] of jobs) {
    await sharp(await tile(mark, size, scale, { rounded })).toFile(join(ROOT, rel));
    console.log("png →", rel);
  }
}

await main();
