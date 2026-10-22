/**
 * Lecturas: artículos según la semana y libros por trimestre (Juntos › Lecturas y «Para leer esta semana» en
 * «Hoy»). Puro (sin React ni Firebase).
 *
 * Criterios del contenido (enlaces leídos uno por uno en octubre de 2026):
 * - Artículos en español de fuentes públicas de salud: MedlinePlus (Biblioteca Nacional de Medicina de EE. UU.),
 *   HealthyChildren (Academia Americana de Pediatría) y la FDA. Una fuente que no se deja leer no entra (ACOG no
 *   publica sus guías en español; CDC rechaza la lectura automática).
 * - Ninguno contradice las reglas de la app. Quedaron fuera «Parto prematuro» de MedlinePlus (avisa con más de 5
 *   contracciones por hora; la app, desde 4) y «Estrategias para transitar el trabajo de parto» (regla 4-1-1; la app
 *   usa la 5-1-1).
 * - El título es el de la fuente (en «usted»); `why` es nuestra, en tuteo, y solo dice lo que el artículo trae.
 * - Cada artículo vale en un tramo de semanas (`from`–`to`), no una semana suelta: entre la 1 y la 42 siempre hay
 *   al menos uno para cada rol.
 * - Libros publicados en español, confirmados con la editorial o en catálogos de bibliotecas. Sin enlaces de compra.
 * - Nadie del área de salud revisó esta selección: no la presentes como recomendada por médicos.
 */

import { WEEK_MAX, WEEK_MIN } from "@/lib/weeks";

/** Para quién es la lectura: la mamá, el papá o los dos. */
export type ReadingFor = "mama" | "papa" | "ambos";
export type ReadingRole = "mama" | "papa";

export type Article = {
  id: string;
  /** Título tal como lo publica la fuente. */
  title: string;
  source: string;
  url: string;
  /** Tramo de semanas en que vale la pena leerlo. */
  from: number;
  to: number;
  for: ReadingFor;
  /** Qué trae, en una frase. */
  why: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  /** Editorial y año de la edición en español que se verificó. */
  edition: string;
  trimester: 1 | 2 | 3;
  for: ReadingFor;
  why: string;
};

/** Cuándo se leyeron los enlaces por última vez (se dice en la pantalla). */
export const READINGS_CHECKED = "octubre de 2026";

const MEDLINE = "MedlinePlus";
const AAP = "HealthyChildren (AAP)";

/** En orden de aparición (`from`); ante un empate, manda el orden de esta lista. */
export const ARTICLES: readonly Article[] = [
  {
    id: "acido-folico",
    title: "Ácido fólico",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/folicacid.html",
    from: 1,
    to: 8,
    for: "ambos",
    why: "Qué es, por qué importa antes y durante el embarazo y qué defectos ayuda a prevenir.",
  },
  {
    id: "listeria",
    title: "Listeria (Seguridad alimentaria para futuras mamás)",
    source: "FDA",
    url: "https://www.fda.gov/food/people-risk-foodborne-illness/listeria-seguridad-alimentaria-para-futuras-mamas",
    from: 4,
    to: 13,
    for: "ambos",
    why: "Qué quesos y alimentos evitar, también el queso fresco, y cómo prepararlos sin riesgo.",
  },
  {
    id: "nauseas",
    title: "Náuseas del embarazo",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/patientinstructions/000604.htm",
    from: 5,
    to: 14,
    for: "mama",
    why: "Qué comer y beber, qué más probar y cuándo llamar al médico.",
  },
  {
    id: "primer-trimestre",
    title: "Cuidados prenatales en el primer trimestre",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/patientinstructions/000544.htm",
    from: 6,
    to: 13,
    for: "ambos",
    why: "La primera consulta, los análisis, las ecografías y las pruebas genéticas.",
  },
  {
    id: "pruebas-prenatales",
    title: "Pruebas prenatales",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/prenataltesting.html",
    from: 10,
    to: 20,
    for: "ambos",
    why: "Qué son, para qué sirven y en qué se diferencian sus dos tipos.",
  },
  {
    id: "segundo-trimestre",
    title: "Cuidado prenatal en el segundo trimestre",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/patientinstructions/000557.htm",
    from: 14,
    to: 20,
    for: "ambos",
    why: "Las consultas de esta etapa: análisis, ecografías y cuándo llamar al médico.",
  },
  {
    id: "comer-bien",
    title: "Comer bien durante el embarazo",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/patientinstructions/000584.htm",
    from: 14,
    to: 24,
    for: "ambos",
    why: "Comer para dos sin exagerar: qué comer, líquidos, vitaminas y antojos.",
  },
  {
    id: "papas-involucrarse",
    title: "Nuevos papás, compañeros y parejas: por qué es importante involucrarse en la crianza de los hijos",
    source: AAP,
    url: "https://www.healthychildren.org/Spanish/ages-stages/baby/Paginas/a-special-message-to-fathers.aspx",
    from: 16,
    to: 27,
    for: "papa",
    why: "Por qué tu participación importa en el embarazo, el parto y los primeros meses.",
  },
  {
    id: "ecografia",
    title: "Ecografía en el embarazo",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/article/003778.htm",
    from: 18,
    to: 22,
    for: "ambos",
    why: "Cómo se hace, qué se siente y para qué sirve cada ecografía.",
  },
  {
    id: "diabetes-gestacional",
    title: "Diabetes gestacional",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/article/000896.htm",
    from: 23,
    to: 28,
    for: "ambos",
    why: "Qué es, cómo se detecta con la prueba de glucosa y cómo se controla.",
  },
  {
    id: "vacunas",
    title: "Vacunas y embarazo: ¿cómo cuidar su salud y la de su bebé?",
    source: AAP,
    url: "https://www.healthychildren.org/spanish/ages-stages/prenatal/paginas/vaccines-during-pregnancy-keeping-you-and-your-baby-healthy.aspx",
    from: 26,
    to: 36,
    for: "ambos",
    why: "Cuáles se recomiendan en el embarazo (Tdap, gripe, VRS) y cuándo ponérselas.",
  },
  {
    id: "tercer-trimestre",
    title: "Cuidado prenatal en el tercer trimestre",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/patientinstructions/000558.htm",
    from: 28,
    to: 32,
    for: "ambos",
    why: "Las consultas del final, los movimientos del bebé y cuándo llamar al médico.",
  },
  {
    id: "pediatra",
    title: "Cómo elegir a un pediatra para su hijo",
    source: AAP,
    url: "https://www.healthychildren.org/Spanish/family-life/health-management/Paginas/how-to-choose-a-pediatrician.aspx",
    from: 29,
    to: 35,
    for: "papa",
    why: "Dónde buscar pediatras y qué preguntarles en la entrevista.",
  },
  {
    id: "plan-parto",
    title: "Qué incluir en su plan para el parto",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/patientinstructions/000567.htm",
    from: 30,
    to: 36,
    for: "ambos",
    why: "Qué decidir sobre la sala de partos, el alivio del dolor y las primeras horas con el bebé.",
  },
  {
    id: "silla-auto",
    title: "Sillas de seguridad para auto: información para familias",
    source: AAP,
    url: "https://www.healthychildren.org/Spanish/safety-prevention/on-the-go/Paginas/Car-Safety-Seats-Information-for-Families.aspx",
    from: 31,
    to: 38,
    for: "papa",
    why: "Los tipos de silla y cómo instalarla bien en el auto.",
  },
  {
    id: "sueno-seguro",
    title: "Cómo mantener seguro a su bebé cuando duerme: explicamos la política de la AAP",
    source: AAP,
    url: "https://www.healthychildren.org/Spanish/ages-stages/baby/sleep/Paginas/a-parents-guide-to-safe-sleep.aspx",
    from: 34,
    to: 40,
    for: "ambos",
    why: "Boca arriba, en su propia cuna y en la misma habitación: por qué y cómo.",
  },
  {
    id: "calostro",
    title: "Calostro: la primera comida de su bebé",
    source: AAP,
    url: "https://www.healthychildren.org/Spanish/ages-stages/baby/breastfeeding/Paginas/colostrum-your-babys-first-meal.aspx",
    from: 35,
    to: 40,
    for: "mama",
    why: "La primera leche: qué es y cómo es la primera vez que le das pecho.",
  },
  {
    id: "trabajo-de-parto",
    title: "¿Estoy en trabajo de parto?",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/patientinstructions/000508.htm",
    from: 36,
    to: 41,
    for: "ambos",
    why: "Cómo distinguir las contracciones de práctica del trabajo de parto y cuándo llamar.",
  },
  {
    id: "depresion-posparto",
    title: "Depresión posparto",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/postpartumdepression.html",
    from: 39,
    to: 42,
    for: "mama",
    why: "Cómo reconocerla, por qué aparece y cómo se trata.",
  },
  {
    id: "papas-depresion",
    title: "Depresión posparto y perinatal: ¿pueden ambos padres tener «melancolía del puerperio»?",
    source: AAP,
    url: "https://www.healthychildren.org/Spanish/ages-stages/prenatal/delivery-beyond/Paginas/Dads-Can-Get-Postpartum-Depression-Too.aspx",
    from: 39,
    to: 42,
    for: "papa",
    why: "Los papás también pueden tenerla: las señales y cómo pedir ayuda.",
  },
  {
    id: "pasar-fecha",
    title: "Cuando se pase de la fecha probable de parto",
    source: MEDLINE,
    url: "https://medlineplus.gov/spanish/ency/patientinstructions/000515.htm",
    from: 40,
    to: 42,
    for: "ambos",
    why: "Por qué pasa, sus riesgos y cómo se induce el parto si hace falta.",
  },
];

export const BOOKS: readonly Book[] = [
  {
    id: "que-esperar",
    title: "Qué puedes esperar cuando estás esperando",
    author: "Heidi Murkoff",
    edition: "Workman, 5.ª edición en español, 2023",
    trimester: 1,
    for: "ambos",
    why: "Una guía mes a mes: los cambios de cada etapa, los controles y las dudas más comunes.",
  },
  {
    id: "voy-a-ser-papa",
    title: "Voy a ser papá",
    author: "Armin A. Brott y Jennifer Ash",
    edition: "Aguilar, 2016",
    trimester: 1,
    for: "papa",
    why: "Mes a mes, lo que vive el futuro papá (en lo emocional, lo económico y hasta lo físico) y cómo acompañar.",
  },
  {
    id: "parir",
    title: "Parir: el poder del parto",
    author: "Ibone Olza",
    edition: "Vergara, edición actualizada, 2021",
    trimester: 2,
    for: "ambos",
    why: "Un ensayo, no un manual: el parto desde la psicología y la neurociencia, escrito por una psiquiatra perinatal.",
  },
  {
    id: "regalo-toda-la-vida",
    title: "Un regalo para toda la vida: guía de la lactancia materna",
    author: "Carlos González",
    edition: "Planeta, 2006",
    trimester: 2,
    for: "mama",
    why: "Una guía práctica de lactancia: cómo empezar y cómo resolver los problemas frecuentes.",
  },
  {
    id: "cuidado-bebe-aap",
    title: "El cuidado de su bebé y niño pequeño: desde el nacimiento hasta los 5 años",
    author: "Academia Americana de Pediatría",
    edition: "3.ª edición, 2016",
    trimester: 3,
    for: "ambos",
    why: "La guía de los pediatras de la AAP para el día a día con el bebé: alimentación, cuidados, salud y desarrollo.",
  },
];

/** Semana entera dentro de 1..42, o undefined si no es un número usable. */
function asWeek(week: number | undefined): number | undefined {
  if (typeof week !== "number" || !Number.isFinite(week) || week < WEEK_MIN) return undefined;
  return Math.min(WEEK_MAX, Math.floor(week));
}

export function isForReader(item: { for: ReadingFor }, reader: ReadingRole): boolean {
  return item.for === "ambos" || item.for === reader;
}

/** Los artículos de esa semana, el más reciente primero (el que acaba de empezar es el más de «esta semana»). */
export function articlesForWeek(week: number | undefined): Article[] {
  const w = asWeek(week);
  if (w === undefined) return [];
  // sort es estable: ante el mismo `from`, manda el orden de ARTICLES.
  return ARTICLES.filter((a) => a.from <= w && w <= a.to).sort((a, b) => b.from - a.from);
}

/** Cuántos artículos son «de esta semana» para quien lee: los más recientes; el resto sigue en su trimestre. */
const WEEK_READINGS_MAX = 3;

/** «Esta semana» (Lecturas y su fila en Juntos): para quien lee o para los dos, los 3 más recientes. */
export function weekReadings(week: number | undefined, reader: ReadingRole): Article[] {
  return articlesForWeek(week).filter((a) => isForReader(a, reader)).slice(0, WEEK_READINGS_MAX);
}

/** «Para leer esta semana» en «Hoy»: el primero de «Esta semana». */
export function weekReading(week: number | undefined, reader: ReadingRole): Article | undefined {
  return weekReadings(week, reader)[0];
}

/** Semanas de cada trimestre (el tercero llega hasta la 42). */
const TRIMESTER_WEEKS: Record<1 | 2 | 3, readonly [number, number]> = { 1: [1, 13], 2: [14, 27], 3: [28, WEEK_MAX] };

/**
 * Los artículos cuyo tramo toca el trimestre (Vacunas, de la 26 a la 36, está en el 2.º y en el 3.º), en orden
 * de aparición. Con `week`, los que ya pasaron van al final: primero lo que vale ahora o viene.
 */
export function articlesOfTrimester(trimester: 1 | 2 | 3, week?: number): Article[] {
  const [start, end] = TRIMESTER_WEEKS[trimester];
  const list = ARTICLES.filter((a) => a.from <= end && a.to >= start);
  const w = asWeek(week);
  if (w === undefined) return list;
  return [...list.filter((a) => a.to >= w), ...list.filter((a) => a.to < w)];
}

export function booksOfTrimester(trimester: 1 | 2 | 3): Book[] {
  return BOOKS.filter((b) => b.trimester === trimester);
}

/** «Para ti», «Para los dos» o «Para Ana» (sin nombre: «Para mamá» / «Para papá»). */
export function readingForLabel(forWhom: ReadingFor, reader: ReadingRole, partnerName?: string): string {
  if (forWhom === "ambos") return "Para los dos";
  if (forWhom === reader) return "Para ti";
  return `Para ${partnerName?.trim() || (forWhom === "mama" ? "mamá" : "papá")}`;
}

/** «Semanas 18 a 22». */
export function articleWeeks(a: Pick<Article, "from" | "to">): string {
  return a.from === a.to ? `Semana ${a.from}` : `Semanas ${a.from} a ${a.to}`;
}
