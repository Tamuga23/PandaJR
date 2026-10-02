/**
 * Herramientas de «Juntos»: nombres, a qué lleva cada misión de la Guía y qué toca esta semana.
 * Puro (sin React ni Firebase): lo usan la Guía (botón bajo la misión) y el índice de «Juntos».
 */

export type ToolId = "sos" | "contracciones" | "patadas" | "maleta" | "parto" | "nombres" | "presupuesto" | "diario" | "reproductor" | "story";

/** Destino de un enlace desde la Guía: una herramienta o la pestaña Agenda. */
export type GuiaLinkTarget = ToolId | "agenda";

export const TOOL_LABEL: Record<ToolId, string> = {
  sos: "SOS Síntomas",
  contracciones: "Contracciones",
  patadas: "Patadas",
  maleta: "Maleta",
  parto: "Plan de parto",
  nombres: "Nombres",
  presupuesto: "Presupuesto",
  diario: "Diario",
  reproductor: "Panda Audio",
  story: "PandaStory",
};

/** Texto del botón que abre cada destino desde la misión («Abrir el Presupuesto»…). */
export const LINK_LABEL: Record<GuiaLinkTarget, string> = {
  sos: "Abrir SOS Síntomas",
  contracciones: "Abrir el contador de contracciones",
  patadas: "Abrir el contador de patadas",
  maleta: "Abrir la Maleta",
  parto: "Abrir el Plan de parto",
  nombres: "Abrir Nombres",
  presupuesto: "Abrir el Presupuesto",
  diario: "Abrir el Diario",
  reproductor: "Abrir Panda Audio",
  story: "Abrir PandaStory",
  agenda: "Abrir la Agenda",
};

/**
 * Menciones EXPLÍCITAS de una herramienta en el texto de la misión (no palabras sueltas): «recordatorio
 * diario» no es el Diario y «menos movimientos» no es el contador de patadas. Revisado contra las 42
 * semanas × 2 roles de weeks.ts. Si hay varias, gana la que aparece antes en el texto.
 */
const MISSION_LINKS: readonly (readonly [GuiaLinkTarget, RegExp])[] = [
  ["presupuesto", /\bPresupuesto\b/],
  ["nombres", /\ben Nombres\b/],
  ["diario", /\bDiario\b/],
  ["parto", /\bplan de parto\b/i],
  ["maleta", /\bmaleta\b/i],
  ["patadas", /contador de patadas|conteo de patadas|contando movimientos|cuenta movimientos/i],
  ["contracciones", /contador de contracciones|cronometra las contracciones|llevas el cronómetro|regla 5-1-1/i],
  ["agenda", /\b(?:en|a) la Agenda\b/],
];

export function missionLink(text: string | undefined | null): GuiaLinkTarget | null {
  if (!text) return null;
  let best: { target: GuiaLinkTarget; at: number } | null = null;
  for (const [target, re] of MISSION_LINKS) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.at)) best = { target, at: m.index };
  }
  return best?.target ?? null;
}

/**
 * Lo que toca esta semana (2–3 herramientas). La herramienta que pide la misión de quien lee va primero;
 * luego, según la semana: los nombres y el presupuesto al principio, patadas desde la 28, maleta y plan
 * de parto de la 32 a la 35, contracciones desde la 36. Sin semana conocida: lo que se usa en pareja.
 */
export function weekTools(week: number | undefined, missionText?: string | null): ToolId[] {
  const base: ToolId[] =
    week === undefined
      ? ["nombres", "presupuesto", "diario"]
      : week >= 36
        ? ["contracciones", "maleta", "parto"]
        : week >= 32
          ? ["maleta", "parto", "patadas"]
          : week >= 28
            ? ["patadas", "nombres", "parto"]
            : week >= 4
              ? ["nombres", "presupuesto", "story"]
              : ["nombres", "presupuesto", "diario"];
  const fromMission = missionLink(missionText);
  const first: ToolId[] = fromMission && fromMission !== "agenda" && fromMission !== "sos" ? [fromMission] : [];
  return [...first, ...base.filter((t) => !first.includes(t))].slice(0, 3);
}
