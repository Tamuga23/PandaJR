"use client";

import { useEffect, useRef } from "react";
import { WEEK_MAX, WEEK_MIN } from "@/lib/weeks";

/**
 * GrowingPlant — la firma botánica de PandaJr: "una planta que crece contigo".
 *
 * SVG paramétrico y determinista (sin Math.random: la variación sale de un hash del número de la
 * semana en que brotó cada hoja, así que cada hoja conserva su forma mientras la planta crece).
 *   1–2    semilla sobre la tierra (en la 2 asoma la raíz)
 *   3–6    brote: tallo corto con dos cotiledones que se abren
 *   7–35   tallo que se alarga cada semana; una hoja nueva cada 4 semanas (7, 11 … 35), alternando
 *          lados, y las jóvenes siguen creciendo y abriéndose (cada semana cambia algo visible)
 *   36–39  botón terracota que engorda
 *   40–42  flor abierta
 *   undefined → brote neutro (sin número).
 *
 * Trazo de 1.5px en pantalla a cualquier tamaño (el grosor se compensa en unidades del viewBox),
 * sage-ink para tallo y hojas, rellenos tenues de sage, terracota solo en el botón/flor. Todo por
 * tokens (var(--sage-ink), var(--sage), var(--terracotta)…): correcto en claro y oscuro sin props.
 *
 * Animación única de autor: al AVANZAR de semana (no al montar ni al retroceder) el tallo se alarga
 * hasta su nueva punta, la punta sube con él y la hoja más joven crece desde su nudo; 600ms,
 * ease-out exponencial. Desactivada con prefers-reduced-motion o animate={false}. El estado por
 * defecto es la planta completa: si la animación no corre, no falta nada.
 *
 * Accesibilidad: role="img" + aria-label ("Planta de la semana 24"). title personaliza la etiqueta;
 * title="" la vuelve decorativa (aria-hidden) cuando el texto de al lado ya dice la semana.
 */

const VB = 120;
const BASE_X = 60;
const SOIL_Y = 100; // cima del montículo de tierra, bajo el tallo
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const GROW_MS = 600;

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Hash entero determinista → [0, 1). */
function hash01(n: number, salt = 0): number {
  let x = Math.imul(n + 0x632be5ab, 0x85ebca6b) ^ Math.imul(salt + 1, 0x27d4eb2f);
  x ^= x >>> 15;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 13;
  x = Math.imul(x, 0x165667b1);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/* ---------- Geometría (pura; también la usa la animación para la semana anterior) ---------- */

type Stage = "seed" | "sprout" | "stem" | "bud" | "flower";

type LeafGeo = {
  key: string;
  x: number;
  y: number;
  side: 1 | -1;
  /** Rotación (grados) de la hoja dibujada hacia +x, antes del espejo del lado izquierdo. */
  rot: number;
  len: number;
  /** Proporción ancho/largo. */
  wide: number;
  /** Caída de la punta (fracción del largo): las hojas maduras se arquean. */
  droop: number;
  /** Crecimiento 0..1 (para animar la hoja más joven desde su tamaño anterior). */
  growth: number;
  emergedWeek: number;
};

type PlantGeo = {
  stage: Stage;
  stemHeight: number;
  stemPath: string;
  stemLength: number;
  tip: { x: number; y: number; angle: number };
  cotyledons: { size: number; x: number; y: number } | null;
  leaves: LeafGeo[];
  /** Tamaño relativo de la punta (botón/flor/brote) para animar desde la semana anterior. */
  apexScale: number;
  bud: number; // alto del botón (36–39)
  petal: number; // largo de pétalo (40–42)
  petalTurn: number;
  seed: "alone" | "rooting" | "husk" | null;
};

function stageOf(week: number): Stage {
  if (week <= 2) return "seed";
  if (week <= 6) return "sprout";
  if (week <= 35) return "stem";
  if (week <= 39) return "bud";
  return "flower";
}

/** Altura del tallo (unidades del viewBox) sobre la tierra. */
function stemHeightOf(week: number): number {
  if (week <= 2) return 0;
  if (week <= 6) return 7 + (week - 3) * 4; // 7 · 11 · 15 · 19
  if (week <= 35) return 19 + ((week - 6) * (72 - 19)) / 29; // 20.8 … 72
  return 72 + (week - 35) * 0.4; // 72.4 … 74.8
}

/** Vaivén suave del tallo según la altura absoluta (los nudos bajos no se mueven al crecer). */
function stemX(d: number): number {
  return BASE_X + 3 * Math.sin(d / 16) * Math.min(1, d / 22);
}

const COTYLEDON_NODE = 19;
const LEAF_EVERY = 4;
const FIRST_LEAF_WEEK = 7;
const LAST_LEAF_WEEK = 35;
const COTYLEDON_SIZES = [6, 8.5, 10.5, 12]; // semanas 3–6; después se quedan en 12

function buildPlant(week: number): PlantGeo {
  const stage = stageOf(week);
  const h = stemHeightOf(week);

  // Tallo: muestreo cada 3 unidades → curva suave (cuadráticas por puntos medios).
  const pts: { x: number; y: number }[] = [];
  const steps = Math.max(2, Math.ceil(h / 3));
  for (let i = 0; i <= steps; i++) {
    const d = (h * i) / steps;
    pts.push({ x: stemX(d), y: SOIL_Y - d });
  }
  let stemPath = "";
  let stemLength = 0;
  if (h > 0) {
    stemPath = `M${r2(pts[0].x)} ${r2(pts[0].y)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      stemPath += ` Q${r2(pts[i].x)} ${r2(pts[i].y)} ${r2(mx)} ${r2(my)}`;
    }
    const last = pts[pts.length - 1];
    stemPath += ` L${r2(last.x)} ${r2(last.y)}`;
    for (let i = 1; i < pts.length; i++) stemLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  const tipD = h;
  const dx = stemX(tipD) - stemX(Math.max(0, tipD - 1));
  const tip = { x: stemX(tipD), y: SOIL_Y - tipD, angle: (Math.atan2(dx, 1) * 180) / Math.PI };

  // Cotiledones: en la punta del brote (3–6); después quedan en su nudo.
  let cotyledons: PlantGeo["cotyledons"] = null;
  if (stage === "sprout") {
    cotyledons = { size: COTYLEDON_SIZES[week - 3], x: tip.x, y: tip.y };
  } else if (stage !== "seed" && week <= 18) {
    // Los cotiledones se quedan en su nudo y se marchitan poco a poco (12 → 0 entre las semanas 11 y 19).
    const size = week <= 11 ? 12 : 12 * (1 - (week - 11) / 8);
    cotyledons = { size, x: stemX(COTYLEDON_NODE), y: SOIL_Y - COTYLEDON_NODE };
  }

  // Hojas verdaderas: brotan cerca de la punta y siguen creciendo unas semanas.
  const leaves: LeafGeo[] = [];
  if (stage === "stem" || stage === "bud" || stage === "flower") {
    for (let k = 0, e = FIRST_LEAF_WEEK; e <= LAST_LEAF_WEEK && e <= week; k++, e += LEAF_EVERY) {
      const age = week - e;
      const growth = 1 - Math.exp(-(age + 1) / 2.6);
      const side: 1 | -1 = k % 2 === 0 ? 1 : -1;
      const node = stemHeightOf(e) - 3;
      const maxLen = (31 - k * 2.3) * (0.92 + 0.16 * hash01(e, 1)); // silueta ovada: arriba, más cortas
      const openDeg = 30 + 46 * growth + (hash01(e, 2) * 10 - 5); // joven apunta arriba; madura se abre
      leaves.push({
        key: `leaf-${e}`,
        x: stemX(node),
        y: SOIL_Y - node,
        side,
        rot: openDeg - 90,
        len: maxLen * (0.3 + 0.7 * growth),
        wide: 0.3 + 0.06 * hash01(e, 3),
        droop: -0.02 + 0.2 * growth,
        growth,
        emergedWeek: e,
      });
    }
  }

  let apexScale = 1;
  let bud = 0;
  let petal = 0;
  if (stage === "sprout") apexScale = COTYLEDON_SIZES[week - 3] / 12;
  if (stage === "bud") {
    bud = 10 + (week - 36) * 1.7; // 10 … 15.1
    apexScale = bud / 15.1;
  }
  if (stage === "flower") {
    petal = [12.5, 13.8, 15][week - 40];
    apexScale = petal / 15;
  }

  const seed: PlantGeo["seed"] = week <= 1 ? "alone" : week === 2 ? "rooting" : stage === "sprout" ? "husk" : null;

  return { stage, stemHeight: h, stemPath, stemLength, tip, cotyledons, leaves, apexScale, bud, petal, petalTurn: hash01(week, 7) * 20 - 10, seed };
}

/* ---------- Piezas ---------- */

/**
 * Hoja dibujada hacia +x desde (0,0); el lado izquierdo es su espejo. La punta cae `droop`·len
 * (las maduras se arquean) y el borde superior abomba más que el inferior.
 */
function leafPath(len: number, wide: number, droop = 0): string {
  const w = len * wide;
  const tipY = droop * len;
  return `M0 0 C${r2(len * 0.22)} ${r2(-w * 1.1)} ${r2(len * 0.68)} ${r2(-w * 1.05 + tipY * 0.4)} ${r2(len)} ${r2(tipY)} C${r2(len * 0.72)} ${r2(w * 0.5 + tipY * 0.7)} ${r2(len * 0.28)} ${r2(w * 0.8)} 0 0Z`;
}

function midribPath(len: number, wide: number, droop = 0): string {
  const w = len * wide;
  const tipY = droop * len;
  return `M${r2(len * 0.06)} 0 Q${r2(len * 0.5)} ${r2(-w * 0.22 + tipY * 0.2)} ${r2(len * 0.86)} ${r2(tipY * 0.8)}`;
}

type Paint = { sw: number; detail: boolean };

function Leaf({ len, wide, rot, side, droop = 0, paint }: { len: number; wide: number; rot: number; side: 1 | -1; droop?: number; paint: Paint }) {
  return (
    <g transform={`scale(${side} 1) rotate(${r2(rot)})`}>
      <path d={leafPath(len, wide, droop)} fill="var(--sage)" fillOpacity={0.22} stroke="currentColor" strokeWidth={paint.sw} strokeLinejoin="round" />
      {paint.detail && len > 9 && (
        <path d={midribPath(len, wide, droop)} fill="none" stroke="currentColor" strokeWidth={paint.sw * 0.7} strokeOpacity={0.55} strokeLinecap="round" />
      )}
    </g>
  );
}

function CotyledonPair({ size, paint }: { size: number; paint: Paint }) {
  return (
    <>
      <Leaf len={size} wide={0.55} rot={-28} side={1} paint={{ ...paint, detail: false }} />
      <Leaf len={size} wide={0.55} rot={-28} side={-1} paint={{ ...paint, detail: false }} />
    </>
  );
}

function Seed({ variant, paint }: { variant: "alone" | "rooting" | "husk"; paint: Paint }) {
  if (variant === "husk") {
    // Cáscara que queda al pie del brote, medio enterrada.
    return (
      <g transform={`translate(${BASE_X - 4.5} ${SOIL_Y + 0.6}) rotate(-24)`}>
        <path d="M-4 0 C-4 -2.6 4 -2.6 4 0" fill="var(--sage)" fillOpacity={0.3} stroke="currentColor" strokeWidth={paint.sw} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform={`translate(${BASE_X} ${SOIL_Y - 4.2})`}>
      {variant === "rooting" && (
        <path d="M-1 4 C-1.8 7.2 0.9 9.2 -0.4 12.4" fill="none" stroke="currentColor" strokeWidth={paint.sw} strokeLinecap="round" />
      )}
      <ellipse cx={0} cy={0} rx={7} ry={4.8} transform="rotate(-16)" fill="var(--sage)" fillOpacity={0.3} stroke="currentColor" strokeWidth={paint.sw} />
      <path d="M-3.6 -1.1 Q0 -3.2 3.7 -1.7" fill="none" stroke="currentColor" strokeWidth={paint.sw * 0.7} strokeOpacity={0.55} strokeLinecap="round" transform="rotate(-16)" />
      {variant === "rooting" && (
        <path d="M2 -4.3 Q3 -6.8 1.6 -8.6" fill="none" stroke="currentColor" strokeWidth={paint.sw} strokeLinecap="round" />
      )}
    </g>
  );
}

function Soil({ paint }: { paint: Paint }) {
  return (
    <g>
      <path d="M26 104.5 Q60 95.5 94 104.5 Z" fill="var(--sage)" fillOpacity={0.14} />
      <path d="M26 104.5 Q60 95.5 94 104.5" fill="none" stroke="currentColor" strokeWidth={paint.sw} strokeLinecap="round" />
      <path d="M47 102.6 h3 M68 103 h4.5" fill="none" stroke="currentColor" strokeWidth={paint.sw} strokeOpacity={0.45} strokeLinecap="round" />
    </g>
  );
}

/** Yema apical (7–35): dos hojitas cerradas que coronan el tallo. */
function ApicalBud({ paint }: { paint: Paint }) {
  return (
    <>
      <Leaf len={5} wide={0.42} rot={-72} side={1} paint={{ ...paint, detail: false }} />
      <Leaf len={5} wide={0.42} rot={-72} side={-1} paint={{ ...paint, detail: false }} />
    </>
  );
}

function Sepals({ paint }: { paint: Paint }) {
  return (
    <>
      <Leaf len={6.5} wide={0.42} rot={-40} side={1} paint={{ ...paint, detail: false }} />
      <Leaf len={6.5} wide={0.42} rot={-40} side={-1} paint={{ ...paint, detail: false }} />
    </>
  );
}

function FlowerBud({ height, paint }: { height: number; paint: Paint }) {
  const w = height * 0.36;
  const d = `M0 0 C${r2(w * 1.5)} ${r2(-height * 0.2)} ${r2(w * 0.9)} ${r2(-height * 0.82)} 0 ${r2(-height)} C${r2(-w * 0.9)} ${r2(-height * 0.82)} ${r2(-w * 1.5)} ${r2(-height * 0.2)} 0 0Z`;
  return (
    <>
      <path d={d} fill="var(--terracotta)" stroke="var(--terracotta-ink)" strokeWidth={paint.sw} strokeLinejoin="round" />
      <path d={`M0.3 -1 Q${r2(w * 0.35)} ${r2(-height * 0.5)} 0 ${r2(-height * 0.9)}`} fill="none" stroke="var(--terracotta-ink)" strokeWidth={paint.sw * 0.7} strokeOpacity={0.7} strokeLinecap="round" />
      <Sepals paint={paint} />
    </>
  );
}

function Flower({ petal, turn, paint }: { petal: number; turn: number; paint: Paint }) {
  const pw = petal * 0.62;
  const d = `M0 0 C${r2(pw * 0.62)} ${r2(-petal * 0.28)} ${r2(pw * 0.55)} ${r2(-petal * 0.9)} 0 ${r2(-petal)} C${r2(-pw * 0.55)} ${r2(-petal * 0.9)} ${r2(-pw * 0.62)} ${r2(-petal * 0.28)} 0 0Z`;
  const cy = -petal * 0.62;
  return (
    <>
      <Sepals paint={paint} />
      {/* La flor mira de frente, algo inclinada (escala vertical) para leerse sobre el tallo. */}
      <g transform={`translate(0 ${r2(cy)}) scale(1 0.86)`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={d} transform={`rotate(${r2(turn + i * 72)})`} fill="var(--terracotta)" stroke="var(--terracotta-ink)" strokeWidth={paint.sw} strokeLinejoin="round" />
        ))}
        <circle r={r2(petal * 0.24)} fill="var(--terracotta-ink)" />
      </g>
    </>
  );
}

/* ---------- Componente ---------- */

export function GrowingPlant({
  week,
  size = 120,
  animate = true,
  className,
  title,
}: {
  week: number | undefined;
  size?: number;
  animate?: boolean;
  className?: string;
  title?: string;
}) {
  const known = typeof week === "number" && Number.isFinite(week);
  const w = known ? Math.min(WEEK_MAX, Math.max(WEEK_MIN, Math.round(week as number))) : 5;
  const geo = buildPlant(w);

  // Grosor constante en pantalla: 1.5px a cualquier tamaño.
  const paint: Paint = { sw: r2((1.5 * VB) / Math.max(16, size)), detail: size >= 72 };

  const stemRef = useRef<SVGPathElement>(null);
  const apexRef = useRef<SVGGElement>(null);
  const leafRef = useRef<SVGGElement>(null);
  const prevWeek = useRef<number | undefined>(undefined);

  const newestLeaf = geo.leaves.length ? geo.leaves[geo.leaves.length - 1] : null;

  useEffect(() => {
    const prev = prevWeek.current;
    prevWeek.current = known ? w : undefined;
    if (!animate || !known || prev === undefined || w <= prev) return;
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Sin Web Animations (navegadores antiguos, jsdom): la planta ya está en su estado final; una
    // animación decorativa nunca debe tumbar la Guía.
    if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") return;

    const before = buildPlant(prev);
    const now = buildPlant(w);
    const running: Animation[] = [];
    const opts: KeyframeAnimationOptions = { duration: GROW_MS, easing: EASE_OUT_EXPO, fill: "backwards" };

    const stem = stemRef.current;
    if (stem && now.stemLength > 0 && typeof stem.getTotalLength === "function") {
      const total = stem.getTotalLength();
      const from = total * (1 - Math.min(1, before.stemLength / now.stemLength));
      stem.style.strokeDasharray = `${total} ${total}`;
      const a = stem.animate([{ strokeDashoffset: from }, { strokeDashoffset: 0 }], opts);
      a.onfinish = a.oncancel = () => {
        stem.style.strokeDasharray = "";
      };
      running.push(a);
    }

    const apex = apexRef.current;
    if (apex) {
      const dx = r2(before.tip.x - now.tip.x);
      const dy = r2(before.tip.y - now.tip.y);
      const sameKind = before.stage === now.stage;
      const s0 = sameKind ? Math.min(1, before.apexScale / now.apexScale) : before.stage === "bud" ? 0.5 : 0;
      running.push(
        apex.animate(
          [{ transform: `translate(${dx}px, ${dy}px) scale(${r2(s0)})` }, { transform: "translate(0px, 0px) scale(1)" }],
          opts
        )
      );
    }

    const leaf = leafRef.current;
    const nowLeaf = now.leaves[now.leaves.length - 1];
    if (leaf && nowLeaf) {
      const prevSame = before.leaves.find((l) => l.emergedWeek === nowLeaf.emergedWeek);
      const s0 = prevSame ? Math.min(1, prevSame.len / nowLeaf.len) : 0;
      if (s0 < 0.995) {
        running.push(leaf.animate([{ transform: `scale(${r2(s0)})` }, { transform: "scale(1)" }], { ...opts, delay: prevSame ? 0 : 90 }));
      }
    }

    return () => running.forEach((a) => a.cancel());
  }, [w, known, animate]);

  const label = title ?? (known ? `Planta de la semana ${w}` : "Planta");
  const decorative = title === "";
  const originStyle = { transformOrigin: "0px 0px", transformBox: "view-box" } as const;

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      className={`text-sage-ink${className ? ` ${className}` : ""}`}
      {...(decorative ? { "aria-hidden": true, focusable: false } : { role: "img", "aria-label": label })}
      data-week={known ? w : undefined}
    >
      <Soil paint={paint} />
      {geo.seed && <Seed variant={geo.seed} paint={paint} />}

      {/* Hojas bajo el tallo: el trazo del tallo queda continuo sobre los nudos. */}
      {geo.leaves.map((l) => (
        <g key={l.key} transform={`translate(${r2(l.x)} ${r2(l.y)})`}>
          <g ref={l === newestLeaf ? leafRef : undefined} style={l === newestLeaf ? originStyle : undefined}>
            <Leaf len={l.len} wide={l.wide} rot={l.rot} side={l.side} droop={l.droop} paint={paint} />
          </g>
        </g>
      ))}
      {geo.cotyledons && geo.stage !== "sprout" && (
        <g transform={`translate(${r2(geo.cotyledons.x)} ${r2(geo.cotyledons.y)})`}>
          <CotyledonPair size={geo.cotyledons.size} paint={paint} />
        </g>
      )}

      {geo.stemPath && (
        <path ref={stemRef} d={geo.stemPath} fill="none" stroke="currentColor" strokeWidth={paint.sw} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {geo.stage !== "seed" && (
        <g transform={`translate(${r2(geo.tip.x)} ${r2(geo.tip.y)}) rotate(${r2(geo.tip.angle)})`}>
          <g ref={apexRef} style={originStyle}>
            {geo.stage === "sprout" && geo.cotyledons && <CotyledonPair size={geo.cotyledons.size} paint={paint} />}
            {geo.stage === "stem" && <ApicalBud paint={paint} />}
            {geo.stage === "bud" && <FlowerBud height={geo.bud} paint={paint} />}
            {geo.stage === "flower" && <Flower petal={geo.petal} turn={geo.petalTurn} paint={paint} />}
          </g>
        </g>
      )}
    </svg>
  );
}
