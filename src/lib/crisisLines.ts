// Países del mercado y líneas de crisis de salud mental por país (R2 · paso 4).
//
// Isomórfico y sin dependencias: lo usan la interfaz (equipo de salud, SOS, tarjeta de urgencia del
// chat) y sus pruebas. No toca window / navigator en el ámbito de módulo.
//
// REGLA: solo líneas verificadas en una fuente oficial (gobierno, ministerio de salud o la propia
// línea), con la URL junto al dato y la fecha de la verificación. Nunca se inventa un número. Un país
// sin línea verificada queda solo con Emergencias (la persona puede escribir la suya en el equipo de
// salud). Verificación: 2026-09-30.
//
// Descartadas en esa verificación (sin fuente oficial que confirme una línea de 24 h vigente):
// - Colombia: la página del Minsalud sobre la 192 opción 4 ya no existe (404) y solo hay evidencia de
//   2020–2021; la 106 es solo para Bogotá. Queda con Emergencias 123.
// - República Dominicana: el 811 figura como «se habilitará durante 2026» en msp.gob.do / sns.gob.do; el
//   809-200-1400 atiende de 8:00 a 24:00.
// - Ecuador: la 171 opción 6 figura de 7:00 a 20:00 en la página oficial del MSP (2023).
// - Panamá (MIDES 147): la página oficial no respondió; sin lectura directa no se incluye.
// - Argentina 135 / 0800-345-1435 (Centro de Asistencia al Suicida): ONG, de 8:00 a 24:00. Se usa la
//   línea nacional oficial de 24 h.
// - Costa Rica, El Salvador, Honduras, Venezuela: sin fuente oficial verificada.
// - Nicaragua, Guatemala (añadidos 2026-09-30): sin línea de crisis de 24 h verificada; solo Emergencias
//   (128 y 122, fuentes en EMERGENCY_NUMBERS de urgency.ts).
// - Bolivia: el 168 (número único, Minsalud 2018) se anunció con implementación gradual y no hay
//   confirmación de que funcione en todo el país; no se incluye hasta verificarlo.

import { EMERGENCY_NUMBERS } from "./urgency";

/** Valor del selector para un país fuera de la lista: sin línea de crisis, Emergencias editable. */
export const OTHER_COUNTRY = "OTHER";

/** Países del mercado con número de emergencias conocido (orden alfabético en español). */
export const MARKET_COUNTRIES: readonly { code: string; name: string }[] = [
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "EC", name: "Ecuador" },
  { code: "SV", name: "El Salvador" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "MX", name: "México" },
  { code: "NI", name: "Nicaragua" },
  { code: "PA", name: "Panamá" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Perú" },
  { code: "PR", name: "Puerto Rico" },
  { code: "DO", name: "República Dominicana" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
];

export function isMarketCountry(code: unknown): code is string {
  return typeof code === "string" && MARKET_COUNTRIES.some((c) => c.code === code);
}

/** Valor válido para `careTeam.country`: un país de la lista o «Otro». */
export function isCountryChoice(code: unknown): code is string {
  return code === OTHER_COUNTRY || isMarketCountry(code);
}

export function countryName(code: string | null | undefined): string | null {
  if (code === OTHER_COUNTRY) return "Otro país";
  return MARKET_COUNTRIES.find((c) => c.code === code)?.name ?? null;
}

/** Número de emergencias por defecto de un país de la lista (undefined para «Otro» o desconocido). */
export function emergencyNumberFor(code: string | null | undefined): string | undefined {
  return isMarketCountry(code) ? EMERGENCY_NUMBERS[code] : undefined;
}

export type CrisisLine = {
  /** Nombre corto para la interfaz. */
  name: string;
  /** Número tal como se muestra. */
  display: string;
  /** Lo que se marca. Con * o # no se ofrece enlace: iOS no marca esos tel: y el botón no haría nada. */
  dial: string;
  /** Detalle confirmado por la fuente: horario, costo, cómo marcar. */
  hint: string;
  /** Fuente oficial consultada. */
  source: string;
};

/** Líneas de crisis verificadas (2026-09-30). La fuente de cada una va en `source`. */
export const CRISIS_LINES: Readonly<Record<string, CrisisLine>> = {
  // «marque 988 y presione 2» · «envía la palabra AYUDA a 988» · «servicios gratuitos en español las 24 horas».
  US: {
    name: "Línea 988",
    display: "988",
    dial: "988",
    hint: "Marca 2 para español · gratis, 24 h",
    source: "https://988lifeline.org/interpretation-services/servicios-en-espanol/",
  },
  // Línea PAS de ASSMCA: «1-800-981-0023» y 988, «Disponible 24/7 · 365 días». (La gratuidad no está en la página.)
  PR: {
    name: "Línea PAS",
    display: "1-800-981-0023",
    dial: "18009810023",
    hint: "24 h, todos los días · también el 988",
    source: "https://lineapas.assmca.pr.gov/",
  },
  // Línea de la Vida (CONASAMA): «800-911-2000», «disponible las 24 horas del día, los 365 días del año», «gratuito».
  MX: {
    name: "Línea de la Vida",
    display: "800 911 2000",
    dial: "8009112000",
    hint: "Gratis, 24 h",
    source: "https://www.gob.mx/conasama/articulos/linea-de-la-vida-800-911-2000",
  },
  // Ministerio de Sanidad: «El 024 es un servicio de alcance nacional […], gratuito, confidencial y disponible las 24 horas».
  ES: {
    name: "Línea 024",
    display: "024",
    dial: "024",
    hint: "Gratis y confidencial, 24 h",
    source: "https://www.sanidad.gob.es/linea024/home.htm",
  },
  // Ministerio de Salud (10-09-2026): «0800-999-0091», «las 24 horas, los 365 días del año», gratuita, todo el país,
  // riesgo suicida y autolesión.
  AR: {
    name: "Línea de Salud Mental",
    display: "0800 999 0091",
    dial: "08009990091",
    hint: "Gratis, 24 h, todo el país",
    source:
      "https://www.argentina.gob.ar/noticias/la-linea-nacional-de-orientacion-y-apoyo-en-la-urgencia-de-salud-mental-funciona-las-24",
  },
  // Chile Crece Contigo (Gobierno de Chile): «La línea telefónica *4141 es completamente gratuita y se puede llamar desde
  // celulares de lunes a domingo, las 24 horas del día». (minsal.cl bloquea la lectura automática.)
  CL: {
    name: "No estás solo, no estás sola",
    display: "*4141",
    dial: "*4141",
    hint: "Desde celular · gratis, 24 h",
    source:
      "https://www.crececontigo.gob.cl/noticias/no-estas-solo-no-estas-sola-ministerio-de-salud-tiene-disponible-el-fono-4141-linea-prevencion-del-suicidio/",
  },
  // Minsa (13-01-2026): «la Línea 113, opción 5, que brinda orientación y apoyo psicológico las 24 horas del día», gratuita.
  PE: {
    name: "Línea 113, opción 5",
    display: "113 · opción 5",
    dial: "113",
    hint: "Marca 5 al contestar · gratis, 24 h",
    source:
      "https://www.gob.pe/institucion/minsa/noticias/1332478-minsa-recuerda-que-la-linea-113-brinda-orientacion-y-apoyo-psicologico-gratuito-las-24-horas",
  },
  // ASSE: «0800 0767» (fijo) y «*0767» (celular), «24 horas […] 365 días», gratuita.
  UY: {
    name: "Línea Vida",
    display: "*0767",
    dial: "*0767",
    hint: "Desde celular (0800 0767 desde un fijo) · gratis, 24 h",
    source: "https://www.asse.com.uy/contenido/Linea-de-Prevencion-del-Suicidio-0800-0767-0767-12540",
  },
  // MSPBS: «La Línea 155 Salud Mental, operativa desde mayo de 2025, es un servicio gratuito, confidencial y de cobertura
  // nacional […] disponible las 24 horas durante todo el año»; atiende crisis suicidas.
  PY: {
    name: "Línea 155",
    display: "155",
    dial: "155",
    hint: "Gratis, 24 h, todo el país",
    source:
      "https://www.mspbs.gov.py/portal/35318/linea-155-asistencia-en-situaciones-de-crisis-en-salud-mental-todo-el-antildeo.html",
  },
};

/** Línea verificada de un país (null para «Otro», desconocido o sin línea verificada). */
export function crisisLineFor(code: string | null | undefined): CrisisLine | null {
  return code && code !== OTHER_COUNTRY ? CRISIS_LINES[code] ?? null : null;
}

/** Línea escrita a mano en el equipo de salud (prioridad sobre la del país). */
export function customCrisisLine(number: string): CrisisLine {
  const n = number.trim();
  return { name: "Línea de crisis", display: n, dial: n, hint: "La que guardaron en el equipo de salud", source: "" };
}

/** Se puede ofrecer como enlace tel: (sin * ni #, que iOS no marca). */
export function canDial(line: Pick<CrisisLine, "dial">): boolean {
  return /\d/.test(line.dial) && !/[*#]/.test(line.dial);
}

/** tel: para una línea marcable (solo dígitos y un + inicial). */
export function crisisTelHref(line: Pick<CrisisLine, "dial">): string {
  const trimmed = line.dial.trim();
  return "tel:" + (trimmed.startsWith("+") ? "+" : "") + trimmed.replace(/\D/g, "");
}
