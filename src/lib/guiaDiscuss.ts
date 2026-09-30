// Puente de solo interfaz entre la Guía y la preparación de cita (R2 · paso 3).
//
// La Guía conoce el progreso de las tareas (escucha el checklist compartido); la hoja de preparación se
// monta en la raíz de page.tsx y se abre también desde la Agenda. La Guía publica aquí, tras cada render,
// las tareas de ventana pasada y sin marcar que tocan en el próximo control (solo con el dato del servidor
// ya recibido), y la hoja las lee para su próxima cita. Nada se escribe en Firebase: es memoria del
// teléfono, como un estado compartido entre dos componentes.
//
// También lleva una petición de «abrir el grupo en la Guía» (desde el enlace de la hoja de preparación).

import { useSyncExternalStore } from "react";

export type DiscussItem = { id: string; text: string; ask: string };
export type DiscussSnapshot = { eventId: string | number | null; items: DiscussItem[] };

const EMPTY: DiscussSnapshot = { eventId: null, items: [] };
let snapshot: DiscussSnapshot = EMPTY;
let openRequest = 0;
const listeners = new Set<() => void>();

const keyOf = (s: DiscussSnapshot) => `${s.eventId ?? ""}|${s.items.map((i) => `${i.id}:${i.ask}`).join(",")}`;
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** La Guía publica lo que hay para comentar en su próxima cita (no avisa si no cambió). */
export function publishDiscuss(next: DiscussSnapshot | null): void {
  const value = next ?? EMPTY;
  if (keyOf(value) === keyOf(snapshot)) return;
  snapshot = value;
  emit();
}

/** Tareas para comentar en esta cita (vacío si no es la próxima o si no hay ninguna). */
export function useDiscussForEvent(eventId: string | number | null | undefined): DiscussItem[] {
  const s = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
  return eventId != null && s.eventId != null && String(s.eventId) === String(eventId) ? s.items : [];
}

/** Pide a la Guía que despliegue el grupo «para comentar» y le dé el foco. */
export function requestOpenDiscuss(): void {
  openRequest += 1;
  emit();
}

export function useOpenDiscussRequest(): number {
  return useSyncExternalStore(subscribe, () => openRequest, () => 0);
}
