/**
 * StoryBackdrop — el fondo ilustrado de la tarjeta de PandaStory (la tira de crecimiento).
 *
 * Tres escenas, una por composición, con el vocabulario de GrowingPlant (trazo fino de sage-ink, rellenos
 * tenues, terracota solo de acento) y los valores canónicos de DESIGN.md:
 *   semana  invernadero: luz suave detrás de la tira, frondas que suben por los bordes
 *   foto    alabastro liso (la foto manda) y dos ramitas prensadas en las franjas
 *   cuenta  noche: estrellas en puntos y Casiopea arriba, un halo lavanda detrás de la tira y colinas abajo
 *
 * Lienzo de 90×160 (la tarjeta es 9:16; 1 unidad = 12 px a 1080×1920). Lo que tapa Instagram —arriba hasta
 * y≈22.5 (270 px) y abajo desde y≈131.7 (1580 px)— solo lleva ilustración; la columna del texto (x≈7–83)
 * queda limpia entre y≈24 y y≈130. La tira cruza de borde a borde con su línea de tierra entre y≈90 («La semana»)
 * y y≈109 («Con foto»); la luz y el halo se centran en ella.
 *
 * SVG determinista y en línea (sin imágenes externas): html-to-image lo exporta tal cual al PNG.
 * Decorativo: aria-hidden.
 */
import type { ReactNode } from "react";

export type StoryStyleId = "semana" | "foto" | "cuenta";

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

/* --------------------------------- Escenas --------------------------------- */

/** «La semana»: invernadero. Luz detrás de la tira; frondas por los bordes, fuera de la columna del texto. */
function Semana() {
  const frond: Ink = { fill: "#6c9a84", fillOpacity: 0.2, stroke: "#44695a", strokeOpacity: 0.5, sw: 0.4 };
  const soft: Ink = { fill: "#6c9a84", fillOpacity: 0.14, stroke: "#44695a", strokeOpacity: 0.38, sw: 0.36 };
  return (
    <>
      <defs>
        <linearGradient id="ps-sem-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#edf3ef" />
          <stop offset="1" stopColor="#dce8e0" />
        </linearGradient>
        <radialGradient id="ps-sem-glow" cx="45" cy="79" r="44" gradientTransform="matrix(1 0 0 0.62 0 30.02)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f8fbf9" stopOpacity="1" />
          <stop offset="0.65" stopColor="#f3f7f4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f3f7f4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="90" height="160" fill="url(#ps-sem-bg)" />
      <rect width="90" height="160" fill="url(#ps-sem-glow)" />
      {/* Frondas que suben desde la franja de abajo por los bordes. */}
      <Frond p0={[-4, 166]} c={[2, 136]} p1={[6, 104]} count={9} leafLen={8.5} ink={frond} paired spread={58} />
      <Frond p0={[94, 166]} c={[88, 138]} p1={[84, 108]} count={8} leafLen={8} ink={frond} paired spread={58} />
      {[[-3, 163, -58, 14], [-2, 163, -34, 12]].map(([x, y, rot, len]) => (
        <Leaf key={`bl${rot}`} x={x} y={y} len={len} rot={rot} ink={soft} wide={0.34} />
      ))}
      {[[93, 163, -122, 14], [92, 163, -146, 12]].map(([x, y, rot, len]) => (
        <Leaf key={`br${rot}`} x={x} y={y} len={len} rot={rot} ink={soft} wide={0.34} />
      ))}
      {/* Ramitas en la franja de arriba. */}
      <Frond p0={[-2, 2]} c={[8, 5]} p1={[16, 16]} count={5} leafLen={5.2} ink={soft} spread={60} />
      <Frond p0={[92, 3]} c={[82, 6]} p1={[74, 17]} count={5} leafLen={5.2} ink={soft} spread={60} />
      {/* Semillas sueltas en los márgenes. */}
      {[[4, 44, 0.5], [86, 40, 0.5], [3, 92, 0.45], [87, 88, 0.45], [12, 22, 0.35], [78, 24, 0.35]].map(([x, y, rad]) => (
        <ellipse key={`s${x}${y}`} cx={x} cy={y} rx={rad} ry={rad * 0.7} fill="#44695a" fillOpacity="0.3" />
      ))}
    </>
  );
}

/** «Con foto»: alabastro liso (la foto es la protagonista) con dos ramitas prensadas en las franjas. */
function Foto() {
  const pressed: Ink = { fill: "#6c9a84", fillOpacity: 0.12, stroke: "#5c554d", strokeOpacity: 0.45, sw: 0.3 };
  return (
    <>
      <rect width="90" height="160" fill="#faf9f5" />
      <Frond p0={[9, 19]} c={[16, 11]} p1={[27, 9]} count={6} leafLen={4.6} ink={pressed} spread={52} />
      <Frond p0={[81, 141]} c={[74, 149]} p1={[63, 151]} count={6} leafLen={4.6} ink={pressed} spread={52} />
    </>
  );
}

type Star = readonly [x: number, y: number, size: number, opacity: number];

/** Casiopea: la «W» del cielo del norte, entera dentro de la franja de arriba (la une un punteado tenue). */
const CASSIOPEIA: readonly Star[] = [[63, 10, 0.45, 0.6], [68.5, 15.5, 0.5, 0.65], [74, 11, 0.55, 0.7], [79.5, 16.5, 0.45, 0.6], [85, 8.5, 1, 0.8]];

const NIGHT_STARS: readonly Star[] = [
  [8, 8, 1.3, 0.85], [20, 4, 0.5, 0.6], [5, 21, 0.45, 0.55], [52, 5, 0.6, 0.7], [36, 10, 0.35, 0.45],
  [28, 18, 0.35, 0.4], [55, 20, 0.3, 0.4], ...CASSIOPEIA,
  [3, 52, 0.4, 0.45], [87, 48, 0.9, 0.6], [4, 104, 0.4, 0.45], [86, 98, 0.35, 0.45],
];

/** «Cuenta regresiva»: noche. Estrellas arriba, halo lavanda detrás de la tira, colinas en la franja de abajo. */
function Cuenta() {
  const blade = "#619b7e";
  return (
    <>
      <defs>
        <linearGradient id="ps-cue-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#100d16" />
          <stop offset="0.55" stopColor="#181520" />
          <stop offset="1" stopColor="#1d1827" />
        </linearGradient>
        <radialGradient id="ps-cue-halo" cx="45" cy="83" r="46" gradientTransform="matrix(1 0 0 0.6 0 33.2)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a4160" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#3a334b" stopOpacity="0.2" />
          <stop offset="1" stopColor="#3a334b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="90" height="160" fill="url(#ps-cue-bg)" />
      {/* Estrellas como puntos (las brillantes, algo más grandes y claras): nada de destellos de cuatro puntas. */}
      {NIGHT_STARS.map(([x, y, s, o]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={s >= 0.8 ? s * 0.42 : s * 0.6} fill={s >= 0.8 ? "#eae6e1" : "#cbc5d2"} fillOpacity={o} />
      ))}
      <path d={`M${CASSIOPEIA.map(([x, y]) => `${x} ${y}`).join("L")}`} fill="none" stroke="#cbc5d2" strokeOpacity="0.16" strokeWidth="0.25" strokeDasharray="0.8 0.9" />
      <rect width="90" height="160" fill="url(#ps-cue-halo)" />
      {/* Colinas en la franja de abajo. */}
      <path d="M0 136C18 129 33 132 48 136C63 140 77 131 90 133L90 160L0 160Z" fill="#221d2d" />
      <path d="M0 147C17 141 33 144 51 148C67 152 80 144 90 146L90 160L0 160Z" fill="#1a1724" />
      <path d="M0 136C18 129 33 132 48 136C63 140 77 131 90 133" fill="none" stroke="#4a4160" strokeOpacity="0.6" strokeWidth="0.3" />
      <Tuft x={6} y={134} h={4.6} color={blade} opacity={0.55} sw={0.34} lean={-4} />
      <Tuft x={14} y={131.5} h={3.4} color={blade} opacity={0.45} sw={0.3} lean={6} />
      <Tuft x={80} y={132.5} h={4.4} color={blade} opacity={0.55} sw={0.34} lean={4} />
      <Tuft x={87} y={132} h={3} color={blade} opacity={0.45} sw={0.3} />
    </>
  );
}

const SCENES: Record<StoryStyleId, () => ReactNode> = { semana: Semana, foto: Foto, cuenta: Cuenta };

export function StoryBackdrop({ styleId, className = "" }: { styleId: StoryStyleId; className?: string }) {
  const Scene = SCENES[styleId];
  return (
    <svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={className}>
      <Scene />
    </svg>
  );
}
