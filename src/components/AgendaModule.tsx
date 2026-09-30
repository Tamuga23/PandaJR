"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Bot,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleAlert,
  ClipboardList,
  Clock,
  Download,
  FlaskConical,
  Lightbulb,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCw,
  ScanHeart,
  Stethoscope,
  Syringe,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePandaStore, type UserProfile } from "@/store/usePandaStore";
import { currentUid, listenToAppointmentPrep, setAppointmentPrepItem, type SharedDocMeta } from "@/lib/firebase/pairing";
import { clinicalWeek } from "@/lib/urgency";
import { formatDateShort, repairMojibake } from "@/lib/format";
import { localToSharedFlag } from "@/lib/seeds";
import { AuthorChip } from "@/components/AuthorChip";
import { SyncBadge, usePartner } from "@/components/SyncBadge";
import { ModalPortal } from "@/components/ModalPortal";
import { ListGroup, ListRow, RowButton, Section } from "@/components/ui/List";
import { useModalDialog } from "@/lib/useModalDialog";
import { Z_CLASS } from "@/lib/layers";

export type { UserProfile };

// =====================================================================================
// Tipos
// =====================================================================================

export type AgendaEventType = "ecografia" | "laboratorio" | "control" | "vacuna" | "otro";

export type AgendaEvent = {
  id: number | string;
  /** Texto corto para mostrar ("15 oct"). La fecha fiable es rawDate (AAAA-MM-DD). */
  date: string;
  rawDate?: string;
  /** "10:30", "10:30 AM" o "Por definir". */
  time?: string;
  title: string;
  doctor?: string;
  type?: AgendaEventType;
  createdBy?: string;
  createdByName?: string;
};

export interface AppointmentPrepInfo {
  category: string;
  badge: string;
  whatToBring: string[];
  whatToAsk: string[];
  tip: string;
}

/** Firma del toast de page.tsx: "Deshacer" solo aparece si llega onUndo. (Sintaxis de método: acepta ambas firmas.) */
type ToastFn = { bivarianceHack(message: string, onUndo?: () => void): void }["bivarianceHack"];

const EVENT_TYPES: { value: AgendaEventType; label: string; Icon: LucideIcon }[] = [
  { value: "ecografia", label: "Ecografía", Icon: ScanHeart },
  { value: "laboratorio", label: "Laboratorio", Icon: FlaskConical },
  { value: "control", label: "Control prenatal", Icon: Stethoscope },
  { value: "vacuna", label: "Vacuna", Icon: Syringe },
  { value: "otro", label: "Otro", Icon: CalendarDays },
];

const TYPE_META = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t])) as Record<
  AgendaEventType,
  (typeof EVENT_TYPES)[number]
>;

function isEventType(v: unknown): v is AgendaEventType {
  return typeof v === "string" && v in TYPE_META;
}

// =====================================================================================
// Texto: normalización e inferencia del tipo por palabras completas
// =====================================================================================

/** Repara mojibake, quita acentos y pasa a minúsculas para comparar por palabras. */
function normalize(s: unknown): string {
  if (typeof s !== "string") return "";
  return repairMojibake(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Texto visible de un campo que puede venir mal formado de Firestore: "" si no es texto. */
function cleanStr(v: unknown): string {
  return typeof v === "string" ? repairMojibake(v).trim() : "";
}

// Siempre con límites de palabra: "lab" no coincide con "labor", ni "20" con "2026".
const RX = {
  vacuna: /\b(vacunas?|vacunacion|tdap|dtpa|influenza|gripe|covid|vsr|abrysvo)\b/,
  glucosa: /\b(glucosa|glucemia|glicemia|curva|tolerancia|ptog|ogtt)\b|sullivan/,
  sgb: /\b(estreptococo|sgb|gbs|exudado)\b|\bcultivo (vaginal|rectal|recto)\b/,
  eco: /\b(eco|ecos|ecografia|ecografias|ecosonograma|ultrasonido|ultrasonografia|sonografia|ecodoppler|doppler|translucencia|morfologica|3d|4d|5d)\b/,
  lab: /\b(laboratorio|lab|labs|analisis|analitica|examen|examenes|sangre|orina|urocultivo|hemograma|cultivo|serologia|toxoplasma|toxoplasmosis|vih|hepatitis)\b/,
  tamizaje: /\b(tamizaje|cribado|screening)\b/,
  control: /\b(control|controles|consulta|chequeo|revision|monitoreo|monitorizacion|nst|preparto|prenatal|obstetra|ginecologo|ginecologa|matrona|partera)\b/,
  eco3d: /\b(3d|4d|5d|emocional)\b/,
  ecoT2: /\b(morfologica|morfologico|morfologia|estructural|anatomica|anatomia)\b|\bsegundo trimestre\b/,
  ecoT1: /\b(tamizaje|translucencia|nucal|tn|cribado|screening)\b|\bprimer trimestre\b/,
  ecoT3: /\b(crecimiento|doppler|bienestar|biofisico)\b|\btercer trimestre\b/,
  preparto: /\b(preparto|monitoreo|monitorizacion|nst|parto)\b/,
};

/** Tipo probable según el título (para citas antiguas o de la IA, que no guardan `type`). */
export function inferEventType(title: unknown): AgendaEventType {
  const t = normalize(title);
  if (!t) return "otro";
  if (RX.vacuna.test(t)) return "vacuna";
  if (RX.glucosa.test(t) || RX.sgb.test(t)) return "laboratorio";
  if (RX.eco.test(t)) return "ecografia";
  if (RX.lab.test(t)) return "laboratorio";
  if (RX.tamizaje.test(t)) return "ecografia";
  if (RX.control.test(t)) return "control";
  return "otro";
}

function eventKind(ev: { type?: unknown; title?: unknown }): AgendaEventType {
  return isEventType(ev.type) ? ev.type : inferEventType(ev.title);
}

/** Semana mencionada en el título ("de las 12 semanas", "semana 36"), si es plausible. */
function weekHint(t: string): number | undefined {
  const m = t.match(/\bsemanas? (?:de |numero )?(\d{1,2})\b/) ?? t.match(/\b(\d{1,2}) ?(?:semanas?|sem|ss|sdg)\b/);
  const n = m ? parseInt(m[1], 10) : NaN;
  return n >= 4 && n <= 42 ? n : undefined;
}

// =====================================================================================
// Guías de preparación
// =====================================================================================

type GuideId =
  | "eco_t1"
  | "eco_t2"
  | "eco_3d"
  | "eco_t3"
  | "eco_general"
  | "lab_general"
  | "lab_glucosa"
  | "lab_sgb"
  | "control_general"
  | "control_preparto"
  | "vacuna"
  | "otro";

const PREP_GUIDES: Record<GuideId, AppointmentPrepInfo> = {
  eco_t1: {
    category: "Ecografía de tamizaje (semanas 11 a 14)",
    badge: "Desarrollo temprano",
    whatToBring: [
      "Ropa cómoda de dos piezas (evita vestidos enteros)",
      "Si la clínica lo pidió, la vejiga con algo de líquido (confirma antes: no siempre se pide)",
      "Resultados de análisis previos y del estudio de ADN fetal en sangre, si ya lo hiciste",
      "Carnet perinatal, documento de identidad y seguro",
    ],
    whatToAsk: [
      "¿Cuánto mide la translucencia nucal (el líquido bajo la piel de la nuca) y se ve el hueso nasal?",
      "¿Cuánto mide de la cabeza a las nalgas (longitud cráneo-caudal) y se confirma la fecha probable de parto?",
      "¿Cuál es la frecuencia cardiaca del bebé?",
      "¿El resultado del tamizaje sugiere hacer estudios adicionales?",
    ],
    tip: "Pregunta si pueden escuchar el latido juntos y si la clínica permite grabar un momento.",
  },
  eco_t2: {
    category: "Ecografía morfológica (semanas 18 a 22)",
    badge: "Anatomía detallada",
    whatToBring: [
      "Ropa de dos piezas (blusa y pantalón holgado para descubrir el vientre)",
      "Informes de las ecografías y análisis del primer trimestre",
      "Algo dulce o un jugo por si el bebé está dormido y te piden caminar unos minutos",
      "Carnet perinatal, documento de identidad y seguro",
    ],
    whatToAsk: [
      "¿Se ven bien las cuatro cámaras del corazón y el flujo sanguíneo?",
      "¿El crecimiento de la cabeza, el abdomen y el fémur corresponde a las semanas?",
      "¿Dónde está la placenta? ¿Descartamos placenta baja o previa?",
      "¿La cantidad de líquido amniótico y la longitud del cuello uterino están bien?",
      "¿Se puede ver el sexo y el perfil de la cara?",
    ],
    tip: "Es la ecografía más minuciosa (30 a 45 minutos). Si el especialista se queda en silencio un rato, suele ser porque está tomando medidas. Si tienes dudas, pregúntale al final.",
  },
  eco_3d: {
    category: "Ecografía 3D / 4D",
    badge: "Visualización",
    whatToBring: [
      "Ropa cómoda de dos piezas",
      "Un vaso de agua o jugo 20 minutos antes puede ayudar a que el bebé se mueva",
      "Teléfono con batería y espacio para fotos y videos",
    ],
    whatToAsk: [
      "¿Tiene las manos o el cordón frente a la cara?",
      "¿Cuál es el peso estimado hoy?",
      "¿Nos pueden entregar las imágenes en digital?",
    ],
    tip: "Si el bebé está de espaldas, acostarte de lado o caminar unos minutos suele ayudar a que cambie de postura.",
  },
  eco_t3: {
    category: "Ecografía del tercer trimestre",
    badge: "Crecimiento y posición",
    whatToBring: [
      "Ropa cómoda de dos piezas",
      "Informes de las ecografías anteriores",
      "Carnet perinatal, documento de identidad y seguro",
    ],
    whatToAsk: [
      "¿El peso estimado y el crecimiento van de acuerdo con las semanas?",
      "¿En qué posición está el bebé?",
      "¿Cómo están la placenta y el líquido amniótico?",
      "Si hicieron Doppler, ¿cómo está el flujo de la placenta y del cordón?",
    ],
    tip: "El peso estimado por ecografía tiene un margen de error: pregunta cómo interpretarlo junto con tu control.",
  },
  eco_general: {
    category: "Ecografía obstétrica",
    badge: "Seguimiento",
    whatToBring: [
      "Ropa cómoda de dos piezas",
      "Orden médica e informes de ecografías anteriores",
      "Carnet perinatal, documento de identidad y seguro",
    ],
    whatToAsk: [
      "¿El crecimiento del bebé corresponde a las semanas?",
      "¿Cómo están la placenta y el líquido amniótico?",
      "¿Me entregan hoy el informe y las imágenes?",
      "¿Cuándo es la próxima ecografía y qué se revisará?",
    ],
    tip: "Si es tu primera vez en esa clínica, llega 15 minutos antes para el registro.",
  },
  lab_general: {
    category: "Exámenes de laboratorio",
    badge: "Sangre y orina",
    whatToBring: [
      "Orden médica, documento de identidad y seguro",
      "Confirma si piden ayuno y de cuántas horas",
      "Si piden orina, pregunta si debe ser la primera de la mañana y cómo recogerla",
      "Algo de comer para después, si vas en ayuno",
    ],
    whatToAsk: [
      "¿Qué se revisa en estos análisis (hemoglobina, grupo y Rh, glucosa, orina, infecciones)?",
      "¿Cuándo estarán los resultados y quién me los explica?",
      "¿Debo suspender las vitaminas o el hierro antes de la toma?",
    ],
    tip: "Si te mareas con las extracciones, avísalo antes: pueden hacerla contigo recostada.",
  },
  lab_glucosa: {
    category: "Prueba de glucosa (prueba corta o curva)",
    badge: "Diabetes gestacional",
    whatToBring: [
      "Confirma si tu prueba requiere ayuno: la prueba corta de 1 hora (50 g) normalmente no; la curva de tolerancia (75 o 100 g) sí, de 8 a 10 horas",
      "Agua natural (pregunta si puedes beber durante la prueba)",
      "Un libro o audífonos: la prueba corta dura cerca de 1 hora y la curva, de 2 a 3 horas",
      "Algo nutritivo para comer apenas termine la última extracción",
    ],
    whatToAsk: [
      "¿Qué prueba me toca: la prueba corta de 1 hora o la curva de tolerancia?",
      "¿Cuándo estarán los resultados y quién me los explica?",
      "Si me mareo o tengo náuseas durante la espera, ¿a quién aviso?",
      "¿Tomo mis vitaminas antes o después de la prueba?",
    ],
    tip: "Quédate sentada y tranquila entre tomas: caminar o hacer esfuerzo puede alterar el resultado.",
  },
  lab_sgb: {
    category: "Cultivo de estreptococo del grupo B (SGB)",
    badge: "Semanas 36 a 37",
    whatToBring: [
      "Carnet perinatal, documento de identidad y seguro",
      "Orden médica, si la toma es en un laboratorio",
      "Lista de alergias a medicamentos (sobre todo a la penicilina)",
    ],
    whatToAsk: [
      "¿Cuándo estará el resultado y dónde queda registrado para el día del parto?",
      "Si sale positivo, ¿qué antibiótico me darán durante el parto?",
      "Si soy alérgica a algún antibiótico, ¿cambia el plan?",
    ],
    tip: "Es una toma rápida con hisopo de la vagina y el recto. Un resultado positivo es común y se trata con antibiótico durante el parto.",
  },
  control_general: {
    category: "Control prenatal",
    badge: "Chequeo periódico",
    whatToBring: [
      "Carnet de control perinatal",
      "Registro de presión arterial, si te la tomas en casa o en la farmacia",
      "Lista de síntomas y dudas de las últimas semanas",
      "Nombres exactos de los suplementos o vitaminas que tomas",
    ],
    whatToAsk: [
      "¿El aumento de peso y la altura uterina van como se espera?",
      "¿Los movimientos del bebé que siento son los esperados para esta semana?",
      "¿Puedo seguir con mi actividad física o conviene adaptarla?",
      "¿Qué señales deberían hacerme ir a urgencias de inmediato?",
    ],
    tip: "Anota las preguntas en tu teléfono apenas surjan durante el mes para no olvidarlas en la consulta.",
  },
  control_preparto: {
    category: "Control preparto y monitoreo",
    badge: "Recta final",
    whatToBring: [
      "Plan de parto impreso (dos copias: una para ti y otra para el equipo)",
      "Historial del embarazo, ecografías y resultado del cultivo de estreptococo del grupo B",
      "Ropa cómoda para el monitoreo",
      "Maleta del hospital lista, por si deciden ingresarte",
    ],
    whatToAsk: [
      "¿En qué posición está el bebé?",
      "¿El cuello uterino ya empezó a adelgazarse (borramiento) o a dilatarse?",
      "¿Con qué frecuencia y duración de contracciones debemos ir al hospital?",
      "¿Qué opciones de alivio del dolor hay (epidural y métodos sin medicamentos)?",
      "¿Quién del equipo estará de guardia o atenderá el parto?",
    ],
    tip: "Pregunta también la logística: por qué puerta entrar de noche, dónde estacionar y qué documentos llevar al llegar.",
  },
  vacuna: {
    category: "Vacunación en el embarazo",
    badge: "Protección para el bebé",
    whatToBring: [
      "Carnet de vacunación y carnet perinatal",
      "Ropa con mangas fáciles de subir",
      "Documento de identidad y seguro",
    ],
    whatToAsk: [
      "¿Qué vacuna me corresponde hoy: Tdap (tos ferina), influenza, VSR (virus respiratorio sincitial) u otra?",
      "¿Qué molestias son normales después y cuáles debo reportar?",
      "¿Quienes cuidarán al bebé también deberían vacunarse?",
      "¿Puedo recibir otra vacuna el mismo día?",
    ],
    tip: "La Tdap se recomienda en cada embarazo entre las semanas 27 y 36 para que el bebé nazca con defensas contra la tos ferina.",
  },
  otro: {
    category: "Cita",
    badge: "General",
    whatToBring: [
      "Documento de identidad y seguro",
      "Carnet perinatal",
      "Tus preguntas anotadas",
    ],
    whatToAsk: [
      "¿Hay algo que deba hacer o evitar antes de la próxima cita?",
      "¿Cuándo debo volver y con quién?",
      "¿A quién llamo si tengo dudas antes de esa fecha?",
    ],
    tip: "Si es una cita nueva, pregunta si debes llevar algún estudio o documento en particular.",
  },
};

/** Elige la guía por el tipo explícito; sin tipo, por palabras completas del título. */
function chooseGuide(ev: { title?: unknown; type?: unknown }, weekAtEvent?: number): GuideId {
  const t = normalize(ev.title);
  const kind = eventKind(ev);
  const week = weekHint(t) ?? weekAtEvent;

  if (kind === "ecografia") {
    if (RX.eco3d.test(t)) return "eco_3d";
    if (RX.ecoT2.test(t)) return "eco_t2";
    if (RX.ecoT1.test(t)) return "eco_t1";
    if (RX.ecoT3.test(t)) return "eco_t3";
    if (week !== undefined) {
      if (week >= 10 && week < 15) return "eco_t1";
      if (week >= 17 && week < 25) return "eco_t2";
      if (week >= 28) return "eco_t3";
    }
    return "eco_general";
  }
  if (kind === "laboratorio") {
    if (RX.glucosa.test(t)) return "lab_glucosa";
    if (RX.sgb.test(t)) return "lab_sgb";
    return "lab_general";
  }
  if (kind === "control") {
    if (RX.preparto.test(t) || (week !== undefined && week >= 36)) return "control_preparto";
    return "control_general";
  }
  if (kind === "vacuna") return "vacuna";
  return "otro";
}

export function getAppointmentPrep(ev: { title?: unknown; type?: unknown }, weekAtEvent?: number): AppointmentPrepInfo {
  return PREP_GUIDES[chooseGuide(ev, weekAtEvent)];
}

// =====================================================================================
// Fechas
// =====================================================================================

const DAY_MS = 86_400_000;
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_INDEX: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11,
  jan: 0, apr: 3, aug: 7, dec: 11,
};

function parseTime(time?: unknown): { h: number; m: number } | null {
  if (typeof time !== "string" || !time) return null;
  const match = time.match(/(\d{1,2}):(\d{2})\s*([ap])?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ap = match[3]?.toLowerCase();
  if (ap === "p" && h < 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function hasTime(ev: { time?: unknown }): boolean {
  return parseTime(ev.time) !== null;
}

function parseIsoDay(s?: unknown): Date | null {
  const m = typeof s === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim()) : null;
  if (!m) return null;
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  return Number.isNaN(d.getTime()) || d.getDate() !== parseInt(m[3], 10) ? null : d;
}

/**
 * Fecha (y hora, si la hay) de una cita. Acepta rawDate "2026-10-15" o date "15 oct" / "15 Oct" /
 * "15 de octubre". Un mes que no se reconoce devuelve null (antes caía en septiembre).
 */
export function parseEventDate(ev: { rawDate?: string; date?: string; time?: string }): Date | null {
  let d = parseIsoDay(ev.rawDate) ?? parseIsoDay(ev.date);
  if (!d && typeof ev.date === "string" && ev.date) {
    const parts = normalize(ev.date)
      .replace(/[.,]/g, " ")
      .split(" ")
      .filter((p) => p && p !== "de" && p !== "del");
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const month = MONTH_INDEX[parts[1].slice(0, 3)];
      if (day >= 1 && day <= 31 && month !== undefined) {
        const yearPart = parts.find((p) => /^\d{4}$/.test(p));
        const year = yearPart ? parseInt(yearPart, 10) : new Date().getFullYear();
        d = new Date(year, month, day);
      }
    }
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const t = parseTime(ev.time);
  if (t) d.setHours(t.h, t.m, 0, 0);
  return d;
}

function startOfDay(d: Date | number): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Días de calendario entre a y b (a − b): mañana = 1, ayer = −1. */
function dayDiff(a: Date | number, b: Date | number): number {
  return Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS);
}

/** Pasada: con hora, 2 h después de empezar; sin hora, cuando termina ese día. Sin fecha: no se sabe. */
function isPastEvent(ev: AgendaEvent, date: Date | null, now: number): boolean {
  if (!date) return false;
  if (hasTime(ev)) return date.getTime() + 2 * 3_600_000 < now;
  return startOfDay(date) + DAY_MS <= now;
}

function countdownLabel(date: Date, now: number): { text: string; soon: boolean } {
  const diff = dayDiff(date, now);
  if (diff < 0) return { text: "Ya pasó", soon: false };
  if (diff === 0) return { text: "Es hoy", soon: true };
  if (diff === 1) return { text: "Es mañana", soon: true };
  return { text: `En ${diff} días`, soon: diff <= 7 };
}

/** Semana estimada el día de la cita, a partir de la semana clínica de hoy. */
function weekAtDate(cw: number | undefined, date: Date | null, now: number): number | undefined {
  if (cw === undefined || !date) return undefined;
  return cw + dayDiff(date, now) / 7;
}

function timeLabel(ev: { time?: unknown }): string {
  return hasTime(ev) ? (ev.time as string).trim() : "Hora por definir";
}

function toIsoDay(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "10:30 AM" → "10:30" para el input type=time. */
function toInputTime(time?: string): string {
  const t = parseTime(time);
  return t ? `${pad2(t.h)}:${pad2(t.m)}` : "";
}

let longDateFmt: Intl.DateTimeFormat | null = null;
function formatDateLong(d: Date): string {
  longDateFmt ??= new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" });
  return longDateFmt.format(d);
}

function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// =====================================================================================
// localStorage (solo conveniencias por teléfono; siempre en try/catch)
// =====================================================================================

const LS_EVENT = "pandajr:agenda-storage";

function readLS(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string | null): boolean {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent<string>(LS_EVENT, { detail: key }));
    return true;
  } catch {
    return false;
  }
}

/** Valor de localStorage sin romper la hidratación (en servidor: null). */
function useLocalStorageValue(key: string): string | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === key) cb();
      };
      const onLocal = (e: Event) => {
        if ((e as CustomEvent<string>).detail === key) cb();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(LS_EVENT, onLocal);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(LS_EVENT, onLocal);
      };
    },
    [key]
  );
  return useSyncExternalStore(
    subscribe,
    () => readLS(key),
    () => null
  );
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// =====================================================================================
// Calendario (.ics y Google Calendar)
// =====================================================================================

function icsDay(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function icsLocalDateTime(d: Date): string {
  return `${icsDay(d)}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
}

function icsUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

/** Escapado de texto RFC 5545. */
function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Pliega líneas a 75 octetos (UTF-8) sin partir caracteres. */
function foldIcsLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      out.push(cur);
      cur = ch;
      bytes = b;
      limit = 74; // las líneas de continuación empiezan con un espacio
    } else {
      cur += ch;
      bytes += b;
    }
  }
  out.push(cur);
  return out.join("\r\n ");
}

function prepDescription(ev: AgendaEvent, prep: AppointmentPrepInfo): string {
  const doctor = cleanStr(ev.doctor);
  return [
    `Cita: ${cleanStr(ev.title) || "Cita"}`,
    `Médico o clínica: ${doctor || "por definir"}`,
    "",
    "Qué llevar:",
    ...prep.whatToBring.map((i) => `• ${i}`),
    "",
    "Preguntas para la consulta:",
    ...prep.whatToAsk.map((q) => `• ${q}`),
    "",
    `Consejo: ${prep.tip}`,
    "",
    "Preparado con PandaJR. Es una guía general: sigue las indicaciones de tu equipo de salud.",
  ].join("\n");
}

/** Archivo .ics con dos avisos (1 día y 2 horas antes) o, sin hora, un evento de día completo. */
function buildIcs(ev: AgendaEvent, prep: AppointmentPrepInfo, stamp: Date = new Date()): string | null {
  const start = parseEventDate(ev);
  if (!start) return null;
  const title = cleanStr(ev.title) || "Cita";
  const doctor = cleanStr(ev.doctor);
  const timed = hasTime(ev);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PandaJR//Agenda prenatal//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:pandajr-${String(ev.id).replace(/[^\w-]/g, "")}@pandajr.app`,
    `DTSTAMP:${icsUtcStamp(stamp)}`,
  ];
  if (timed) {
    const end = new Date(start.getTime() + 3_600_000);
    lines.push(`DTSTART:${icsLocalDateTime(start)}`, `DTEND:${icsLocalDateTime(end)}`);
  } else {
    const next = new Date(start);
    next.setDate(next.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${icsDay(start)}`, `DTEND;VALUE=DATE:${icsDay(next)}`);
  }
  lines.push(`SUMMARY:${icsEscape(`Cita: ${title}`)}`, `DESCRIPTION:${icsEscape(prepDescription(ev, prep))}`);
  if (doctor) lines.push(`LOCATION:${icsEscape(doctor)}`);
  lines.push("STATUS:CONFIRMED");
  const alarms: [string, string][] = timed
    ? [
        ["-P1D", `Mañana: ${title}. Revisa qué llevar y qué preguntar.`],
        ["-PT2H", `En 2 horas: ${title}${doctor ? ` con ${doctor}` : ""}.`],
      ]
    : [["-PT15H", `Mañana: ${title}. Revisa qué llevar y qué preguntar.`]];
  for (const [trigger, message] of alarms) {
    lines.push("BEGIN:VALARM", `TRIGGER:${trigger}`, "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(message)}`, "END:VALARM");
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

function googleCalendarUrl(ev: AgendaEvent, prep: AppointmentPrepInfo): string | null {
  const start = parseEventDate(ev);
  if (!start) return null;
  let dates: string;
  if (hasTime(ev)) {
    dates = `${icsLocalDateTime(start)}/${icsLocalDateTime(new Date(start.getTime() + 3_600_000))}`;
  } else {
    const next = new Date(start);
    next.setDate(next.getDate() + 1);
    dates = `${icsDay(start)}/${icsDay(next)}`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Cita: ${cleanStr(ev.title) || "Cita"}`,
    dates,
    details: prepDescription(ev, prep),
  });
  const doctor = cleanStr(ev.doctor);
  if (doctor) params.set("location", doctor);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function slugify(s: string): string {
  return (
    normalize(s)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "cita"
  );
}

function downloadIcs(ev: AgendaEvent, prep: AppointmentPrepInfo): boolean {
  const ics = buildIcs(ev, prep);
  if (!ics) return false;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cita-${slugify(cleanStr(ev.title))}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// =====================================================================================
// Escrituras: espera acotada y mensajes humanos
// =====================================================================================

type Settled = { status: "ok" } | { status: "error"; error: unknown } | { status: "pending" };

/** Espera la promesa hasta `ms`; si sigue pendiente (sin conexión o red lenta) devuelve "pending". */
function settleWithin(p: Promise<unknown>, ms: number): Promise<Settled> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ status: "pending" }), ms);
    p.then(
      () => {
        clearTimeout(timer);
        resolve({ status: "ok" });
      },
      (error: unknown) => {
        clearTimeout(timer);
        resolve({ status: "error", error });
      }
    );
  });
}

function errorCodeOf(e: unknown): string {
  if (typeof e === "object" && e !== null && "code" in e) {
    const c = (e as { code?: unknown }).code;
    return typeof c === "string" ? c : "";
  }
  return "";
}

function writeErrorMessage(e: unknown, what = "la cita"): string {
  if (errorCodeOf(e) === "permission-denied") {
    return `No se pudo guardar ${what}: este teléfono ya no tiene acceso al embarazo compartido. Revisa el vínculo en Ajustes.`;
  }
  return `No se pudo guardar ${what}. Revisa tu conexión y vuelve a intentarlo.`;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

// =====================================================================================
// Hoja modal: useModalDialog (Escape, foco atrapado, foco de retorno, fondo inerte, sin scroll
// de fondo) + ModalPortal (fuera de los contextos de apilamiento de la app) + capa Z_CLASS.sheet.
// =====================================================================================

function Sheet({
  open,
  onClose,
  labelledBy,
  describedBy,
  initialFocusRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  /** Sin él, el foco va al panel (el lector anuncia el título y la descripción antes que los controles). */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { dialogProps } = useModalDialog({
    open,
    onClose,
    labelledBy,
    describedBy,
    initialFocusRef: initialFocusRef ?? panelRef,
  });
  const { ref: dialogRef, ...dialogRest } = dialogProps;
  const setPanel = useCallback(
    (el: HTMLDivElement | null) => {
      panelRef.current = el;
      dialogRef(el);
    },
    [dialogRef]
  );

  if (!open) return null;

  return (
    <ModalPortal>
      <div className={`fixed inset-0 ${Z_CLASS.sheet} flex items-end sm:items-center justify-center sm:p-4`}>
        {/* Tocar fuera cierra (el teclado cierra con Escape desde useModalDialog). */}
        <div
          className="absolute inset-0 bg-scrim"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={setPanel}
          {...dialogRest}
          className="relative w-full max-w-md max-h-[92dvh] flex flex-col bg-surface-raised text-ink rounded-t-3xl sm:rounded-3xl border border-line shadow-sheet outline-none"
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

const closeButtonClass =
  "shrink-0 -mr-1 w-11 h-11 inline-flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
/** Foco dentro de una fila que llega al borde (anillo interior, como ListRow). */
const focusInset = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta-ink";

/** Cabecera fija de las hojas: título en Alegreya (rol title) y botón de cerrar. */
const sheetHeadClass = "flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-line shrink-0";
const sheetTitleClass = "font-display text-title text-ink text-balance break-words hyphens-auto";

/** Botón de texto en tinta terracota (acción secundaria de una fila o de un aviso), ≥44px. */
const textActionClass = `min-h-11 px-2 rounded-full inline-flex items-center gap-1.5 text-meta font-bold text-terracotta-ink hover:bg-surface-hover transition-colors ${focusRing}`;

/** Aviso en línea (error de carga o de escritura): lavado terracota, tinta del mismo tono. */
const alertClass = "flex items-start gap-2.5 rounded-xl bg-terracotta-wash px-3.5 py-3 text-meta text-ink";

// =====================================================================================
// Preparación de la cita (compartida con la pareja; sin vínculo, en este teléfono)
// =====================================================================================

type PrepKind = "items" | "questions";
type PrepData = { items: Record<string, boolean>; questions: Record<string, boolean> };
const EMPTY_PREP: PrepData = { items: {}, questions: {} };

function toBoolMap(v: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, b] of Object.entries(v as Record<string, unknown>)) if (typeof b === "boolean") out[k] = b;
  }
  return out;
}

/** Ver AppointmentPrepModal: sube una vez lo marcado en este teléfono a la preparación compartida. */
function mergeLocalPrepOnce(pregnancyId: string, eventId: AgendaEvent["id"], remote: PrepData) {
  const flag = localToSharedFlag(`prep_${eventId}`, pregnancyId);
  if (readLS(flag) === "1") return;
  const local = readLocalPrep(`pandajr_prep_${eventId}`);
  const writes: Promise<void>[] = [];
  (["items", "questions"] as const).forEach((kind) => {
    for (const [text, checked] of Object.entries(local[kind])) {
      if (checked && !remote[kind][text]) writes.push(setAppointmentPrepItem(pregnancyId, eventId, kind, text, true));
    }
  });
  Promise.all(writes).then(
    () => writeLS(flag, "1"),
    () => {
      // Se intentará la próxima vez que se abra la preparación de esta cita.
    }
  );
}

function readLocalPrep(key: string): PrepData {
  const raw = typeof window === "undefined" ? null : readLS(key);
  if (!raw) return EMPTY_PREP;
  try {
    const v = JSON.parse(raw) as { items?: unknown; questions?: unknown };
    return { items: toBoolMap(v?.items), questions: toBoolMap(v?.questions) };
  } catch {
    return EMPTY_PREP;
  }
}

function omitKey<T>(obj: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

export function AppointmentPrepModal({
  event,
  profile,
  onClose,
  onAskPandaIA,
}: {
  event: AgendaEvent;
  profile?: Partial<UserProfile> | null;
  onClose: () => void;
  onAskPandaIA?: (question: string) => void;
}) {
  const storePregnancyId = usePandaStore((s) => s.profile.pregnancyId);
  const pregnancyId = storePregnancyId ?? profile?.pregnancyId;
  const titleId = useId();
  const now = useNow();

  const eventId = event.id;
  const title = cleanStr(event.title) || "Cita";
  const doctor = cleanStr(event.doctor);
  const date = parseEventDate(event);
  const cw = clinicalWeek(profile ?? undefined);
  const prep = getAppointmentPrep(event, weekAtDate(cw, date, now));
  const countdown = date ? countdownLabel(date, now) : null;

  // --- Con vínculo: escucha la preparación compartida (solo actualiza estado local) ---
  const [retryNonce, setRetryNonce] = useState(0);
  const remoteKey = pregnancyId ? `${pregnancyId}|${eventId}|${retryNonce}` : null;
  const [remote, setRemote] = useState<{ key: string; data: PrepData; meta: SharedDocMeta | null; failed?: boolean } | null>(
    null
  );

  useEffect(() => {
    if (!pregnancyId) return;
    const key = `${pregnancyId}|${eventId}|${retryNonce}`;
    let localChecked = false;
    return listenToAppointmentPrep(
      pregnancyId,
      eventId,
      (data, meta) => {
        // Caché vacía sin respuesta del servidor: seguimos "cargando" (nada se marca ni se escribe).
        if (meta.fromCache && !meta.exists) return;
        setRemote({ key, data, meta });
        // Traspaso único tras el primer dato del servidor: la versión anterior guardaba lo marcado
        // SOLO en el teléfono (también con vínculo), y lo mismo pasa con lo marcado antes de
        // vincular. Solo agrega marcas que falten; nunca desmarca nada de la pareja.
        if (!localChecked && !meta.fromCache) {
          localChecked = true;
          mergeLocalPrepOnce(pregnancyId, eventId, data);
        }
      },
      () => setRemote((prev) => ({ key, data: prev?.key === key ? prev.data : EMPTY_PREP, meta: null, failed: true }))
    );
  }, [pregnancyId, eventId, retryNonce]);

  const remoteCurrent = remote && remote.key === remoteKey ? remote : null;
  const loading = !!pregnancyId && !remoteCurrent;
  const loadFailed = !!remoteCurrent?.failed;
  const canToggle = !pregnancyId || (!!remoteCurrent && !remoteCurrent.failed);

  // --- Sin vínculo: localStorage del teléfono (clave de siempre) ---
  const localKey = `pandajr_prep_${eventId}`;
  const [local, setLocal] = useState<PrepData>(() => readLocalPrep(localKey));

  // --- Optimista: lo marcado se ve al instante; si la escritura falla se revierte ---
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [writeError, setWriteError] = useState<{ kind: PrepKind; key: string; checked: boolean; localOnly?: boolean } | null>(
    null
  );

  const base = pregnancyId ? (remoteCurrent?.data ?? EMPTY_PREP) : local;
  const isChecked = (kind: PrepKind, key: string): boolean => {
    const o = overrides[`${kind}:${key}`];
    return o !== undefined ? o : !!base[kind][key];
  };

  const setItem = (kind: PrepKind, key: string, checked: boolean) => {
    setWriteError(null);
    if (!pregnancyId) {
      const next: PrepData = { ...local, [kind]: { ...local[kind], [key]: checked } };
      setLocal(next);
      if (!writeLS(localKey, JSON.stringify(next))) setWriteError({ kind, key, checked, localOnly: true });
      return;
    }
    if (!canToggle) return; // nada se escribe antes del primer snapshot remoto
    const ok = `${kind}:${key}`;
    setOverrides((prev) => ({ ...prev, [ok]: checked }));
    setAppointmentPrepItem(pregnancyId, eventId, kind, key, checked).then(
      () => setOverrides((prev) => (prev[ok] === checked ? omitKey(prev, ok) : prev)),
      () => {
        setOverrides((prev) => (prev[ok] === checked ? omitKey(prev, ok) : prev));
        setWriteError({ kind, key, checked });
      }
    );
  };

  const readyItems = prep.whatToBring.filter((i) => isChecked("items", i)).length;
  const askedQuestions = prep.whatToAsk.filter((q) => isChecked("questions", q)).length;

  const [calendarNote, setCalendarNote] = useState<string | null>(null);
  const canCalendar = !!date;

  const askText =
    profile?.role === "papa"
      ? `Voy a acompañar a mi pareja a su cita de ${title}${date ? ` el ${formatDateShort(date)}` : ""}${doctor ? ` con ${doctor}` : ""}. ¿Qué más nos conviene preparar o preguntar?`
      : `Tengo una cita de ${title}${date ? ` el ${formatDateShort(date)}` : ""}${doctor ? ` con ${doctor}` : ""}. ¿Qué más me conviene preparar o preguntar?`;

  // Cada punto es una fila de la lista (divisor fino, sin cajas): un checkbox que ocupa toda la fila.
  const renderChecklist = (kind: PrepKind, list: string[], labelledBy: string) => (
    <ListGroup aria-labelledby={labelledBy}>
      {list.map((text) => {
        const checked = isChecked(kind, text);
        return (
          <li key={text} className="relative">
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={!canToggle}
              onClick={() => setItem(kind, text, !checked)}
              className={`flex w-full min-h-12 items-stretch ps-[var(--gutter)] text-left transition-colors hover:bg-surface-hover active:bg-surface-hover disabled:cursor-wait disabled:opacity-70 disabled:hover:bg-transparent ${focusInset}`}
            >
              <span className={`flex shrink-0 items-start pt-3 pe-3 ${checked ? "text-sage-ink" : "text-line-control"}`} aria-hidden="true">
                {checked ? <CheckCircle2 size={20} strokeWidth={1.75} /> : <Circle size={20} strokeWidth={1.75} />}
              </span>
              <span
                className={`pj-row-body min-w-0 flex-1 py-3 pe-[var(--gutter)] text-body break-words ${
                  checked ? "text-ink-muted line-through decoration-ink-subtle" : "text-ink"
                }`}
              >
                {text}
              </span>
            </button>
          </li>
        );
      })}
    </ListGroup>
  );

  return (
    <Sheet open onClose={onClose} labelledBy={titleId}>
      {/* Cabecera: legible (≥4.5:1), sin texto blanco sobre salvia */}
      <div className={sheetHeadClass}>
        <div className="min-w-0">
          <h2 id={titleId} className={sheetTitleClass}>
            {title}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={15} aria-hidden="true" className="shrink-0" />
              {date ? formatDateLong(date) : "Fecha sin confirmar"}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock size={15} aria-hidden="true" className="shrink-0" />
              {timeLabel(event)}
            </span>
            {doctor && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Stethoscope size={15} aria-hidden="true" className="shrink-0" />
                <span className="break-words">{doctor}</span>
              </span>
            )}
          </p>
          {/* Texto plano (sin píldoras: no se tocan). La urgencia la lleva la cuenta atrás en terracota. */}
          <p className="mt-2 text-meta font-bold text-ink-muted">
            {prep.category}
            {countdown && (
              <>
                {" · "}
                <span className={countdown.soon ? "text-terracotta-ink" : undefined}>{countdown.text}</span>
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={onClose} className={closeButtonClass} aria-label="Cerrar preparación de la cita">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="overflow-y-auto overscroll-contain flex-1 px-5 [--gutter:1.25rem] pt-4 pb-6 flex flex-col gap-7">
        <div className="flex flex-col gap-4">
          <SyncBadge lastSyncedAt={remoteCurrent?.meta?.updatedAt ?? null} />

          <div className="flex items-start gap-3 rounded-xl bg-surface-sunken px-3.5 py-3">
            <Lightbulb size={18} strokeWidth={1.75} aria-hidden="true" className="text-ink-muted shrink-0 mt-0.5" />
            <p className="text-meta text-ink">
              <strong className="font-bold">Consejo:</strong> {prep.tip}
            </p>
          </div>
          {profile?.role === "papa" && (
            <p className="text-meta text-ink-muted">
              Las preguntas están escritas para que tu pareja las haga. Tú puedes llevar la lista y anotar las respuestas.
            </p>
          )}

          {loading && (
            <p className="flex items-center gap-2 text-meta text-ink-muted" role="status">
              <LoaderCircle size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              Cargando lo que ya marcaron…
            </p>
          )}
          {loadFailed && (
            <div role="alert" className={alertClass}>
              <CircleAlert size={16} aria-hidden="true" className="text-terracotta-ink shrink-0 mt-0.5" />
              <p className="flex-1">No pudimos cargar lo que marcó tu pareja. Revisa tu conexión.</p>
              <button type="button" onClick={() => setRetryNonce((n) => n + 1)} className={`-my-2.5 -me-1.5 ${textActionClass}`}>
                <RotateCw size={14} aria-hidden="true" /> Reintentar
              </button>
            </div>
          )}
          {writeError && (
            <div role="alert" className={alertClass}>
              <CircleAlert size={16} aria-hidden="true" className="text-terracotta-ink shrink-0 mt-0.5" />
              <p className="flex-1">
                {writeError.localOnly
                  ? "No se pudo guardar en este teléfono (el navegador no permite guardar datos). Lo marcado se perderá al cerrar."
                  : "No se pudo guardar lo que marcaste. Revisa tu conexión."}
              </p>
              {!writeError.localOnly && (
                <button
                  type="button"
                  onClick={() => setItem(writeError.kind, writeError.key, writeError.checked)}
                  className={`-my-2.5 -me-1.5 ${textActionClass}`}
                >
                  <RotateCw size={14} aria-hidden="true" /> Reintentar
                </button>
              )}
            </div>
          )}
        </div>

        <Section
          as="h3"
          size="md"
          headingId={`${titleId}-bring`}
          title="Qué llevar"
          action={
            <span className="text-meta font-medium text-ink-subtle tabular-nums">
              {readyItems} de {prep.whatToBring.length} listos
            </span>
          }
        >
          <div aria-busy={loading}>{renderChecklist("items", prep.whatToBring, `${titleId}-bring`)}</div>
        </Section>

        <Section
          as="h3"
          size="md"
          headingId={`${titleId}-ask`}
          title="Preguntas para la consulta"
          action={
            <span className="text-meta font-medium text-ink-subtle tabular-nums">
              {askedQuestions} de {prep.whatToAsk.length} hechas
            </span>
          }
        >
          <div aria-busy={loading}>{renderChecklist("questions", prep.whatToAsk, `${titleId}-ask`)}</div>
        </Section>

        <Section
          as="h3"
          size="md"
          headingId={`${titleId}-cal`}
          title="Recordatorios en tu calendario"
          description={
            !canCalendar
              ? "Esta cita no tiene una fecha válida. Edítala para poder agregarla a tu calendario."
              : hasTime(event)
                ? "El archivo de calendario (.ics) trae dos avisos, un día antes y dos horas antes, con esta lista en las notas. Google Calendar usa tus avisos habituales."
                : "El archivo de calendario (.ics) trae un aviso el día anterior, con esta lista en las notas. Google Calendar usa tus avisos habituales."
          }
        >
          <ListGroup>
            <ListRow
              leading={<Download size={20} strokeWidth={1.75} />}
              title="Descargar .ics"
              disabled={!canCalendar}
              onClick={() => {
                const ok = downloadIcs(event, prep);
                setCalendarNote(ok ? "Abre el archivo descargado para agregar la cita a tu calendario." : null);
              }}
            />
            <ListRow
              leading={<CalendarPlus size={20} strokeWidth={1.75} />}
              title="Google Calendar"
              trailing="external"
              disabled={!canCalendar}
              onClick={() => {
                const url = googleCalendarUrl(event, prep);
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              }}
            />
          </ListGroup>
          {calendarNote && (
            <p className="mt-2 text-meta text-ink-muted" role="status">
              {calendarNote}
            </p>
          )}
        </Section>

        <p className="text-micro font-medium text-ink-subtle">
          Es una guía general. Sigue siempre las indicaciones de tu equipo de salud.
        </p>
      </div>

      <div className="shrink-0 px-5 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] border-t border-line flex gap-2 max-[300px]:flex-col">
        {onAskPandaIA && (
          <button
            type="button"
            onClick={() => onAskPandaIA(askText)}
            className={`flex-1 min-h-[48px] px-4 bg-terracotta-ink hover:bg-terracotta-ink-hover text-on-accent rounded-2xl font-bold text-body inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.98] ${focusRing}`}
          >
            <Bot size={18} aria-hidden="true" /> Preguntar a PandaIA
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className={`min-h-[48px] px-5 rounded-2xl border border-line-control font-bold text-body text-ink hover:bg-surface-hover transition-colors ${
            onAskPandaIA ? "" : "flex-1"
          } ${focusRing}`}
        >
          Listo
        </button>
      </div>
    </Sheet>
  );
}

// =====================================================================================
// Sugerencias según la semana (reglas locales, no IA)
// =====================================================================================

type SuggestionDef = {
  id: string;
  /** Semanas (inclusive) en las que se muestra: desde una semana antes de la ventana para poder agendar. */
  showFrom: number;
  showTo: number;
  type: AgendaEventType;
  title: string;
  detail: string;
  /** Título con el que se prellena la cita al tocar "Agendar". */
  eventTitle: string;
  /** Cambia cada semana (se puede descartar esta semana y vuelve la siguiente). */
  weekly?: boolean;
  /** true si ya hay una cita que cubre esta sugerencia. */
  covers: (ev: AgendaEvent, date: Date | null, cw: number, now: number) => boolean;
};

/**
 * Una cita cubre la sugerencia si cae en la ventana de semanas y:
 * - su título nombra ese estudio (`named`), aunque ya haya pasado; o
 * - es del mismo tipo, está agendada (hoy o después) y su título no nombra otro estudio (`other`).
 * Así un "Análisis de sangre" ya pasado no oculta la prueba de glucosa, ni una vacuna de la
 * influenza oculta la Tdap.
 */
function coveredByWeek(type: AgendaEventType, from: number, to: number, named?: RegExp, other?: RegExp) {
  return (ev: AgendaEvent, date: Date | null, cw: number, now: number) => {
    const t = normalize(ev.title);
    const isNamed = !!named && named.test(t);
    if (!isNamed && (eventKind(ev) !== type || (!!other && other.test(t)))) return false;
    const w = weekAtDate(cw, date, now);
    if (w === undefined || w < from || w >= to) return false;
    return isNamed || dayDiff(date as Date, now) >= 0;
  };
}

const RX_TDAP = /\b(tdap|dtpa)\b|\btos ferina\b/;
const RX_OTHER_VACCINE = /\b(influenza|gripe|covid|vsr|abrysvo)\b/;

const SUGGESTIONS: SuggestionDef[] = [
  {
    id: "tamizaje-t1",
    showFrom: 10,
    showTo: 14,
    type: "ecografia",
    title: "Ecografía de tamizaje del primer trimestre",
    detail: "Mide la translucencia nucal (el líquido bajo la piel de la nuca del bebé) y revisa su desarrollo temprano. Se hace entre las semanas 11 y 14.",
    eventTitle: "Ecografía de tamizaje (translucencia nucal)",
    covers: coveredByWeek("ecografia", 10, 15, RX.ecoT1, /\b(morfologica|morfologia|estructural|3d|4d|5d|crecimiento)\b/),
  },
  {
    id: "morfologica",
    showFrom: 17,
    showTo: 22,
    type: "ecografia",
    title: "Ecografía morfológica",
    detail: "Revisa con detalle los órganos, la placenta y el líquido amniótico. Se hace entre las semanas 18 y 22.",
    eventTitle: "Ecografía morfológica",
    covers: coveredByWeek("ecografia", 17, 25, RX.ecoT2, /\b(tamizaje|translucencia|nucal|3d|4d|5d|crecimiento)\b/),
  },
  {
    id: "glucosa",
    showFrom: 23,
    showTo: 28,
    type: "laboratorio",
    title: "Prueba de glucosa (diabetes gestacional)",
    detail: "Detecta la diabetes gestacional. Se hace entre las semanas 24 y 28.",
    eventTitle: "Prueba de glucosa (diabetes gestacional)",
    covers: coveredByWeek("laboratorio", 23, 29, RX.glucosa, RX.sgb),
  },
  {
    id: "tdap",
    showFrom: 26,
    showTo: 36,
    type: "vacuna",
    title: "Vacuna Tdap",
    detail: "Protege al bebé contra la tos ferina en sus primeros meses. Se aplica en cada embarazo, entre las semanas 27 y 36.",
    eventTitle: "Vacuna Tdap",
    covers: coveredByWeek("vacuna", 26, 37, RX_TDAP, RX_OTHER_VACCINE),
  },
  {
    id: "sgb",
    showFrom: 35,
    showTo: 37,
    type: "laboratorio",
    title: "Cultivo de estreptococo del grupo B (SGB)",
    detail: "Busca una bacteria común que puede pasar al bebé en el parto. Es una toma rápida con hisopo; si sale positivo, se da antibiótico durante el parto. Se hace entre las semanas 36 y 37.",
    eventTitle: "Cultivo de estreptococo del grupo B",
    covers: coveredByWeek("laboratorio", 34, 38, RX.sgb, RX.glucosa),
  },
  {
    id: "control-semanal",
    showFrom: 36,
    showTo: 42,
    type: "control",
    title: "Control prenatal de esta semana",
    detail: "Desde la semana 36 los controles suelen ser semanales.",
    eventTitle: "Control prenatal",
    weekly: true,
    covers: (ev, date, _cw, now) => {
      if (eventKind(ev) !== "control" || !date) return false;
      const d = dayDiff(date, now);
      return d >= -3 && d <= 7;
    },
  },
];

// =====================================================================================
// Agenda
// =====================================================================================

type FormState = {
  title: string;
  date: string;
  time: string;
  doctor: string;
  type?: AgendaEventType;
  /** true si la persona eligió el tipo; si no, se propone según el título. */
  typeTouched: boolean;
};

const EMPTY_FORM: FormState = { title: "", date: "", time: "", doctor: "", typeTouched: false };

const inputClass =
  // Campo = pozo (surface-sunken) sobre el panel de la hoja (surface-raised).
  "w-full min-h-[48px] rounded-2xl border bg-surface-sunken px-4 py-2.5 text-body text-ink " +
  // Borde ≥3:1 con el panel (1.4.11): line-control 3.6:1 sobre raised claro · 3.7:1 sobre raised oscuro.
  // El placeholder usa --placeholder (globals.css, ≥4.5:1 sobre los pozos de los dos temas).
  "border-line-control " +
  // Foco: anillo de tinta de 2px con separación (visible también en modo de alto contraste).
  // :focus (no :focus-visible): en fecha y hora Chrome no aplica :focus-visible cuando el foco está en
  // los segmentos internos o en el icono del calendario, y el campo se quedaba sin contorno.
  "transition-colors focus:border-terracotta-ink focus:outline-2 focus:outline-offset-2 focus:outline-terracotta-ink " +
  "aria-[invalid=true]:border-terracotta-ink disabled:opacity-60";
const labelClass = "block text-meta font-bold text-ink mb-1.5";
const optionalClass = "font-normal text-ink-muted";
const helpClass = "mt-1.5 text-meta text-ink-muted";
const errorClass = "mt-1.5 flex items-start gap-1.5 text-meta font-medium text-terracotta-ink";

const SAVE_WAIT_MS = 2500;

type AgendaViewProps = {
  showToast: ToastFn;
  events: AgendaEvent[];
  profile: UserProfile;
  /** Se mantiene por compatibilidad con page.tsx. */
  updateProfile?: (u: Partial<UserProfile>) => void;
  onAddEvent: (ev: AgendaEvent) => Promise<void>;
  onUpdateEvent: (ev: AgendaEvent) => Promise<void>;
  /** Devuelve la cita borrada para poder deshacer con onAddEvent. */
  onDeleteEvent: (id: AgendaEvent["id"]) => Promise<AgendaEvent | undefined>;
  onOpenPrep: (ev: AgendaEvent) => void;
  /**
   * Con vínculo: aún no llegó la agenda del servidor (solo caché vacía o nada). No se muestra
   * "No tienes citas" ni sugerencias de agendar: sería un vacío falso.
   */
  loading?: boolean;
  /** No se pudo leer la agenda compartida (sin permisos o error del listener). */
  loadError?: boolean;
  onRetryLoad?: () => void;
};

type DatedEvent = { ev: AgendaEvent; date: Date | null; key: string };

export function AgendaView({
  showToast,
  events,
  profile,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onOpenPrep,
  loading = false,
  loadError = false,
  onRetryLoad,
}: AgendaViewProps) {
  const pregnancyId = profile.pregnancyId;
  const now = useNow();
  const cw = clinicalWeek(profile);
  const partner = usePartner(!!pregnancyId);
  const ids = {
    upcoming: useId(),
    suggestions: useId(),
    past: useId(),
    pastList: useId(),
    formTitle: useId(),
    title: useId(),
    date: useId(),
    time: useId(),
    doctor: useId(),
    type: useId(),
  };

  // --- Citas ordenadas: próximas (ascendente) y pasadas (la más reciente primero) ---
  const { upcoming, past } = useMemo(() => {
    const seen = new Map<string, number>();
    const dated: DatedEvent[] = (Array.isArray(events) ? events : [])
      .filter((ev): ev is AgendaEvent => !!ev && typeof ev === "object")
      .map((ev) => {
        const base = String(ev.id);
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        return { ev, date: parseEventDate(ev), key: n ? `${base}~${n}` : base };
      });
    const up: DatedEvent[] = [];
    const pa: DatedEvent[] = [];
    for (const d of dated) (isPastEvent(d.ev, d.date, now) ? pa : up).push(d);
    const t = (d: DatedEvent) => (d.date ? d.date.getTime() : Number.MAX_SAFE_INTEGER);
    up.sort((a, b) => t(a) - t(b));
    pa.sort((a, b) => t(b) - t(a));
    return { upcoming: up, past: pa };
  }, [events, now]);

  const [showPast, setShowPast] = useState(false);

  // --- Sugerencias por semana (descartes recordados en este teléfono) ---
  const dismissKey = `pandajr_agenda_sugerencias_${pregnancyId || "local"}`;
  const dismissedRaw = useLocalStorageValue(dismissKey);
  const [sessionDismissed, setSessionDismissed] = useState<string[]>([]);
  const dismissed = useMemo(
    () => new Set([...parseStringArray(dismissedRaw), ...sessionDismissed]),
    [dismissedRaw, sessionDismissed]
  );

  const suggestions = useMemo(() => {
    if (cw === undefined) return [];
    return SUGGESTIONS.filter((s) => cw >= s.showFrom && cw <= s.showTo)
      .map((s) => ({ ...s, id: s.weekly ? `${s.id}-${cw}` : s.id }))
      .filter((s) => !dismissed.has(s.id))
      .filter((s) => !events.some((ev) => ev && s.covers(ev, parseEventDate(ev), cw, now)));
  }, [cw, events, dismissed, now]);

  const dismissSuggestion = (id: string) => {
    setSessionDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    const stored = parseStringArray(readLS(dismissKey));
    if (!stored.includes(id)) writeLS(dismissKey, JSON.stringify([...stored, id].slice(-50)));
    showToast("Sugerencia descartada", () => {
      setSessionDismissed((prev) => prev.filter((x) => x !== id));
      const current = parseStringArray(readLS(dismissKey));
      writeLS(dismissKey, JSON.stringify(current.filter((x) => x !== id)));
    });
  };

  // --- Autor de cada cita (solo con vínculo) ---
  const roleOf = (uid?: string): "mama" | "papa" | undefined => {
    if (!uid) return undefined;
    const m = partner.members.find((x) => x.uid === uid);
    if (m) return m.role;
    if (partner.myUid && uid === partner.myUid) return profile.role;
    return undefined;
  };

  // --- Formulario ---
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<{ title?: boolean; date?: boolean }>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const formSession = useRef(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const inferredType = form.title.trim() ? inferEventType(form.title) : undefined;
  const effectiveType: AgendaEventType | undefined = form.typeTouched ? form.type : inferredType;
  const autoTyped = !form.typeTouched && !!inferredType && inferredType !== "otro";
  const formDate = parseIsoDay(form.date);
  const errors = {
    title: form.title.trim() ? undefined : "Escribe el motivo de la cita.",
    date: !form.date ? "Elige la fecha de la cita." : formDate ? undefined : "Esa fecha no es válida.",
  };
  const showTitleError = touched.title ? errors.title : undefined;
  const showDateError = touched.date ? errors.date : undefined;
  const dateIsPast = !!formDate && dayDiff(formDate, now) < 0;

  const openForm = (next: FormState, ev: AgendaEvent | null) => {
    formSession.current += 1;
    setEditing(ev);
    setForm(next);
    setTouched({});
    setSaveState("idle");
    setSaveError(null);
    setFormOpen(true);
  };

  const openNew = (preset?: { title: string; type: AgendaEventType }) =>
    openForm(
      preset ? { ...EMPTY_FORM, title: preset.title, type: preset.type, typeTouched: true } : EMPTY_FORM,
      null
    );

  const openEdit = (ev: AgendaEvent) => {
    const d = parseEventDate(ev);
    openForm(
      {
        title: cleanStr(ev.title),
        date: d ? toIsoDay(d) : "",
        time: toInputTime(ev.time),
        doctor: cleanStr(ev.doctor),
        type: isEventType(ev.type) ? ev.type : undefined,
        typeTouched: isEventType(ev.type),
      },
      ev
    );
  };

  const closeForm = useCallback(() => {
    formSession.current += 1;
    setFormOpen(false);
  }, []);

  const updateField = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    if (saveState === "error") {
      setSaveState("idle");
      setSaveError(null);
    }
  };

  const submit = async () => {
    if (saveState === "saving" || saveState === "success") return;
    setTouched({ title: true, date: true });
    if (errors.title) {
      titleRef.current?.focus();
      return;
    }
    if (errors.date || !formDate) {
      dateRef.current?.focus();
      return;
    }

    const title = form.title.trim();
    const ev: AgendaEvent = {
      ...(editing ?? {}),
      id: editing ? editing.id : Date.now(),
      date: formatDateShort(formDate),
      rawDate: toIsoDay(formDate),
      time: form.time || "Por definir",
      title,
      doctor: form.doctor.trim() || undefined,
      type: effectiveType ?? "otro",
      createdBy: editing ? editing.createdBy : (currentUid() ?? undefined),
      createdByName: editing ? editing.createdByName : cleanStr(profile.name) || undefined,
    };

    const session = formSession.current;
    setSaveState("saving");
    setSaveError(null);

    let op: Promise<void>;
    try {
      op = editing ? onUpdateEvent(ev) : onAddEvent(ev);
    } catch (e) {
      op = Promise.reject(e);
    }
    const result = await settleWithin(op, SAVE_WAIT_MS);

    // La hoja se cerró mientras guardaba: el resultado llega por toast.
    if (session !== formSession.current) {
      if (result.status === "error") showToast(writeErrorMessage(result.error, `“${title}”`));
      else if (result.status === "pending") op.catch((e: unknown) => showToast(writeErrorMessage(e, `“${title}”`)));
      return;
    }

    if (result.status === "error") {
      setSaveState("error");
      setSaveError(writeErrorMessage(result.error));
      return;
    }

    if (result.status === "pending") {
      op.catch((e: unknown) => showToast(writeErrorMessage(e, `“${title}”`)));
    }
    setSaveState("success");
    setTimeout(() => {
      if (session !== formSession.current) return;
      closeForm();
      if (result.status === "pending") {
        showToast(
          pregnancyId && !isOnline()
            ? "Sin conexión: la cita se compartirá al volver la señal. No cierres la app hasta entonces."
            : "Guardando la cita… Te avisaremos si algo falla."
        );
      }
    }, 650);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  // --- Borrar con deshacer real ---
  // Al borrar con teclado o lector de pantalla, la fila (y su botón enfocado) desaparece y el foco
  // caería al inicio de la página: se lleva al encabezado de la lista (o a "Pasadas").
  const upcomingHeadingRef = useRef<HTMLHeadingElement>(null);
  const pastToggleRef = useRef<HTMLButtonElement>(null);
  const refocusAfterDelete = useRef<"upcoming" | "past" | null>(null);
  useEffect(() => {
    // Primer cambio de la lista tras borrar (local: al instante; compartida: el eco del servidor).
    const where = refocusAfterDelete.current;
    if (!where) return;
    refocusAfterDelete.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return; // el foco sigue en su sitio
    const past = where === "past" && pastToggleRef.current?.isConnected ? pastToggleRef.current : null;
    (past ?? upcomingHeadingRef.current)?.focus();
  }, [events]);

  const handleDelete = (ev: AgendaEvent, fromList?: "upcoming" | "past") => {
    const active = typeof document !== "undefined" ? document.activeElement : null;
    refocusAfterDelete.current = active && active !== document.body && fromList ? fromList : null;
    let deletion: Promise<AgendaEvent | undefined>;
    try {
      deletion = onDeleteEvent(ev.id);
    } catch (e) {
      deletion = Promise.reject(e);
    }
    deletion.catch(() => showToast("No se pudo eliminar la cita. Revisa tu conexión y vuelve a intentarlo."));
    showToast("Cita eliminada", () => {
      // Se restaura cuando el borrado terminó, para que no se crucen las dos escrituras.
      deletion.then(
        (removed) =>
          onAddEvent(removed ?? ev).catch(() => showToast("No se pudo restaurar la cita. Vuelve a agregarla.")),
        () => undefined // el borrado falló: la cita sigue en la agenda
      );
    });
  };

  // --- Cabecera ---
  const weekKnown = !profile.weekUnknown && typeof profile.week === "number" && profile.week >= 1;
  const week = weekKnown ? Math.floor(profile.week) : undefined;
  const trimester = week === undefined ? "" : week <= 13 ? "primer trimestre" : week <= 27 ? "segundo trimestre" : "tercer trimestre";
  const weeksLeft = week === undefined ? 0 : Math.max(0, 40 - week);

  const saving = saveState === "saving";

  return (
    // Padding = --gutter (16px, el de toda la app): las listas llegan al borde y el texto queda alineado con los
    // títulos. Desde 1024px el gutter es 0 (sin sangrado) y la columna lleva lg:px-8, como la cabecera.
    <div className="relative flex flex-col">
      <header className="px-[var(--gutter)] pt-6 lg:px-8 lg:pt-10">
        <h2 className="font-display text-title text-ink">Agenda médica</h2>
        <p className="mt-1 text-meta text-ink-muted">
          {week === undefined
            ? "Semana sin confirmar"
            : `Semana ${week} · ${trimester}${weeksLeft > 0 ? ` · faltan ${weeksLeft} ${weeksLeft === 1 ? "semana" : "semanas"}` : ""}`}
        </p>
        <SyncBadge className="mt-1.5" waiting={loading} />
      </header>

      <div className="px-[var(--gutter)] pt-7 pb-[calc(6.5rem+var(--safe-bottom))] flex flex-col gap-9 lg:px-8 lg:pb-12">
        {/* Próximas citas: una lista con divisores; la primera (la que toca) lleva la acción principal */}
        <section aria-labelledby={ids.upcoming}>
          {/* Como Section: con el título por debajo de 8rem (zoom del 200%) «Nueva cita» baja de línea. */}
          <div className="mb-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1 basis-32">
              <h3 id={ids.upcoming} ref={upcomingHeadingRef} tabIndex={-1} className="font-display text-subtitle text-ink rounded-md">
                Próximas citas
              </h3>
            </div>
            <div className="-mb-1.5 flex shrink-0 items-center">
              {/* Sin citas, agregar una es LA acción de la pantalla; con citas, lo es preparar la próxima. */}
              <RowButton tone={upcoming.length === 0 && !loading && !loadError ? "primary" : "default"} onClick={() => openNew()} aria-haspopup="dialog">
                <Plus size={17} aria-hidden="true" /> Nueva cita
              </RowButton>
            </div>
          </div>

          {loadError && upcoming.length === 0 ? (
            <div role="alert" className={`mt-3 ${alertClass}`}>
              <CircleAlert size={16} aria-hidden="true" className="text-terracotta-ink shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>No pudimos cargar la agenda compartida. Revisa tu conexión.</p>
                {onRetryLoad && (
                  <button type="button" onClick={onRetryLoad} className={`mt-1 -ms-2 ${textActionClass}`}>
                    <RotateCw size={15} aria-hidden="true" /> Reintentar
                  </button>
                )}
              </div>
            </div>
          ) : loading && upcoming.length === 0 ? (
            <p role="status" className="flex items-center gap-2 py-5 text-meta text-ink-muted">
              {isOnline() && <LoaderCircle size={16} aria-hidden="true" className="shrink-0 animate-spin motion-reduce:animate-none" />}
              {isOnline()
                ? "Cargando la agenda compartida…"
                : "Sin conexión: no podemos mostrar la agenda compartida ahora."}
            </p>
          ) : upcoming.length === 0 ? (
            <ListGroup>
              <ListRow
                leading={<Calendar size={20} strokeWidth={1.75} />}
                title="No hay citas próximas"
                meta="Agrega la próxima consulta para tener a mano qué llevar y qué preguntar."
                className="py-1.5"
              />
            </ListGroup>
          ) : (
            <ListGroup>
              {upcoming.map((d, i) => (
                <EventRow
                  key={d.key}
                  item={d}
                  now={now}
                  variant={i === 0 && d.date ? "featured" : "default"}
                  authorRole={roleOf(d.ev.createdBy)}
                  showAuthor={!!pregnancyId}
                  onOpenPrep={onOpenPrep}
                  onEdit={openEdit}
                  onDelete={(ev) => handleDelete(ev, "upcoming")}
                />
              ))}
            </ListGroup>
          )}
        </section>

        {/* Sugerencias según la semana (no mientras la agenda compartida no ha cargado:
            ofrecería agendar algo que quizá ya está agendado) */}
        {loading || loadError ? null : cw === undefined ? (
          <p className="text-meta text-ink-muted">
            {/* Semana confirmada pero menor de 4: pedir que la confirme sería un callejón sin salida. */}
            {!profile.weekUnknown && typeof profile.week === "number" && profile.week >= 1 && profile.week < 4
              ? "Desde la semana 4 verás aquí qué estudios suelen tocar."
              : "Cuando la semana de embarazo esté confirmada en Ajustes, aquí verás qué estudios suelen tocar."}
          </p>
        ) : (
          suggestions.length > 0 && (
            <Section
              as="h3"
              size="md"
              headingId={ids.suggestions}
              title={profile.role === "papa" ? `Para la semana ${cw}` : `Para tu semana ${cw}`}
              description={profile.role === "papa" ? "Guía general: su obstetra define las fechas exactas." : "Guía general: tu obstetra define las fechas exactas."}
            >
              <ListGroup>
                {suggestions.map((s) => {
                  const Icon = TYPE_META[s.type].Icon;
                  return (
                    <li key={s.id} className="relative flex items-stretch ps-[var(--gutter)]">
                      <span aria-hidden="true" className="flex shrink-0 items-start pt-3.5 pe-3 text-ink-muted">
                        <Icon size={20} strokeWidth={1.75} />
                      </span>
                      <div className="pj-row-body min-w-0 flex-1 pt-3 pb-1.5 pe-[calc(var(--gutter)-0.75rem)]">
                        <div className="flex items-start gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-body font-bold text-ink">{s.title}</p>
                            <p className="mt-0.5 text-meta text-ink-muted">
                              {s.detail}
                              {profile.role === "papa" ? " Reserva ese día para acompañarla." : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissSuggestion(s.id)}
                            aria-label={`Descartar sugerencia: ${s.title}`}
                            className={`-mt-1.5 shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-full text-ink-subtle hover:bg-surface-hover hover:text-ink transition-colors ${focusRing}`}
                          >
                            <X size={18} aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => openNew({ title: s.eventTitle, type: s.type })}
                          aria-haspopup="dialog"
                          className={`mt-0.5 -ms-2 ${textActionClass}`}
                        >
                          <CalendarPlus size={16} aria-hidden="true" /> Agendar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ListGroup>
            </Section>
          )
        )}

        {/* Pasadas: plegadas y atenuadas. -mt-3 compensa el relleno del botón de 48px para que el aire
            sobre este título sea el mismo que sobre los demás. */}
        {past.length > 0 && (
          <section aria-labelledby={ids.past} className="-mt-3">
            <h3 id={ids.past} className="-mx-[var(--gutter)]">
              <button
                ref={pastToggleRef}
                type="button"
                aria-expanded={showPast}
                aria-controls={ids.pastList}
                onClick={() => setShowPast((v) => !v)}
                className={`w-full min-h-12 px-[var(--gutter)] flex items-center justify-between gap-3 text-left transition-colors hover:bg-surface-hover ${focusInset}`}
              >
                <span className="font-display text-subtitle text-ink">
                  Pasadas <span className="font-sans text-meta font-medium text-ink-subtle tabular-nums">({past.length})</span>
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={`text-ink-subtle transition-transform duration-200 motion-reduce:transition-none ${showPast ? "rotate-180" : ""}`}
                />
              </button>
            </h3>
            {showPast && (
              <div id={ids.pastList}>
                <ListGroup>
                  {past.map((d) => (
                    <EventRow
                      key={d.key}
                      item={d}
                      now={now}
                      variant="past"
                      authorRole={roleOf(d.ev.createdBy)}
                      showAuthor={!!pregnancyId}
                      onOpenPrep={onOpenPrep}
                      onEdit={openEdit}
                      onDelete={(ev) => handleDelete(ev, "past")}
                    />
                  ))}
                </ListGroup>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Hoja: nueva cita / editar cita */}
      <Sheet open={formOpen} onClose={closeForm} labelledBy={ids.formTitle} initialFocusRef={titleRef}>
        <div className={sheetHeadClass}>
          <h2 id={ids.formTitle} className={sheetTitleClass}>
            {editing ? "Editar cita" : "Nueva cita"}
          </h2>
          <button type="button" onClick={closeForm} className={closeButtonClass} aria-label="Cerrar sin guardar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          aria-busy={saving}
          className="overflow-y-auto overscroll-contain px-5 pt-5 pb-[calc(1.25rem+var(--safe-bottom))] flex flex-col gap-6"
        >
          <fieldset aria-describedby={autoTyped ? `${ids.type}-help` : undefined}>
            <legend className={labelClass}>Tipo de cita</legend>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(({ value, label, Icon }) => {
                const selected = effectiveType === value;
                return (
                  <label
                    key={value}
                    className={`min-h-[44px] px-3.5 rounded-full border inline-flex items-center gap-1.5 text-meta font-bold cursor-pointer select-none transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-terracotta-ink ${
                      selected
                        ? "bg-sage-ink border-transparent text-on-accent"
                        : "bg-surface-raised border-line-control text-ink hover:bg-surface-hover"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${ids.type}-kind`}
                      value={value}
                      checked={selected}
                      onChange={() => updateField({ type: value, typeTouched: true })}
                      disabled={saving}
                      className="sr-only"
                    />
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    {label}
                  </label>
                );
              })}
            </div>
            {autoTyped && (
              <p id={`${ids.type}-help`} className={helpClass}>
                Lo elegimos por el título; cámbialo si no corresponde.
              </p>
            )}
          </fieldset>

          <div>
            <label htmlFor={ids.title} className={labelClass}>
              Motivo de la cita
            </label>
            <input
              ref={titleRef}
              id={ids.title}
              type="text"
              required
              maxLength={120}
              autoComplete="off"
              value={form.title}
              onChange={(e) => updateField({ title: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              aria-invalid={!!showTitleError}
              aria-describedby={showTitleError ? `${ids.title}-error` : undefined}
              disabled={saving}
              placeholder="Ej. Ecografía morfológica o control prenatal"
              className={inputClass}
            />
            {showTitleError && (
              <p id={`${ids.title}-error`} className={errorClass}>
                <CircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0" /> {showTitleError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label htmlFor={ids.date} className={labelClass}>
                Fecha
              </label>
              <input
                ref={dateRef}
                id={ids.date}
                type="date"
                required
                value={form.date}
                onChange={(e) => updateField({ date: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, date: true }))}
                aria-invalid={!!showDateError}
                aria-describedby={showDateError ? `${ids.date}-error` : dateIsPast ? `${ids.date}-help` : undefined}
                disabled={saving}
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor={ids.time} className={labelClass}>
                Hora <span className={optionalClass}>(opcional)</span>
              </label>
              <input
                id={ids.time}
                type="time"
                value={form.time}
                onChange={(e) => updateField({ time: e.target.value })}
                disabled={saving}
                className={`${inputClass} tabular-nums`}
              />
            </div>
            {showDateError && (
              <p id={`${ids.date}-error`} className={`${errorClass} col-span-2 mt-0`}>
                <CircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0" /> {showDateError}
              </p>
            )}
            {!showDateError && dateIsPast && (
              <p id={`${ids.date}-help`} className={`${helpClass} col-span-2 mt-0`}>
                Esa fecha ya pasó: la cita quedará en Pasadas.
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.doctor} className={labelClass}>
              Médico o clínica <span className={optionalClass}>(opcional)</span>
            </label>
            <input
              id={ids.doctor}
              type="text"
              maxLength={120}
              autoComplete="off"
              autoCapitalize="words"
              value={form.doctor}
              onChange={(e) => updateField({ doctor: e.target.value })}
              disabled={saving}
              placeholder="Ej. Dra. Gómez o Clínica del Valle"
              className={inputClass}
            />
          </div>

          {saveState === "error" && saveError && (
            <div role="alert" className={alertClass}>
              <CircleAlert size={16} aria-hidden="true" className="text-terracotta-ink shrink-0 mt-0.5" />
              <p>{saveError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || saveState === "success"}
            className={`w-full min-h-[52px] rounded-2xl font-bold text-body text-on-accent inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99] disabled:cursor-default ${focusRing} ${
              saveState === "success" ? "bg-sage-ink" : "bg-terracotta-ink hover:bg-terracotta-ink-hover disabled:hover:bg-terracotta-ink"
            }`}
          >
            {saveState === "saving" ? (
              <>
                <LoaderCircle size={18} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> Guardando…
              </>
            ) : saveState === "success" ? (
              <>
                <Check size={18} aria-hidden="true" /> {editing ? "Cambios guardados" : "Cita guardada"}
              </>
            ) : saveState === "error" ? (
              <>
                <RotateCw size={18} aria-hidden="true" /> Reintentar
              </>
            ) : editing ? (
              "Guardar cambios"
            ) : (
              "Guardar cita"
            )}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {saveState === "saving" ? "Guardando la cita" : saveState === "success" ? "Cita guardada" : ""}
          </span>
        </form>
      </Sheet>
    </div>
  );
}

// =====================================================================================
// Fila de cita (una fila de ListGroup: fecha tipográfica a la izquierda, divisor tras ella)
// =====================================================================================

function EventRow({
  item,
  now,
  variant,
  authorRole,
  showAuthor,
  onOpenPrep,
  onEdit,
  onDelete,
}: {
  item: DatedEvent;
  now: number;
  variant: "featured" | "default" | "past";
  authorRole?: "mama" | "papa";
  showAuthor: boolean;
  onOpenPrep: (ev: AgendaEvent) => void;
  onEdit: (ev: AgendaEvent) => void;
  onDelete: (ev: AgendaEvent) => void;
}) {
  const { ev, date } = item;
  const title = cleanStr(ev.title) || "Cita sin título";
  const doctor = cleanStr(ev.doctor);
  // Etiqueta de tipo: la elegida; si es deducida del título, solo cuando es inequívoca
  // ("Consulta con nutrición" no es un control prenatal).
  const shownKind: AgendaEventType | null = isEventType(ev.type)
    ? ev.type
    : (() => {
        const k = inferEventType(ev.title);
        return k === "ecografia" || k === "laboratorio" || k === "vacuna" ? k : null;
      })();
  const typeMeta = shownKind ? TYPE_META[shownKind] : null;
  // El tipo no se repite si ya es el título ("Control prenatal · Control prenatal") ni se muestra "Otro".
  const typeLabel =
    typeMeta && shownKind !== "otro" && normalize(typeMeta.label) !== normalize(title) ? typeMeta.label : null;
  const featured = variant === "featured";
  const muted = variant === "past";
  const countdown = !muted && date ? countdownLabel(date, now) : null;
  const author = showAuthor ? cleanStr(ev.createdByName) : "";

  // La fecha es la columna de la fila: el día en Alegreya, el mes debajo. Tinta para la próxima, ink-muted para
  // las siguientes, atenuada en las pasadas: la urgencia la lleva la cuenta atrás ("Es hoy", "Es mañana").
  const dateTone = featured ? "text-ink" : muted ? "text-ink-subtle" : "text-ink-muted";
  const iconButton = `w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full text-ink-subtle hover:bg-surface-hover hover:text-ink transition-colors ${focusRing}`;

  // Línea de datos: "En 2 días · Laboratorio · 10:30" (en las pasadas, sin cuenta atrás).
  const metaParts: React.ReactNode[] = [];
  if (countdown) {
    metaParts.push(
      <span className={`font-bold ${countdown.soon ? "text-terracotta-ink" : "text-ink"}`}>{countdown.text}</span>
    );
  }
  if (!date) metaParts.push(<span className="font-bold text-ink">Fecha sin confirmar</span>);
  if (typeLabel) metaParts.push(typeLabel);
  metaParts.push(<span className="tabular-nums">{timeLabel(ev)}</span>);

  const editDelete = (
    <div className="flex shrink-0 items-center">
      <button type="button" onClick={() => onEdit(ev)} aria-label={`Editar cita: ${title}`} aria-haspopup="dialog" className={iconButton}>
        <Pencil size={17} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onDelete(ev)} aria-label={`Eliminar cita: ${title}`} className={iconButton}>
        <Trash2 size={17} aria-hidden="true" />
      </button>
    </div>
  );

  const text = (
    <>
      <div className="flex items-start justify-between gap-2 pe-3">
        <h4 className={`text-body font-bold break-words ${muted ? "text-ink-muted" : "text-ink"}`}>
          <span className="sr-only">{date ? `${formatDateLong(date)}: ` : ""}</span>
          {title}
        </h4>
        {author && (
          <span className="mt-0.5 shrink-0">
            <AuthorChip name={author} role={authorRole} size="xs" title={`Agendada por ${author}`} />
          </span>
        )}
      </div>
      <p className="mt-0.5 pe-3 text-meta text-ink-muted">
        {metaParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && " · "}
            {part}
          </React.Fragment>
        ))}
      </p>
      {doctor && <p className="pe-3 text-meta text-ink-muted break-words">{doctor}</p>}
    </>
  );

  return (
    <li className="relative flex items-stretch ps-[var(--gutter)]">
      <div aria-hidden="true" className={`w-11 shrink-0 me-3 pt-3.5 flex flex-col items-center text-center ${dateTone}`}>
        {date ? (
          <>
            <span className="font-display text-title tabular-nums">{date.getDate()}</span>
            <span className="text-micro font-bold">{MONTHS_SHORT[date.getMonth()]}</span>
          </>
        ) : (
          <CalendarDays size={22} strokeWidth={1.75} className="mt-1" />
        )}
      </div>

      {muted ? (
        // Pasada: sin preparación; editar y borrar quedan al lado del texto (sin una línea solo para ellos).
        <div className="pj-row-body min-w-0 flex-1 flex items-center gap-1 py-3.5 pe-[calc(var(--gutter)-0.75rem)]">
          <div className="min-w-0 flex-1">{text}</div>
          {editDelete}
        </div>
      ) : (
        <div className="pj-row-body min-w-0 flex-1 pt-3.5 pb-2 pe-[calc(var(--gutter)-0.75rem)]">
          {text}
          {/* Si «Qué llevar y preguntar» no cabe junto a editar/borrar (320px), estos bajan a otra línea
              en vez de partir la acción en dos. */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {featured ? (
              <RowButton
                tone="primary"
                onClick={() => onOpenPrep(ev)}
                // Nombre único por fila (hay uno por cita); empieza por el texto visible (2.5.3).
                aria-label={`Qué llevar y preguntar: ${title}`}
                aria-haspopup="dialog"
              >
                <ClipboardList size={16} aria-hidden="true" /> Qué llevar y preguntar
              </RowButton>
            ) : (
              <button
                type="button"
                onClick={() => onOpenPrep(ev)}
                aria-label={`Qué llevar y preguntar: ${title}`}
                aria-haspopup="dialog"
                className={`-ms-2 ${textActionClass}`}
              >
                <ClipboardList size={16} aria-hidden="true" /> Qué llevar y preguntar
              </button>
            )}
            <div className="ms-auto">{editDelete}</div>
          </div>
        </div>
      )}
    </li>
  );
}
