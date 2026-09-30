// Marca de PandaJR: de la mascota original a vectores y rasters en la paleta (procedencia: DESIGN.md › Components › Marca (§4.2)).
//
//   node scripts/brand/render-brand.mjs trace <original.jpg>   → src/components/panda-paths.json
//   node scripts/brand/render-brand.mjs icons                  → src/app/icon.svg, src/app/apple-icon.png,
//                                                                public/icons/icon-{192,512}.png,
//                                                                public/icons/icon-maskable-{192,512}.png
//
// La mascota original (JPEG 1001×1024, azulejo menta con esquinas negras) está en git:
//   git show 2bf0815:src/app/icon.jpg > panda-original.jpg
// trace: separa fondo (menta / negro de esquinas), pelaje, cabeza del bebé, sombra del pecho y manchas;
// cada capa es un iso-contorno (marching squares) de su máscara suavizada, simplificado (RDP) y pasado a
// curvas (Catmull-Rom → Bézier), en un viewBox cuadrado de 100 unidades. Determinista.
// icons: rasteriza con sharp (librsvg) las mismas capas sobre alabastro #faf9f5 (tokens de DESIGN.md §1.1).
// El og-image (1200×630) se captura aparte: ver scripts/brand/og-page.tsx.
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PATHS_JSON = join(ROOT, "src/components/panda-paths.json");

// Colores (claro) de DESIGN.md: pelaje surface-raised, bebé surface-sunken, sombra line, manchas y contorno ink.
const LIGHT = { ground: "#faf9f5", fur: "#fffefb", baby: "#f3efe7", shade: "#e8e2d7", patch: "#2d2a26", line: "#2d2a26", lineStrong: "#d8d0c1" };

async function trace(src) {
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels, N = W * H;
  const R = new Uint8Array(N), G = new Uint8Array(N), B = new Uint8Array(N), L = new Float32Array(N);
  for (let i = 0; i < N; i++) { R[i] = data[i * C]; G[i] = data[i * C + 1]; B[i] = data[i * C + 2]; L[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i]; }
  const idx = (x, y) => y * W + x;
  const nbrs = (p) => { const x = p % W, y = (p / W) | 0; return [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]; };
  const flood = (mask, seeds, val) => {
    const vis = new Uint8Array(N); const q = new Int32Array(N); let h = 0, t = 0;
    for (const s of seeds) if (mask[s] === val && !vis[s]) { vis[s] = 1; q[t++] = s; }
    while (h < t) { const p = q[h++]; for (const n of nbrs(p)) if (n >= 0 && !vis[n] && mask[n] === val) { vis[n] = 1; q[t++] = n; } }
    return vis;
  };
  const border = []; for (let x = 0; x < W; x++) border.push(idx(x, 0), idx(x, H - 1)); for (let y = 0; y < H; y++) border.push(idx(0, y), idx(W - 1, y));
  const components = (m) => { const lb = new Int32Array(N).fill(-1); const sizes = []; const q = new Int32Array(N); let l = 0;
    for (let i = 0; i < N; i++) if (m[i] && lb[i] < 0) { let h = 0, t = 0; q[t++] = i; lb[i] = l; while (h < t) { const p = q[h++]; for (const n of nbrs(p)) if (n >= 0 && m[n] && lb[n] < 0) { lb[n] = l; q[t++] = n; } } sizes.push(t); l++; }
    return { lb, sizes }; };
  const fillHoles = (m) => { const out = new Uint8Array(m); const outside = flood(m, border, 0); for (let i = 0; i < N; i++) if (!m[i] && !outside[i]) out[i] = 1; return out; };
  // 1. Silueta: todo lo que no es menta ni el negro de las esquinas, sin lo que toca el borde; la mayor pieza.
  let sil = new Uint8Array(N);
  for (let i = 0; i < N; i++) sil[i] = G[i] - R[i] > 14 || R[i] + G[i] + B[i] < 40 ? 0 : 1;
  const touching = flood(sil, border, 1); for (let i = 0; i < N; i++) if (touching[i]) sil[i] = 0;
  { const { lb, sizes } = components(sil); let best = 0; sizes.forEach((s, i) => { if (s > sizes[best]) best = i; }); for (let i = 0; i < N; i++) sil[i] = lb[i] === best ? 1 : 0; }
  sil = fillHoles(sil);
  // 2. Capas internas por luminancia: manchas < 150 ≤ sombra < 236 ≤ bebé < 249 ≤ pelaje.
  const dark = new Uint8Array(N), baby = new Uint8Array(N), shade = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (sil[i]) { if (L[i] < 150) dark[i] = 1; else if (L[i] < 236) shade[i] = 1; else if (L[i] < 249) baby[i] = 1; }
  const morph = (m, r, erode) => {
    const pass = (src, horizontal) => { const o = new Uint8Array(N);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = erode ? 1 : 0;
        for (let d = -r; d <= r; d++) { const xx = horizontal ? x + d : x, yy = horizontal ? y : y + d;
          const s = xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : src[idx(xx, yy)];
          if (erode && !s) { v = 0; break; } if (!erode && s) { v = 1; break; } }
        o[idx(x, y)] = v; }
      return o; };
    return pass(pass(m, true), false); };
  const open = (m, r) => morph(morph(m, r, true), r, false);
  const keepBig = (m, min) => { const { lb, sizes } = components(m); const o = new Uint8Array(N); for (let i = 0; i < N; i++) if (lb[i] >= 0 && sizes[lb[i]] >= min) o[i] = 1; return o; };
  const darkC = keepBig(open(dark, 1), 30);
  const babyC = fillHoles(keepBig(open(baby, 3), 4000));
  const shadeC = keepBig(open(shade, 3), 800);
  // 3. Suavizado (caja ×3 ≈ gaussiana) + iso-contorno 0.5 + RDP + Catmull-Rom.
  const blur = (m, r) => { let a = Float32Array.from(m);
    for (let k = 0; k < 3; k++) { const b = new Float32Array(N), c = new Float32Array(N);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let d = -r; d <= r; d++) s += a[idx(Math.min(W - 1, Math.max(0, x + d)), y)]; b[idx(x, y)] = s / (2 * r + 1); }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let d = -r; d <= r; d++) s += b[idx(x, Math.min(H - 1, Math.max(0, y + d)))]; c[idx(x, y)] = s / (2 * r + 1); }
      a = c; }
    return a; };
  const contours = (f) => {
    const v = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : f[idx(x, y)]);
    const segs = new Map(); const add = (a, b) => segs.set(a, b);
    const pt = (key) => { const [t, xs, ys] = key.split(","); const x = +xs, y = +ys;
      if (t === "h") { const a = v(x, y), b = v(x + 1, y); return [x + (0.5 - a) / (b - a), y]; }
      const a = v(x, y), b = v(x, y + 1); return [x, y + (0.5 - a) / (b - a)]; };
    for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
      const c = (v(x, y) > 0.5 ? 8 : 0) | (v(x + 1, y) > 0.5 ? 4 : 0) | (v(x + 1, y + 1) > 0.5 ? 2 : 0) | (v(x, y + 1) > 0.5 ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const T = `h,${x},${y}`, Bm = `h,${x},${y + 1}`, Lf = `v,${x},${y}`, Rt = `v,${x + 1},${y}`;
      const centre = (v(x, y) + v(x + 1, y) + v(x + 1, y + 1) + v(x, y + 1)) / 4 > 0.5;
      switch (c) {
        case 1: add(Lf, Bm); break; case 2: add(Bm, Rt); break; case 3: add(Lf, Rt); break;
        case 4: add(Rt, T); break; case 6: add(Bm, T); break; case 7: add(Lf, T); break;
        case 8: add(T, Lf); break; case 9: add(T, Bm); break; case 11: add(T, Rt); break;
        case 12: add(Rt, Lf); break; case 13: add(Rt, Bm); break; case 14: add(Bm, Lf); break;
        case 5: if (centre) { add(Lf, T); add(Rt, Bm); } else { add(Lf, Bm); add(Rt, T); } break;
        case 10: if (centre) { add(T, Rt); add(Bm, Lf); } else { add(T, Lf); add(Bm, Rt); } break;
      }
    }
    const loops = [];
    while (segs.size) { let k = segs.keys().next().value; const loop = []; while (segs.has(k)) { loop.push(pt(k)); const n = segs.get(k); segs.delete(k); k = n; } if (loop.length > 8) loops.push(loop); }
    return loops; };
  const rdp = (pts, eps) => { if (pts.length < 3) return pts; const a = pts[0], b = pts[pts.length - 1]; const dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1e-9; let dmax = 0, ix = 0;
    for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len; if (d > dmax) { dmax = d; ix = i; } }
    if (dmax <= eps) return [a, b]; const l = rdp(pts.slice(0, ix + 1), eps), r = rdp(pts.slice(ix), eps); return l.slice(0, -1).concat(r); };
  const simplify = (loop, eps) => { let far = 0, fd = 0; for (let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > fd) { fd = d; far = i; } }
    return rdp(loop.slice(0, far + 1), eps).slice(0, -1).concat(rdp(loop.slice(far).concat([loop[0]]), eps).slice(0, -1)); };
  const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return s / 2; };
  const layer = (m, minArea, r, eps) => contours(blur(m, r)).map((l) => simplify(l, eps)).filter((l) => Math.abs(area(l)) >= minArea);
  const silL = layer(sil, 500, 4, 1.6), babyL = layer(babyC, 500, 2, 1.1), shadeL = layer(shadeC, 300, 2, 1.1), darkL = layer(darkC, 20, 2, 1.1);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const l of silL) for (const [x, y] of l) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const side = Math.max(maxX - minX, maxY - minY), k = 100 / side, ox = (minX + maxX) / 2 - side / 2, oy = (minY + maxY) / 2 - side / 2;
  const f1 = (n) => String(Math.round(n * 10) / 10);
  const X = (x) => f1((x - ox) * k), Y = (y) => f1((y - oy) * k);
  const toPath = (loops) => loops.map((p) => { const n = p.length; let d = `M${X(p[0][0])} ${Y(p[0][1])}`;
    for (let i = 0; i < n; i++) { const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n], t = 1 / 6;
      d += `C${X(p1[0] + (p2[0] - p0[0]) * t)} ${Y(p1[1] + (p2[1] - p0[1]) * t)} ${X(p2[0] - (p3[0] - p1[0]) * t)} ${Y(p2[1] - (p3[1] - p1[1]) * t)} ${X(p2[0])} ${Y(p2[1])}`; }
    return d + "Z"; }).join("");
  const out = { viewBox: "0 0 100 100", source: "git 2bf0815:src/app/icon.jpg (1001×1024)", fur: toPath(silL), baby: toPath(babyL), shade: toPath(shadeL), patches: toPath(darkL) };
  writeFileSync(PATHS_JSON, JSON.stringify(out, null, 1) + "\n");
  console.log("paths →", PATHS_JSON, { loops: { fur: silL.length, baby: babyL.length, shade: shadeL.length, patches: darkL.length } });
}

/** Las capas del panda (claro) dentro de un <g> escalado: `scale` = fracción del lado, centrado. */
function pandaGroup(P, size, scale, linePx = Math.max(1.25, size * 0.012)) {
  const s = (size * scale) / 100, off = (size - size * scale) / 2;
  const lw = linePx / s; // contorno en px de la imagen final: 1.25 px en la UI, ~1.2 % del lado en los iconos
  return `<g transform="translate(${off} ${off}) scale(${s})">
  <path d="${P.fur}" fill="${LIGHT.fur}"/><path d="${P.baby}" fill="${LIGHT.baby}"/><path d="${P.shade}" fill="${LIGHT.shade}"/>
  <path d="${P.patches}" fill="${LIGHT.patch}" fill-rule="evenodd"/>
  <path d="${P.fur}" fill="none" stroke="${LIGHT.line}" stroke-width="${lw.toFixed(3)}" stroke-linejoin="round"/></g>`;
}

async function icons() {
  const P = JSON.parse(readFileSync(PATHS_JSON, "utf8"));
  mkdirSync(join(ROOT, "public/icons"), { recursive: true });
  // "any": azulejo alabastro a sangre con el panda al 84 %; "maskable": el panda dentro de la zona segura
  // (círculo del 80 %): el panda —casi un óvalo— al 70 %.
  const square = (size, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${LIGHT.ground}"/>${pandaGroup(P, size, scale)}</svg>`;
  const jobs = [
    ["public/icons/icon-192.png", square(192, 0.84)],
    ["public/icons/icon-512.png", square(512, 0.84)],
    ["public/icons/icon-maskable-192.png", square(192, 0.7)],
    ["public/icons/icon-maskable-512.png", square(512, 0.7)],
    ["src/app/apple-icon.png", square(180, 0.8)],
  ];
  for (const [rel, svg] of jobs) { await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(ROOT, rel)); console.log("png →", rel); }
  // Favicon vectorial: azulejo alabastro redondeado con filete line-strong (legible en pestañas claras y oscuras).
  const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="1" y="1" width="98" height="98" rx="22" fill="${LIGHT.ground}" stroke="${LIGHT.lineStrong}" stroke-width="2"/>${pandaGroup(P, 100, 0.82, 3)}</svg>\n`;
  writeFileSync(join(ROOT, "src/app/icon.svg"), fav);
  console.log("svg → src/app/icon.svg");
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "trace" && arg) await trace(arg);
else if (cmd === "icons") await icons();
else { console.error("uso: render-brand.mjs trace <original.jpg> | icons"); process.exit(1); }
