// Puente de solo interfaz con «Lo que toca esta semana», la lista única de la Guía (crítica 2026-10-13,
// P2 #5). Juntos y la Agenda no la repiten: llevan a ella.
//
// La Guía conoce el progreso (escucha el checklist compartido) y las citas. Tras cada render publica aquí
// qué estudios de la lista siguen sin marcar y sin cita, y la Agenda los nombra en su enlace. Solo cuando
// lo sabe: con el progreso y la agenda ya recibidos. Nada se escribe en Firebase: es memoria del teléfono.
//
// También lleva la petición «abrir la lista» desde Juntos y la Agenda: la Guía la despliega y le da el foco.

import { useSyncExternalStore } from "react";

export type LoQueTocaSummary = {
  /** false mientras la Guía no sabe qué está hecho o qué citas hay (al abrir, sin conexión). */
  known: boolean;
  /** Estudios de la lista sin marcar y sin cita («Prueba de glucosa (diabetes gestacional)»). */
  toSchedule: string[];
};

const UNKNOWN: LoQueTocaSummary = { known: false, toSchedule: [] };
let summary: LoQueTocaSummary = UNKNOWN;
let openRequest = 0;
const listeners = new Set<() => void>();

const keyOf = (s: LoQueTocaSummary) => `${s.known}|${s.toSchedule.join("\n")}`;
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** La Guía publica lo que queda por agendar (no avisa si no cambió). null: no lo sabe. */
export function publishLoQueToca(next: LoQueTocaSummary | null): void {
  const value = next ?? UNKNOWN;
  if (keyOf(value) === keyOf(summary)) return;
  summary = value;
  emit();
}

export function useLoQueToca(): LoQueTocaSummary {
  return useSyncExternalStore(subscribe, () => summary, () => UNKNOWN);
}

/** Pide a la Guía que despliegue «Lo que toca esta semana» y le dé el foco. */
export function requestOpenLoQueToca(): void {
  openRequest += 1;
  emit();
}

export function useOpenLoQueTocaRequest(): number {
  return useSyncExternalStore(subscribe, () => openRequest, () => 0);
}
