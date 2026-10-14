/**
 * Herramientas de «Juntos»: nombres, a qué lleva cada misión de la Guía y qué toca esta semana.
 * Puro (sin React ni Firebase): lo usan la Guía (botón bajo la misión) y el índice de «Juntos».
 */

export type ToolId =
  | "sos"
  | "contracciones"
  | "patadas"
  | "maleta"
  | "parto"
  | "modoparto"
  | "nombres"
  | "presupuesto"
  | "diario"
  | "reproductor"
  | "story";

/**
 * Destino de un enlace desde la Guía: una herramienta, la pestaña Agenda o la «Guía del acompañante»
 * (dentro del modo parto, con el cronómetro: abre directamente en esa sección).
 */
export type GuiaLinkTarget = ToolId | "agenda" | "acompanante";

export const TOOL_LABEL: Record<ToolId, string> = {
  sos: "SOS Síntomas",
  contracciones: "Contracciones",
  patadas: "Patadas",
  maleta: "Maleta",
  parto: "Plan de parto",
  modoparto: "Modo parto",
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
  modoparto: "Abrir el modo parto",
  nombres: "Abrir Nombres",
  presupuesto: "Abrir el Presupuesto",
  diario: "Abrir el Diario",
  reproductor: "Abrir Panda Audio",
  story: "Abrir PandaStory",
  agenda: "Abrir la Agenda",
  acompanante: "Abrir la guía del acompañante",
};

/**
 * Menciones EXPLÍCITAS de una herramienta en el texto de la misión (no palabras sueltas): «recordatorio
 * diario» no es el Diario y «menos movimientos» no es el contador de patadas. Revisado contra las 42
 * semanas × 2 roles de weeks.ts. Si hay varias, gana la que aparece antes en el texto.
 */
const MISSION_LINKS: readonly (readonly [GuiaLinkTarget, RegExp])[] = [
  // Antes que «contador de contracciones»: la misión de la semana 37 del papá nombra las dos y lleva a la guía.
  ["acompanante", /gu[ií]a (?:r[aá]pida )?(?:para el|del) acompañante/i],
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
 * Desde la semana 36 el cronómetro vive en el modo parto (con las llamadas, la respiración y la guía del
 * acompañante): la misión que nombra el contador lleva ahí. Antes, al contador de Contracciones.
 */
export function laborTarget(target: GuiaLinkTarget | null, week: number | undefined): GuiaLinkTarget | null {
  return target === "contracciones" && week !== undefined && week >= 36 ? "modoparto" : target;
}

/**
 * Las herramientas a mano esta semana en «Juntos» (2–3; lo que toca vive en la Guía). La que pide la misión de quien lee va primero;
 * luego, según la semana: los nombres y el presupuesto al principio, patadas desde la 28, maleta y plan
 * de parto de la 32 a la 35, el modo parto desde la 36. Sin semana conocida: lo que se usa en pareja.
 */
export function weekTools(week: number | undefined, missionText?: string | null): ToolId[] {
  const base: ToolId[] =
    week === undefined
      ? ["nombres", "presupuesto", "diario"]
      : week >= 36
        ? ["modoparto", "maleta", "parto"]
        : week >= 32
          ? ["maleta", "parto", "patadas"]
          : week >= 28
            ? ["patadas", "nombres", "parto"]
            : week >= 4
              ? ["nombres", "presupuesto", "story"]
              : ["nombres", "presupuesto", "diario"];
  // La guía del acompañante vive en el modo parto (con el cronómetro); antes de la 36, el contador basta.
  const fromMission = laborTarget(missionLink(missionText), week);
  const missionTool: ToolId | null =
    fromMission === "acompanante" ? "modoparto" : fromMission && fromMission !== "agenda" && fromMission !== "sos" ? fromMission : null;
  // Desde la 36 el modo parto va siempre primero; la herramienta que pide la misión, justo después.
  const first: ToolId[] =
    week !== undefined && week >= 36
      ? ["modoparto", ...(missionTool && missionTool !== "modoparto" ? [missionTool] : [])]
      : missionTool
        ? [missionTool]
        : [];
  return [...first, ...base.filter((t) => !first.includes(t))].slice(0, 3);
}
