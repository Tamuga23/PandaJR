// Formato de fechas, tiempos relativos y dinero para la UI (español neutro).
// Funciones puras: sin window/navigator/localStorage; seguras en servidor y cliente.

/** Acepta Date, milisegundos o un Timestamp de Firestore ({ toDate() }). */
export type DateInput = Date | number | { toDate(): Date } | null | undefined;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Tolerancia para marcas "futuras" que en realidad son de ahora (reloj viejo o desfase del servidor). */
const FRESH_SKEW_MS = 5 * MINUTE;

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Convierte la entrada a Date válida, o null si no se puede. */
export function toDateSafe(value: DateInput): Date | null {
  if (value === null || value === undefined) return null;
  let d: Date | null = null;
  if (value instanceof Date) d = value;
  else if (typeof value === "number") d = new Date(value);
  else if (typeof value === "object" && typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      d = (value as { toDate(): Date }).toDate();
    } catch {
      d = null;
    }
  }
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** Diferencia en días de calendario locales (a − b): ayer = −1, mañana = 1. */
function calendarDayDiff(a: Date, b: Date): number {
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((da - db) / (24 * HOUR));
}

let rtfAuto: Intl.RelativeTimeFormat | null = null;
let rtfAlways: Intl.RelativeTimeFormat | null = null;
const auto = () => (rtfAuto ??= new Intl.RelativeTimeFormat("es", { numeric: "auto" }));
const always = () => (rtfAlways ??= new Intl.RelativeTimeFormat("es", { numeric: "always" }));

/**
 * Tiempo relativo en español: "hace un momento", "hace 5 minutos", "hace 3 horas",
 * "ayer", "hace 3 días", "hace 2 semanas", "mañana", "en 3 días". null/indefinido → "".
 */
export function formatRelative(date: DateInput, now: Date = new Date()): string {
  const d = toDateSafe(date);
  if (!d || Number.isNaN(now.getTime())) return "";

  const diff = d.getTime() - now.getTime();
  // Marcas recién escritas que quedan "en el futuro" por un reloj de pantalla que se refresca
  // por minuto o por desfase con el servidor: son de ahora mismo, nunca "en un momento".
  if (diff > 0 && diff < FRESH_SKEW_MS) return "hace un momento";
  const abs = Math.abs(diff);
  const sign = diff < 0 ? -1 : 1;

  if (abs < MINUTE) return "hace un momento";
  if (abs < HOUR) return auto().format(sign * Math.floor(abs / MINUTE), "minute");

  const days = calendarDayDiff(d, now);
  if (days === 0) return auto().format(sign * Math.floor(abs / HOUR), "hour");

  const absDays = Math.abs(days);
  const daySign = days < 0 ? -1 : 1;
  if (absDays < 7) return auto().format(days, "day"); // "ayer", "hace 3 días", "mañana"
  if (absDays < 30) return always().format(daySign * Math.floor(absDays / 7), "week");
  if (absDays < 365) return always().format(daySign * Math.floor(absDays / 30), "month");
  return always().format(daySign * Math.floor(absDays / 365), "year");
}

let moneyFmt: Intl.NumberFormat | null = null;

/**
 * Dinero sin decimales con prefijo "$" y signo menos tipográfico: 1500 → "$1500",
 * 12500 → "$12.500", −500 → "−$500". Valores no finitos → "$0".
 */
export function formatMoney(n: number): string {
  const value = Number.isFinite(n) ? Math.round(n) : 0;
  moneyFmt ??= new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
  const body = moneyFmt.format(Math.abs(value));
  return (value < 0 ? "−" : "") + "$" + body;
}

/** Fecha corta: "15 oct". Fecha inválida → "". Igual en servidor y cliente (sin Intl). */
export function formatDateShort(d: Date): string {
  const date = toDateSafe(d);
  if (!date) return "";
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

// --- Reparación de mojibake (UTF-8 leído como Windows-1252) ---
// Útil para datos ya guardados (localStorage/Firestore) con textos como "EcografÃ­a" o "â†’".

const CP1252_REVERSE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

const MOJIBAKE_HINT = /[ÃÂâð][\u0080-ÿŒ-™]/;

/**
 * Deshace el mojibake típico ("EcografÃ­a" → "Ecografía", "â†’" → "→").
 * Si el texto no parece dañado o no se puede reparar con seguridad, lo devuelve igual.
 */
export function repairMojibake(input: string): string {
  if (typeof input !== "string" || !MOJIBAKE_HINT.test(input)) return input;
  const bytes: number[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x100) bytes.push(cp);
    else if (CP1252_REVERSE[cp] !== undefined) bytes.push(CP1252_REVERSE[cp]);
    else return input; // carácter fuera de Windows-1252: no es mojibake reparable
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return input;
  }
}
