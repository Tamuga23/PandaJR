/**
 * Casilla de una tarea que se dibuja al marcarla: el círculo pasa a sage y la palomita se traza
 * (globals.css › .pj-tick). Es una transición, no una animación: corre cuando cambia el estado, también
 * si la marca la pareja desde su teléfono, y nunca al montar ni al volver a la pestaña. Decorativa: el
 * estado lo dice el control que la contiene (aria-checked o aria-pressed).
 *
 * - ring (por defecto): círculo de contorno y palomita, como las tareas de la Guía y de la cita.
 * - filled: círculo relleno de sage con la palomita en blanco (la Maleta).
 */
export function CheckGlyph({
  checked,
  size = 22,
  tone = "ring",
}: {
  checked: boolean;
  size?: number;
  tone?: "ring" | "filled";
}) {
  if (tone === "filled") {
    return (
      <span
        aria-hidden="true"
        data-checked={checked}
        className={`pj-check grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
          checked ? "border-transparent bg-sage-ink text-on-accent" : "border-line-control"
        }`}
      >
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path className="pj-tick" pathLength={1} d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  return (
    <svg
      aria-hidden="true"
      data-checked={checked}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pj-check shrink-0 transition-colors ${checked ? "text-sage-ink" : "text-line-control"}`}
    >
      <circle cx="12" cy="12" r="10" />
      <path className="pj-tick" pathLength={1} d="m9 12 2 2 4-4" />
    </svg>
  );
}
