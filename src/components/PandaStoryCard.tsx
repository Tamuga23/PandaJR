/**
 * PandaStoryCard — la tarjeta de PandaStory para historias (1080×1920): la tira de crecimiento.
 *
 * Una serie de la misma planta de la app, semana tras semana sobre una sola línea de tierra que cruza la tarjeta de
 * borde a borde; las semanas que faltan esperan en fantasma (dibujo típico de esa semana, sin medidas: «todavía no»).
 * Tres composiciones, cada una con su suelo: «La semana» (sage-wash), «Con foto» (alabastro: la tira termina en su
 * foto, que ocupa el lugar de hoy) y «Cuenta regresiva» (obsidiana).
 *
 * Se maqueta a tamaño real y la vista previa la muestra a escala desde un ancestro (la exportación lee el nodo sin
 * escalar: el PNG es lo que la pareja aprobó). Cada composición fija sus tokens en la raíz, así que la tarjeta se ve
 * igual con la app en claro o en oscuro. Tipografía en cqw: el contenedor es la tarjeta y cqw se mide sobre su caja de
 * contenido (1080 − 2×86 = 908 px), así que 1cqw = 9.08 px. La tira, en px de la tarjeta.
 *
 * Franjas que tapa Instagram: sin texto arriba de 270 px ni debajo de 1580 px (solo ilustración).
 */
import type { CSSProperties, Ref } from "react";
import { ImagePlus } from "lucide-react";
import { GrowingPlant } from "@/components/GrowingPlant";
import { PANDA_MARK_SRC } from "@/components/PandaMark";
import { StoryBackdrop } from "@/components/StoryBackdrop";
import {
  countdownText,
  countdownWeeks,
  measuresPhrase,
  photoStripWeeks,
  plantReach,
  sizePhrase,
  storyWindow,
  type StoryComposition,
  type StoryCountdown,
  type StoryPerson,
} from "@/lib/story";

export const STORY_W = 1080;
export const STORY_H = 1920;

/** Tokens de cada composición (valores canónicos de DESIGN.md). Texto ≥4.5:1 sobre su suelo; números futuros ≥3:1 (≥50 px). */
const PALETTES: Record<StoryComposition, Record<string, string>> = {
  semana: {
    "--ground": "#e5eee8",
    "--ink": "#2d2a26",
    "--ink-muted": "#5c554d",
    "--story-subtle": "#6f8077",
    "--story-accent": "#a54833",
    "--story-rule": "rgb(68 105 90 / 0.3)",
    "--sage-ink": "#44695a",
    "--sage": "#6c9a84",
    "--terracotta": "#e07a64",
    "--terracotta-ink": "#a54833",
    "--chip-mama": "#a54833",
    "--chip-papa": "#44695a",
    "--chip-text": "#fffefb",
    "--ghost-sage-ink": "#a7bfb2",
    "--ghost-sage": "#d0dfd6",
    "--ghost-terracotta": "#efc1b4",
    "--ghost-terracotta-ink": "#dba595",
  },
  foto: {
    "--ground": "#faf9f5",
    "--ink": "#2d2a26",
    "--ink-muted": "#5c554d",
    "--story-subtle": "#7d756b",
    "--story-accent": "#a54833",
    "--story-rule": "#d8d0c1",
    "--sage-ink": "#44695a",
    "--sage": "#6c9a84",
    "--terracotta": "#e07a64",
    "--terracotta-ink": "#a54833",
    "--chip-mama": "#a54833",
    "--chip-papa": "#44695a",
    "--chip-text": "#fffefb",
    "--ghost-sage-ink": "#b9c4bc",
    "--ghost-sage": "#e2e8e3",
    "--ghost-terracotta": "#f1cfc4",
    "--ghost-terracotta-ink": "#dfb6a8",
  },
  cuenta: {
    "--ground": "#181520",
    "--ink": "#eae6e1",
    "--ink-muted": "#cbc5d2",
    "--story-subtle": "#968ea7",
    "--story-accent": "#eb9279",
    "--story-rule": "rgb(234 230 225 / 0.22)",
    "--sage-ink": "#89bca0",
    "--sage": "#619b7e",
    "--terracotta": "#d16e5a",
    "--terracotta-ink": "#eb9279",
    "--chip-mama": "#eb9279",
    "--chip-papa": "#89bca0",
    "--chip-text": "#181520",
    "--ghost-sage-ink": "#5f5777",
    "--ghost-sage": "#2e2840",
    "--ghost-terracotta": "#5e4856",
    "--ghost-terracotta-ink": "#7c5d68",
    // El azul carbón de la mascota se perdería en la noche: un halo fino en tinta clara la recorta.
    "--story-mark-filter": "drop-shadow(0 0 0.35cqw rgb(234 230 225 / 0.6))",
  },
};

/** Las semanas que faltan: la planta típica de esa semana en el tono fantasma de la composición. */
const GHOST_VARS = {
  "--sage-ink": "var(--ghost-sage-ink)",
  "--sage": "var(--ghost-sage)",
  "--terracotta": "var(--ghost-terracotta)",
  "--terracotta-ink": "var(--ghost-terracotta-ink)",
} as CSSProperties;

export type StoryCardModel = {
  composition: StoryComposition;
  /** Semana confirmada (4–42). */
  week: number;
  /** Nombres a mostrar (ya filtrados por el interruptor): null = sin nombres. */
  couple: { line: string; people: StoryPerson[] } | null;
  size: { label: string; length: string; weight: string };
  countdown: StoryCountdown;
  /** Foto ya recortada en cuadrado (data:). */
  photo: string | null;
  /** «4 de noviembre de 2026»: la cuenta regresiva dice cuándo era verdad. */
  dateText: string;
};

/** Primera letra (también si empieza con un carácter compuesto). */
function initialOf(name: string): string {
  return (Array.from(name.trim())[0] ?? "").toLocaleUpperCase("es");
}

/** Las iniciales de la pareja (como en la app: mamá terracota, papá salvia) y sus nombres. */
function CoupleNames({ couple }: { couple: { line: string; people: StoryPerson[] } }) {
  return (
    <div className="flex flex-col items-center gap-[2cqw]">
      <div className="flex items-center" aria-hidden="true">
        {couple.people.map((p, i) => (
          <span key={`${p.role}${i}`} className={`block rounded-[1.2cqw] bg-[var(--ground)] p-[0.6cqw] ${i > 0 ? "-ms-[1.8cqw]" : ""}`}>
            <span
              className="grid size-[8.4cqw] place-items-center rounded-[0.8cqw] font-display text-[4.8cqw] font-bold leading-none"
              style={{ background: p.role === "mama" ? "var(--chip-mama)" : "var(--chip-papa)", color: "var(--chip-text)" }}
            >
              {initialOf(p.name ?? "")}
            </span>
          </span>
        ))}
      </div>
      <p className={`font-display font-bold leading-[1.1] text-balance text-ink ${couple.line.length > 22 ? "text-[5.4cqw]" : "text-[6.6cqw]"}`}>
        {couple.line}
      </p>
    </div>
  );
}

/* ---------------------------------- La tira ---------------------------------- */

/** px de la tarjeta por unidad de GrowingPlant (viewBox de 120): cinco plantas de 58 unidades caben de borde a borde. */
const PLANT_PX = 4.1;
const PLANT_BOX = 120 * PLANT_PX;
/** De tallo a tallo. */
const STEP = 200;
/** Lo que se abren las hojas a cada lado del tallo (medido: x 34.1–91.7 con el tallo en 60). */
const LEAVES_LEFT = 26 * PLANT_PX;
const LEAVES_RIGHT = 32 * PLANT_PX;
/** `size` de GrowingPlant: su trazo mide 1.5 px a ese tamaño, así que aquí ≈6.5 px, el mismo de la tierra. */
const PLANT_SIZE = 114;
const STROKE = ((1.5 * 120) / PLANT_SIZE) * PLANT_PX;
/** El montículo bajo cada planta: la tierra de GrowingPlant, más baja, para que la línea sea una sola. */
const RISE = 14;
/** «Con foto»: la foto, cuadrada, ocupa el lugar de hoy al final de la tira (con aire parejo a los dos lados). */
const PHOTO = 460;
const PHOTO_GAP = 24;
const NUMBER_GAP = 30;
const NUMBER_PX = 52;

type Slot = { week: number; photo: boolean; cx: number; x0: number; x1: number };

/** Las plantas (y la foto, al final) centradas por lo que de verdad ocupan: las hojas no se salen de la tarjeta. */
function stripSlots(weeks: number[], today: number, withPhoto: boolean): Slot[] {
  const n = weeks.length;
  const plantsW = n === 0 ? 0 : LEAVES_LEFT + (n - 1) * STEP + LEAVES_RIGHT + (withPhoto ? PHOTO_GAP : 0);
  const left = (STORY_W - plantsW - (withPhoto ? PHOTO : 0)) / 2;
  const slots: Slot[] = weeks.map((week, i) => {
    const cx = left + LEAVES_LEFT + i * STEP;
    return { week, photo: false, cx, x0: cx - STEP / 2, x1: cx + STEP / 2 };
  });
  if (withPhoto) {
    const x0 = left + plantsW;
    slots.push({ week: today, photo: true, cx: x0 + PHOTO / 2, x0, x1: x0 + PHOTO });
  }
  return slots;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** La línea de tierra de `from` a `to`: plana, con un montículo bajo cada planta de ese tramo. */
function groundD(slots: Slot[], from: number, to: number, base: number): string {
  let d = `M${r1(from)} ${r1(base)}`;
  for (const s of slots) {
    if (s.photo) continue;
    d += ` L${r1(s.x0)} ${r1(base)} Q${r1(s.cx)} ${r1(base - 2 * RISE)} ${r1(s.x1)} ${r1(base)}`;
  }
  return `${d} L${r1(to)} ${r1(base)}`;
}

/**
 * La tira: plantas del mismo tamaño (la altura se lee como crecimiento) sobre una sola línea de tierra de borde a
 * borde, y debajo el número de cada semana. Hoy lleva el número en el acento; lo que falta (planta, tierra y número)
 * va en fantasma. En «Con foto» la tira termina en su foto, de pie sobre la tierra en el lugar de hoy.
 */
function Strip({ weeks, today, photo }: { weeks: number[]; today: number; photo?: { src: string | null } }) {
  const withPhoto = photo !== undefined;
  const slots = stripSlots(weeks, today, withPhoto);
  const reach = Math.max(0, ...weeks.map((w) => (plantReach(w) + 2) * PLANT_PX));
  // Sobre la cima de los montículos: la planta más alta o la foto (que se apoya en la línea plana).
  const above = Math.max(reach, withPhoto ? PHOTO + STROKE / 2 - RISE : 0);
  const soilY = Math.round(above);
  const base = soilY + RISE;
  const numberTop = base + NUMBER_GAP;
  const height = numberTop + NUMBER_PX;
  // Lo de hoy y antes, en tinta; lo que falta, en fantasma (la línea sigue hasta el borde: el camino continúa).
  const todayEnd = slots.find((s) => s.week === today)?.x1 ?? slots.filter((s) => s.week < today).at(-1)?.x1 ?? 0;
  const past = slots.filter((s) => s.week <= today);
  const future = slots.filter((s) => s.week > today);
  const grain = (s: Slot) => {
    const w = s.x1 - s.x0;
    const y = base - RISE * 0.55;
    return `M${r1(s.x0 + w * 0.31)} ${r1(y)} h${r1(w * 0.045)} M${r1(s.x0 + w * 0.62)} ${r1(y + RISE * 0.1)} h${r1(w * 0.065)}`;
  };
  return (
    <div className="relative shrink-0" style={{ width: STORY_W, height }}>
      <svg aria-hidden="true" focusable="false" className="absolute left-0 top-0" width={STORY_W} height={height} viewBox={`0 0 ${STORY_W} ${height}`}>
        {slots
          .filter((s) => !s.photo)
          .map((s) => (
            <path
              key={`suelo-${s.week}`}
              d={`M${r1(s.x0)} ${r1(base)} Q${r1(s.cx)} ${r1(base - 2 * RISE)} ${r1(s.x1)} ${r1(base)} Z`}
              fill={s.week > today ? "var(--ghost-sage)" : "var(--sage)"}
              fillOpacity={0.14}
            />
          ))}
        <path d={groundD(future, todayEnd, STORY_W, base)} fill="none" stroke="var(--ghost-sage-ink)" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
        <path d={groundD(past, 0, todayEnd, base)} fill="none" stroke="var(--sage-ink)" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
        {slots
          .filter((s) => !s.photo)
          .map((s) => (
            <path key={`grano-${s.week}`} d={grain(s)} fill="none" stroke={s.week > today ? "var(--ghost-sage-ink)" : "var(--sage-ink)"} strokeOpacity={0.45} strokeWidth={STROKE} strokeLinecap="round" />
          ))}
      </svg>

      {slots.map((s) =>
        s.photo ? (
          // Contenedores redondeados con la foto (ya cuadrada) dentro: sin object-fit ni box-shadow, que WebKit pinta
          // mal al exportar. El filete es un relleno. De pie sobre la tierra: su borde de abajo toca la línea.
          <div key="foto" data-story-plant className="absolute" style={{ left: s.x0, top: base - STROKE / 2 - PHOTO, width: PHOTO, height: PHOTO }}>
            <span className="block h-full w-full rounded-[3.6cqw] bg-[var(--story-rule)] p-[0.4cqw]">
              <span className="grid h-full w-full place-items-center overflow-hidden rounded-[3.2cqw] bg-[var(--ground)]">
                {photo?.src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- foto local del usuario (data:) para exportar
                  <img src={photo.src} alt="Foto elegida para la tarjeta" className="block h-full w-full" />
                ) : (
                  // Solo en la vista previa: sin foto la tarjeta no se exporta, y el marco vacío no parece un error.
                  <ImagePlus aria-hidden="true" strokeWidth={1.25} className="size-[11cqw] text-[var(--story-subtle)]" />
                )}
              </span>
            </span>
          </div>
        ) : (
          <div
            key={s.week}
            data-story-plant
            className="absolute"
            style={{ left: s.cx - PLANT_BOX / 2, top: soilY - 100 * PLANT_PX, width: PLANT_BOX, height: PLANT_BOX, ...(s.week > today ? GHOST_VARS : null) }}
          >
            <GrowingPlant week={s.week} size={PLANT_SIZE} soil={false} animate={false} title="" className="block h-full w-full" />
          </div>
        )
      )}

      {slots.map((s) => (
        <span
          key={`n${s.week}${s.photo ? "f" : ""}`}
          className={`absolute block text-center font-sans leading-none tabular-nums ${
            s.week === today ? "font-bold text-[var(--story-accent)]" : s.week > today ? "font-medium text-[var(--story-subtle)]" : "font-medium text-ink-muted"
          }`}
          style={{ left: s.cx - 80, width: 160, top: numberTop, fontSize: NUMBER_PX }}
        >
          {s.week}
        </span>
      ))}
    </div>
  );
}

/** La firma de la app: la mascota (el logo tal cual) y el wordmark, pequeños, dentro de la zona segura. */
function Signature() {
  return (
    <div className="flex items-center justify-center gap-[1.8cqw]">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo de public/: html-to-image lo incrusta en el PNG */}
      <img src={PANDA_MARK_SRC} alt="" aria-hidden="true" draggable={false} className="h-[7.4cqw] w-auto [filter:var(--story-mark-filter,none)]" />
      <p className="font-display text-[5.6cqw] font-extrabold leading-none tracking-[-0.01em] text-ink">
        Panda<span className="text-[var(--story-accent)]">Jr</span>
      </p>
    </div>
  );
}

function WeekTitle({ week, sizeCqw }: { week: number; sizeCqw: number }) {
  return (
    <p className="font-display font-bold leading-none text-ink" style={{ fontSize: `${sizeCqw}cqw` }}>
      Semana <span className="text-[var(--story-accent)]">{week}</span>
    </p>
  );
}

export function PandaStoryCard({ model, ref }: { model: StoryCardModel; ref?: Ref<HTMLDivElement> }) {
  const { composition, week, couple, size, countdown, photo, dateText } = model;
  return (
    <div
      ref={ref}
      style={PALETTES[composition] as CSSProperties}
      // El relleno de la raíz va en px: los cqw de un contenedor se miden contra su ancestro, no contra sí mismo.
      // 290 / 360 px dejan el texto entre las franjas que tapa Instagram (0–270 y 1580–1920).
      className="@container relative isolate flex h-[1920px] w-[1080px] flex-col items-center justify-between overflow-hidden bg-ground px-[86px] pb-[360px] pt-[290px] text-center text-ink"
    >
      <StoryBackdrop styleId={composition} className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />

      {couple ? <CoupleNames couple={couple} /> : <span aria-hidden="true" />}

      {composition === "semana" && (
        <>
          <WeekTitle week={week} sizeCqw={12.5} />
          <Strip weeks={storyWindow(week)} today={week} />
          {/* Las medidas primero (de referencia: «en promedio»); la comparación, una frase debajo. 820 px de ancho
              como máximo: la frase más larga («…con reposamuñecas») se parte en dos y no pisa las frondas de los lados. */}
          <div className="flex max-w-[820px] flex-col items-center">
            <p className="font-display text-[6.4cqw] font-bold leading-[1.15] text-balance text-ink tabular-nums">{measuresPhrase(size.length, size.weight)}</p>
            <p className="mt-[1.4cqw] font-sans text-[4.6cqw] font-medium leading-snug text-balance text-ink-muted">{sizePhrase(size.label).text}</p>
          </div>
        </>
      )}

      {composition === "foto" && (
        <>
          <WeekTitle week={week} sizeCqw={12.5} />
          <Strip weeks={photoStripWeeks(week)} today={week} photo={{ src: photo }} />
        </>
      )}

      {composition === "cuenta" && (
        <>
          {countdown.kind === "dias" ? (
            // Una sola frase, en tinta: la terracota es solo de la semana de hoy.
            <p className="font-display text-[8cqw] font-bold leading-[1.12] text-balance text-ink">
              <span className="block tabular-nums">
                {countdownText(countdown).lead} {countdownText(countdown).number}
              </span>{" "}
              <span className="block">para la fecha probable</span>
            </p>
          ) : countdown.kind === "hoy" ? (
            <p className="font-display text-[8cqw] font-bold leading-[1.12] text-balance text-ink">Hoy es la fecha probable</p>
          ) : (
            // Sin fecha probable de verdad no hay cuenta (el generador no ofrece esta composición entonces).
            <span aria-hidden="true" />
          )}
          <Strip weeks={countdownWeeks(week)} today={week} />
          <div className="flex flex-col items-center">
            <WeekTitle week={week} sizeCqw={6.6} />
            <p className="mt-[2.2cqw] font-sans text-[4.2cqw] font-medium leading-none text-ink-muted">{dateText}</p>
          </div>
        </>
      )}

      <Signature />
    </div>
  );
}
