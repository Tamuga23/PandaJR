/**
 * PandaStory (tarjeta 9:16 para historias): qué puede decir la tarjeta y con qué semanas se arma la tira.
 * Sin React ni Firebase. Solo lo verdadero (PRODUCT.md): semana confirmada, nombres reales, días que faltan
 * solo con una fecha probable de verdad, medidas «en promedio».
 */
import { MAX_VALID_GESTATION_DAYS, PREGNANCY_DAYS, type GestationalAgeState } from "@/lib/pregnancy";

/** Las tres composiciones: cada una cuenta algo distinto. */
export type StoryComposition = "semana" | "foto" | "cuenta";

/**
 * Las cinco semanas de la tira, de 4 en 4 (cada paso suma una hoja verdadera a la planta), con la de hoy lo
 * más al centro que se pueda, entre la 4 y la 40 (o la de hoy, si ya pasó de 40). 24 → 16 20 24 28 32;
 * 6 → 6 10 14 18 22; 38 → 22 26 30 34 38.
 */
export function storyWindow(week: number): number[] {
  const w = Math.floor(week);
  const hi = Math.max(40, w);
  for (const k of [2, 1, 3, 0, 4]) {
    const start = w - 4 * k;
    if (start >= 4 && start + 16 <= hi) return [0, 1, 2, 3, 4].map((i) => start + 4 * i);
  }
  return [w];
}

/** La tira de «Con foto», que termina en su foto: las dos semanas de antes, de 4 en 4 (24 → 16 20; la foto es la 24). */
export function photoStripWeeks(week: number): number[] {
  const w = Math.floor(week);
  return [w - 8, w - 4].filter((x) => x >= 4);
}

/**
 * Hasta dónde sube el dibujo de GrowingPlant sobre su tierra, en unidades de su viewBox de 120 (medido en el
 * navegador el 2026-11-04, semanas 4–42). Reserva la altura justa de la tira: si la planta cambia, solo queda un
 * poco más o menos de aire sobre ella.
 */
const PLANT_REACH: readonly (readonly [week: number, units: number])[] = [
  [4, 19.5], [8, 33.9], [12, 41], [16, 48], [20, 52.4], [24, 57.6], [28, 64.8], [32, 72], [34, 75.6], [36, 82.6], [38, 86.8], [40, 93.1], [42, 97.3],
];

export function plantReach(week: number): number {
  const w = Math.min(42, Math.max(4, week));
  for (let i = 1; i < PLANT_REACH.length; i++) {
    const [w1, u1] = PLANT_REACH[i];
    if (w <= w1) {
      const [w0, u0] = PLANT_REACH[i - 1];
      return u0 + ((u1 - u0) * (w - w0)) / (w1 - w0);
    }
  }
  return PLANT_REACH[PLANT_REACH.length - 1][1];
}

/** Primera letra en minúscula a media frase («Menos de 1 g» → «menos de 1 g»), sin tocar siglas («LED», «USB»). */
export function lowerFirst(s: string): string {
  return /^\p{Lu}\p{Ll}/u.test(s) ? s[0].toLocaleLowerCase("es") + s.slice(1) : s;
}

/** «En promedio, 30 cm y 600 g»: las medidas son de referencia, no de su bebé. */
export function measuresPhrase(length: string, weight: string): string {
  return `En promedio, ${lowerFirst(length)} y ${lowerFirst(weight)}`;
}

/**
 * El artículo de cada tamaño de src/lib/weeks.ts que puede salir en la tarjeta (semanas 4–42, frutas y geek), para
 * decir «del tamaño de una mazorca de maíz». Si cambia un tamaño en weeks.ts, agrega aquí su artículo (la prueba de
 * PandaStory revisa que estén todos).
 */
const SIZE_ARTICLE: Readonly<Record<string, "un" | "una" | "la">> = {
  // frutas
  "Semilla de amapola": "una", "Semilla de sésamo (ajonjolí)": "una", Lenteja: "una", Arándano: "un", Frambuesa: "una",
  Cereza: "una", Fresa: "una", Higo: "un", Ciruela: "una", Limón: "un", Durazno: "un", Manzana: "una", Aguacate: "un",
  Granada: "una", "Pimiento morrón": "un", Mango: "un", Plátano: "un", Zanahoria: "una", "Papaya pequeña": "una",
  Toronja: "una", "Mazorca de maíz": "una", "Nabo grande": "un", Lechuga: "una", Coliflor: "una", Berenjena: "una",
  "Calabaza alargada": "una", Repollo: "un", Coco: "un", "Papaya grande": "una", Piña: "una", "Melón cantalupo": "un",
  "Melón verde": "un", "Racimo de plátanos": "un", "Calabaza mediana": "una", "Sandía mini": "una", "Melón grande": "un",
  "Sandía pequeña": "una",
  // geek
  "Punta de un bolígrafo": "la", "Tornillo de laptop": "un", "LED de indicador": "un", "Botón de un control": "un",
  "Dado de seis caras": "un", "Ficha de arcade": "una", "Memoria USB pequeña": "una", "Cubo de rompecabezas de llavero": "un",
  "Pila AA": "una", "Figura de acción pequeña": "una", "Carta coleccionable": "una", "Mouse de computadora": "un",
  "Control de consola retro": "un", "Teléfono celular pequeño": "un", "Teléfono celular": "un", "Consola portátil clásica": "una",
  "Consola portátil grande": "una", "Teclado inalámbrico delgado": "un", "Tableta de 10 pulgadas": "una",
  "Tableta de 11 pulgadas": "una", "Mango de espada láser de juguete": "un", "Teclado mecánico compacto": "un",
  "Laptop de 11 pulgadas": "una", "Teclado sin bloque numérico": "un", "Laptop de 13 pulgadas": "una",
  "Laptop de 14 pulgadas": "una", "Laptop de 15 pulgadas": "una", "Teclado completo con reposamuñecas": "un",
  "Barra de sonido compacta": "una", "Consola de sobremesa compacta": "una", "Laptop gamer": "una",
  "Laptop gamer de 16 pulgadas": "una", "Laptop gamer de 17 pulgadas": "una", "Consola de sobremesa": "una",
  "Torre de PC compacta": "una", "Consola de sobremesa grande": "una", "Consola de sobremesa grande con un control": "una",
  "Consola de sobremesa grande con dos controles": "una",
};

/**
 * «Del tamaño de una mazorca de maíz» (natural); sin artículo conocido, la forma de la Guía, que no lo necesita:
 * «Tamaño aproximado: …».
 */
export function sizePhrase(label: string): { text: string; natural: boolean } {
  const article = SIZE_ARTICLE[label];
  if (!article) return { text: `Tamaño aproximado: ${lowerFirst(label)}`, natural: false };
  return { text: `Del tamaño de ${article} ${lowerFirst(label)}`, natural: true };
}

/** La tira de la cuenta regresiva: hoy y, en partes iguales, hasta la 40 (24 → 24 28 32 36 40; 38 → 38 39 40). */
export function countdownWeeks(week: number): number[] {
  const w = Math.floor(week);
  if (w >= 40) return [40];
  const n = Math.min(5, 40 - w + 1);
  return Array.from({ length: n }, (_, i) => Math.round(w + ((40 - w) * i) / (n - 1)));
}

/** Palabras que la app guarda cuando no hay nombre: no son nombres y no van en una tarjeta pública. */
const NOT_A_NAME = new Set(["invitado", "invitada", "mamá", "mama", "papá", "papa", "copiloto", "tu pareja"]);

/** El nombre tal como la persona lo escribió, o undefined si no hay uno real. */
export function realName(name: string | null | undefined): string | undefined {
  const n = name?.trim().replace(/\s+/g, " ");
  if (!n || NOT_A_NAME.has(n.toLocaleLowerCase("es"))) return undefined;
  return n;
}

export type StoryPerson = { name?: string; role: "mama" | "papa" };

/** «Ana y Luis» (mamá primero, como en la app) o un solo nombre; null si no hay ninguno real. */
export function coupleLine(people: StoryPerson[]): { line: string; people: StoryPerson[] } | null {
  const real = people
    .map((p) => ({ ...p, name: realName(p.name) }))
    .filter((p): p is { name: string; role: "mama" | "papa" } => !!p.name)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "mama" ? -1 : 1));
  if (real.length === 0) return null;
  // «Ana e Iván», «Ana e Hilario»: «y» pasa a «e» ante el sonido /i/ (no ante «hie-», «hia-» ni «y-»).
  const joiner = real.length > 1 && /^h?[ií](?![aeiouáéíóú])/i.test(real[1].name) ? " e " : " y ";
  return { line: real.map((p) => p.name).join(joiner), people: real };
}

/** Lo que la cuenta regresiva puede decir hoy, o por qué no está. */
export type StoryCountdown =
  | { kind: "dias"; days: number; estimated: boolean }
  | { kind: "hoy" }
  | { kind: "no"; reason: string };

export type StoryFacts =
  | { gate: "ok"; week: number; countdown: StoryCountdown }
  | { gate: "revisar" | "temprano" | "sin-semana" };

/**
 * Qué puede mostrar la tarjeta. La primera regla que aplica gana:
 * - revisar: la fecha probable quedó fuera de rango (más de 42 + 6) o la pareja la está revisando;
 * - sin-semana: la semana no está confirmada;
 * - temprano: semanas 1–3 (todavía no hay nada que medir);
 * - ok: la semana y, si hay fecha probable de verdad, los días que faltan.
 */
export function storyFacts(ga: GestationalAgeState, dueDateNeedsReview = false): StoryFacts {
  if (dueDateNeedsReview || (ga.source === "dueDate" && (ga.totalDays ?? 0) > MAX_VALID_GESTATION_DAYS)) return { gate: "revisar" };
  if (ga.source === "unknown" || typeof ga.weeks !== "number") return { gate: "sin-semana" };
  if (ga.weeks < 4) return { gate: "temprano" };
  return { gate: "ok", week: ga.weeks, countdown: storyCountdown(ga) };
}

function storyCountdown(ga: GestationalAgeState): StoryCountdown {
  if (ga.source !== "dueDate" || typeof ga.totalDays !== "number") {
    return { kind: "no", reason: "Para contar los días hace falta la fecha probable. Agrégala en Ajustes." };
  }
  const left = PREGNANCY_DAYS - ga.totalDays;
  if (left > 0) return { kind: "dias", days: left, estimated: ga.dueDateSource === "manual" };
  if (left === 0) return { kind: "hoy" };
  return { kind: "no", reason: "Ya pasó la fecha probable: la cuenta regresiva terminó." };
}

/** «Faltan 109 días», «Faltan unos 109 días» (fecha estimada por la semana), «Falta 1 día». */
export function countdownText(c: Extract<StoryCountdown, { kind: "dias" }>): { lead: string; number: string } {
  const lead = c.days === 1 ? (c.estimated ? "Falta más o menos" : "Falta") : c.estimated ? "Faltan unos" : "Faltan";
  return { lead, number: `${c.days} ${c.days === 1 ? "día" : "días"}` };
}
