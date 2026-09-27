// Adaptador con la forma antigua de getWeekData. La fuente única de las semanas es src/lib/weeks.ts:
// el código nuevo debe usar getWeek() y los formateadores de allí.
import { formatLength, formatWeight, getWeek, sizeEmoji } from "@/lib/weeks";

export type LegacyWeekData = {
  /** Objeto de comparación; con `withEmoji` lleva al final un emoji ilustrativo (PandaStory lo separa). */
  size: string;
  length: string;
  weight: string;
  milestone: string;
  momMission: string;
  dadMission: string;
};

/**
 * @deprecated Usa `getWeek` de "@/lib/weeks". Datos EXACTOS de la semana pedida (acotada a 1..42),
 * ya no los de la semana anterior más cercana.
 */
export function getWeekData(
  week: number,
  theme: "frutas" | "geek" = "frutas",
  opts: { withEmoji?: boolean } = {}
): LegacyWeekData {
  const w = getWeek(week);
  const label = theme === "geek" ? w.size.geek : w.size.fruta;
  const emoji = opts.withEmoji === false ? "" : sizeEmoji(w.week, theme);
  return {
    size: emoji ? `${label} ${emoji}` : label,
    length: formatLength(w),
    weight: formatWeight(w),
    milestone: w.milestone,
    momMission: w.forMom,
    dadMission: w.forDad,
  };
}
