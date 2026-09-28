/**
 * Capas z de toda la app (una sola escala). Usa Z_CLASS en className y Z en estilos en línea.
 *
 *   header 40  cabecera fija
 *   nav 50     barra inferior
 *   sheet 60   hojas y diálogos de primer nivel (Ajustes, Nueva cita, Presupuesto, PandaStory…)
 *   dialog 60  ídem (alias semántico)
 *   careTeam 70 diálogo que se abre SOBRE otro (Ajustes → Equipo de salud)
 *   toast 80   avisos: por encima de cualquier diálogo para que "Deshacer"/"Reintentar" se vean y se toquen
 *
 * Nada por encima de toast salvo un caso justificado y documentado aquí. Nunca z-[999].
 * Las clases están escritas completas para que Tailwind las detecte.
 */
export const Z = { header: 40, nav: 50, sheet: 60, dialog: 60, careTeam: 70, toast: 80 } as const;

export type Layer = keyof typeof Z;

export const Z_CLASS = {
  header: "z-40",
  nav: "z-50",
  sheet: "z-[60]",
  dialog: "z-[60]",
  careTeam: "z-[70]",
  toast: "z-[80]",
} as const satisfies Record<Layer, string>;
