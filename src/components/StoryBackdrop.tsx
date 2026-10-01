/**
 * StoryBackdrop — el fondo ilustrado de la tarjeta compartible (PandaStory).
 *
 * Cuatro escenas del mismo jardín, dibujadas con el vocabulario de GrowingPlant (trazo fino de sage-ink,
 * rellenos tenues, terracota solo de acento) y con los valores canónicos de DESIGN.md:
 *   botanico  invernadero: frondas desde los bordes, halo de luz y anillo punteado de espécimen
 *   nocturno  jardín de noche: luna llena detrás de la planta, estrellas, colinas y luciérnagas
 *   amanecer  el sol sale justo en la tierra de la planta, rayos, nubes de línea y flores silvestres
 *   limpio    herbario: papel cuadriculado, doble filete, ramitas prensadas con cinta y una corona
 *
 * Composición sobre un lienzo de 90×160 (la tarjeta es 9:16): wordmark ~y 6–11, titular ~14–37, planta
 * ~39–105 (tierra en ~94), texto ~107–153. Lo ilustrado vive en los bordes y detrás de la planta; las
 * franjas de texto quedan limpias o sobre tintes claros (contraste ≥4.5:1 medido para cada texto).
 *
 * SVG determinista y en línea (sin imágenes externas): html-to-image lo exporta tal cual al PNG.
 * Decorativo: aria-hidden.
 */
import type { ReactNode } from "react";

export type StoryStyleId = "botanico" | "nocturno" | "amanecer" | "limpio";

const r = (v: number) => Math.round(v * 100) / 100;
type Pt = readonly [number, number];

type Ink = { fill: string; fillOpacity: number; stroke: string; strokeOpacity: number; sw: number };

/** Hoja apuntando a +x desde (0,0): misma silueta lanceolada que la planta. */
function leafD(len: number, wide: number): string {
  const w = len * wide;
  return `M0 0C${r(len * 0.28)} ${r(-w)} ${r(len * 0.72)} ${r(-w)} ${r(len)} 0C${r(len * 0.72)} ${r(w)} ${r(len * 0.28)} ${r(w)} 0 0Z`;
}

function Leaf({ x, y, len, rot, ink, wide = 0.3, rib = true }: { x: number; y: number; len: number; rot: number; ink: Ink; wide?: number; rib?: boolean }) {
  return (
    <g transform={`translate(${r(x)} ${r(y)}) rotate(${r(rot)})`}>
      <path d={leafD(len, wide)} fill={ink.fill} fillOpacity={ink.fillOpacity} stroke={ink.stroke} strokeOpacity={ink.strokeOpacity} strokeWidth={ink.sw} strokeLinejoin="round" />
      {rib && (
        <path d={`M${r(len * 0.08)} 0L${r(len * 0.84)} 0`} fill="none" stroke={ink.stroke} strokeOpacity={ink.strokeOpacity * 0.7} strokeWidth={ink.sw * 0.7} strokeLinecap="round" />
      )}
    </g>
  );
}

/** Rama curva (Bézier cuadrática) con hojas que se afinan hacia la punta. */
function Frond({
  p0, c, p1, count, leafLen, ink, spread = 52, wide = 0.3, paired = false, start = 0.14,
}: {
  p0: Pt; c: Pt; p1: Pt; count: number; leafLen: number; ink: Ink; spread?: number; wide?: number; paired?: boolean; start?: number;
}) {
  const at = (t: number) => {
    const u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0];
    const y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1];
    const dx = 2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]);
    const dy = 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
    return { x, y, ang: (Math.atan2(dy, dx) * 180) / Math.PI };
  };
  const leaves: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = start + (i / Math.max(1, count - 1)) * (0.92 - start);
    const p = at(t);
    const len = leafLen * (1 - 0.5 * t);
    const sides = paired ? [1, -1] : [i % 2 === 0 ? 1 : -1];
    for (const s of sides) leaves.push(<Leaf key={`${i}${s}`} x={p.x} y={p.y} len={len} rot={p.ang + s * spread} ink={ink} wide={wide} />);
  }
  const tip = at(1);
  return (
    <g>
      <path d={`M${p0[0]} ${p0[1]}Q${c[0]} ${c[1]} ${p1[0]} ${p1[1]}`} fill="none" stroke={ink.stroke} strokeOpacity={ink.strokeOpacity} strokeWidth={ink.sw} strokeLinecap="round" />
      {leaves}
      <Leaf x={tip.x} y={tip.y} len={leafLen * 0.42} rot={tip.ang} ink={ink} wide={wide} />
    </g>
  );
}

/** Destello de cuatro puntas (estrella dibujada, no un glifo). */
function Sparkle({ x, y, s, color, opacity }: { x: number; y: number; s: number; color: string; opacity: number }) {
  const k = s * 0.22;
  return (
    <path
      d={`M${r(x)} ${r(y - s)}L${r(x + k)} ${r(y - k)}L${r(x + s)} ${r(y)}L${r(x + k)} ${r(y + k)}L${r(x)} ${r(y + s)}L${r(x - k)} ${r(y + k)}L${r(x - s)} ${r(y)}L${r(x - k)} ${r(y - k)}Z`}
      fill={color}
      fillOpacity={opacity}
    />
  );
}

/** Mechón de pasto: hojas finas que salen de un punto. */
function Tuft({ x, y, h, color, opacity, sw, lean = 0 }: { x: number; y: number; h: number; color: string; opacity: number; sw: number; lean?: number }) {
  const blades = [-14, -5, 4, 12].map((a, i) => {
    const ang = ((a + lean) * Math.PI) / 180;
    const len = h * (i % 2 === 0 ? 1 : 0.72);
    const tx = x + Math.sin(ang) * len;
    const ty = y - Math.cos(ang) * len;
    const cx = x + Math.sin(ang) * len * 0.2;
    const cy = y - Math.cos(ang) * len * 0.6;
    return <path key={a} d={`M${r(x)} ${r(y)}Q${r(cx)} ${r(cy)} ${r(tx)} ${r(ty)}`} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={sw} strokeLinecap="round" />;
  });
  return <g>{blades}</g>;
}

/** Flor silvestre: tallo, dos hojas y un botón. */
function Wildflower({ x, y, h, lean, stem, bud, leafInk, sw }: { x: number; y: number; h: number; lean: number; stem: string; bud: string; leafInk: Ink; sw: number }) {
  const tx = x + lean;
  const ty = y - h;
  return (
    <g>
      <path d={`M${x} ${y}Q${r(x + lean * 0.2)} ${r(y - h * 0.55)} ${r(tx)} ${r(ty)}`} fill="none" stroke={stem} strokeOpacity={0.55} strokeWidth={sw} strokeLinecap="round" />
      <Leaf x={x + lean * 0.12} y={y - h * 0.32} len={h * 0.3} rot={-40 + lean * 2} ink={leafInk} wide={0.32} rib={false} />
      <Leaf x={x + lean * 0.22} y={y - h * 0.5} len={h * 0.24} rot={-150 + lean * 2} ink={leafInk} wide={0.32} rib={false} />
      <circle cx={r(tx)} cy={r(ty)} r={h * 0.075} fill={bud} fillOpacity={0.75} />
      <circle cx={r(tx)} cy={r(ty)} r={h * 0.13} fill="none" stroke={bud} strokeOpacity={0.35} strokeWidth={sw * 0.8} />
    </g>
  );
}

/* --------------------------------- Escenas --------------------------------- */

function Botanico() {
  const frond: Ink = { fill: "#6c9a84", fillOpacity: 0.2, stroke: "#44695a", strokeOpacity: 0.55, sw: 0.42 };
  const soft: Ink = { fill: "#6c9a84", fillOpacity: 0.14, stroke: "#44695a", strokeOpacity: 0.4, sw: 0.38 };
  return (
    <>
      <defs>
        <linearGradient id="ps-bot-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ebf2ee" />
          <stop offset="1" stopColor="#dce8e0" />
        </linearGradient>
        <radialGradient id="ps-bot-glow" cx="45" cy="72" r="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f7fbf8" stopOpacity="1" />
          <stop offset="0.7" stopColor="#f2f7f3" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f2f7f3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="90" height="160" fill="url(#ps-bot-bg)" />
      <circle cx="45" cy="72" r="38" fill="url(#ps-bot-glow)" />
      {/* Anillo de espécimen: punteado alrededor de la planta. */}
      <circle cx="45" cy="72" r="34.5" fill="none" stroke="#44695a" strokeOpacity="0.28" strokeWidth="0.45" strokeDasharray="0.01 1.6" strokeLinecap="round" />
      <circle cx="45" cy="72" r="36.8" fill="none" stroke="#44695a" strokeOpacity="0.12" strokeWidth="0.3" />
      {/* Frondas que suben por los bordes. */}
      <Frond p0={[-5, 104]} c={[4, 70]} p1={[15, 44]} count={9} leafLen={10} ink={frond} paired spread={58} />
      <Frond p0={[95, 110]} c={[86, 78]} p1={[76, 54]} count={8} leafLen={9.5} ink={frond} paired spread={58} />
      {/* Hojas anchas en las esquinas de abajo, fuera del texto. */}
      {[[-3, 163, -62, 15], [-3, 163, -38, 13], [-2, 162, -84, 12]].map(([x, y, rot, len]) => (
        <Leaf key={`bl${rot}`} x={x} y={y} len={len} rot={rot} ink={soft} wide={0.34} />
      ))}
      {[[93, 163, -118, 15], [93, 163, -142, 13], [92, 162, -96, 12]].map(([x, y, rot, len]) => (
        <Leaf key={`br${rot}`} x={x} y={y} len={len} rot={rot} ink={soft} wide={0.34} />
      ))}
      {/* Ramitas en las esquinas de arriba, junto a la marca. */}
      <Frond p0={[-2, 2]} c={[6, 4]} p1={[12, 13]} count={4} leafLen={5} ink={soft} spread={60} />
      <Frond p0={[92, 3]} c={[84, 5]} p1={[78, 13]} count={4} leafLen={5} ink={soft} spread={60} />
      {/* Semillas y polen. */}
      {[[9, 40, 0.55], [81, 38, 0.5], [6, 118, 0.5], [85, 124, 0.55], [20, 104, 0.4], [70, 102, 0.4], [14, 30, 0.35], [77, 46, 0.35]].map(([x, y, rad]) => (
        <ellipse key={`s${x}${y}`} cx={x} cy={y} rx={rad} ry={rad * 0.7} fill="#44695a" fillOpacity="0.3" />
      ))}
    </>
  );
}

const NIGHT_STARS: readonly (readonly [number, number, number, number])[] = [
  [8, 9, 1.3, 0.85], [20, 4, 0.5, 0.6], [79, 7, 1.1, 0.8], [86, 18, 0.45, 0.6], [5, 24, 0.45, 0.55],
  [84, 40, 1.4, 0.75], [7, 52, 0.9, 0.7], [12, 74, 0.45, 0.5], [81, 64, 0.5, 0.55], [86, 92, 0.85, 0.6],
  [4, 96, 0.4, 0.5], [30, 44, 0.35, 0.45], [62, 42, 0.4, 0.5], [70, 12, 0.35, 0.5], [36, 9, 0.35, 0.45],
  [52, 5, 0.6, 0.7], [16, 60, 0.35, 0.45], [76, 84, 0.35, 0.45], [2, 40, 0.35, 0.4], [89, 52, 0.35, 0.45],
];

function Nocturno() {
  const blade = "#619b7e";
  return (
    <>
      <defs>
        <linearGradient id="ps-noc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#100d16" />
          <stop offset="0.55" stopColor="#181520" />
          <stop offset="1" stopColor="#1d1827" />
        </linearGradient>
        <radialGradient id="ps-noc-halo" cx="45" cy="70" r="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a4160" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#3a334b" stopOpacity="0.22" />
          <stop offset="1" stopColor="#3a334b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ps-noc-moon" cx="40" cy="62" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a334b" />
          <stop offset="1" stopColor="#2d273a" />
        </radialGradient>
        <radialGradient id="ps-noc-fly" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#eb9279" stopOpacity="0.45" />
          <stop offset="1" stopColor="#eb9279" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="90" height="160" fill="url(#ps-noc-bg)" />
      {NIGHT_STARS.map(([x, y, s, o]) =>
        s >= 0.8 ? <Sparkle key={`${x}-${y}`} x={x} y={y} s={s} color="#eae6e1" opacity={o} /> : <circle key={`${x}-${y}`} cx={x} cy={y} r={s * 0.6} fill="#cbc5d2" fillOpacity={o} />
      )}
      {/* Una constelación discreta arriba a la derecha. */}
      <path d="M79 7L86 18L84 40" fill="none" stroke="#cbc5d2" strokeOpacity="0.16" strokeWidth="0.25" strokeDasharray="0.8 0.9" />
      {/* Luna llena detrás de la planta. */}
      <circle cx="45" cy="70" r="44" fill="url(#ps-noc-halo)" />
      <circle cx="45" cy="70" r="26" fill="url(#ps-noc-moon)" />
      <circle cx="45" cy="70" r="26" fill="none" stroke="#cbc5d2" strokeOpacity="0.16" strokeWidth="0.35" />
      {[[34, 60, 3.2], [56, 80, 4], [57, 58, 2], [37, 83, 1.6], [48, 52, 1.2], [28, 74, 1.4]].map(([x, y, rad]) => (
        <circle key={`c${x}${y}`} cx={x} cy={y} r={rad} fill="#221d2d" fillOpacity="0.55" />
      ))}
      {/* Colinas en dos capas. */}
      <path d="M0 116C18 106 33 110 48 115C63 120 77 108 90 111L90 160L0 160Z" fill="#221d2d" />
      <path d="M0 131C17 123 33 127 51 133C67 138 80 127 90 129L90 160L0 160Z" fill="#1a1724" />
      <path d="M0 116C18 106 33 110 48 115C63 120 77 108 90 111" fill="none" stroke="#4a4160" strokeOpacity="0.6" strokeWidth="0.3" />
      {/* Pasto y flores en las orillas. */}
      <Tuft x={6} y={113} h={5} color={blade} opacity={0.6} sw={0.35} lean={-4} />
      <Tuft x={13} y={110} h={3.6} color={blade} opacity={0.5} sw={0.32} lean={6} />
      <Tuft x={81} y={111} h={4.6} color={blade} opacity={0.6} sw={0.35} lean={4} />
      <Tuft x={87} y={110.5} h={3.2} color={blade} opacity={0.5} sw={0.32} />
      <Tuft x={4} y={130} h={4.2} color={blade} opacity={0.45} sw={0.32} />
      <Tuft x={86} y={128} h={4.2} color={blade} opacity={0.45} sw={0.32} lean={-6} />
      {/* Luciérnagas: luz cálida, terracota de noche. */}
      {[[12, 98, 1], [21, 88, 0.8], [77, 94, 1], [70, 106, 0.75], [84, 80, 0.85], [8, 84, 0.7]].map(([x, y, s]) => (
        <g key={`f${x}${y}`}>
          <circle cx={x} cy={y} r={3.2 * s} fill="url(#ps-noc-fly)" />
          <circle cx={x} cy={y} r={0.55 * s} fill="#eb9279" fillOpacity="0.95" />
        </g>
      ))}
    </>
  );
}

function Amanecer() {
  const leafInk: Ink = { fill: "#6c9a84", fillOpacity: 0.22, stroke: "#44695a", strokeOpacity: 0.5, sw: 0.32 };
  const cloud = "#a54833";
  return (
    <>
      <defs>
        <linearGradient id="ps-ama-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3dbd1" />
          <stop offset="0.6" stopColor="#f9ebe5" />
          <stop offset="1" stopColor="#fbf1ec" />
        </linearGradient>
        <radialGradient id="ps-ama-sun" cx="45" cy="95" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f6d2c3" />
          <stop offset="1" stopColor="#f1c3b1" />
        </radialGradient>
        <clipPath id="ps-ama-horizon">
          <rect x="0" y="0" width="90" height="95.5" />
        </clipPath>
      </defs>
      <rect width="90" height="160" fill="url(#ps-ama-sky)" />
      {/* El sol sale en la tierra de la planta; arcos de luz por encima del horizonte. */}
      <g clipPath="url(#ps-ama-horizon)">
        {[[34, 0.26, ""], [40, 0.2, "0.01 1.5"], [47, 0.16, ""], [55, 0.12, "0.01 1.8"]].map(([rad, op, dash]) => (
          <circle key={`ray${rad}`} cx="45" cy="95" r={rad as number} fill="none" stroke="#e07a64" strokeOpacity={op as number} strokeWidth="0.45" strokeDasharray={(dash as string) || undefined} strokeLinecap="round" />
        ))}
        <circle cx="45" cy="95" r="28" fill="url(#ps-ama-sun)" />
        <circle cx="45" cy="95" r="28" fill="none" stroke="#e07a64" strokeOpacity="0.35" strokeWidth="0.4" />
      </g>
      {/* Nubes de línea en los bordes. */}
      <path d="M-2 26C2 21 7 21 9 24C11 20 17 20 18 25C21 24 23 27 21 29L-2 29" fill="#fbf1ec" fillOpacity="0.85" stroke={cloud} strokeOpacity="0.22" strokeWidth="0.35" strokeLinejoin="round" />
      <path d="M92 44C88 39 83 39 81 42C79 38 73 38 72 43C69 42 67 45 69 47L92 47" fill="#fbf1ec" fillOpacity="0.85" stroke={cloud} strokeOpacity="0.22" strokeWidth="0.35" strokeLinejoin="round" />
      {/* Colinas: la de atrás en el horizonte; la de delante, bruma clara bajo el texto. */}
      <path d="M0 99C16 93 30 95 45 97C60 99 74 92 90 96L90 160L0 160Z" fill="#f3dcd1" />
      <path d="M0 99C16 93 30 95 45 97C60 99 74 92 90 96" fill="none" stroke="#e07a64" strokeOpacity="0.3" strokeWidth="0.35" />
      <path d="M0 121C20 113 40 117 56 123C70 128 82 119 90 120L90 160L0 160Z" fill="#f8e9e2" />
      {/* Flores silvestres y pasto en las esquinas. */}
      <Wildflower x={5} y={160} h={20} lean={2} stem="#44695a" bud="#e07a64" leafInk={leafInk} sw={0.35} />
      <Wildflower x={11} y={161} h={14} lean={-2} stem="#44695a" bud="#a54833" leafInk={leafInk} sw={0.33} />
      <Wildflower x={84} y={160} h={19} lean={-2} stem="#44695a" bud="#e07a64" leafInk={leafInk} sw={0.35} />
      <Tuft x={78} y={160} h={6} color="#44695a" opacity={0.45} sw={0.32} lean={-4} />
      <Tuft x={17} y={160} h={5} color="#44695a" opacity={0.45} sw={0.32} lean={4} />
      <Tuft x={7} y={98} h={3.4} color="#44695a" opacity={0.4} sw={0.3} />
      <Tuft x={83} y={97} h={3.4} color="#44695a" opacity={0.4} sw={0.3} lean={-4} />
    </>
  );
}

function Limpio() {
  const pressed: Ink = { fill: "#6c9a84", fillOpacity: 0.1, stroke: "#5c554d", strokeOpacity: 0.5, sw: 0.32 };
  const wreathInk: Ink = { fill: "#6c9a84", fillOpacity: 0.12, stroke: "#44695a", strokeOpacity: 0.5, sw: 0.32 };
  // Corona abierta arriba: dos ramas que suben desde la tierra de la planta.
  const wreath: ReactNode[] = [];
  const R = 33;
  for (const side of [1, -1] as const) {
    for (let i = 0; i < 9; i++) {
      const a = ((100 - i * 17) * Math.PI) / 180; // de abajo (90°) hacia arriba
      const ang = side === 1 ? a : Math.PI - a;
      const x = 45 + R * Math.cos(ang);
      const y = 72 + R * Math.sin(ang);
      const tangent = (ang * 180) / Math.PI + (side === 1 ? -90 : 90);
      wreath.push(<Leaf key={`w${side}${i}`} x={x} y={y} len={4.6 - i * 0.18} rot={tangent + (i % 2 === 0 ? 34 : -34) * side} ink={wreathInk} wide={0.36} rib={false} />);
    }
  }
  const tape = (x: number, y: number, rot: number) => (
    <rect x={-4} y={-1.3} width={8} height={2.6} rx={0.3} transform={`translate(${x} ${y}) rotate(${rot})`} fill="#f3efe7" fillOpacity="0.92" stroke="#d8d0c1" strokeWidth="0.2" />
  );
  return (
    <>
      <defs>
        <pattern id="ps-lim-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M5 0L0 0L0 5" fill="none" stroke="#e8e2d7" strokeWidth="0.18" />
        </pattern>
      </defs>
      <rect width="90" height="160" fill="#faf9f5" />
      <rect width="90" height="160" fill="url(#ps-lim-grid)" opacity="0.8" />
      {/* Doble filete de lámina de herbario. */}
      <rect x="3" y="3" width="84" height="154" rx="3.5" fill="none" stroke="#d8d0c1" strokeWidth="0.45" />
      <rect x="4.7" y="4.7" width="80.6" height="150.6" rx="2.2" fill="none" stroke="#d8d0c1" strokeWidth="0.2" />
      {/* Corona alrededor de la planta. */}
      {/* Rama derecha: de abajo (100°) por la derecha hasta arriba (−36°), ángulo decreciente → sweep 0.
          Rama izquierda: de abajo (80°) por la izquierda hasta 216°, ángulo creciente → sweep 1. */}
      <path d={`M${r(45 + R * Math.cos((100 * Math.PI) / 180))} ${r(72 + R * Math.sin((100 * Math.PI) / 180))}A${R} ${R} 0 0 0 ${r(45 + R * Math.cos((-36 * Math.PI) / 180))} ${r(72 + R * Math.sin((-36 * Math.PI) / 180))}`} fill="none" stroke="#44695a" strokeOpacity="0.35" strokeWidth="0.3" />
      <path d={`M${r(45 + R * Math.cos((80 * Math.PI) / 180))} ${r(72 + R * Math.sin((80 * Math.PI) / 180))}A${R} ${R} 0 0 1 ${r(45 + R * Math.cos((216 * Math.PI) / 180))} ${r(72 + R * Math.sin((216 * Math.PI) / 180))}`} fill="none" stroke="#44695a" strokeOpacity="0.35" strokeWidth="0.3" />
      {wreath}
      {/* Ramitas prensadas, sujetas con cinta, a los lados. */}
      <Frond p0={[6, 100]} c={[5, 80]} p1={[10, 60]} count={6} leafLen={6} ink={pressed} spread={50} />
      {tape(7, 92, -18)}
      <Frond p0={[84, 64]} c={[86, 84]} p1={[81, 104]} count={6} leafLen={6} ink={pressed} spread={50} />
      {tape(83, 72, 14)}
    </>
  );
}

const SCENES: Record<StoryStyleId, () => ReactNode> = { botanico: Botanico, nocturno: Nocturno, amanecer: Amanecer, limpio: Limpio };

export function StoryBackdrop({ styleId, className = "" }: { styleId: StoryStyleId; className?: string }) {
  const Scene = SCENES[styleId];
  return (
    <svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={className}>
      <Scene />
    </svg>
  );
}
