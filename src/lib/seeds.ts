// Datos de ejemplo que versiones anteriores sembraban como si fueran de la familia
// (citas, sesiones de patadas y nombres). Sirven para reconocerlos y purgarlos una sola vez.
// Solo datos y predicados puros: sin Firebase, sin window.

import { repairMojibake } from "./format";

/** Normaliza para comparar: repara mojibake, quita acentos, minúsculas y espacios extra. */
function key(value: unknown): string {
  if (typeof value !== "string") return "";
  return repairMojibake(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// --- Citas (page.tsx: estado inicial de `events`) ---

export const LEGACY_SEED_EVENTS = [
  { id: 1, date: "15 Oct", rawDate: "2026-10-15", time: "10:30 AM", title: "Ecografía de las 12 Semanas (Tamizaje)", doctor: "Dra. Ramírez" },
  { id: 2, date: "28 Oct", rawDate: "2026-10-28", time: "09:00 AM", title: "Exámenes de laboratorio", doctor: "Laboratorio Central" },
] as const;

const SEED_EVENT_KEYS = new Set(LEGACY_SEED_EVENTS.map((e) => `${key(e.title)}|${key(e.doctor)}`));

/**
 * true si la cita es una de las de ejemplo (mismo título y mismo doctor, también en su
 * versión con mojibake "EcografÃ­a… · Dra. RamÃ­rez"). Una cita real con otro doctor no coincide.
 */
export function isLegacySeedEvent(e: { title?: unknown; doctor?: unknown } | null | undefined): boolean {
  if (!e) return false;
  return SEED_EVENT_KEYS.has(`${key(e.title)}|${key(e.doctor)}`);
}

// --- Sesiones de patadas (HerramientasModule: "sesiones de referencia clínica inicial") ---

export const LEGACY_SEED_KICK_IDS = [1, 2] as const;

export const LEGACY_SEED_KICK_SESSIONS = [
  { id: 1, dateFormatted: "Ayer, 08:30 PM", count: 10, durationSeconds: 1380, durationFormatted: "23 min", note: "En reposo nocturno" },
  { id: 2, dateFormatted: "Hace 2 días, 01:15 PM", count: 10, durationSeconds: 1020, durationFormatted: "17 min", note: "Después de almorzar" },
] as const;

/** Formato aún más antiguo (page.tsx) con `date` y `duration` como texto. */
const LEGACY_SEED_KICK_OLD_FORMAT = [
  { id: 1, date: "Ayer", duration: "25 min" },
  { id: 2, date: "Antier", duration: "18 min" },
] as const;

/** true si la sesión es una de las de ejemplo (por id + texto de fecha fijo). */
export function isLegacySeedKickSession(
  s: { id?: unknown; dateFormatted?: unknown; date?: unknown; duration?: unknown } | null | undefined
): boolean {
  if (!s) return false;
  const id = Number(s.id);
  if (id !== 1 && id !== 2) return false;
  if (LEGACY_SEED_KICK_SESSIONS.some((seed) => seed.id === id && key(s.dateFormatted) === key(seed.dateFormatted))) return true;
  return LEGACY_SEED_KICK_OLD_FORMAT.some(
    (seed) => seed.id === id && key(s.date) === key(seed.date) && key(s.duration) === key(seed.duration)
  );
}

// --- Nombres (VotadorNombres: lista inicial con partnerLiked inventado) ---

export const LEGACY_SEED_NAMES = ["Valentina", "Mateo", "Noa", "Emilio", "Lucía", "Alex"] as const;

const SEED_NAME_KEYS = new Set<string>(LEGACY_SEED_NAMES.map(key));

/** true si el nombre es uno de los 6 de ejemplo (ignora acentos, mayúsculas y mojibake). */
export function isLegacySeedName(name: unknown): boolean {
  return SEED_NAME_KEYS.has(key(name));
}

/** Ítem de nombre del formato antiguo (shared_data/baby_names.items o localStorage). */
export function isLegacySeedNameItem(item: { id?: unknown; text?: unknown; name?: unknown } | null | undefined): boolean {
  if (!item) return false;
  return isLegacySeedName(item.text ?? item.name);
}

// --- Traspaso de "Solo en este teléfono" a lo compartido (migraciones de una vez) ---

/**
 * Marca que pone page.tsx cuando este teléfono se vincula (onboarding o "Vincular con mi pareja")
 * después de haber registrado cosas sin vínculo. Cada herramienta la usa para subir UNA vez lo que
 * tenía en localStorage, sin pisar lo que ya exista en el embarazo compartido.
 */
export function linkedFromLocalKey(pregnancyId: string): string {
  return `pandajr_linked_from_local_${pregnancyId}`;
}

/** Bandera "ya traspasé {tool} a este embarazo" (una por herramienta, embarazo y teléfono). */
export function localToSharedFlag(tool: string, pregnancyId: string): string {
  return `pandajr_mig_local2shared_${tool}_${pregnancyId}`;
}
