/*
 * Movimiento de la app (DESIGN.md › Movimiento). Dos momentos de autor: la planta al avanzar de semana
 * (GrowingPlant) y los monogramas que se juntan (el abrazo que llega y la coincidencia de nombres). El
 * resto es oficio: reconocer un toque, explicar un cambio de estado o de lugar. Solo se mueve lo que acaba
 * de pasar; nada anima al cargar ni al cambiar de pestaña.
 *
 * Las entradas declarativas (hojas, toast, casillas) viven en globals.css; aquí, las que dependen de un
 * evento y usan Web Animations. Sin Web Animations o con movimiento reducido no se reproduce nada y el
 * elemento queda en su estado final: una animación nunca debe tumbar ni esconder la interfaz.
 */

/** Curva de llegada (la de la planta): sale rápido y se asienta despacio. También es `ease-out-expo` en CSS. */
export const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Hay Web Animations y no se pidió reducir el movimiento. */
export function canAnimate(el: Element | null | undefined): el is Element {
  return !!el && typeof el.animate === "function" && !prefersReducedMotion();
}

const played = new WeakSet<Element>();

/**
 * Reproduce una entrada una sola vez por elemento. Pensado para ref callbacks, que React vuelve a llamar
 * en cada render con el mismo nodo: el nodo nuevo anima, el que ya estaba no.
 */
export function playOnce(el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions): void {
  if (!el || played.has(el)) return;
  played.add(el);
  if (canAnimate(el)) el.animate(keyframes, options);
}

/** Un mensaje que acaba de llegar (PandaIA): sube 6px y se funde. */
export function arriveMessage(el: HTMLElement | null): void {
  playOnce(el, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
    duration: 280,
    easing: EASE_OUT_EXPO,
  });
}

/**
 * El abrazo de los monogramas: los dos cuadrados llegan desde los lados, se encuentran donde los dibuja
 * la pareja de «Juntos» (el segundo monta sobre el primero) y se aprietan una vez. `first` es el de la
 * izquierda. Devuelve las animaciones para cancelarlas al desmontar.
 */
export function playEmbrace(
  first: Element | null | undefined,
  second: Element | null | undefined,
  { distance = 14, delay = 0 }: { distance?: number; delay?: number } = {}
): Animation[] {
  if (!canAnimate(first) || !canAnimate(second)) return [];
  const frames = (side: -1 | 1): Keyframe[] => [
    { transform: `translateX(${side * distance}px)`, easing: EASE_OUT_EXPO },
    { offset: 0.6, transform: "translateX(0px) scale(1)", easing: "ease-in-out" },
    { offset: 0.8, transform: `translateX(${-side}px) scale(1.06)`, easing: "ease-in-out" },
    { transform: "translateX(0px) scale(1)" },
  ];
  const opts: KeyframeAnimationOptions = { duration: 900, delay, fill: "backwards" };
  return [first.animate(frames(-1), opts), second.animate(frames(1), opts)];
}
