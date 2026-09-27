// Modelo de edad gestacional (EG) a partir de la fecha probable de parto (FPP).
// Las funciones puras son isomórficas (no tocan window/localStorage en ámbito de módulo) y el
// hook useGestationalAge solo se usa en componentes cliente.
//
// Convenciones:
// - Las fechas "aaaa-mm-dd" son días de calendario LOCALES (sin hora ni zona horaria).
// - EG = 280 − días que faltan para la FPP. `weeks` son semanas COMPLETAS (24 + 3 = 24 semanas
//   y 3 días), igual que la notación obstétrica; el trimestre sale de ahí (1: 1–13, 2: 14–27, 3: 28+).
// - Regla de Naegele: FPP = primer día de la última regla (FUM) + 280 días.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePandaStore } from "@/store/usePandaStore";
import { WEEK_MAX, WEEK_MIN, trimesterOfWeek } from "./weeks";

export type DueDateSource = "eco" | "fum" | "manual";
export const DUE_DATE_SOURCES: readonly DueDateSource[] = ["eco", "fum", "manual"];

/** De dónde salió la FPP, para mostrarlo junto a la fecha. */
export const DUE_DATE_SOURCE_LABEL: Record<DueDateSource, string> = {
  eco: "Según la ecografía",
  fum: "Según tu última regla",
  manual: "Estimada por la semana que indicaste",
};

export function isDueDateSource(v: unknown): v is DueDateSource {
  return v === "eco" || v === "fum" || v === "manual";
}

/**
 * Línea de origen para la cabecera de la Guía y Ajustes, en la voz de quien lee:
 * "Según la ecografía · fecha probable: 14 de enero",
 * "Estimada por la semana que indicaron · fecha probable estimada: 14 de enero" (copiloto) o,
 * sin origen guardado, "Fecha probable: 14 de enero". `dueText` es la fecha ya formateada.
 */
export function dueDateSummary(source: DueDateSource | undefined, reader: "mama" | "papa", dueText?: string): string {
  const isMama = reader === "mama";
  const origin =
    source === "eco"
      ? "Según la ecografía"
      : source === "fum"
        ? isMama
          ? "Según tu última regla"
          : "Según su última regla"
        : source === "manual"
          ? isMama
            ? "Estimada por la semana que indicaste"
            : "Estimada por la semana que indicaron"
          : "";
  if (!origin) return dueText ? `Fecha probable: ${dueText}` : "Fecha probable guardada";
  if (!dueText) return origin;
  return `${origin} · ${source === "manual" ? "fecha probable estimada" : "fecha probable"}: ${dueText}`;
}

export const PREGNANCY_DAYS = 280;
/** Menos de 2 semanas de EG: la FPP no tiene sentido (todavía no hay embarazo). */
export const MIN_VALID_GESTATION_DAYS = 14;
/** 42 semanas + 6 días. */
export const MAX_VALID_GESTATION_DAYS = 42 * 7 + 6;

const DAY_MS = 86_400_000;

// =====================================================================================
// Fechas de calendario
// =====================================================================================

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/** Número de día de calendario local (independiente de la hora y del horario de verano). */
function dayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/** Días de calendario de `from` a `to` (mañana = 1, ayer = −1). */
export function daysBetween(from: Date, to: Date): number {
  return dayNumber(to) - dayNumber(from);
}

/** Suma días de calendario (a medianoche local). */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Fecha local → "aaaa-mm-dd". */
export function toISODate(d: Date): string {
  const y = String(d.getFullYear()).padStart(4, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "aaaa-mm-dd" → Date a medianoche local; null si el formato o la fecha no son válidos (p. ej. 2027-02-30). */
export function parseISODate(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function isISODate(v: unknown): v is string {
  return parseISODate(v) !== null;
}

// =====================================================================================
// FPP y edad gestacional
// =====================================================================================

/** Regla de Naegele: FUM + 280 días. */
export function dueDateFromLMP(lmp: Date): Date {
  if (!isValidDate(lmp)) throw new RangeError("Fecha de última regla inválida");
  return addDays(lmp, PREGNANCY_DAYS);
}

/** FUM equivalente a una FPP (FPP − 280 días). */
export function lmpFromDueDate(dueDate: Date): Date {
  if (!isValidDate(dueDate)) throw new RangeError("Fecha probable de parto inválida");
  return addDays(dueDate, -PREGNANCY_DAYS);
}

export type GestationalAge = {
  /** Semanas completas, acotadas a 1..42 para la UI. */
  weeks: number;
  /** Días sobre las semanas completas (0..6). */
  days: number;
  /** Días reales de EG (sin acotar; puede pasar de 294 o ser negativo). */
  totalDays: number;
  trimester: 1 | 2 | 3;
  /** Días reales desde la FPP (0 si aún no llega). */
  overdueDays: number;
};

/** EG a partir de la FPP. Hoy = FPP → 40 + 0; FPP hace 10 días → 41 + 3 con overdueDays 10. */
export function gestationalAgeFromDueDate(dueDate: Date, today: Date = new Date()): GestationalAge {
  if (!isValidDate(dueDate)) throw new RangeError("Fecha probable de parto inválida");
  if (!isValidDate(today)) throw new RangeError("Fecha de hoy inválida");
  const totalDays = PREGNANCY_DAYS - daysBetween(today, dueDate);
  const overdueDays = Math.max(0, totalDays - PREGNANCY_DAYS);
  let weeks: number;
  let days: number;
  if (totalDays < WEEK_MIN * 7) {
    weeks = WEEK_MIN;
    days = 0;
  } else if (totalDays > MAX_VALID_GESTATION_DAYS) {
    weeks = WEEK_MAX;
    days = 6;
  } else {
    weeks = Math.floor(totalDays / 7);
    days = totalDays % 7;
  }
  return { weeks, days, totalDays, trimester: trimesterOfWeek(weeks), overdueDays };
}

/** Semana completa (1..42) según una FPP "aaaa-mm-dd"; undefined si la fecha no es válida. */
export function weekFromDueDateISO(dueDate: unknown, today: Date = new Date()): number | undefined {
  const d = parseISODate(dueDate);
  if (!d || !isValidDate(today)) return undefined;
  return gestationalAgeFromDueDate(d, today).weeks;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * "Semana 24 + 3 días", "Semana 40 · hoy es la fecha probable",
 * "Semana 40 + 2 días · ya pasó la fecha probable". Neutro: lo leen la mamá y el copiloto.
 */
export function weekLabel(ga: Pick<GestationalAge, "weeks" | "days"> & Partial<Pick<GestationalAge, "totalDays" | "overdueDays">>): string {
  const total = ga.totalDays ?? ga.weeks * 7 + ga.days;
  const overdue = ga.overdueDays ?? Math.max(0, total - PREGNANCY_DAYS);
  if (total > MAX_VALID_GESTATION_DAYS) {
    return `Pasaron ${plural(overdue, "día", "días")} de la fecha probable · revisa la fecha`;
  }
  const base = ga.days > 0 ? `Semana ${ga.weeks} + ${plural(ga.days, "día", "días")}` : `Semana ${ga.weeks}`;
  if (overdue > 0) return `${base} · ya pasó la fecha probable`;
  if (total === PREGNANCY_DAYS) return `${base} · hoy es la fecha probable`;
  return base;
}

export type DateValidation = { ok: boolean; error?: string };

/** Rechaza FPP que impliquen menos de 2 semanas o más de 42 + 6 de embarazo. Mensajes listos para la UI. */
export function validateDueDate(d: Date, today: Date = new Date()): DateValidation {
  if (!isValidDate(d)) return { ok: false, error: "Escribe una fecha válida: día, mes y año." };
  const total = PREGNANCY_DAYS - daysBetween(today, d);
  if (total < MIN_VALID_GESTATION_DAYS) {
    return {
      ok: false,
      error: "Esa fecha está demasiado lejos: serían menos de 2 semanas de embarazo. Revisa el mes y el año.",
    };
  }
  if (total > MAX_VALID_GESTATION_DAYS) {
    return {
      ok: false,
      error: "Esa fecha ya pasó hace más de 20 días: serían más de 42 semanas de embarazo. Revisa el día, el mes y el año.",
    };
  }
  return { ok: true };
}

/** Igual que validateDueDate, pero con mensajes pensados para la fecha de la última regla (FUM). */
export function validateLMP(lmp: Date, today: Date = new Date()): DateValidation {
  if (!isValidDate(lmp)) return { ok: false, error: "Escribe una fecha válida: día, mes y año." };
  const total = daysBetween(lmp, today);
  if (total < 0) return { ok: false, error: "La fecha de tu última regla no puede ser posterior a hoy." };
  if (total < MIN_VALID_GESTATION_DAYS) {
    return { ok: false, error: "Con esa fecha serían menos de 2 semanas de embarazo. Revisa el día y el mes." };
  }
  if (total > MAX_VALID_GESTATION_DAYS) {
    return { ok: false, error: "Esa fecha es de hace más de 42 semanas. Revisa el mes y el año." };
  }
  return { ok: true };
}

// =====================================================================================
// Perfil: de dónde sale la semana
// =====================================================================================

/** Campos del perfil que intervienen en la semana (subconjunto de UserProfile). */
export type DatingProfile = {
  week?: number | null;
  weekUnknown?: boolean;
  dueDate?: string;
  dueDateSource?: DueDateSource;
};

export type GestationalAgeState = {
  weeks?: number;
  days?: number;
  totalDays?: number;
  trimester?: 1 | 2 | 3;
  dueDate?: Date;
  /** La FPP tal como está guardada ("aaaa-mm-dd"). */
  dueDateISO?: string;
  dueDateSource?: DueDateSource;
  /** dueDate: calculada cada día desde la FPP; manual: semana elegida a mano; unknown: sin confirmar. */
  source: "dueDate" | "manual" | "unknown";
  label: string;
  overdueDays: number;
};

function manualWeek(w: unknown): number | undefined {
  return typeof w === "number" && Number.isInteger(w) && w >= WEEK_MIN && w <= WEEK_MAX ? w : undefined;
}

/** Versión pura del hook: FPP válida → 'dueDate'; si no, semana confirmada → 'manual'; si no → 'unknown'. */
export function resolveGestationalAge(profile: DatingProfile | null | undefined, today: Date = new Date()): GestationalAgeState {
  const due = parseISODate(profile?.dueDate);
  if (due && isValidDate(today)) {
    const ga = gestationalAgeFromDueDate(due, today);
    return {
      weeks: ga.weeks,
      days: ga.days,
      totalDays: ga.totalDays,
      trimester: ga.trimester,
      dueDate: due,
      dueDateISO: toISODate(due),
      dueDateSource: isDueDateSource(profile?.dueDateSource) ? profile.dueDateSource : undefined,
      source: "dueDate",
      label: weekLabel(ga),
      overdueDays: ga.overdueDays,
    };
  }
  const w = profile && !profile.weekUnknown ? manualWeek(profile.week) : undefined;
  if (w !== undefined) {
    return { weeks: w, trimester: trimesterOfWeek(w), source: "manual", label: `Semana ${w}`, overdueDays: 0 };
  }
  return { source: "unknown", label: "Semana sin confirmar", overdueDays: 0 };
}

/** Parche de perfil al guardar una FPP (validarla antes con validateDueDate). */
export function profilePatchForDueDate(
  dueDate: string,
  source: DueDateSource,
  today: Date = new Date()
): { dueDate: string; dueDateSource: DueDateSource; week: number; weekUnknown: false } {
  const d = parseISODate(dueDate);
  if (!d) throw new RangeError("La fecha probable debe tener el formato aaaa-mm-dd");
  if (!isDueDateSource(source)) throw new RangeError("Origen de la fecha probable inválido");
  return { dueDate: toISODate(d), dueDateSource: source, week: gestationalAgeFromDueDate(d, today).weeks, weekUnknown: false };
}

/**
 * FPP estimada a partir de una semana elegida a mano (hoy = semana N + 0 días), para que la
 * semana avance sola. null en la semana 1: una FPP con menos de 2 semanas de EG no es válida
 * (validateDueDate / datingFromPregnancyDoc la rechazarían).
 */
export function estimatedDueDateForWeek(week: number, today: Date = new Date()): string | null {
  const w = manualWeek(week);
  if (w === undefined) throw new RangeError("La semana debe ser un entero entre 1 y 42");
  if (w * 7 < MIN_VALID_GESTATION_DAYS) return null;
  return toISODate(addDays(today, PREGNANCY_DAYS - w * 7));
}

/**
 * Parche de perfil al elegir la semana a mano: guarda una FPP estimada (origen "manual") para
 * que la semana avance sola cada día. En la semana 1 no hay FPP válida: queda como semana fija.
 */
export function profilePatchForManualWeek(week: number, today: Date = new Date()): {
  week: number;
  weekUnknown: false;
  dueDate: string | undefined;
  dueDateSource: DueDateSource | undefined;
} {
  const w = manualWeek(week);
  if (w === undefined) throw new RangeError("La semana debe ser un entero entre 1 y 42");
  const estimated = estimatedDueDateForWeek(w, today);
  if (estimated) return profilePatchForDueDate(estimated, "manual", today);
  return { week: w, weekUnknown: false, dueDate: undefined, dueDateSource: undefined };
}

// =====================================================================================
// Documento del embarazo compartido (pregnancies/{pid})
// =====================================================================================

export type PregnancyDating = {
  /** FPP válida guardada en el embarazo compartido. */
  dueDate?: string;
  dueDateSource?: DueDateSource;
  /** true si alguien quitó la FPP a propósito (pasó a semana manual): hay dueDateUpdatedAt sin dueDate. */
  dueDateCleared: boolean;
  /**
   * true si hay una FPP con formato válido pero fuera de rango (menos de 2 o más de 42 + 6 semanas,
   * p. ej. un año mal escrito): no se usa ni se deriva semana de ella. Solo aparece cuando es true.
   */
  dueDateOutOfRange?: boolean;
  /** Semana guardada tal cual (compatibilidad con versiones que solo conocen `week`). */
  storedWeek?: number;
  /**
   * Semana vigente: la calculada desde la FPP si existe; si no, la guardada. Con una FPP fuera de
   * rango es undefined (semana sin confirmar: la semana guardada salió de esa misma fecha).
   */
  week?: number;
};

/** Lee y valida la datación de un documento del embarazo (dato remoto: nunca se confía a ciegas). */
export function datingFromPregnancyDoc(data: unknown, today: Date = new Date()): PregnancyDating {
  const d = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const parsed = parseISODate(d.dueDate);
  // Mismo rango que acepta la UI al guardar (validateDueDate).
  const outOfRange = !!parsed && isValidDate(today) && !validateDueDate(parsed, today).ok;
  const dueDate = parsed && !outOfRange ? toISODate(parsed) : undefined;
  const storedWeek = manualWeek(typeof d.week === "number" ? d.week : Number(d.week));
  const out: PregnancyDating = {
    dueDateCleared: !parsed && d.dueDateUpdatedAt !== undefined && d.dueDateUpdatedAt !== null,
    storedWeek,
    week: dueDate ? weekFromDueDateISO(dueDate, today) : outOfRange ? undefined : storedWeek,
  };
  if (dueDate) {
    out.dueDate = dueDate;
    if (isDueDateSource(d.dueDateSource)) out.dueDateSource = d.dueDateSource;
  }
  if (outOfRange) out.dueDateOutOfRange = true;
  return out;
}

export type DatingPatch = {
  week?: number;
  weekUnknown?: boolean;
  dueDate?: string;
  dueDateSource?: DueDateSource;
};

/**
 * Qué cambiar en el perfil LOCAL cuando llega un snapshot del embarazo compartido (para el
 * listener de listenToPregnancy; solo estado local, nunca escribe). null = nada que cambiar.
 * - FPP remota → manda (y la semana se deriva de ella).
 * - FPP remota fuera de rango → semana sin confirmar (sin reglas clínicas) hasta que alguien la
 *   corrija en Ajustes; la UI lo avisa con datingFromPregnancyDoc(...).dueDateOutOfRange.
 * - FPP quitada a propósito en el otro teléfono → se quita también aquí.
 * - Sin FPP local → la semana guardada en remoto, como hasta ahora.
 * - FPP local que nunca se compartió (sin marca remota) → se conserva.
 */
export function remoteDatingPatch(data: unknown, current: DatingProfile, today: Date = new Date()): DatingPatch | null {
  const remote = datingFromPregnancyDoc(data, today);
  if (remote.dueDate) {
    const week = weekFromDueDateISO(remote.dueDate, today)!;
    if (
      current.dueDate === remote.dueDate &&
      current.dueDateSource === remote.dueDateSource &&
      current.week === week &&
      !current.weekUnknown
    ) {
      return null;
    }
    return { dueDate: remote.dueDate, dueDateSource: remote.dueDateSource, week, weekUnknown: false };
  }
  if (remote.dueDateOutOfRange) {
    if (current.weekUnknown && current.dueDate === undefined && current.dueDateSource === undefined) return null;
    return { weekUnknown: true, dueDate: undefined, dueDateSource: undefined };
  }
  const patch: DatingPatch = {};
  let hasLocalDue = isISODate(current.dueDate);
  if (hasLocalDue && remote.dueDateCleared) {
    patch.dueDate = undefined;
    patch.dueDateSource = undefined;
    hasLocalDue = false;
  }
  const w = remote.storedWeek;
  if (!hasLocalDue && w !== undefined && (w !== current.week || current.weekUnknown)) {
    patch.week = w;
    patch.weekUnknown = false;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

// =====================================================================================
// Hook cliente
// =====================================================================================

// Reloj del día: se re-evalúa a medianoche y al volver a la app (el temporizador puede dormirse
// con el teléfono bloqueado; visibilitychange/focus/pageshow lo corrigen al despertar).
const getTodayKey = () => toISODate(new Date());
const MAX_TIMER_MS = 6 * 60 * 60 * 1000;

function subscribeToday(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    timer = setTimeout(() => {
      onChange();
      schedule();
    }, Math.min(MAX_TIMER_MS, Math.max(1000, nextMidnight.getTime() - now.getTime())));
  };
  const onWake = () => {
    if (typeof document === "undefined" || document.visibilityState !== "hidden") onChange();
  };
  schedule();
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
  window.addEventListener("pageshow", onWake);
  return () => {
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onWake);
    window.removeEventListener("focus", onWake);
    window.removeEventListener("pageshow", onWake);
  };
}

/**
 * Semana gestacional vigente para la UI. Con FPP se recalcula cada día (medianoche y al volver
 * a la app) y mantiene `profile.week` derivado SOLO en el store local (para el código que aún
 * lee profile.week); nunca escribe en Firebase. Móntalo una vez en la raíz de la app.
 */
export function useGestationalAge(): GestationalAgeState {
  const dueDate = usePandaStore((s) => s.profile.dueDate);
  const dueDateSource = usePandaStore((s) => s.profile.dueDateSource);
  const week = usePandaStore((s) => s.profile.week);
  const weekUnknown = usePandaStore((s) => s.profile.weekUnknown);
  const hasHydrated = usePandaStore((s) => s.hasHydrated);
  const todayKey = useSyncExternalStore(subscribeToday, getTodayKey, getTodayKey);

  const state = useMemo(
    () => resolveGestationalAge({ dueDate, dueDateSource, week, weekUnknown }, parseISODate(todayKey) ?? new Date()),
    [dueDate, dueDateSource, week, weekUnknown, todayKey]
  );

  // Semana derivada de la FPP → store local (compatibilidad). No dispara escrituras remotas.
  const derivedWeek = state.source === "dueDate" ? state.weeks : undefined;
  useEffect(() => {
    if (!hasHydrated || derivedWeek === undefined) return;
    if (week !== derivedWeek || weekUnknown) {
      usePandaStore.getState().setProfile({ week: derivedWeek, weekUnknown: false });
    }
  }, [hasHydrated, derivedWeek, week, weekUnknown]);

  return state;
}
