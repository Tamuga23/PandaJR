"use client";

import { AgendaView, AppointmentPrepModal, parseEventDate } from "@/components/AgendaModule";
import { HerramientasView } from "@/components/HerramientasModule";
import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { usePandaStore, type ThemePreference } from "@/store/usePandaStore";
import { ModalPortal } from "@/components/ModalPortal";
import { focusIntoTopDialog, useModalDialog, useModalOpenerTracking } from "@/lib/useModalDialog";
import { Z_CLASS } from "@/lib/layers";
import {
  ensureAuth,
  ensureMembership,
  createPregnancyForMom,
  previewInvite,
  joinPregnancyAsDad,
  regenerateInviteCode,
  removeMember,
  normalizeInviteCode,
  listenToPregnancy,
  listenToMomStatus,
  updatePregnancyWeek,
  saveDueDate,
  saveMomStatus,
  listenToEvents,
  mutateEvents,
  setChecklistItem,
  setTaskOwner,
  listenToChecklistProgress,
  sendNudge,
  listenToNudges,
  currentUid,
  readAccessLink,
  PAIRING_MESSAGES,
  type AccessLink,
  type RestoredAccount,
  type ChecklistMeta,
  type InvitePreview,
  type Member,
  type MomStatus,
} from "@/lib/firebase/pairing";
import { SyncBadge, useOnline, usePartner, type PartnerInfo } from "@/components/SyncBadge";
import { AuthorChip } from "@/components/AuthorChip";
import { formatDateShort, formatDayCountdown, formatRelative, repairMojibake } from "@/lib/format";
import { isLegacySeedEvent, linkedFromLocalKey, localToSharedFlag } from "@/lib/seeds";
import { Compass, Calendar, Bot, Send, CheckCircle2, Circle, ChevronRight, ChevronLeft, HeartPulse, Baby, Info, ChevronDown, ChevronUp, Sparkles, Activity, Heart, X, Users, AlertTriangle, AlertCircle, FileText, Settings, Paperclip, Share2, RotateCcw, RotateCw, Stethoscope, PhoneCall, Check, Copy, Edit3, Sun, Moon, SunMoon, RefreshCw, UserMinus, Lightbulb, CalendarCheck, CalendarClock, CalendarX, Smartphone, Sprout, KeyRound } from "lucide-react";
import { CallActions, EmergencyCallLink } from "@/components/CallActions";
import { CareTeamSheet } from "@/components/CareTeamForm";
import { AccountSheet } from "@/components/AccountSheet";
import { useAccount } from "@/lib/useAccount";
import { useCareTeam } from "@/lib/useCareTeam";
import { MARKET_COUNTRIES, OTHER_COUNTRY, isCountryChoice } from "@/lib/crisisLines";
import { clinicalWeek, detectAlarm, type AlarmSign } from "@/lib/urgency";
import { signCopy } from "@/lib/urgencyCopy";
import {
  datingFromPregnancyDoc,
  dueDateSummary,
  estimatedDueDateForWeek,
  gestationalAgeFromDueDate,
  isDueDateSource,
  profilePatchForManualWeek,
  parseISODate,
  remoteDatingPatch,
  resolveGestationalAge,
  toISODate,
  useGestationalAge,
  validateDueDate,
  type DueDateSource,
  type GestationalAgeState,
} from "@/lib/pregnancy";
import {
  ALL_TASKS,
  TASK_CATEGORIES,
  TRIMESTER_WEEKS,
  effectiveOwner,
  isTaskDone,
  ownersMissingRemotely,
  readLocalTaskOwners,
  taskWindow,
  tasksForWeek,
  writeLocalTaskOwner,
  type TaskOwner,
  type TaskOwnerMap,
} from "@/lib/tasks";
import {
  DatingPicker,
  choiceFromDraft,
  choiceFromProfile,
  datingPatch,
  draftFromProfile,
  formatDateLong,
  sameDating,
  type DatingChoice,
  type DatingDraft,
} from "@/components/DatingPicker";
import {
  AllTasksSheet,
  FetalCard,
  LaborReadyBlock,
  TodayBlock,
  WeekHeader,
  discussAtControl,
  overdueAsk,
  taskWindowNote,
  useWeekExplorer,
  type GuiaTool,
  type OwnerLabels,
  type SinceLastVisit,
  type TaskRowModel,
  type TodayGroup,
  type TrimesterModel,
} from "@/components/GuiaBlocks";
import { publishDiscuss, requestOpenDiscuss } from "@/lib/guiaDiscuss";
import { GrowingPlant } from "@/components/GrowingPlant";
import { Wordmark } from "@/components/Wordmark";
import { PandaMark } from "@/components/PandaMark";
import { BotanicalRule, ListGroup, ListRow, RowButton, Section } from "@/components/ui/List";

type Tab = "planificacion" | "agenda" | "herramientas" | "pandaia";

export interface UserProfile {
  role: "papa" | "mama";
  name: string;
  week: number;
  /** Semana sin confirmar (registro omitido o pareja unida sin semana): las reglas clínicas la ignoran. */
  weekUnknown?: boolean;
  location?: string;
  notes?: string;
  pregnancyId?: string;
  inviteCode?: string;
  comparisonTheme?: "frutas" | "geek";
  /** Fecha probable de parto "aaaa-mm-dd" (manda sobre `week`; ver src/lib/pregnancy.ts). */
  dueDate?: string;
  dueDateSource?: DueDateSource;
}

// =====================================================================================
// Utilidades compartidas de la página (sin window/localStorage en ámbito de módulo)
// =====================================================================================

type ToastOptions = { actionLabel?: string; duration?: number };
/**
 * Toast global. La acción (por defecto "Deshacer") solo se pinta si llega `onAction`.
 * El 3er argumento cambia la etiqueta ("Reintentar") o la duración.
 */
type ShowToast = (message: string, onAction?: () => void, labelOrOpts?: string | ToastOptions) => void;

/** Cita de la Agenda (contrato H, compartido con AgendaModule). */
type AgendaEvent = {
  id: number | string;
  date: string;
  rawDate?: string;
  time?: string;
  title: string;
  doctor?: string;
  type?: "ecografia" | "laboratorio" | "control" | "vacuna" | "otro";
  createdBy?: string;
  createdByName?: string;
};

type ChecklistStatusValue = "completed" | "dismissed";

const LS_EVENTS = "pandajr_events";
const LS_CHECKLIST = "pandajr_checklist_local";
const LS_MOM_STATUS = "pandajr_mom_status_local";
const MIG_SEED_EVENTS_LOCAL = "pandajr_mig_seedEvents_local";
const migSeedEventsKey = (pid: string) => `pandajr_mig_seedEvents_${pid}`;
/**
 * uid con el que este teléfono ya figuró como miembro del embarazo. Solo si el uid ACTUAL es ese
 * mismo, desaparecer de la lista significa que lo quitaron; si el uid cambió, este teléfono perdió
 * su sesión anónima (no es que la pareja lo haya quitado). Versiones anteriores guardaban "1".
 */
const memberConfirmedKey = (pid: string) => `pandajr_member_ok_${pid}`;
/** Embarazo del que la mamá desvinculó este teléfono (sigue siendo miembro: puede volver). */
const LS_LAST_PREGNANCY = "pandajr_last_pregnancy";
type LastPregnancy = { pid: string; inviteCode?: string };
/** Último abrazo recibido y ya mostrado, por embarazo (para mostrar los que llegaron con la app cerrada). */
const nudgeSeenKey = (pid: string) => `pandajr_nudge_seen_${pid}`;
const NUDGE_LOOKBACK_MS = 48 * 60 * 60 * 1000;
const chatStorageKey = (pid?: string) => `pandajr_chat_${pid || "local"}`;
const CHAT_MAX_STORED = 60;

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado o almacenamiento lleno: la sesión sigue funcionando en memoria */
  }
}

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setFlag(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* sin almacenamiento: la migración idempotente se repetirá sin efecto */
  }
}

/** uid confirmado como miembro ("" = marca antigua sin uid; null = nunca confirmado). */
function readMemberUid(pid: string): string | null {
  try {
    const v = window.localStorage.getItem(memberConfirmedKey(pid));
    if (v === null) return null;
    return v === "1" ? "" : v;
  } catch {
    return null;
  }
}

function writeMemberUid(pid: string, uid: string | null) {
  try {
    if (uid) window.localStorage.setItem(memberConfirmedKey(pid), uid);
    else window.localStorage.removeItem(memberConfirmedKey(pid));
  } catch {
    /* sin almacenamiento */
  }
}

const HUMAN_MESSAGES = new Set<string>(Object.values(PAIRING_MESSAGES));

/** Solo deja pasar mensajes pensados para personas (los de pairing.ts); el resto usa `fallback`. */
function humanError(e: unknown, fallback: string): string {
  if (e && typeof e === "object") {
    const err = e as { human?: unknown; message?: unknown };
    if (typeof err.message === "string" && (err.human === true || HUMAN_MESSAGES.has(err.message))) return err.message;
  }
  return fallback;
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Re-render periódico para que "hace 5 minutos" y "en 48 h" no se congelen. */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Normaliza los ítems que llegan de Firestore/localStorage (repara mojibake de datos antiguos). */
function toAgendaEvents(items: unknown): AgendaEvent[] {
  if (!Array.isArray(items)) return [];
  const out: AgendaEvent[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const id = typeof e.id === "number" || typeof e.id === "string" ? e.id : null;
    const title = typeof e.title === "string" ? repairMojibake(e.title).trim() : "";
    if (id === null || !title) continue;
    out.push({
      ...(e as Partial<AgendaEvent>),
      id,
      title,
      date: typeof e.date === "string" ? e.date : "",
      doctor: typeof e.doctor === "string" ? repairMojibake(e.doctor) : undefined,
    });
  }
  return out;
}

function sameEvent(a: AgendaEvent | undefined, b: AgendaEvent | undefined): boolean {
  if (!a || !b) return false;
  return (
    String(a.id) === String(b.id) &&
    a.title === b.title &&
    (a.date || "") === (b.date || "") &&
    (a.rawDate || "") === (b.rawDate || "") &&
    (a.time || "") === (b.time || "") &&
    (a.doctor || "") === (b.doctor || "")
  );
}

function inferEventType(title: string): AgendaEvent["type"] {
  const t = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/ecograf|ultrason|sonograf|tra(n)?slucencia|morfolog/.test(t)) return "ecografia";
  if (/laborator|examen|analisis|sangre|glucosa|o'?sullivan|orina|cultivo|estreptococo/.test(t)) return "laboratorio";
  if (/vacuna|tdap|influenza/.test(t)) return "vacuna";
  if (/control|consulta|chequeo|monitoreo/.test(t)) return "control";
  return "otro";
}

/** Hora con dígitos ("10:30", "9:00 AM"): sin ella, la cita cuenta como "todo el día". */
function hasClockTime(time?: string): boolean {
  return !!time && /\d{1,2}:\d{2}/.test(time);
}

const DATE_MONTHS: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5,
  jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9,
  set: 9, setiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};
const DATE_MONTH_RE = "(septiembre|setiembre|diciembre|noviembre|febrero|octubre|agosto|enero|marzo|abril|mayo|junio|julio|sept|ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)";
const DATE_WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

/**
 * ¿La fecha de la cita (`rawDate`, YYYY-MM-DD) es una que la persona escribió? Evita agendar
 * con una fecha que inventó la IA: "15 de octubre", "15 oct", "20/10", "2026-10-20", "el 15",
 * "hoy", "mañana", "pasado mañana", "el viernes", "en 3 días". "La próxima semana" o
 * "semana 12" no dicen el día, así que no cuentan (la IA debe preguntar).
 */
function userDateMatches(text: string, rawDate: string, now: Date = new Date()): boolean {
  if (!isValidIsoDate(rawDate)) return false;
  const [y, m, d] = rawDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const t = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(en|por|de|a|durante)?\s*la(s)?\s+mananas?\b/g, " ");

  for (const mm of t.matchAll(new RegExp(`\\b(\\d{1,2})\\s*(?:de\\s+)?${DATE_MONTH_RE}\\b`, "g"))) {
    if (Number(mm[1]) === d && DATE_MONTHS[mm[2]] === m) return true;
  }
  for (const mm of t.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    if (Number(mm[1]) === d && Number(mm[2]) === m) return true;
  }
  for (const mm of t.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    if (Number(mm[1]) === y && Number(mm[2]) === m && Number(mm[3]) === d) return true;
  }
  // "el 15", "el día 15" sin mes: ese día del mes, dentro de las próximas semanas.
  const dayOnly = new RegExp(`\\b(?:el|dia)\\s+(?:dia\\s+)?(\\d{1,2})\\b(?!\\s*(?:de\\s+)?${DATE_MONTH_RE}\\b|\\s*[/:.])`, "g");
  for (const mm of t.matchAll(dayOnly)) {
    if (Number(mm[1]) === d && diffDays >= 0 && diffDays <= 62) return true;
  }
  if (/\bpasado manana\b/.test(t) && diffDays === 2) return true;
  if (/\bmanana\b/.test(t.replace(/\bpasado manana\b/g, " ")) && diffDays === 1) return true;
  if (/\bhoy\b/.test(t) && diffDays === 0) return true;
  for (const mm of t.matchAll(/\ben (\d{1,2}) dias?\b/g)) {
    if (Number(mm[1]) === diffDays) return true;
  }
  for (const mm of t.matchAll(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/g)) {
    if (DATE_WEEKDAYS.indexOf(mm[1]) === target.getDay() && diffDays >= 0 && diffDays <= 14) return true;
  }
  return false;
}

function isValidIsoDate(raw?: string): raw is string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const [y, m, d] = raw.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Copia al portapapeles (con alternativa para navegadores sin Clipboard API). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* sin permiso: probamos la alternativa */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ROLE_LABEL es el rol (lista de acceso); PERSON_LABEL, cómo se nombra a la persona sin nombre.
const ROLE_LABEL: Record<"mama" | "papa", string> = { mama: "Mamá", papa: "Copiloto" };
const PERSON_LABEL: Record<"mama" | "papa", string> = { mama: "Mamá", papa: "Papá" };

// Fase 6: clases compartidas de la página. Solo tokens de globals.css (sin hex ni variantes dark:,
// que los tokens resuelven solos). Reglas: DESIGN.md › Components.
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
/** Botón de icono (cabecera, cierre de diálogo): ≥44px, fantasma. */
const ICON_BUTTON = `inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink ${FOCUS_RING}`;
/** Botón a lo ancho (diálogos y bienvenida). Se combina con un relleno: TERRA_FILL, SAGE_FILL o INK_FILL. */
const WIDE_BUTTON = `flex w-full min-h-12 items-center justify-center gap-2 rounded-full px-5 text-body font-bold transition-colors disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-disabled disabled:hover:bg-surface-sunken ${FOCUS_RING}`;
const TERRA_FILL = "bg-terracotta-ink text-on-accent hover:bg-terracotta-ink-hover";
const SAGE_FILL = "bg-sage-ink text-on-accent hover:bg-sage-ink-hover";
/** Neutro (tinta sobre alabastro; en oscuro, alabastro sobre obsidiana). */
const INK_FILL = "bg-ink text-ground hover:bg-ink-muted";
/** Contorno neutro a lo ancho. */
const OUTLINE_FILL = "border border-line-control text-ink hover:bg-surface-hover";
/** Acción de texto terracota con objetivo ≥44px. */
const TEXT_ACTION = `-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-meta font-bold text-terracotta-ink underline-offset-4 hover:underline ${FOCUS_RING}`;
/** Campo de texto: borde ≥3:1 (1.4.11) y foco en tinta. */
const FIELD = "w-full min-h-12 rounded-2xl border border-line-control bg-surface-sunken px-4 py-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-terracotta-ink";
/** Velo de diálogo: sólido, sin desenfoque decorativo. */
const SCRIM = "bg-scrim";

/**
 * Confirmación destructiva modal (alertdialog) que se abre sobre Ajustes: el foco va a la opción
 * segura ("Cancelar"), Escape o tocar fuera cancelan y el resto de la app queda inerte. Mientras
 * se aplica (`busy`) no se puede cerrar a medias.
 */
function ConfirmDialog({
  titleId,
  descId,
  title,
  children,
  error,
  busy,
  confirmLabel,
  busyLabel,
  onCancel,
  onConfirm,
  returnFocusRef,
}: {
  titleId: string;
  descId: string;
  title: React.ReactNode;
  children: React.ReactNode;
  error?: string;
  busy: boolean;
  confirmLabel: string;
  busyLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Destino del foco al cerrar si no debe volver a quien abrió (vacío = quien abrió). */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancel = () => { if (!busy) onCancel(); };
  const { dialogProps } = useModalDialog({
    open: true,
    onClose: cancel,
    role: "alertdialog",
    labelledBy: titleId,
    describedBy: descId,
    initialFocusRef: cancelRef,
    returnFocusRef,
  });
  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 ${Z_CLASS.careTeam} flex items-center justify-center ${SCRIM} p-4`}
        onClick={(e) => { if (e.target === e.currentTarget) cancel(); }}
      >
        <div
          {...dialogProps}
          className="w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-5 shadow-dialog outline-none"
        >
          <h2 id={titleId} className="font-display text-title text-ink">{title}</h2>
          <div id={descId} className="mt-2 space-y-2 text-body text-ink-muted">{children}</div>
          {error && <p role="alert" className="mt-2 text-meta font-bold text-terracotta-ink">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={cancel}
              disabled={busy}
              className={`flex-1 min-h-11 rounded-full ${OUTLINE_FILL} text-meta font-bold transition-colors disabled:opacity-60 ${FOCUS_RING}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`flex-1 min-h-11 rounded-full ${TERRA_FILL} text-meta font-bold transition-colors disabled:opacity-60 ${FOCUS_RING}`}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/** Estado del código de la mamá: vigencia, uso y generación de uno nuevo. */
function InviteCodePanel({
  pregnancyId,
  code,
  myUid,
  onCodeChange,
}: {
  pregnancyId: string;
  code?: string;
  myUid: string | null;
  onCodeChange: (code: string) => void;
}) {
  const [info, setInfo] = useState<{ code: string; preview: InvitePreview | null; failed?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lectura puntual de la vigencia del código (no escribe nada).
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    previewInvite(code)
      .then((preview) => { if (!cancelled) setInfo({ code, preview }); })
      .catch(() => { if (!cancelled) setInfo({ code, preview: null, failed: true }); });
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  const current = info && info.code === code ? info : null;
  const preview = current?.preview ?? null;

  let status = "Comprobando vigencia…";
  let needsNew = false;
  if (!code) {
    status = "Aún no tienes código. Genera uno para invitar a tu pareja.";
    needsNew = true;
  } else if (current?.failed) {
    status = "No pudimos comprobar si el código sigue vigente. Revisa tu conexión; si tu pareja no puede usarlo, genera uno nuevo.";
  } else if (preview) {
    if (preview.status === "used") status = "Tu pareja ya se unió con este código.";
    else if (preview.status === "expired") { status = "Este código caducó. Genera uno nuevo para invitar a tu pareja."; needsNew = true; }
    else if (preview.status === "not_found") { status = "Este código ya no sirve. Genera uno nuevo."; needsNew = true; }
    else if (preview.legacy) status = "Código antiguo: te recomendamos generar uno nuevo, más seguro.";
    else if (preview.expiresAt) status = `Vale hasta el ${formatDateShort(preview.expiresAt)}. Solo sirve para una persona.`;
    else status = "Solo sirve para una persona.";
  }

  const copy = async () => {
    if (!code) return;
    const ok = await copyText(code);
    setCopied(ok);
    setCopyFailed(!ok);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => { setCopied(false); setCopyFailed(false); }, 2500);
  };

  const regenerate = async () => {
    setError("");
    const uid = myUid ?? currentUid() ?? (await ensureAuth().catch(() => undefined));
    if (!uid) { setError("No pudimos conectar este teléfono. Revisa tu internet e inténtalo de nuevo."); return; }
    setBusy(true);
    try {
      const next = await regenerateInviteCode(pregnancyId, uid);
      onCodeChange(next);
    } catch (e) {
      setError(humanError(e, PAIRING_MESSAGES.regenerateFailed));
    } finally {
      setBusy(false);
    }
  };

  // Sin caja: el código es la línea fuerte (mono), el estado va debajo y las acciones al lado y al pie.
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-meta text-ink-muted">Código para tu pareja</p>
          <p className="mt-0.5 font-mono text-subtitle font-bold tracking-wide whitespace-nowrap text-ink">{code || "Sin código"}</p>
        </div>
        {code && (
          <RowButton onClick={copy} aria-label={copied ? "Código copiado" : "Copiar código"} className="shrink-0">
            {copied ? <Check size={18} strokeWidth={1.75} className="text-sage-ink" aria-hidden="true" /> : <Copy size={18} strokeWidth={1.75} aria-hidden="true" />}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </RowButton>
        )}
      </div>
      {/* Si hace falta un código nuevo, el aviso va en tinta y negrita (el botón es de contorno: un solo primario). */}
      <p className={`mt-1.5 text-meta ${needsNew && !copyFailed ? "font-bold text-ink" : "text-ink-muted"}`} aria-live="polite">
        {copyFailed ? "No pudimos copiarlo: mantén presionado el código para copiarlo a mano." : status}
      </p>
      {/* R2 · paso 4: contorno siempre (un solo primario por vista en Ajustes); el texto de arriba ya dice que hace falta. */}
      <RowButton onClick={regenerate} disabled={busy} className="mt-3">
        <RefreshCw size={16} strokeWidth={1.75} className={busy ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
        {busy ? "Generando…" : "Generar código nuevo"}
      </RowButton>
      {error && <p role="alert" className="mt-2 text-meta font-bold text-terracotta-ink">{error}</p>}
    </div>
  );
}

/** Quién puede ver y editar los datos compartidos. La mamá puede quitar el acceso de otra persona. */
function AccessSection({
  profile,
  partner,
  showToast,
  onStartLink,
}: {
  profile: UserProfile;
  partner: PartnerInfo;
  showToast: ShowToast;
  onStartLink: () => void;
}) {
  const pid = profile.pregnancyId;
  const [confirming, setConfirming] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const myUid = partner.myUid;
  const me = partner.members.find((m) => m.uid === myUid);
  const iAmMama = me ? me.role === "mama" : profile.role === "mama";

  if (!pid) {
    const last = profile.role === "mama" ? readStored<LastPregnancy | null>(LS_LAST_PREGNANCY, null) : null;
    const guest = profile.name === "Invitado";
    return (
      <div>
        <p className="flex items-center gap-2 text-body font-bold text-ink">
          <Smartphone size={20} strokeWidth={1.75} className="shrink-0 text-sage-ink" aria-hidden="true" />
          {guest ? "Estás explorando como invitado" : "Solo en este teléfono"}
        </p>
        <p className="mt-1 text-meta text-ink-muted">
          {guest
            ? "Elige tu rol: crea el embarazo compartido o únete al de tu pareja con su código. Lo que anotes mientras tanto queda en este teléfono y se comparte al vincularte."
            : "Nadie más ve lo que registras. Al vincularte, lo que ya anotaste aquí (citas, tareas, patadas, contracciones, presupuesto, nombres, diario y plan de parto) pasa a compartirse con tu pareja."}
        </p>
        {last?.pid && (
          <button
            type="button"
            onClick={() => {
              usePandaStore.getState().setProfile({ pregnancyId: last.pid, inviteCode: last.inviteCode || "" });
              try { window.localStorage.removeItem(LS_LAST_PREGNANCY); } catch { /* sin almacenamiento */ }
              showToast("Este teléfono volvió a tu embarazo compartido");
            }}
            className={`mt-4 ${WIDE_BUTTON} ${OUTLINE_FILL}`}
          >
            Volver a mi embarazo compartido
          </button>
        )}
        {/* R2 · paso 4: contorno (en Ajustes el único relleno es «Guardar fecha», con el editor de fecha abierto). */}
        <button type="button" onClick={onStartLink} className={`${last?.pid ? "mt-2" : "mt-4"} ${WIDE_BUTTON} ${OUTLINE_FILL}`}>
          {guest ? "Crear o unirme a un embarazo" : "Vincular con mi pareja"}
        </button>
      </div>
    );
  }

  const confirmRemove = async () => {
    if (!confirming || !pid) return;
    const who = confirming.name || PERSON_LABEL[confirming.role];
    setRemoving(true);
    setRemoveError("");
    try {
      await removeMember(pid, confirming.uid);
      setConfirming(null);
      showToast(`${who} ya no tiene acceso`);
    } catch (e) {
      setRemoveError(humanError(e, PAIRING_MESSAGES.removeFailed));
    } finally {
      setRemoving(false);
    }
  };

  const others = partner.members.filter((m) => m.uid !== myUid);

  return (
    <div>
      {!partner.loaded && (
        <p className="text-meta text-ink-muted" aria-live="polite">Cargando quién tiene acceso…</p>
      )}
      {partner.loaded && partner.members.length === 0 && (
        <p className="text-meta text-ink-muted">
          Aún no vemos la lista de personas vinculadas. Aparecerá cuando este teléfono termine de conectarse.
        </p>
      )}
      {partner.members.length > 0 && (
        <ListGroup>
          {partner.members.map((m) => {
            const isMe = m.uid === myUid;
            const who = m.name || PERSON_LABEL[m.role];
            return (
              <ListRow
                key={m.uid}
                leading={<AuthorChip name={m.name} role={m.role} title={who} decorative />}
                title={
                  <>
                    {who}
                    {isMe && <span className="font-normal text-ink-muted"> (tú)</span>}
                  </>
                }
                meta={`${ROLE_LABEL[m.role]}${m.joinedAt ? ` · desde el ${formatDateShort(m.joinedAt)}` : ""}`}
                trailing={
                  iAmMama && !isMe ? (
                    <RowButton tone="danger" onClick={() => { setRemoveError(""); setConfirming(m); }} aria-haspopup="dialog">
                      <UserMinus size={16} strokeWidth={1.75} aria-hidden="true" />
                      Quitar acceso
                    </RowButton>
                  ) : undefined
                }
              />
            );
          })}
        </ListGroup>
      )}
      {partner.loaded && partner.members.length > 0 && others.length === 0 && (
        <p className="mt-2 text-meta text-ink-muted">
          {iAmMama ? "Tu pareja aún no se une. Compártele tu código." : "Tu pareja aparecerá aquí cuando se conecte."}
        </p>
      )}

      {confirming && (
        <ConfirmDialog
          titleId="remove-access-title"
          descId="remove-access-desc"
          title={`¿Quitar el acceso de ${confirming.name || PERSON_LABEL[confirming.role]}?`}
          error={removeError}
          busy={removing}
          confirmLabel="Sí, quitar acceso"
          busyLabel="Quitando…"
          onCancel={() => setConfirming(null)}
          onConfirm={() => { void confirmRemove(); }}
        >
          <p>Dejará de ver y editar la agenda, las tareas y los demás datos compartidos. Para volver necesitará un código nuevo.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

/** Campos de Ajustes: borde ≥3:1 con el fondo (claro y oscuro) y foco con la tinta. */
const SETTINGS_INPUT = FIELD;

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", Icon: SunMoon },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
];

/**
 * Tema en tres estados: Sistema (sigue al teléfono en vivo) · Claro · Oscuro. Grupo de radios con
 * tabulación itinerante: Tab entra en la opción elegida y las flechas cambian de opción.
 * Solo elige la preferencia; ThemeSync aplica la clase y el color de la barra del sistema.
 */
function ThemeChoice({
  preference,
  resolved,
  onChange,
}: {
  preference: ThemePreference;
  resolved: "light" | "dark";
  onChange: (preference: ThemePreference) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, THEME_OPTIONS.findIndex((o) => o.value === preference));
  const select = (i: number) => {
    const next = (i + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    onChange(THEME_OPTIONS[next].value);
    refs.current[next]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select(index + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select(index - 1); }
    else if (e.key === "Home") { e.preventDefault(); select(0); }
    else if (e.key === "End") { e.preventDefault(); select(THEME_OPTIONS.length - 1); }
  };
  const hint = preference === "system"
    ? `Sigue el modo de tu teléfono (ahora, ${resolved === "dark" ? "oscuro" : "claro"}).`
    : "El modo oscuro es más cómodo de noche.";
  // Sección de Ajustes (h3 en Alegreya): la pista de segmentado es el único pozo; la opción elegida
  // en sage-ink (seleccionado), con contraste ≥3:1 contra la pista.
  return (
    <section aria-labelledby="theme-choice-label">
      <h3 id="theme-choice-label" className="font-display text-body font-bold text-ink">Apariencia</h3>
      <p id="theme-choice-hint" className="mt-0.5 text-meta text-ink-muted">{hint}</p>
      <div
        role="radiogroup"
        aria-labelledby="theme-choice-label"
        aria-describedby="theme-choice-hint"
        onKeyDown={onKeyDown}
        className="mt-2 flex flex-wrap gap-1 rounded-full bg-surface-sunken p-1"
      >
        {/* flex-1 sin min-w-0: las tres opciones comparten la fila mientras quepan sus etiquetas (por
            debajo de 380px sin el icono decorativo, para que quepan en 320-360px); con zoom o texto
            grande pasan a una por fila en vez de montarse unas sobre otras (1.4.10). */}
        {THEME_OPTIONS.map((o, i) => {
          const checked = i === index;
          return (
            <button
              key={o.value}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={`flex-1 min-h-11 rounded-full px-1.5 flex items-center justify-center gap-1.5 whitespace-nowrap text-meta font-bold transition-colors ${FOCUS_RING} ${
                checked ? SAGE_FILL : "text-ink-muted hover:bg-surface-hover hover:text-ink"
              }`}
            >
              <o.Icon size={16} strokeWidth={1.75} className="shrink-0 max-[380px]:hidden" aria-hidden="true" />
              {o.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Diálogo de dos salidas que se abre SOBRE Ajustes (alertdialog, capa careTeam). Escape o tocar fuera
 * no eligen nada: vuelven a Ajustes. El foco inicial va a la acción principal (la que no pierde nada).
 */
function ChoiceDialog({
  titleId,
  descId,
  title,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onDismiss,
}: {
  titleId: string;
  descId: string;
  title: React.ReactNode;
  children: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
  onDismiss: () => void;
}) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const { dialogProps } = useModalDialog({
    open: true,
    onClose: onDismiss,
    role: "alertdialog",
    labelledBy: titleId,
    describedBy: descId,
    initialFocusRef: primaryRef,
  });
  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 ${Z_CLASS.careTeam} flex items-center justify-center ${SCRIM} p-4`}
        onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
      >
        <div
          {...dialogProps}
          className="w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-5 shadow-dialog outline-none"
        >
          <h2 id={titleId} className="font-display text-title text-ink">{title}</h2>
          <div id={descId} className="mt-2 space-y-2 text-body text-ink-muted">{children}</div>
          <div className="mt-5 flex gap-2 max-[300px]:flex-col">
            <button
              type="button"
              onClick={onSecondary}
              className={`flex-1 min-h-11 rounded-full ${OUTLINE_FILL} text-meta font-bold transition-colors ${FOCUS_RING}`}
            >
              {secondaryLabel}
            </button>
            <button
              ref={primaryRef}
              type="button"
              onClick={onPrimary}
              className={`flex-1 min-h-11 rounded-full ${TERRA_FILL} text-meta font-bold transition-colors ${FOCUS_RING}`}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/** «Fecha probable: 15 de enero de 2027 (semana 24 + 4 días)», «Semana 30, elegida a mano»… */
function describeDating(choice: DatingChoice): string {
  if (choice.kind === "unknown") return "Semana sin confirmar.";
  if (choice.kind === "manual") return `Semana ${choice.week}, elegida a mano.`;
  const ga = resolveGestationalAge(datingPatch(choice));
  const when = ga.dueDate ? formatDateLong(ga.dueDate) : choice.dueDate;
  return `Fecha probable: ${when} (${ga.label.split(" · ")[0].toLocaleLowerCase("es")}).`;
}

/**
 * País (R2 · paso 4): fija el número de emergencias y la línea de crisis por defecto (lo escrito a mano
 * en el equipo de salud manda). Vive en el equipo de salud, compartido con la pareja. Se guarda al
 * elegirlo (una escritura por elección, en el manejador); con vínculo, no antes del primer dato del
 * servidor del equipo de salud.
 */
function CountryField({ partnerName, onSaved }: { partnerName?: string; onSaved: () => void }) {
  const { careTeam, defaults, emergency, crisisLine, save, saving, ready, error } = useCareTeam();
  const pregnancyId = usePandaStore((s) => s.profile.pregnancyId);
  const value = isCountryChoice(careTeam.country) ? careTeam.country : defaults.country ?? "";
  const detectedOnly = !defaults.chosen && !!defaults.country;
  const customEmergency = careTeam.emergencyNumber?.trim();
  const customCrisis = careTeam.crisisLine?.trim();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (!next || next === careTeam.country || !ready) return;
    save({ country: next }).then(onSaved, () => { /* el hook muestra el error; quedó en este teléfono */ });
  };

  let help: string;
  if (!defaults.country) {
    help = "Elige tu país: fija el número de emergencias y la línea de crisis.";
  } else if (defaults.country === OTHER_COUNTRY) {
    help = customEmergency
      ? `Emergencias: ${customEmergency} (el que guardaron). Sin línea de crisis: puedes escribir una en el equipo de salud.`
      : "Revisa el número de emergencias en el equipo de salud. Para «Otro» no hay línea de crisis.";
  } else {
    const em = customEmergency ? `Emergencias: ${customEmergency} (el que guardaron)` : `Emergencias: ${emergency.number}`;
    const cl = crisisLine
      ? customCrisis
        ? ` · Línea de crisis: ${crisisLine.display} (la que guardaron)`
        : ` · Línea de crisis: ${crisisLine.name}, ${crisisLine.display}`
      : ` · Sin línea de crisis verificada para ${defaults.countryName}`;
    help = `${detectedOnly ? "Detectado por tu teléfono. " : ""}${em}${cl}.`;
  }
  const scope = pregnancyId ? `Se comparte con ${partnerName || "tu pareja"}.` : "Solo en este teléfono.";

  return (
    <div className="mt-5">
      <label htmlFor="settings-country" className="mb-1 block text-meta font-bold text-ink">País</label>
      <select
        id="settings-country"
        value={value}
        onChange={onChange}
        disabled={!ready || saving}
        aria-describedby="settings-country-help"
        aria-busy={!ready || saving || undefined}
        className={`${SETTINGS_INPUT} appearance-auto`}
      >
        {!value && (
          <option value="" disabled>
            Elegir país
          </option>
        )}
        {MARKET_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}{detectedOnly && c.code === defaults.country ? " (detectado)" : ""}
          </option>
        ))}
        <option value={OTHER_COUNTRY}>Otro</option>
      </select>
      <p id="settings-country-help" className="mt-1 text-meta text-ink-muted">
        {!ready ? "Cargando lo que tienen guardado…" : help} <span className="text-ink-subtle">{scope}</span>
      </p>
      {error && <p role="alert" className="mt-1 text-meta font-bold text-terracotta-ink">{error}</p>}
    </div>
  );
}

function ProfileModal({
  profile,
  onSaveDating,
  onUpdateLocal,
  onClose,
  focusDating = false,
  partner,
  showToast,
  onStartLink,
  dueDateNeedsReview = false,
  afterUnlinkFocusRef,
}: {
  profile: UserProfile;
  /** Guarda una fecha elegida a propósito (al instante; con vínculo, también para la pareja). */
  onSaveDating: (dating: DatingChoice) => void;
  /** Ajustes locales (comparación de tamaño): se guardan al cambiarlos. */
  onUpdateLocal: (updates: Partial<UserProfile>) => void;
  onClose: () => void;
  /** Abrir con el editor de fecha desplegado y a la vista ("Confirmar mi fecha"). */
  focusDating?: boolean;
  partner: PartnerInfo;
  showToast: ShowToast;
  onStartLink: () => void;
  /** La FPP compartida está fuera de rango: por eso la semana está sin confirmar. */
  dueDateNeedsReview?: boolean;
  /** A dónde vuelve el foco tras desvincular (Ajustes se cierra entero): el botón de Ajustes de la cabecera. */
  afterUnlinkFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const themePreference = usePandaStore(state => state.themePreference);
  const resolvedTheme = usePandaStore(state => state.resolvedTheme);
  const setThemePreference = usePandaStore(state => state.setThemePreference);
  // Fecha: el editor solo se abre a propósito y tiene su propio «Guardar fecha».
  const [datingOpen, setDatingOpen] = useState(focusDating);
  const [datingDraft, setDatingDraft] = useState<DatingDraft>(() => draftFromProfile(profile));
  const datingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusDating) datingRef.current?.scrollIntoView({ block: "center" });
  }, [focusDating]);
  const currentGa = resolveGestationalAge(profile);
  const datingEval = datingOpen ? choiceFromDraft(datingDraft) : null;
  const pendingDating = datingEval?.choice && !sameDating(datingEval.choice, profile) ? datingEval.choice : undefined;
  // Editor abierto con una opción elegida pero sin completar: no se puede guardar a medias.
  const datingBlocked = datingOpen && datingDraft.mode !== null && !datingEval?.choice;
  // Cerrar (X, Escape o el fondo) con una fecha sin guardar no la pierde en silencio: se pregunta.
  const [closeAsk, setCloseAsk] = useState<null | "save" | "incomplete">(null);
  const requestClose = () => {
    if (datingOpen && pendingDating) setCloseAsk("save");
    else if (datingBlocked) setCloseAsk("incomplete");
    else onClose();
  };
  const { dialogProps } = useModalDialog({ open: true, onClose: requestClose, labelledBy: "profile-modal-title" });

  // «Guardado» discreto en el ajuste que se acaba de cambiar (y anunciado por la región viva).
  const [saved, setSaved] = useState<{ key: "comparison" | "country"; text: string } | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSaved = (key: "comparison" | "country", text: string) => {
    setSaved({ key, text });
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(null), 3000);
  };
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  const saveDatingNow = () => {
    if (!pendingDating) return;
    onSaveDating(pendingDating);
    setDatingOpen(false);
  };

  const currentDue = currentGa.dueDate;
  const datingSourceText =
    currentGa.source === "dueDate"
      ? dueDateSummary(currentGa.dueDateSource, profile.role, currentDue ? formatDateLong(currentDue) : undefined)
      : currentGa.source === "manual"
        ? "Semana elegida a mano: agrega la fecha probable para que avance sola"
        : dueDateNeedsReview
          ? "La fecha probable guardada no es válida (serían menos de 2 o más de 42 semanas): elígela otra vez"
          : "Aún no hay fecha ni semana confirmadas";
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  // Al cancelar, el foco vuelve a "Desvincular" (null = quien abrió); al desvincular se cierra
  // Ajustes entero y el foco va al botón de Ajustes de la cabecera.
  const unlinkReturnRef = useRef<HTMLElement | null>(null);
  const [careTeamOpen, setCareTeamOpen] = useState(false);
  // Cuenta opcional: el mismo acceso en otro dispositivo (Google o enlace por correo).
  const [accountOpen, setAccountOpen] = useState(false);
  const account = useAccount();
  const showAccess = !!account.uid && (!!profile.pregnancyId || !account.anonymous);
  const careTeam = usePandaStore(state => state.careTeam);
  const careTeamSummary = careTeam.obName || careTeam.obPhone || careTeam.hospitalName
    ? [careTeam.obName || (careTeam.obPhone ? "Obstetra" : ""), careTeam.hospitalName].filter(Boolean).join(" · ")
    : "Obstetra, hospital, emergencias y línea de crisis";

  /**
   * Desvincular ESTE teléfono. Se conservan nombre y rol (no vuelve a pedir el registro).
   * - Copiloto: sale de la lista de miembros (para volver necesita un código nuevo).
   * - Mamá: sigue siendo miembro (sin ella nadie podría invitar ni quitar acceso), así que puede
   *   volver con "Deshacer" o desde Ajustes ("Volver a mi embarazo compartido").
   */
  const unlink = async () => {
    const pid = profile.pregnancyId;
    const inviteCode = profile.inviteCode;
    const uid = partner.myUid ?? currentUid();
    setUnlinking(true);
    let leftList = true;
    if (pid && uid && profile.role === "papa") {
      try { await removeMember(pid, uid); } catch { leftList = false; }
    }
    if (pid && profile.role === "mama") writeStored(LS_LAST_PREGNANCY, { pid, inviteCode } satisfies LastPregnancy);
    usePandaStore.getState().setProfile({ pregnancyId: "", inviteCode: "" });
    setUnlinking(false);
    unlinkReturnRef.current = afterUnlinkFocusRef?.current ?? null;
    onClose();
    if (!pid) return;
    if (profile.role === "mama") {
      showToast("Desvinculaste este teléfono. Lo compartido sigue guardado y puedes volver desde Ajustes.", () => {
        usePandaStore.getState().setProfile({ pregnancyId: pid, inviteCode: inviteCode || "" });
        try { window.localStorage.removeItem(LS_LAST_PREGNANCY); } catch { /* sin almacenamiento */ }
      }, { duration: 9000 });
    } else {
      showToast(leftList
        ? "Desvinculaste este teléfono. Para volver necesitarás un código nuevo."
        : "Desvinculaste este teléfono. Tu pareja aún te verá en su lista hasta que te quite.");
    }
  };
  const partnerLabelForUnlink = partner.partnerName || (profile.role === "mama" ? "papá" : "tu pareja");
  const isMama = profile.role === "mama";
  const geek = profile.comparisonTheme === "geek";

  // Fase 6: el diálogo es la única caja; dentro, secciones (h3 en Alegreya) y listas con divisores.
  // R2 · paso 4: sin «Guardar cambios». Cada ajuste se guarda al cambiarlo; la fecha, con «Guardar fecha».
  return (
    <ModalPortal>
    <div
      className={`fixed inset-0 ${SCRIM} ${Z_CLASS.dialog} flex items-center justify-center p-4`}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div
        {...dialogProps}
        className="bg-surface-raised text-ink rounded-3xl shadow-dialog w-full max-w-sm overflow-hidden border border-line flex flex-col max-h-[min(85dvh,var(--dialog-max))] outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line py-2 ps-5 pe-2">
          <h2 id="profile-modal-title" className="font-display text-title text-ink">Ajustes</h2>
          <button type="button" onClick={requestClose} className={ICON_BUTTON} aria-label="Cerrar ventana de ajustes">
            <X size={22} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Anuncio de «Guardado» para el lector de pantalla (el texto visible va en cada ajuste). */}
        <p role="status" className="sr-only">{saved ? saved.text : ""}</p>

        {/* El gutter es el padding del cuerpo: las filas llegan al borde del panel. */}
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-5 pt-4 pb-6 [--gutter:1.25rem]">
          <Section as="h3" title="Familia">
            <ListGroup>
              <ListRow
                leading={isMama ? <Sprout size={20} strokeWidth={1.75} /> : <Users size={20} strokeWidth={1.75} />}
                title={isMama ? "Modo mamá" : "Modo copiloto"}
                meta={profile.name}
                trailing={
                  profile.pregnancyId ? (
                    <RowButton onClick={() => setConfirmUnlink(true)} aria-haspopup="dialog">
                      Desvincular
                    </RowButton>
                  ) : undefined
                }
              />
              {showAccess && (
                <ListRow
                  leading={<KeyRound size={20} strokeWidth={1.75} />}
                  title="Tu acceso"
                  meta={account.anonymous ? "Solo en este dispositivo" : `Cuenta: ${account.email ?? "guardada"}`}
                  trailing={
                    <RowButton onClick={() => setAccountOpen(true)} aria-haspopup="dialog">
                      {account.anonymous ? "Otro dispositivo" : "Ver"}
                    </RowButton>
                  }
                />
              )}
              {/* R2 · paso 5: para los dos roles (antes solo el papá) y con un texto sin estereotipos. */}
                <ListRow
                  leading={<Sparkles size={20} strokeWidth={1.75} />}
                  title="Comparar el tamaño con objetos"
                  meta={
                    <>
                      En vez de frutas: teléfonos, teclados, consolas…
                      {saved?.key === "comparison" && (
                        <span className="ms-1 inline-flex items-center gap-1 font-bold text-sage-ink">
                          · <Check size={14} strokeWidth={2} aria-hidden="true" /> Guardado
                        </span>
                      )}
                    </>
                  }
                  trailing={
                    <button
                      type="button"
                      role="switch"
                      aria-checked={geek}
                      aria-label="Comparar el tamaño con objetos en lugar de frutas"
                      onClick={() => {
                        onUpdateLocal({ comparisonTheme: geek ? "frutas" : "geek" });
                        flashSaved("comparison", "Comparación guardada en este teléfono");
                      }}
                      className={`-me-1.5 grid size-11 shrink-0 place-items-center rounded-full ${FOCUS_RING}`}
                    >
                      {/* Mismo dibujo que el switch de ListRow: pista con borde ≥3:1 apagada, sage-ink encendida. */}
                      <span
                        aria-hidden="true"
                        className={`relative inline-flex h-6 w-10 items-center rounded-full border transition-colors ${geek ? "border-transparent bg-[var(--sage-ink)]" : "border-line-control bg-surface-sunken"}`}
                      >
                        <span
                          className={`absolute left-[3px] size-4 rounded-full transition-transform duration-200 ${geek ? "translate-x-4 bg-[var(--ground)]" : "translate-x-0 bg-[var(--line-control)]"}`}
                        />
                      </span>
                    </button>
                  }
                />
            </ListGroup>

            {confirmUnlink && profile.pregnancyId && (
              <ConfirmDialog
                titleId="unlink-title"
                descId="unlink-desc"
                title="¿Desvincular este teléfono?"
                busy={unlinking}
                confirmLabel="Sí, desvincular"
                busyLabel="Desvinculando…"
                onCancel={() => setConfirmUnlink(false)}
                onConfirm={() => { void unlink(); }}
                returnFocusRef={unlinkReturnRef}
              >
                {profile.role === "mama" ? (
                  <>
                    <p>Este teléfono dejará de ver la agenda, el diario, los nombres y lo demás que comparten. {partnerLabelForUnlink.charAt(0).toLocaleUpperCase("es") + partnerLabelForUnlink.slice(1)} lo seguirá viendo.</p>
                    <p>Nada se borra: podrás volver desde Ajustes. Si lo que quieres es que tu pareja deje de ver tus datos, usa «Quitar acceso» en «Personas con acceso».</p>
                  </>
                ) : (
                  <p>Dejarás de ver lo que comparten. Para volver, {partnerLabelForUnlink} tendrá que darte un código nuevo.</p>
                )}
              </ConfirmDialog>
            )}

            {isMama && profile.pregnancyId && (
              <InviteCodePanel
                pregnancyId={profile.pregnancyId}
                code={profile.inviteCode}
                myUid={partner.myUid}
                onCodeChange={(inviteCode) => {
                  usePandaStore.getState().setProfile({ inviteCode });
                  showToast("Código nuevo listo. El anterior ya no sirve.");
                }}
              />
            )}
          </Section>

          {/* Personas con acceso a los datos compartidos */}
          <Section as="h3" title="Personas con acceso">
            <AccessSection profile={profile} partner={partner} showToast={showToast} onStartLink={onStartLink} />
          </Section>

          <Section as="h3" title="Embarazo">
            {/* Equipo de salud (compartido con la pareja) y fecha: una lista; el editor de fecha se abre debajo. */}
            <div ref={datingRef} className="scroll-mt-4">
              <ListGroup>
                <ListRow
                  leading={<Stethoscope size={20} strokeWidth={1.75} />}
                  title="Equipo de salud"
                  meta={careTeamSummary}
                  onClick={() => setCareTeamOpen(true)}
                  aria-haspopup="dialog"
                  trailing="chevron"
                />
                <ListRow
                  leading={<CalendarClock size={20} strokeWidth={1.75} />}
                  title={currentGa.label}
                  meta={
                    <>
                      {datingSourceText}
                      <span className="mt-0.5 block text-ink-subtle">
                        {profile.pregnancyId ? `Se comparte con ${partner.partnerName || "tu pareja"}` : "Solo en este teléfono"}
                      </span>
                    </>
                  }
                  trailing={
                    !datingOpen ? (
                      <RowButton onClick={() => { setDatingDraft(draftFromProfile(profile)); setDatingOpen(true); }}>
                        {currentGa.source === "unknown" ? "Confirmar fecha" : "Cambiar fecha"}
                      </RowButton>
                    ) : undefined
                  }
                />
              </ListGroup>
              {datingOpen && (
                <div className="mt-4">
                  <DatingPicker
                    draft={datingDraft}
                    onDraftChange={setDatingDraft}
                    allowUnknown={currentGa.source === "unknown"}
                    reader={profile.role}
                    partnerName={partner.partnerName}
                    idPrefix="settings-dating"
                  />
                  {datingBlocked && (
                    <p className="mt-2 text-meta text-ink-muted" aria-live="polite">
                      Completa la fecha para poder guardarla.
                    </p>
                  )}
                  {/* Único botón principal de Ajustes: el de la fecha (el resto se guarda al cambiarlo). */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <RowButton tone="primary" onClick={saveDatingNow} disabled={!pendingDating}>
                      Guardar fecha
                    </RowButton>
                    <button
                      type="button"
                      onClick={() => { setDatingOpen(false); setDatingDraft(draftFromProfile(profile)); }}
                      className={`-ms-1 inline-flex min-h-11 items-center rounded-full px-1 text-meta font-bold text-ink underline underline-offset-4 ${FOCUS_RING}`}
                    >
                      Dejar la fecha como estaba
                    </button>
                  </div>
                </div>
              )}
            </div>

            <CountryField
              partnerName={partner.partnerName}
              onSaved={() => flashSaved("country", "País guardado")}
            />
            {saved?.key === "country" && (
              <p aria-hidden="true" className="mt-1 inline-flex items-center gap-1 text-micro font-bold text-sage-ink">
                <Check size={14} strokeWidth={2} /> Guardado
              </p>
            )}
          </Section>

          {/* Tema: sistema (sigue al teléfono), claro u oscuro. Se aplica y se guarda al elegirlo. */}
          <ThemeChoice
            preference={themePreference}
            resolved={resolvedTheme}
            onChange={(p) => {
              if (p === themePreference) return;
              setThemePreference(p);
              try { navigator.vibrate?.(25); } catch { /* sin vibración */ }
            }}
          />

          {/* Versión publicada (commit de Vercel): para saber si la app instalada ya tomó la última. */}
          <p className="text-center text-micro text-ink-subtle">
            PandaJR · versión <span className="font-mono tabular-nums">{APP_VERSION}</span>
          </p>
        </div>
      </div>

      <CareTeamSheet open={careTeamOpen} onClose={() => setCareTeamOpen(false)} onSaved={() => showToast("Equipo de salud guardado")} />
      {accountOpen && (
        <AccountSheet
          mode="manage"
          current={{ pregnancyId: profile.pregnancyId, role: profile.role }}
          onClose={() => setAccountOpen(false)}
          onRestored={(restored) => {
            // Cambió este dispositivo a la cuenta del otro: lo del embarazo manda.
            usePandaStore.getState().setProfile(profileFromRestored(restored, profile));
            setAccountOpen(false);
            showToast("Listo: este dispositivo ya usa tu cuenta.");
          }}
          onSignedOut={() => {
            // La pertenencia al embarazo no cambia: con la cuenta se vuelve a entrar.
            setAccountOpen(false);
            usePandaStore.getState().setProfile({ name: "", pregnancyId: "", inviteCode: "", week: 14, weekUnknown: undefined, dueDate: undefined, dueDateSource: undefined });
            usePandaStore.setState({ careTeam: {} });
            onClose();
            showToast("Cerraste sesión en este dispositivo. Para volver, elige «Ya uso PandaJR en otro dispositivo».");
          }}
        />
      )}

      {closeAsk === "save" && pendingDating && (
        <ChoiceDialog
          titleId="pending-date-title"
          descId="pending-date-desc"
          title="¿Guardar la nueva fecha?"
          primaryLabel="Guardar fecha"
          onPrimary={() => { setCloseAsk(null); onSaveDating(pendingDating); onClose(); }}
          secondaryLabel="Descartar"
          onSecondary={() => { setCloseAsk(null); onClose(); }}
          onDismiss={() => setCloseAsk(null)}
        >
          <p className="font-bold text-ink">{describeDating(pendingDating)}</p>
          <p>{isMama ? "Si no la guardas, se queda la que tenías." : "Si no la guardas, se queda la que tenían."}</p>
        </ChoiceDialog>
      )}
      {closeAsk === "incomplete" && (
        <ChoiceDialog
          titleId="pending-date-title"
          descId="pending-date-desc"
          title="La fecha quedó a medias"
          primaryLabel="Seguir editando"
          onPrimary={() => setCloseAsk(null)}
          secondaryLabel="Descartar"
          onSecondary={() => { setCloseAsk(null); onClose(); }}
          onDismiss={() => setCloseAsk(null)}
        >
          <p>Si cierras ahora, no se guarda ningún cambio de fecha.</p>
        </ChoiceDialog>
      )}
    </div>
    </ModalPortal>
  );
}

// --- SISTEMA DE PREPARACIÓN CLÍNICA Y RECORDATORIOS DE CITAS ---
export interface AppointmentPrepInfo {
  category: string;
  badge: string;
  whatToBring: string[];
  whatToAsk: string[];
  tip: string;
}

const CONNECT_FAILED = "No pudimos conectar este teléfono. Revisa tu internet e inténtalo de nuevo.";

function inviteShareText(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `Hola, te invito a acompañarme en PandaJR${origin ? ` (${origin})` : ""}. Abre la app, elige «Soy el copiloto (pareja)» y escribe este código: ${code}. Vale por 14 días y solo sirve para una persona.`;
}

type OnbStep = "role" | "name" | "date" | "share" | "code" | "confirm";

/** Pasos tras elegir rol. Mamá: nombre → fecha → código. Copiloto: nombre → código → confirmación. */
const ONB_STEPS: Record<"mama" | "papa", OnbStep[]> = {
  mama: ["name", "date", "share"],
  papa: ["name", "code", "confirm"],
};

// Deshabilitado discreto (pozo + tinta de deshabilitado) y anillo de foco en tinta terracota en todos.
const ONB_CTA = WIDE_BUTTON;
const ONB_CTA_MAMA = `${ONB_CTA} ${TERRA_FILL}`;
const ONB_CTA_PAPA = `${ONB_CTA} ${SAGE_FILL}`;
const ONB_CTA_NEUTRAL = `${ONB_CTA} ${INK_FILL}`;
const ONB_INPUT = FIELD;

/** Perfil local de la datación que eligió la mamá (la desconocida conserva un número de relleno). */
/**
 * Semana elegida a mano → FPP estimada con origen "manual", para que la semana avance sola
 * (decisión de producto). En la semana 1 no hay FPP válida y se guarda como semana fija.
 */
function manualDatingOpts(week: number): { dueDate: string; dueDateSource: "manual" } | { week: number } {
  const estimated = estimatedDueDateForWeek(week);
  return estimated ? { dueDate: estimated, dueDateSource: "manual" } : { week };
}

function saveManualWeek(pregnancyId: string, week: number, by?: { uid: string; name?: string }): Promise<void> {
  const estimated = estimatedDueDateForWeek(week);
  return estimated ? saveDueDate(pregnancyId, estimated, "manual", by) : updatePregnancyWeek(pregnancyId, week, by);
}

function datingProfileFields(c: DatingChoice, fallbackWeek: number): Pick<UserProfile, "week" | "weekUnknown" | "dueDate" | "dueDateSource"> {
  const p = datingPatch(c);
  return { week: p.week ?? fallbackWeek, weekUnknown: p.weekUnknown, dueDate: p.dueDate, dueDateSource: p.dueDateSource };
}

/** Datación que trae el embarazo al que se une el copiloto (FPP si la hay; si no, la semana). */
function joinedDatingFields(res: { week: number; dueDate?: string; dueDateSource?: DueDateSource }): Pick<UserProfile, "week" | "weekUnknown" | "dueDate" | "dueDateSource"> {
  const unconfirmed = { week: 14, weekUnknown: true, dueDate: undefined, dueDateSource: undefined };
  try {
    const due = parseISODate(res.dueDate);
    if (due) {
      // Dato remoto fuera de rango (p. ej. un año mal escrito): semana sin confirmar. La semana del
      // código salió de esa misma fecha, así que tampoco se usa.
      if (!validateDueDate(due).ok) return unconfirmed;
      // Sin origen guardado no se inventa uno: "manual" diría "la semana que indicaste".
      const source = isDueDateSource(res.dueDateSource) ? res.dueDateSource : undefined;
      return { dueDate: toISODate(due), dueDateSource: source, week: gestationalAgeFromDueDate(due).weeks, weekUnknown: false };
    }
    if (res.week) return profilePatchForManualWeek(res.week);
  } catch {
    /* dato remoto inválido: se trata como semana sin confirmar */
  }
  return unconfirmed;
}

/** Perfil al entrar con una cuenta (o al cambiar este dispositivo a ella): el embarazo compartido manda. */
function profileFromRestored(r: RestoredAccount, prev: UserProfile): UserProfile {
  const keptName = prev.name && prev.name !== "Invitado" ? prev.name : "";
  return {
    ...prev,
    role: r.role,
    name: r.name || keptName || (r.role === "mama" ? "Mamá" : "Copiloto"),
    pregnancyId: r.pregnancyId,
    inviteCode: r.inviteCode ?? "",
    ...joinedDatingFields(r),
  };
}

/** Commit publicado (Vercel expone NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA al compilar); en local, "local". */
const APP_VERSION = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);

/** Vuelta de un enlace de acceso por correo (se lee una vez, solo en el navegador). */
let accessLinkCache: AccessLink | null | undefined;
const noopSubscribe = () => () => {};
const getAccessLinkSnapshot = () => {
  if (accessLinkCache === undefined) accessLinkCache = readAccessLink(window.location.href);
  return accessLinkCache;
};
const getServerAccessLink = () => null;

/** Semana que ve el copiloto antes de unirse (con una FPP fuera de rango no se calcula nada). */
function previewWeekLabel(p: { dueDate?: string; week?: number }): string {
  const due = parseISODate(p.dueDate);
  if (due) return validateDueDate(due).ok ? resolveGestationalAge({ dueDate: p.dueDate }).label : "Sin confirmar: hay que revisar la fecha";
  return p.week ? `Semana ${p.week}` : "Sin confirmar";
}

function OnboardingModal({
  onComplete,
  onSkip,
  onCancel,
  onUseAccount,
  initial,
}: {
  onComplete: (profile: UserProfile) => void;
  /** «Ya uso PandaJR en otro dispositivo»: entrar con la cuenta guardada. */
  onUseAccount?: () => void;
  /** "Explorar como invitado" con el rol elegido (o ninguno). */
  onSkip?: (role: "mama" | "papa" | null) => void;
  /** Si llega, la primera pantalla ofrece "Ahora no" (vuelve sin tocar el perfil) en lugar de "Explorar como invitado". */
  onCancel?: () => void;
  initial?: Partial<UserProfile>;
}) {
  const [step, setStep] = useState<OnbStep>("role");
  const [role, setRole] = useState<"mama" | "papa" | null>(null);
  const [name, setName] = useState(initial?.name && initial.name !== "Invitado" ? initial.name : "");
  const [draft, setDraft] = useState<DatingDraft>(() => draftFromProfile(initial));
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tempPregnancyId, setTempPregnancyId] = useState("");
  /** Datación con la que quedó guardado el embarazo compartido (para no reescribirla sin cambios). */
  const [savedChoice, setSavedChoice] = useState<DatingChoice | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const normalizedCode = normalizeInviteCode(code);
  const partnerLabel = preview ? (preview.momName || (preview.legacy ? preview.babyName : "") || "tu pareja") : "tu pareja";
  const { choice } = choiceFromDraft(draft);
  // Si el embarazo ya se guardó con una fecha, "aún no sé" no podría borrarla del otro teléfono.
  const allowUnknown = !(tempPregnancyId && savedChoice && savedChoice.kind !== "unknown");
  const steps = role ? ONB_STEPS[role] : [];
  const stepIndex = steps.indexOf(step);
  const fallbackWeek = initial?.week && !initial.weekUnknown ? initial.week : 14;

  // Diálogo modal: al abrir y al cambiar de paso el foco va al título (lector de pantalla y teclado
  // siguen el flujo). Obligatorio la primera vez; en "Vincular" Escape equivale a "Ahora no" (solo
  // en la primera pantalla, donde está ese botón: más adelante podría dejar a medias lo creado).
  const { dialogProps } = useModalDialog({
    open: true,
    onClose: () => { if (onCancel && step === "role" && !isLoading) onCancel(); },
    labelledBy: "onb-title",
    initialFocusRef: headingRef,
  });
  // Solo en un cambio real de paso: el foco inicial lo pone el diálogo (si se enfocara aquí al montar,
  // el diálogo no sabría quién lo abrió y no podría devolverle el foco al cerrar).
  const shownStepRef = useRef(step);
  useEffect(() => {
    if (shownStepRef.current === step) return;
    shownStepRef.current = step;
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const back = () => {
    if (isLoading) return;
    setErrorMsg("");
    if (step === "name") setStep("role");
    else if (step === "date") setStep("name");
    else if (step === "share") setStep("date");
    else if (step === "code") setStep("name");
    else if (step === "confirm") { setPreview(null); setStep("code"); }
  };

  const submitName = () => {
    if (!name.trim() || !role) return;
    setErrorMsg("");
    setStep(role === "mama" ? "date" : "code");
  };

  /** Mamá: crea el embarazo compartido con su fecha (o actualiza la fecha si volvió atrás). */
  const submitDate = async () => {
    if (!choice || isLoading) return;
    setErrorMsg("");
    if (tempPregnancyId && savedChoice && JSON.stringify(savedChoice) === JSON.stringify(choice)) {
      setStep("share");
      return;
    }
    setIsLoading(true);
    try {
      const uid = await ensureAuth().catch(() => undefined);
      if (!uid) { setErrorMsg(CONNECT_FAILED); return; }
      if (!tempPregnancyId) {
        const opts = choice.kind === "dueDate"
          ? { dueDate: choice.dueDate, dueDateSource: choice.source }
          : choice.kind === "manual" ? manualDatingOpts(choice.week) : {};
        const { inviteCode, pregnancyId } = await createPregnancyForMom(uid, "", name.trim(), opts);
        setGeneratedCode(inviteCode);
        setTempPregnancyId(pregnancyId);
      } else {
        if (isOffline()) { setErrorMsg(PAIRING_MESSAGES.offline); return; }
        const by = { uid, name: name.trim() || undefined };
        if (choice.kind === "dueDate") await saveDueDate(tempPregnancyId, choice.dueDate, choice.source, by);
        else if (choice.kind === "manual") await saveManualWeek(tempPregnancyId, choice.week, by);
      }
      setSavedChoice(choice);
      setStep("share");
    } catch (e) {
      setErrorMsg(humanError(e, tempPregnancyId ? "No pudimos guardar la fecha. Revisa tu conexión e inténtalo de nuevo." : PAIRING_MESSAGES.createFailed));
    } finally {
      setIsLoading(false);
    }
  };

  /** Copiloto: vista previa del código antes de unirse (no escribe nada). */
  const submitCode = async () => {
    if (isLoading) return;
    setErrorMsg("");
    if (!normalizedCode) { setErrorMsg(PAIRING_MESSAGES.notFound); return; }
    setIsLoading(true);
    try {
      // Sesión antes de la vista previa: así sabemos si el código es de este mismo teléfono.
      const uid = await ensureAuth().catch(() => undefined);
      if (!uid) { setErrorMsg(CONNECT_FAILED); return; }
      const p = await previewInvite(normalizedCode.code);
      if (p.isOwnCode) setErrorMsg(PAIRING_MESSAGES.own);
      else if (p.status === "not_found") setErrorMsg(PAIRING_MESSAGES.notFound);
      else if (p.status === "expired") setErrorMsg(PAIRING_MESSAGES.expired);
      else if (p.status === "used") setErrorMsg(PAIRING_MESSAGES.used);
      else { setPreview(p); setStep("confirm"); }
    } catch (e) {
      setErrorMsg(humanError(e, PAIRING_MESSAGES.joinFailed));
    } finally {
      setIsLoading(false);
    }
  };

  /** Copiloto: se une y toma la fecha (o la semana) del embarazo. */
  const confirmJoin = async () => {
    if (!normalizedCode || isLoading) return;
    setErrorMsg("");
    setIsLoading(true);
    try {
      const uid = await ensureAuth().catch(() => undefined);
      if (!uid) { setErrorMsg(CONNECT_FAILED); return; }
      const res = await joinPregnancyAsDad(uid, normalizedCode.code, name.trim());
      onComplete({ role: "papa", name: name.trim(), ...joinedDatingFields(res), location: "", notes: "", pregnancyId: res.pregnancyId });
    } catch (e) {
      setErrorMsg(humanError(e, PAIRING_MESSAGES.joinFailed));
    } finally {
      setIsLoading(false);
    }
  };

  const finishMama = () => {
    const dating = datingProfileFields(savedChoice ?? { kind: "unknown" }, fallbackWeek);
    onComplete({ role: "mama", name: name.trim(), ...dating, location: "", notes: "", pregnancyId: tempPregnancyId, inviteCode: generatedCode });
  };

  const copyGenerated = async () => {
    const ok = await copyText(generatedCode);
    setCodeCopied(ok);
    if (!ok) setErrorMsg("No pudimos copiarlo: mantén presionado el código para copiarlo a mano.");
  };

  const accent = role === "papa" ? "bg-sage-ink" : "bg-terracotta-ink";
  const cta = role === "papa" ? ONB_CTA_PAPA : ONB_CTA_MAMA;
  const spinner = <span aria-hidden="true" className="w-4 h-4 border-2 border-on-accent/30 border-t-on-accent rounded-full animate-spin motion-reduce:animate-none" />;
  const headingClass = "font-display text-title text-ink outline-none";
  const subClass = "mt-1.5 text-body text-ink-muted";
  const fieldLabel = "mb-1 block text-meta font-bold text-ink";
  const errorBox = errorMsg ? (
    <div role="alert" className="mt-4 rounded-xl bg-terracotta-wash p-3 text-meta font-bold text-terracotta-ink">{errorMsg}</div>
  ) : null;
  // La planta de su semana (la que acaba de guardar) recibe a la mamá al terminar; sin semana, un brote.
  const planted = savedChoice ? datingPatch(savedChoice) : null;
  const plantWeek = planted && !planted.weekUnknown ? planted.week : undefined;
  /** Opción de rol: fila de una lista (el texto es el primer <span>, con la tinta del rol al elegirla). */
  const roleOption = (value: "mama" | "papa", label: string, Icon: typeof Baby) => {
    const on = role === value;
    const ink = value === "mama" ? "text-terracotta-ink" : "text-sage-ink";
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setRole(value)}
        className={`flex w-full min-h-16 items-center gap-3 px-[var(--gutter)] py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta-ink ${
          on ? (value === "mama" ? "bg-terracotta-wash" : "bg-sage-wash") : "hover:bg-surface-hover"
        }`}
      >
        <Icon size={24} strokeWidth={1.75} aria-hidden="true" className={`shrink-0 ${on ? ink : "text-ink-subtle"}`} />
        <span className={`min-w-0 flex-1 text-body font-bold ${on ? ink : "text-ink"}`}>{label}</span>
        {on ? (
          <CheckCircle2 size={22} strokeWidth={1.75} aria-hidden="true" className={`shrink-0 ${ink}`} />
        ) : (
          <Circle size={22} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-line-control" />
        )}
      </button>
    );
  };

  // Fase 6: pantalla completa en alabastro y una columna sin tarjeta; las opciones (rol, fecha) son
  // listas con divisores que llegan al borde (--gutter = padding de la columna).
  return (
    <ModalPortal>
    <div className={`fixed inset-0 bg-ground ${Z_CLASS.dialog} overflow-y-auto`}>
      <div className="flex min-h-full items-center justify-center px-5 pt-[max(2rem,var(--safe-top))] pb-[max(2rem,var(--safe-bottom))]">
      <div {...dialogProps} className="w-full max-w-sm outline-none [--gutter:1.25rem]">
        {step !== "role" && role && (
          <div className="mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              aria-disabled={isLoading || undefined}
              className={`-ms-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-meta font-bold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink ${FOCUS_RING}`}
            >
              <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
              Atrás
            </button>
            <div className="flex items-center gap-2">
              <span className="text-micro font-medium text-ink-subtle tabular-nums">Paso {stepIndex + 1} de {steps.length}</span>
              <span aria-hidden="true" className="flex gap-1">
                {steps.map((s, i) => (
                  <span key={s} className={`h-1.5 w-5 rounded-full ${i <= stepIndex ? accent : "bg-line-strong"}`} />
                ))}
              </span>
            </div>
          </div>
        )}

        {step === "role" && (
          <div className="text-center">
            {/* El panda trazado, sobre el alabastro (sin azulejo). */}
            <PandaMark size={88} className="mx-auto mb-5" />
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>Te damos la bienvenida a PandaJR</h2>
            <p className={subClass}>Cuéntanos quién eres para acompañarte mejor.</p>

            <div className="-mx-[var(--gutter)] mt-6 divide-y divide-line border-y border-line">
              {roleOption("mama", "Soy la futura mamá", Sprout)}
              {roleOption("papa", "Soy el copiloto (pareja)", Users)}
            </div>

            <button type="button" onClick={() => role && setStep("name")} disabled={!role} className={`${ONB_CTA_NEUTRAL} mt-6`}>
              Continuar
            </button>
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className={`mt-2 w-full min-h-11 rounded-full text-meta font-bold text-ink-muted transition-colors hover:text-ink ${FOCUS_RING}`}
              >
                Ahora no
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSkip?.(role)}
                className={`mt-2 w-full min-h-11 rounded-full text-meta font-bold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline ${FOCUS_RING}`}
              >
                Explorar como invitado
              </button>
            )}
            {onUseAccount && (
              <div className="mt-6 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={onUseAccount}
                  aria-haspopup="dialog"
                  className={`inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-full text-meta font-bold text-ink transition-colors hover:bg-surface-hover ${FOCUS_RING}`}
                >
                  <KeyRound size={16} strokeWidth={1.75} aria-hidden="true" />
                  Ya uso PandaJR en otro dispositivo
                </button>
              </div>
            )}
          </div>
        )}

        {step === "name" && role && (
          <div>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>¿Cómo te llamas?</h2>
            <p className={subClass}>Así te verá tu pareja en PandaJR.</p>
            {errorBox}
            <div className="mt-5">
              <label htmlFor={role === "mama" ? "onb-mama-name" : "onb-papa-name"} className={fieldLabel}>Tu nombre</label>
              <input
                id={role === "mama" ? "onb-mama-name" : "onb-papa-name"}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitName(); }}
                placeholder={role === "mama" ? "Ej. Elena" : "Ej. Luis"}
                autoComplete="given-name"
                className={ONB_INPUT}
              />
            </div>
            <button type="button" onClick={submitName} disabled={!name.trim()} className={`${cta} mt-6`}>
              Continuar
            </button>
          </div>
        )}

        {step === "date" && role === "mama" && (
          <div>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>Tu fecha probable de parto</h2>
            <p className={subClass}>Con ella calculamos tu semana cada día. Si no la sabes, puedes usar la fecha de tu última regla o elegir la semana a mano.</p>
            {errorBox}
            <div className="mt-5">
              <DatingPicker draft={draft} onDraftChange={setDraft} allowUnknown={allowUnknown} reader="mama" idPrefix="onb-dating" />
            </div>
            <button type="button" onClick={() => { void submitDate(); }} disabled={!choice} aria-disabled={isLoading || undefined} className={`${cta} mt-6`}>
              {isLoading && spinner}
              {isLoading ? (tempPregnancyId ? "Guardando…" : "Creando tu espacio…") : "Continuar"}
            </button>
          </div>
        )}

        {step === "share" && role === "mama" && (
          <div>
            <GrowingPlant week={plantWeek} size={88} title="" className="-ms-3 mb-1" animate={false} />
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>Tu espacio está listo</h2>
            <p className={subClass}>Comparte este código con tu pareja para que se vincule a tu embarazo. Vale por 14 días y sirve para una sola persona.</p>

            <div className="mt-5 rounded-2xl bg-surface-sunken p-4 text-center">
              <p className="font-mono text-subtitle font-extrabold tracking-wider text-terracotta-ink break-all">{generatedCode}</p>
              <button
                type="button"
                onClick={copyGenerated}
                className={`mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-meta font-bold text-ink transition-colors hover:bg-surface-hover ${FOCUS_RING}`}
              >
                {codeCopied ? <Check size={16} strokeWidth={1.75} className="text-sage-ink" aria-hidden="true" /> : <Copy size={16} strokeWidth={1.75} aria-hidden="true" />}
                <span aria-live="polite">{codeCopied ? "Copiado" : "Copiar código"}</span>
              </button>
            </div>
            {errorMsg && <p role="alert" className="mt-2 text-meta font-bold text-terracotta-ink">{errorMsg}</p>}

            <button
              type="button"
              onClick={() => {
                window.open(`https://wa.me/?text=${encodeURIComponent(inviteShareText(generatedCode))}`, "_blank", "noopener,noreferrer");
              }}
              className={`${ONB_CTA_PAPA} mt-5`}
            >
              <Share2 size={20} strokeWidth={1.75} aria-hidden="true" />
              Compartir por WhatsApp
            </button>
            <button type="button" onClick={finishMama} className={`${ONB_CTA_NEUTRAL} mt-3`}>
              Entrar a PandaJR
            </button>
          </div>
        )}

        {step === "code" && role === "papa" && (
          <div>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>El código de tu pareja</h2>
            <p className={subClass}>Pídele el código que aparece en su PandaJR, en Ajustes.</p>
            {errorBox}
            <div className="mt-5">
              <label htmlFor="onb-papa-code" className={fieldLabel}>Código de invitación</label>
              <input
                id="onb-papa-code"
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setErrorMsg(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && normalizedCode) void submitCode(); }}
                placeholder="PANDA-XXXX-XXXX"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby="onb-code-hint"
                className={`${ONB_INPUT} text-center font-mono font-bold tracking-widest text-subtitle! uppercase`}
              />
              <p id="onb-code-hint" className="mt-1.5 text-center text-meta text-ink-muted">
                {code.trim() && !normalizedCode ? "Revisa el código: se ve así, PANDA-XXXX-XXXX." : "Puedes escribirlo con o sin guiones."}
              </p>
            </div>
            <button type="button" onClick={() => { void submitCode(); }} disabled={!normalizedCode} aria-disabled={isLoading || undefined} className={`${cta} mt-6`}>
              {isLoading && spinner}
              {isLoading ? "Buscando…" : "Continuar"}
            </button>
          </div>
        )}

        {step === "confirm" && role === "papa" && preview && (
          <div>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>¿Te unes al embarazo de {partnerLabel}?</h2>
            {errorBox}
            <dl className="mt-4 border-y border-line divide-y divide-line text-body">
              {!preview.legacy && preview.babyName && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-ink-muted">Bebé</dt>
                  <dd className="text-right font-bold text-ink">{preview.babyName}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-ink-muted">Semana</dt>
                <dd className="text-right font-bold text-ink">
                  {previewWeekLabel(preview)}
                </dd>
              </div>
              {preview.dueDate && (
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-ink-muted">Fecha probable</dt>
                  <dd className="text-right font-bold text-ink">{formatDateLong(parseISODate(preview.dueDate) ?? new Date())}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-ink-muted">Código</dt>
                <dd className="text-right font-mono font-bold text-ink">{normalizedCode?.code}</dd>
              </div>
            </dl>
            <p className="mt-4 text-body text-ink-muted">Verán y editarán juntos la agenda, las tareas y el estado de ánimo. La semana se toma de su embarazo.</p>
            <div className="mt-5 space-y-3">
              <button type="button" onClick={() => { void confirmJoin(); }} aria-disabled={isLoading || undefined} className={ONB_CTA_PAPA}>
                {isLoading && spinner}
                {isLoading ? "Uniéndote…" : "Sí, unirme"}
              </button>
              <button
                type="button"
                onClick={() => { if (isLoading) return; setPreview(null); setCode(""); setErrorMsg(""); setStep("code"); }}
                className={`${WIDE_BUTTON} ${OUTLINE_FILL}`}
              >
                No es este
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
    </ModalPortal>
  );
}

type ToastState = { id: number; message: string; onAction?: () => void; actionLabel?: string };

/** Operación de Agenda aún sin confirmar por el servidor (se superpone al último snapshot). */
type PendingEventOp = { seq: number; kind: "upsert" | "delete"; ev?: AgendaEvent; committed?: boolean };

function opReflected(list: AgendaEvent[], key: string, op: PendingEventOp): boolean {
  const cur = list.find((e) => String(e.id) === key);
  return op.kind === "delete" ? !cur : sameEvent(cur, op.ev);
}

/**
 * Botón «Preparar cita» del encabezado (R2 · paso 5: CalendarClock, antes una campana que hacía pensar en
 * avisos). Solo aparece con una cita FUTURA (nunca cae a una pasada).
 * Punto fijo, sin parpadeo, cuando la cita es en 48 h o menos; si no, estado neutro.
 * Las citas sin hora cuentan hasta el final de su día. Tiene su propio reloj por minuto.
 */
function HeaderBell({ events, onOpen }: { events: AgendaEvent[]; onOpen: (ev: AgendaEvent) => void }) {
  const now = useNow(60_000);
  const next = React.useMemo(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    let best: { ev: AgendaEvent; at: Date } | null = null;
    for (const ev of events) {
      const at = parseEventDate(ev);
      if (!at) continue;
      const future = hasClockTime(ev.time) ? at.getTime() >= now.getTime() : at.getTime() >= startOfToday.getTime();
      if (future && (!best || at.getTime() < best.at.getTime())) best = { ev, at };
    }
    return best;
  }, [events, now]);

  if (!next) return null;
  const soon = next.at.getTime() - now.getTime() <= 48 * 60 * 60 * 1000;
  const when = formatDayCountdown(next.at, now);
  const label = `Preparar cita: ${next.ev.title}, ${when}, ${next.ev.date}${hasClockTime(next.ev.time) ? ` a las ${next.ev.time}` : ""}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(next.ev)}
      className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors ${FOCUS_RING} ${
        soon
          ? "border-transparent bg-terracotta-wash text-terracotta-ink hover:bg-terracotta-wash/80"
          : "border-line-strong text-ink-muted hover:bg-surface-hover hover:text-ink"
      }`}
      title={label}
      aria-label={label}
    >
      <CalendarClock size={18} strokeWidth={1.75} aria-hidden="true" />
      {soon && (
        <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-terracotta-ink ring-2 ring-ground"></span>
      )}
    </button>
  );
}

export default function PandaJRApp() {
  const [activeTab, setActiveTab] = useState<Tab>("planificacion");
  // Diálogos: si un toque no dio el foco al botón (iOS), el foco vuelve igualmente a él al cerrar.
  useModalOpenerTracking();

  // Perfil global de usuario (compartido en toda la app)
  // Zustand Global Store
  const profile = usePandaStore(state => state.profile);
  const setProfile = usePandaStore(state => state.setProfile);
  const hasHydrated = usePandaStore(state => state.hasHydrated);
  // Semana vigente: con fecha probable se recalcula cada día y mantiene profile.week (solo local).
  const ga = useGestationalAge();
  const pid = profile.pregnancyId || "";
  // Miembros del embarazo (un solo listener para toda la página).
  const partner = usePartner();
  const myUid = partner.myUid;

  // --- Toast global: "Deshacer"/"Reintentar" solo si hay una acción real ---
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRegionRef = useRef<HTMLDivElement>(null);
  // Si el foco estaba en el toast cuando desaparece ("Deshacer" usado o tiempo agotado) y hay un
  // diálogo abierto, el foco vuelve al diálogo en vez de caer a body.
  const dismissToast = useCallback(() => {
    const hadFocus = !!toastRegionRef.current?.contains(document.activeElement);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
    if (hadFocus) requestAnimationFrame(() => { focusIntoTopDialog(); });
  }, []);
  const showToast = useCallback<ShowToast>((message, onAction, labelOrOpts) => {
    const opts: ToastOptions = typeof labelOrOpts === "string" ? { actionLabel: labelOrOpts } : (labelOrOpts ?? {});
    const action = typeof onAction === "function" ? onAction : undefined;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, onAction: action, actionLabel: action ? (opts.actionLabel || "Deshacer") : undefined });
    toastTimerRef.current = setTimeout(dismissToast, opts.duration ?? (action ? 6500 : 4000));
  }, [dismissToast]);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // --- Firebase Real-time Sync ---
  // FPP compartida fuera de rango (dato remoto dudoso): la semana queda sin confirmar y la Guía y
  // Ajustes avisan "Revisa la fecha en Ajustes". Estado de interfaz, derivado del último snapshot.
  const [remoteDueReviewPid, setRemoteDueReviewPid] = useState<string | null>(null);
  const dueDateNeedsReview = !!pid && remoteDueReviewPid === pid && ga.source === "unknown";
  // Semana y fecha probable compartidas → perfil local (solo estado local, nunca escribe).
  useEffect(() => {
    if (!pid) return;
    return listenToPregnancy(pid, (data) => {
      const cur = usePandaStore.getState().profile;
      // La FPP compartida manda; si se quitó en el otro teléfono se quita aquí; si no hay, la semana.
      // Si está fuera de rango, la semana pasa a "sin confirmar" (sin reglas clínicas).
      const dating = remoteDatingPatch(data, cur);
      if (dating) setProfile(dating);
      setRemoteDueReviewPid(datingFromPregnancyDoc(data).dueDateOutOfRange ? pid : null);
      // Código vigente de la mamá (p. ej. el nuevo que emite ensureMembership en lugar del antiguo).
      const code = typeof data?.inviteCode === "string" ? data.inviteCode : undefined;
      if (cur.role === "mama" && code && code !== cur.inviteCode) setProfile({ inviteCode: code });
    });
  }, [pid, setProfile]);

  // Último estado de mamá (guardado por embarazo para no mostrar el de otro vínculo).
  const [momStatusState, setMomStatusState] = useState<{ pid: string; status: MomStatus } | null>(null);
  const [momStatusLoadedPid, setMomStatusLoadedPid] = useState<string | null>(null);
  useEffect(() => {
    if (!pid) return;
    let firstServer = true;
    return listenToMomStatus(
      pid,
      (status) => setMomStatusState({ pid, status }),
      undefined,
      ({ empty, fromCache }) => {
        // Caché vacía sin respuesta del servidor ≠ "aún no hay estado".
        if (!(fromCache && empty)) setMomStatusLoadedPid(pid);
        if (!firstServer || fromCache) return;
        firstServer = false;
        // Traspaso único al vincular: el estado de hoy que la mamá anotó solo en este teléfono.
        const flag = localToSharedFlag("momstatus", pid);
        if (readFlag(flag)) return;
        const local = readStored<LocalMomStatus | null>(LS_MOM_STATUS, null);
        const fresh = !!local && Date.now() - local.updatedAt < 24 * 60 * 60 * 1000;
        if (empty && fresh && local && usePandaStore.getState().profile.role === "mama" && readFlag(linkedFromLocalKey(pid))) {
          saveMomStatus(pid, local.statusText, local.emoji).then(() => setFlag(flag), () => { /* próxima apertura */ });
        } else {
          setFlag(flag);
        }
      }
    );
  }, [pid]);
  const remoteMomStatus = momStatusState && momStatusState.pid === pid ? momStatusState.status : null;
  const momStatusLoaded = !pid || momStatusLoadedPid === pid;

  // Sesión anónima (uid para autoría, votos y abrazos) + migración única de `members`
  // para embarazos antiguos. Depende solo del vínculo, nunca de snapshots.
  useEffect(() => {
    if (!hasHydrated || !pid) return;
    let cancelled = false;
    // La marca se lee al abrir: la migración corre si este uid aún no figuró como miembro
    // (primera apertura tras la actualización, o sesión anónima nueva) y no en las siguientes.
    const confirmedUid = readMemberUid(pid);
    ensureAuth()
      .then((uid) => {
        if (cancelled || !uid || confirmedUid === uid) return;
        const { role, name } = usePandaStore.getState().profile;
        void ensureMembership(pid, { uid, role, name });
      })
      .catch(() => { /* sin red: se reintenta la próxima vez que abra la app */ });
    return () => { cancelled = true; };
  }, [hasHydrated, pid]);

  // Marca local: este uid ya figura en `members`.
  const confirmedMember = !!pid && partner.loaded && !!myUid && partner.members.some(m => m.uid === myUid);
  useEffect(() => {
    if (confirmedMember) writeMemberUid(pid, myUid);
  }, [confirmedMember, pid, myUid]);

  // Solo se desvincula solo el teléfono del COPILOTO y solo si es la misma sesión que ya figuró
  // como miembro (entonces sí lo quitaron). El de la mamá nunca: se muestra un aviso.
  const confirmedUidNow = pid ? readMemberUid(pid) : null;
  const sameSessionRemoved = !!pid && partner.removed && !!myUid && confirmedUidNow === myUid;
  useEffect(() => {
    if (!pid || !sameSessionRemoved || profile.role !== "papa") return;
    writeMemberUid(pid, null);
    setProfile({ pregnancyId: "", inviteCode: "" });
    showToast("Ya no tienes acceso al embarazo compartido: te quitaron de la lista. Lo que registres ahora queda solo en este teléfono.", undefined, { duration: 9000 });
  }, [pid, sameSessionRemoved, profile.role, setProfile, showToast]);
  // Aviso (sin desvincular): la sesión de este teléfono cambió, Firestore niega el acceso, o a la
  // mamá la dejaron fuera de la lista.
  const accessLost =
    !!pid && partner.removed && !!myUid &&
    ((!!confirmedUidNow && confirmedUidNow !== myUid) || partner.denied || (sameSessionRemoved && profile.role === "mama"));

  // Abrazos de la pareja: también los que llegaron con la app cerrada (últimas 48 h, sin repetir).
  const nudgeSinceRef = useRef<{ pid: string; since: Date } | null>(null);
  const pendingHugsRef = useRef<{ who: string; at: Date }[]>([]);
  const hugFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hugFlushRef.current) clearTimeout(hugFlushRef.current); }, []);
  useEffect(() => {
    if (!pid || !myUid) return;
    if (nudgeSinceRef.current?.pid !== pid) {
      const seen = readStored<number | null>(nudgeSeenKey(pid), null);
      const floor = Date.now() - NUDGE_LOOKBACK_MS;
      nudgeSinceRef.current = { pid, since: new Date(typeof seen === "number" && seen > floor ? seen : floor) };
    }
    return listenToNudges(pid, myUid, nudgeSinceRef.current.since, (n) => {
      const who = n.fromName || (n.fromRole === "papa" ? "Papá" : "Tu pareja");
      const seen = readStored<number | null>(nudgeSeenKey(pid), null);
      if (typeof seen !== "number" || n.createdAt.getTime() > seen) writeStored(nudgeSeenKey(pid), n.createdAt.getTime());
      // Los que llegan juntos (al abrir la app) se anuncian en un solo aviso.
      pendingHugsRef.current.push({ who, at: n.createdAt });
      if (hugFlushRef.current) clearTimeout(hugFlushRef.current);
      hugFlushRef.current = setTimeout(() => {
        const hugs = pendingHugsRef.current;
        pendingHugsRef.current = [];
        if (hugs.length === 0) return;
        const last = hugs[hugs.length - 1];
        const old = Date.now() - hugs[0].at.getTime() > 2 * 60 * 1000;
        const names = Array.from(new Set(hugs.map((h) => h.who)));
        const from = names.length === 1 ? names[0] : "Tu pareja";
        const message = hugs.length === 1
          ? `${from} te mandó un abrazo${old ? ` ${formatRelative(last.at)}` : ""}`
          : `${from} te mandó ${hugs.length} abrazos${old ? " mientras no estabas" : ""}`;
        showToast(message, undefined, { duration: 6500 });
        try { navigator.vibrate?.([40, 60, 40]); } catch { /* sin vibración */ }
      }, 80);
    });
  }, [pid, myUid, showToast]);
  // -------------------------------

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Onboarding abierto a propósito desde "Vincular con mi pareja" (se puede cancelar).
  const [linkFlowOpen, setLinkFlowOpen] = useState(false);
  // Cuenta: «Ya uso PandaJR en otro dispositivo» y la vuelta de un enlace de acceso por correo.
  const [signInOpen, setSignInOpen] = useState(false);
  const accessLink = useSyncExternalStore(noopSubscribe, getAccessLinkSnapshot, getServerAccessLink);
  const [accessLinkDone, setAccessLinkDone] = useState(false);
  const [selectedPrepEvent, setSelectedPrepEvent] = useState<AgendaEvent | null>(null);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>("");
  // Pide a Herramientas que abra una herramienta concreta (ej. 'sos'); el nonce permite repetir la petición.
  const [toolOpenRequest, setToolOpenRequest] = useState<{ tool: string; nonce: number } | undefined>(undefined);

  /** Abre una herramienta concreta (SOS, Contracciones, Maleta…) desde cualquier pestaña. */
  const openTool = (tool: string) => {
    setActiveTab("herramientas");
    setToolOpenRequest({ tool, nonce: Date.now() });
    window.scrollTo({ top: 0 });
  };
  const openSymptoms = () => openTool("sos");
  // Ajustes abiertos directamente en "Fecha" (desde "Confirmar mi fecha" de la Guía).
  const [settingsFocusDating, setSettingsFocusDating] = useState(false);
  const openDateSettings = () => {
    setSettingsFocusDating(true);
    setIsProfileModalOpen(true);
  };
  const closeSettings = () => {
    setIsProfileModalOpen(false);
    setSettingsFocusDating(false);
  };

  const startLinkFlow = () => {
    setIsProfileModalOpen(false);
    setLinkFlowOpen(true);
  };

  // Botón de Ajustes de la cabecera: destino del foco si Ajustes se cierra entero (p. ej. al desvincular).
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Detectar si el usuario necesita Onboarding
  useEffect(() => {
    if (hasHydrated && !profile.name) {
      setShowOnboarding(true);
    }
  }, [hasHydrated, profile.name]);

  /**
   * Guarda una datación ELEGIDA A PROPÓSITO (FPP, semana a mano o "sin confirmar"): al instante en
   * este teléfono y, con vínculo, en el embarazo compartido (saveDueDate o updatePregnancyWeek, que
   * borra la FPP: solo si se eligió semana a mano). Si el servidor la rechaza, revierte y ofrece
   * "Reintentar". Devuelve true si se envió a la pareja. Solo desde manejadores de eventos.
   */
  const applyDating = (choice: DatingChoice): boolean => {
    const prev = usePandaStore.getState().profile;
    const targetPid = prev.pregnancyId;
    setProfile(datingPatch(choice));
    // "Sin confirmar" no se comparte: no hay forma honesta de borrar la fecha del otro teléfono.
    if (!targetPid || choice.kind === "unknown") return false;
    const uid = partner.myUid ?? currentUid();
    const by = uid ? { uid, name: prev.name || undefined } : undefined;
    const write = choice.kind === "dueDate"
      ? saveDueDate(targetPid, choice.dueDate, choice.source, by)
      : saveManualWeek(targetPid, choice.week, by);
    write.catch(() => {
      const cur = usePandaStore.getState().profile;
      // Si cambió de embarazo o ya eligió otra fecha, no hay nada que revertir.
      if (cur.pregnancyId !== targetPid || !sameDating(choice, cur)) return;
      setProfile({ week: prev.week, weekUnknown: prev.weekUnknown, dueDate: prev.dueDate, dueDateSource: prev.dueDateSource });
      showToast(
        choice.kind === "dueDate" ? "No pudimos guardar la fecha para tu pareja." : "No pudimos guardar la semana para tu pareja.",
        () => { applyDating(choice); },
        "Reintentar"
      );
    });
    return true;
  };

  /** Cambios LOCALES del perfil (comparación de tamaño…). La fecha y la semana van por applyDating. */
  const updateProfile = (updates: Partial<UserProfile>) => {
    const rest: Partial<UserProfile> = { ...updates };
    delete rest.week;
    delete rest.weekUnknown;
    delete rest.dueDate;
    delete rest.dueDateSource;
    setProfile(rest);
  };

  /**
   * «Guardar fecha» de Ajustes (R2 · paso 4: la fecha tiene su propio guardado; el resto de ajustes se
   * guarda al cambiarlo). Solo desde manejadores. Dice el alcance real y ofrece deshacer.
   */
  const saveDating = (dating: DatingChoice) => {
    const prev = usePandaStore.getState().profile;
    if (sameDating(dating, prev)) return;
    const shared = applyDating(dating);

    const partnerLabel = partner.partnerName || "tu pareja";
    const what = dating.kind === "manual"
      ? `Semana ${dating.week} actualizada`
      : dating.kind === "unknown"
        ? "Semana marcada como sin confirmar"
        : "Fecha actualizada";
    const message = shared
      ? isOffline()
        ? `${what}. Se compartirá con ${partnerLabel} al volver la señal (no cierres la app)`
        : `${what} para ti y ${partnerLabel}`
      : `${what} en este teléfono`;

    // Sin fecha ni semana previas no hay a qué volver en la cuenta compartida.
    const prevChoice = choiceFromProfile(prev);
    const canUndo = !(shared && prevChoice.kind === "unknown");
    const undo = () => {
      applyDating(prevChoice);
      showToast(
        prevChoice.kind === "dueDate"
          ? "Volviste a la fecha anterior"
          : prevChoice.kind === "manual"
            ? `Volviste a la semana ${prevChoice.week}`
            : "Volviste a semana sin confirmar"
      );
    };
    showToast(message, canUndo ? undo : undefined);
  };

  // =====================================================================================
  // Agenda: listener + operaciones (sin guardados en efectos). Estado inicial vacío.
  // =====================================================================================
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const remoteEventsRef = useRef<AgendaEvent[]>([]);
  const pendingEventOpsRef = useRef(new Map<string, PendingEventOp>());
  const eventSeqRef = useRef(0);
  /** Última operación pedida por cita (para no avisar de un fallo que un "Deshacer" ya dejó atrás). */
  const lastEventOpSeqRef = useRef(new Map<string, number>());
  const localEventsRef = useRef<AgendaEvent[]>([]);
  // Con vínculo: llegó la agenda del servidor (una caché vacía no cuenta) o falló el listener.
  const [eventsStatus, setEventsStatus] = useState<{ pid: string; loaded: boolean; error: boolean } | null>(null);
  const [eventsAttempt, setEventsAttempt] = useState(0);

  const computeEvents = useCallback((): AgendaEvent[] => {
    const list = remoteEventsRef.current.slice();
    for (const [key, op] of pendingEventOpsRef.current) {
      const idx = list.findIndex((e) => String(e.id) === key);
      if (op.kind === "delete") {
        if (idx >= 0) list.splice(idx, 1);
      } else if (op.ev) {
        if (idx >= 0) list[idx] = op.ev;
        else list.push(op.ev);
      }
    }
    return list;
  }, []);
  const refreshEvents = useCallback(() => setEvents(computeEvents()), [computeEvents]);

  useEffect(() => {
    remoteEventsRef.current = [];
    pendingEventOpsRef.current.clear();

    if (!pid) {
      // Sin vínculo: la agenda vive en este teléfono.
      let list = toAgendaEvents(readStored<unknown>(LS_EVENTS, []));
      if (!readFlag(MIG_SEED_EVENTS_LOCAL)) {
        const cleaned = list.filter((e) => !isLegacySeedEvent(e));
        if (cleaned.length !== list.length) writeStored(LS_EVENTS, cleaned);
        setFlag(MIG_SEED_EVENTS_LOCAL);
        list = cleaned;
      }

      // Agenda compartida por enlace: se copia a este teléfono (no queda sincronizada).
      let importedFromLink = false;
      try {
        const params = new URLSearchParams(window.location.search);
        const syncData = params.get("sync_events");
        if (syncData) {
          const decoded = toAgendaEvents(JSON.parse(decodeURIComponent(escape(atob(syncData))))).filter((e) => !isLegacySeedEvent(e));
          if (decoded.length > 0) {
            list = decoded;
            writeStored(LS_EVENTS, decoded);
            importedFromLink = true;
          }
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("sync_events");
          window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search);
        }
      } catch (err) {
        console.warn("No se pudo leer la agenda compartida por enlace:", err);
      }

      localEventsRef.current = list;
      setEvents(list);
      if (importedFromLink) {
        showToast("Cargamos la agenda que te compartieron. Queda guardada solo en este teléfono.", undefined, { duration: 7000 });
        setActiveTab("agenda");
      }
      return;
    }

    setEvents([]);
    let purgeStarted = false;
    return listenToEvents(pid, (items, meta) => {
      if (!(meta.fromCache && !meta.exists)) setEventsStatus({ pid, loaded: true, error: false });
      const seedsPurged = readFlag(migSeedEventsKey(pid));
      const all = toAgendaEvents(items);
      const list = seedsPurged ? all : all.filter((e) => !isLegacySeedEvent(e));
      remoteEventsRef.current = list;
      for (const [key, op] of pendingEventOpsRef.current) {
        if (op.committed && opReflected(list, key, op)) pendingEventOpsRef.current.delete(key);
      }
      refreshEvents();

      // Purga única de las citas de ejemplo de versiones anteriores, tras el primer snapshot del servidor.
      if (!seedsPurged && !purgeStarted && !meta.fromCache) {
        purgeStarted = true;
        if (!all.some(isLegacySeedEvent)) {
          setFlag(migSeedEventsKey(pid));
        } else {
          mutateEvents<AgendaEvent>(pid, (current) => current.filter((e) => !isLegacySeedEvent(e)))
            .then(() => setFlag(migSeedEventsKey(pid)))
            .catch(() => { /* se reintenta la próxima vez que abra la app */ });
        }
      }
    }, () => setEventsStatus((prev) => ({ pid, loaded: prev?.pid === pid ? prev.loaded : false, error: true })));
  }, [pid, refreshEvents, showToast, eventsAttempt]);
  const eventsLoading = !!pid && !(eventsStatus?.pid === pid && eventsStatus.loaded);
  const eventsError = !!pid && eventsStatus?.pid === pid && eventsStatus.error && !eventsStatus.loaded;

  const setLocalEvents = (fn: (list: AgendaEvent[]) => AgendaEvent[]) => {
    const next = fn(localEventsRef.current);
    localEventsRef.current = next;
    setEvents(next);
    writeStored(LS_EVENTS, next);
  };

  /**
   * Escrituras de la Agenda en fila (una transacción tras otra): "borrar" y su "deshacer"
   * nunca se cruzan, ni siquiera cuando ambas esperan a que vuelva la conexión.
   */
  const eventQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const enqueueEventMutation = (targetPid: string, mutate: (items: AgendaEvent[]) => AgendaEvent[]) => {
    const run = eventQueueRef.current.then(() => mutateEvents<AgendaEvent>(targetPid, mutate));
    eventQueueRef.current = run.catch(() => undefined);
    return run;
  };

  /**
   * Aplica la operación al instante (superpuesta al último snapshot) y la confirma en el servidor.
   * La promesa se resuelve cuando el servidor confirma; si falla, revierte y la rechaza para que
   * quien llamó avise (AgendaView muestra su error; PandaIA ofrece "Reintentar").
   */
  const commitEventOp = (
    targetPid: string,
    key: string,
    op: Omit<PendingEventOp, "seq">,
    mutate: (items: AgendaEvent[]) => AgendaEvent[]
  ): Promise<void> => {
    const seq = ++eventSeqRef.current;
    pendingEventOpsRef.current.set(key, { ...op, seq });
    lastEventOpSeqRef.current.set(key, seq);
    refreshEvents();
    const settle = () => {
      if (pendingEventOpsRef.current.get(key)?.seq !== seq) return;
      pendingEventOpsRef.current.delete(key);
      refreshEvents();
    };
    return enqueueEventMutation(targetPid, mutate).then(
      () => {
        const cur = pendingEventOpsRef.current.get(key);
        if (cur?.seq !== seq) return;
        cur.committed = true;
        // Si el snapshot aún no trae el cambio, se mantiene superpuesto un momento (sin parpadeo).
        if (opReflected(remoteEventsRef.current, key, cur)) settle();
        else setTimeout(settle, 5000);
      },
      (error: unknown) => {
        settle();
        throw error;
      }
    );
  };

  const onAddEvent = async (ev: AgendaEvent): Promise<void> => {
    const key = String(ev.id);
    if (!pid) {
      setLocalEvents((list) => [...list.filter((e) => String(e.id) !== key), ev]);
      return;
    }
    const uid = myUid ?? currentUid();
    const full: AgendaEvent = {
      ...ev,
      ...(ev.createdBy || uid ? { createdBy: ev.createdBy ?? uid ?? undefined } : {}),
      ...(ev.createdByName || profile.name ? { createdByName: ev.createdByName ?? profile.name } : {}),
    };
    return commitEventOp(pid, key, { kind: "upsert", ev: full }, (items) => [...items.filter((e) => String(e.id) !== key), full]);
  };

  const onUpdateEvent = async (ev: AgendaEvent): Promise<void> => {
    const key = String(ev.id);
    if (!pid) {
      setLocalEvents((list) => list.map((e) => (String(e.id) === key ? { ...e, ...ev } : e)));
      return;
    }
    const base = computeEvents().find((e) => String(e.id) === key);
    const merged: AgendaEvent = { ...(base ?? {}), ...ev };
    return commitEventOp(pid, key, { kind: "upsert", ev: merged }, (items) =>
      items.map((e) => (String(e.id) === key ? { ...e, ...ev } : e))
    );
  };

  /**
   * Borra y devuelve la cita borrada (para deshacer con onAddEvent). Se resuelve al instante
   * (tras quitarla de la pantalla): la fila de escrituras garantiza que un "Deshacer" se aplique
   * después del borrado, y así se ve de inmediato aunque no haya conexión. Si el servidor
   * rechaza el borrado, la cita reaparece y se avisa aquí con "Reintentar" (salvo que ya se
   * haya deshecho).
   */
  const onDeleteEvent = async (id: AgendaEvent["id"]): Promise<AgendaEvent | undefined> => {
    const key = String(id);
    if (!pid) {
      const removed = localEventsRef.current.find((e) => String(e.id) === key);
      setLocalEvents((list) => list.filter((e) => String(e.id) !== key));
      return removed;
    }
    const targetPid = pid;
    const removed = computeEvents().find((e) => String(e.id) === key);
    const commit = commitEventOp(targetPid, key, { kind: "delete" }, (items) => items.filter((e) => String(e.id) !== key));
    const seq = lastEventOpSeqRef.current.get(key);
    commit.catch(() => {
      if (lastEventOpSeqRef.current.get(key) !== seq || usePandaStore.getState().profile.pregnancyId !== targetPid) return;
      const what = removed?.title ? `«${removed.title}»` : "la cita";
      showToast(`No pudimos eliminar ${what}. Sigue en la agenda.`, () => { void onDeleteEvent(id); }, "Reintentar");
    });
    return removed;
  };

  /** Cita que PandaIA extrajo de lo que escribió la persona. "Deshacer" la borra de verdad. */
  const handleAIAddEvent = (appt: { title: string; rawDate: string; time?: string; doctor?: string }): AgendaEvent => {
    const [y, m, d] = appt.rawDate.split("-").map(Number);
    const title = repairMojibake(appt.title).trim() || "Cita médica";
    const time = appt.time && hasClockTime(appt.time) ? appt.time : "Por definir";
    const doctor = appt.doctor && !/^por definir$/i.test(appt.doctor.trim()) ? repairMojibake(appt.doctor).trim() : undefined;
    const ev: AgendaEvent = {
      id: Date.now(),
      date: formatDateShort(new Date(y, m - 1, d)),
      rawDate: appt.rawDate,
      time,
      title,
      ...(doctor ? { doctor } : {}),
      type: inferEventType(title),
    };
    const key = String(ev.id);
    const save = () => {
      const saving = onAddEvent(ev);
      const seq = lastEventOpSeqRef.current.get(key);
      saving.catch(() => {
        // Si ya la quitaste con "Deshacer", no hay nada que reintentar.
        if (lastEventOpSeqRef.current.get(key) !== seq) return;
        showToast(`No pudimos guardar «${title}» en la agenda compartida.`, save, "Reintentar");
      });
    };
    save();
    const where = pid && isOffline() ? ". Se compartirá al volver la señal (no cierres la app)" : "";
    showToast(`Cita agendada: ${title}, ${ev.date}${where}`, () => {
      void onDeleteEvent(ev.id);
    });
    return ev;
  };

  /** Al vincular: las citas que ya estaban en este teléfono se suman a la agenda compartida (sin duplicar). */
  const shareLocalAgenda = (newPid: string, name: string) => {
    const local = localEventsRef.current.filter((e) => !isLegacySeedEvent(e));
    if (local.length === 0) return;
    const uid = currentUid();
    const withAuthor = local.map((e) => ({ ...e, ...(uid ? { createdBy: uid } : {}), ...(name ? { createdByName: name } : {}) }));
    const attempt = () => {
      enqueueEventMutation(newPid, (items) => {
        const ids = new Set(items.map((e) => String(e.id)));
        return [...items, ...withAuthor.filter((e) => !ids.has(String(e.id)))];
      }).then(
        () => showToast(local.length === 1 ? "Tu cita de este teléfono ahora se comparte" : `Tus ${local.length} citas de este teléfono ahora se comparten`),
        () => showToast("No pudimos compartir las citas que tenías en este teléfono.", attempt, "Reintentar")
      );
    };
    attempt();
  };

  // Escape de Ajustes y de la preparación de cita: lo gestiona cada diálogo (solo cierra el de arriba).

  if (!hasHydrated) return null;

  // Ancho de la columna de contenido. Móvil: la columna de siempre (max-w-md). Escritorio (≥1024px):
  // una columna cómoda de 720px junto al riel de navegación; la Guía a ≥1280px se abre a dos columnas.
  const columnWidth = activeTab === "planificacion" ? "lg:max-w-[45rem] xl:max-w-[70rem]" : "lg:max-w-[45rem]";

  return (
    // overflow-x-clip (no hidden): hidden crea un contenedor de scroll y anula el sticky del header.
    // Orden del DOM (y del foco) igual en todos los tamaños: cabecera → contenido → navegación.
    <div className={`relative mx-auto flex w-full max-w-md flex-col overflow-x-clip bg-ground text-ink sm:border-x sm:border-line lg:max-w-none lg:border-x-0 lg:ps-24 ${activeTab === "pandaia" ? "h-dvh overflow-hidden" : "min-h-dvh pb-[calc(3.5rem+var(--safe-bottom))] lg:pb-0"}`}>
      {/* Cabecera: marca en Alegreya, Síntomas, cita próxima y Ajustes. Fondo sólido (sin desenfoque); su
          altura (3.4375rem + zona segura) la usan las cabeceras de herramienta y el scroll-padding. */}
      {/* fixed (no sticky): en la app instalada, iOS 26 muestrea justo bajo la barra de estado y solo omite su
          desenfoque «Liquid Glass» si ahí hay una caja fija y de fondo sólido; un sticky en reposo (página
          arriba del todo) no cuenta. El espaciador de abajo ocupa su alto en el flujo. */}
      <header className={`fixed inset-x-0 top-0 mx-auto max-w-md [@media(max-height:500px)]:static [@media(max-height:500px)]:max-w-none ${Z_CLASS.header} w-full shrink-0 border-b border-line bg-ground px-3 pt-[var(--safe-top)] pb-2.5 max-[300px]:px-2 sm:border-x sm:px-4 lg:left-24 lg:mx-0 lg:w-auto lg:max-w-none lg:border-x-0 lg:px-0`}>
        {/* Escritorio: el padding va dentro de la columna, así la marca se alinea con el contenido. */}
        <div className={`mx-auto flex w-full items-center justify-between gap-2 lg:px-8 ${columnWidth}`}>
          <h1 className="min-w-0">
            {/* Por debajo de 380px la marca compacta deja sitio a Síntomas, la campana y Ajustes; por debajo
                de 360px (o con zoom) solo el panda, y "PandaJR" sigue siendo el nombre del h1 (sr-only). */}
            <Wordmark responsive />
          </h1>

          <div className="flex shrink-0 items-center gap-1 min-[400px]:gap-1.5 sm:gap-2">
            {/* Acceso a síntomas de alarma desde cualquier pestaña. Por debajo de 300px (zoom del 200% en un
                teléfono) queda el icono, como en la barra: la etiqueta sigue siendo el nombre accesible. */}
            <button
              type="button"
              onClick={openSymptoms}
              aria-label="Síntomas: señales de alarma y a quién llamar"
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line-strong px-3.5 text-meta font-bold text-ink transition-colors hover:bg-surface-hover max-[300px]:w-11 max-[300px]:px-0 ${FOCUS_RING}`}
            >
              <HeartPulse size={18} strokeWidth={1.75} className="shrink-0 text-terracotta-ink" aria-hidden="true" />
              <span className="max-[300px]:sr-only">Síntomas</span>
            </button>

            <HeaderBell events={events} onOpen={(ev) => setSelectedPrepEvent(ev)} />

            {/* Solo icono: con el acceso a Síntomas, nombre y emoji ya no caben en un teléfono de 360-430px */}
            <button
              ref={settingsButtonRef}
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              aria-haspopup="dialog"
              aria-label={`Ajustes y perfil${profile.name ? ` de ${profile.name}` : ""}`}
              className={`${ICON_BUTTON} border border-line-strong`}
              title="Ajustes y perfil"
            >
              <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      {/* Solo en la app instalada: franja sólida a todo el ancho bajo la barra de estado, encima de la cabecera
          (mismo color: no se ve). Es lo primero que encuentra la muestra de WebKit en el borde de arriba, así
          que iOS pinta ese color en vez del desenfoque aunque la cabecera no le bastara. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 hidden h-[max(12px,env(safe-area-inset-top))] bg-ground [@media(display-mode:standalone)]:block [@media(display-mode:standalone)_and_(max-height:500px)]:hidden ${Z_CLASS.header}`}
      />
      {/* Alto de la cabecera fija (3.4375rem + zona segura, el mismo que usan las cabeceras de herramienta). */}
      <div aria-hidden="true" className="h-[calc(3.4375rem+var(--safe-top))] w-full shrink-0 [@media(max-height:500px)]:hidden" />

      {/* Main Content Area */}
      {/* Sin overflow en las pestañas con scroll de documento (el sticky de las herramientas depende de ello).
          En PandaIA, el espacio inferior es la altura real de la nav fija (84px) más el área segura; con el
          riel de escritorio no hay barra inferior.
          Desde 1024px --gutter = 0: las listas no sangran fuera de la columna (divisores = ancho del texto,
          alineados con la cabecera); cada vista pone su padding lg:px-8. */}
      <main className={`mx-auto w-full flex-1 lg:[--gutter:0px] ${columnWidth} ${activeTab === "pandaia" ? "flex flex-col overflow-hidden pb-[calc(5.25rem+var(--safe-bottom))] lg:pb-0" : "pb-6 lg:pb-12"}`}>
        {accessLost && (
          <div role="alert" className="mx-4 mt-3 rounded-2xl bg-amber-wash p-3 lg:mx-8">
            <p className="flex items-start gap-2 text-meta text-ink">
              <AlertTriangle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-amber-ink" aria-hidden="true" />
              <span>
                {profile.role === "mama"
                  ? "Este teléfono ya no tiene acceso a lo que comparten (su sesión cambió o se quitó su acceso). Lo que anotes aquí no le llegará a tu pareja."
                  : `Este teléfono perdió su sesión y ya no tiene acceso a lo compartido. Pídele a ${partner.partnerName || "tu pareja"} un código nuevo para volver a vincularlo.`}
              </span>
            </p>
            {profile.role === "papa" && (
              <button
                type="button"
                onClick={() => {
                  if (pid) writeMemberUid(pid, null);
                  setProfile({ pregnancyId: "", inviteCode: "" });
                  startLinkFlow();
                }}
                className={`mt-2 inline-flex min-h-11 items-center rounded-full px-4 text-meta font-bold transition-colors ${SAGE_FILL} ${FOCUS_RING}`}
              >
                Vincular con un código nuevo
              </button>
            )}
          </div>
        )}
        <div className={activeTab === "planificacion" ? "block w-full h-full" : "hidden"}>
          <GuiaPapaView
            showToast={showToast}
            profile={profile}
            ga={ga}
            remoteMomStatus={remoteMomStatus}
            momStatusLoaded={momStatusLoaded}
            partner={partner}
            onRequestLink={startLinkFlow}
            onConfirmDate={openDateSettings}
            dueDateNeedsReview={dueDateNeedsReview}
            events={events}
            eventsLoading={eventsLoading}
            onOpenPrep={(ev) => setSelectedPrepEvent(ev)}
            onOpenTool={openTool}
            onGoToAgenda={() => { setActiveTab("agenda"); window.scrollTo({ top: 0 }); }}
          />
        </div>
        <div className={activeTab === "agenda" ? "block w-full h-full" : "hidden"}>
          <AgendaView
            showToast={showToast}
            events={events}
            onAddEvent={onAddEvent}
            onUpdateEvent={onUpdateEvent}
            onDeleteEvent={onDeleteEvent}
            profile={profile}
            updateProfile={updateProfile}
            onOpenPrep={(ev: AgendaEvent) => setSelectedPrepEvent(ev)}
            loading={eventsLoading}
            loadError={eventsError}
            onRetryLoad={() => setEventsAttempt((a) => a + 1)}
          />
        </div>
        <div className={activeTab === "herramientas" ? "block w-full h-full" : "hidden"}>
          <HerramientasView showToast={showToast} profile={profile} openRequest={toolOpenRequest} />
        </div>
        <div className={activeTab === "pandaia" ? "flex-1 flex flex-col w-full h-full overflow-hidden" : "hidden"}>
          <PandaIAView
            key={pid || "local"}
            showToast={showToast}
            addEvent={handleAIAddEvent}
            events={events}
            profile={profile}
            initialQuery={aiInitialQuery}
            clearInitialQuery={() => setAiInitialQuery("")}
            setActiveTab={setActiveTab}
            onOpenSymptoms={openSymptoms}
          />
        </div>
      </main>

      {/* Onboarding Modal */}
      {(showOnboarding || linkFlowOpen) && (
        <OnboardingModal
          initial={linkFlowOpen ? profile : undefined}
          onComplete={(newProfile) => {
            if (newProfile.pregnancyId && !pid) {
              // Cada herramienta sube UNA vez lo que tenía en este teléfono (sin pisar lo compartido).
              setFlag(linkedFromLocalKey(newProfile.pregnancyId));
              shareLocalAgenda(newProfile.pregnancyId, newProfile.name);
            }
            // Al vincular desde Ajustes se conservan la ciudad y las notas que ya había.
            setProfile(linkFlowOpen
              ? { ...newProfile, location: profile.location || "", notes: profile.notes || "" }
              : newProfile);
            setShowOnboarding(false);
            setLinkFlowOpen(false);
          }}
          onSkip={(role) => {
            // Invitado con el rol que eligió (si no eligió, copiloto). Puede crear o unirse después desde Ajustes.
            setProfile({ name: "Invitado", role: role ?? "papa", week: 1, weekUnknown: true, dueDate: undefined, dueDateSource: undefined });
            setShowOnboarding(false);
          }}
          onCancel={linkFlowOpen && !showOnboarding ? () => setLinkFlowOpen(false) : undefined}
          onUseAccount={() => setSignInOpen(true)}
        />
      )}

      {/* Cuenta: entrar en este dispositivo o terminar con el enlace del correo (sobre la bienvenida). */}
      {hasHydrated && (signInOpen || (!!accessLink && !accessLinkDone)) && (
        <AccountSheet
          mode={signInOpen ? "signin" : "return"}
          link={signInOpen ? null : accessLink}
          current={{ pregnancyId: profile.pregnancyId, role: profile.role }}
          onClose={() => { setSignInOpen(false); setAccessLinkDone(true); }}
          onRestored={(restored, how) => {
            setProfile(profileFromRestored(restored, profile));
            setShowOnboarding(false);
            setLinkFlowOpen(false);
            setSignInOpen(false);
            setAccessLinkDone(true);
            showToast(how === "switched"
              ? "Listo: este dispositivo ya usa tu cuenta."
              : `Hola de nuevo${restored.name ? `, ${restored.name}` : ""}. Todo está como lo dejaste.`);
          }}
        />
      )}

      {/* Profile Modal Global */}
      {isProfileModalOpen && (
        <ProfileModal
          profile={profile}
          onSaveDating={saveDating}
          onUpdateLocal={updateProfile}
          onClose={closeSettings}
          focusDating={settingsFocusDating}
          partner={partner}
          showToast={showToast}
          onStartLink={startLinkFlow}
          dueDateNeedsReview={dueDateNeedsReview}
          afterUnlinkFocusRef={settingsButtonRef}
        />
      )}

      {/* «Preparar cita» (la hoja de preparación de la cita) */}
      {selectedPrepEvent && (
        <AppointmentPrepModal
            profile={profile}
            event={selectedPrepEvent}
          onClose={() => setSelectedPrepEvent(null)}
          onAskPandaIA={(question) => {
            setSelectedPrepEvent(null);
            setAiInitialQuery(question);
            setActiveTab("pandaia");
          }}
          onMarkTasks={() => {
            // «Para comentar en esta cita» → el grupo de «Hoy» en la Guía, desplegado y con el foco.
            setSelectedPrepEvent(null);
            setActiveTab("planificacion");
            requestOpenDiscuss();
          }}
        />
      )}

      {/* Toast global: la región viva existe siempre para que el lector de pantalla anuncie cada mensaje.
          Exenta de inert y por encima de los diálogos: "Deshacer"/"Reintentar" se anuncian y se tocan con uno abierto.
          Superficie inversa (tinta con texto alabastro; en oscuro, al revés): se lee sobre cualquier pantalla. */}
      <div
        ref={toastRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-inert-exempt=""
        className={`fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto lg:bottom-6 lg:left-28 lg:right-4 ${Z_CLASS.toast} pointer-events-none`}
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex min-h-13 items-center justify-between gap-3 rounded-2xl bg-ink py-2 ps-4 pe-2 text-ground shadow-toast"
          >
            <span className="min-w-0 py-1 text-meta font-medium">{toast.message}</span>
            {toast.onAction && (
              <button
                type="button"
                onClick={() => { const action = toast.onAction; dismissToast(); action?.(); }}
                className="shrink-0 min-h-11 rounded-full bg-ground px-4 text-meta font-bold text-ink transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navegación: barra inferior en móvil; riel vertical a la izquierda desde 1024px (mismo lugar en el
          DOM, así el orden del foco no cambia). Fondo sólido, sin desenfoque. */}
      <nav
        aria-label="Navegación principal"
        className={`fixed inset-x-0 bottom-0 mx-auto grid max-w-md grid-cols-4 items-stretch gap-1 border-t border-line bg-ground px-2 pt-1.5 pb-[var(--safe-bottom)] max-[300px]:gap-0 max-[300px]:px-1 ${Z_CLASS.nav} lg:inset-y-0 lg:right-auto lg:mx-0 lg:flex lg:w-24 lg:max-w-none lg:flex-col lg:justify-start lg:gap-2 lg:border-t-0 lg:border-e lg:px-2 lg:pt-[calc(var(--safe-top)+4.5rem)] lg:pb-6`}
      >
        {/* Riel: el filete de la cabecera continúa hasta el borde de la ventana. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 hidden h-[calc(3.4375rem+var(--safe-top))] border-b border-line lg:block" />
        <NavItem
          icon={<Compass size={22} strokeWidth={1.75} />}
          label="Guía"
          isActive={activeTab === "planificacion"}
          onClick={() => setActiveTab("planificacion")}
        />
        <NavItem
          icon={<Calendar size={22} strokeWidth={1.75} />}
          label="Agenda"
          isActive={activeTab === "agenda"}
          onClick={() => setActiveTab("agenda")}
        />
        <NavItem
          icon={<Activity size={22} strokeWidth={1.75} />}
          label="Herramientas"
          isActive={activeTab === "herramientas"}
          onClick={() => setActiveTab("herramientas")}
        />
        <NavItem
          icon={<Bot size={22} strokeWidth={1.75} />}
          label="PandaIA"
          isActive={activeTab === "pandaia"}
          onClick={() => setActiveTab("pandaia")}
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  // Activa: tinta terracota + pastilla de lavado tras el icono + negrita (el estado no depende solo del color).
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`group flex w-full min-w-0 min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta-ink lg:py-2 ${
        isActive ? "text-terracotta-ink font-bold" : "text-ink-muted font-medium hover:text-ink"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-8 w-14 place-items-center rounded-full transition-colors max-[300px]:w-11 ${isActive ? "bg-terracotta-wash" : "group-hover:bg-surface-hover"}`}
      >
        {icon}
      </span>
      {/* Por debajo de 300px (zoom del 200% en un teléfono) no caben cuatro etiquetas: el icono queda
          visible y la etiqueta sigue siendo el nombre accesible del botón. */}
      <span className="text-micro max-[300px]:sr-only">{label}</span>
    </button>
  );
}

type LocalMomStatus = { statusText: string; emoji: string; updatedAt: number };

/** Estados de ánimo (el emoji es el dato que se guarda y comparte; la etiqueta es para lectores de pantalla). */
const MOOD_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: "😊", label: "Bien" },
  { emoji: "😴", label: "Con sueño" },
  { emoji: "🤢", label: "Con náuseas" },
  { emoji: "😭", label: "Sensible" },
  { emoji: "🥰", label: "Con mucho amor" },
  { emoji: "😡", label: "Irritable" },
  { emoji: "🧘‍♀️", label: "Tranquila" },
  { emoji: "🤰", label: "Pensando en el bebé" },
];
const moodLabel = (emoji?: string) => MOOD_OPTIONS.find((m) => m.emoji === emoji)?.label;

function MomStatusCard({
  profile,
  remoteMomStatus,
  remoteLoaded,
  partner,
  showToast,
  onRequestLink,
}: {
  profile: UserProfile;
  remoteMomStatus: MomStatus | null;
  /** Con vínculo: ya respondió el servidor (si no, "sin estado" podría ser falso). */
  remoteLoaded: boolean;
  partner: PartnerInfo;
  showToast: ShowToast;
  onRequestLink: () => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [text, setText] = React.useState("");
  const [emoji, setEmoji] = React.useState("");
  // Sin vínculo, el estado de la mamá vive en este teléfono.
  const [localStatus, setLocalStatus] = React.useState<LocalMomStatus | null>(() => readStored<LocalMomStatus | null>(LS_MOM_STATUS, null));
  const [hugSent, setHugSent] = React.useState(false);
  const hugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hugTimerRef.current) clearTimeout(hugTimerRef.current); }, []);
  const now = useNow(60_000);

  const linked = !!profile.pregnancyId;
  const isMama = profile.role === "mama";
  const partnerJoined = !!partner.partnerRole;
  const partnerLabel = partner.partnerName || (isMama ? "papá" : "tu pareja");

  const status = linked
    ? remoteMomStatus
      ? { text: remoteMomStatus.statusText, emoji: remoteMomStatus.emoji, at: remoteMomStatus.updatedAt }
      : null
    : isMama && localStatus
      ? { text: localStatus.statusText, emoji: localStatus.emoji, at: new Date(localStatus.updatedAt) }
      : null;

  const handleSave = () => {
    const chosen = emoji;
    // Sin ánimo ni texto no hay nada que guardar (nunca un «Me siento bien» que nadie dijo).
    if (!chosen && !text.trim()) return;
    const statusText = text.trim() || moodLabel(chosen) || "";
    setIsEditing(false);
    const pid = profile.pregnancyId;
    if (linked && pid) {
      const attempt = () => {
        saveMomStatus(pid, statusText, chosen).catch(() => showToast("No pudimos compartir tu estado.", attempt, "Reintentar"));
      };
      attempt();
      showToast(
        isOffline()
          ? "Sin conexión: tu estado se compartirá al volver la señal (no cierres la app)"
          : partnerJoined
            ? `Estado compartido con ${partnerLabel}`
            : partner.loaded && partner.members.length > 0
              ? "Estado guardado. Tu pareja lo verá cuando se una"
              : "Estado compartido con tu pareja"
      );
      return;
    }
    const next: LocalMomStatus = { statusText, emoji: chosen, updatedAt: Date.now() };
    setLocalStatus(next);
    writeStored(LS_MOM_STATUS, next);
    showToast("Estado guardado solo en este teléfono");
  };

  const sendHug = () => {
    const pid = profile.pregnancyId;
    if (!pid || hugSent) return;
    const uid = partner.myUid ?? currentUid();
    if (!uid) {
      showToast("Aún estamos conectando este teléfono. Inténtalo en unos segundos.");
      return;
    }
    const to = partner.partnerName || "tu pareja";
    setHugSent(true);
    if (hugTimerRef.current) clearTimeout(hugTimerRef.current);
    hugTimerRef.current = setTimeout(() => setHugSent(false), 8000);
    const attempt = () => {
      sendNudge(pid, { uid, name: profile.name, role: profile.role }, "hug").catch(() =>
        showToast(`No pudimos enviar el abrazo a ${to}.`, attempt, "Reintentar")
      );
    };
    attempt();
    showToast(isOffline()
      ? `Sin conexión: el abrazo a ${to} se enviará al volver la señal (no cierres la app)`
      : `Abrazo enviado a ${to}. Lo verá aunque ahora no tenga la app abierta`);
    try { navigator.vibrate?.(30); } catch { /* sin vibración */ }
  };

  const waitingRemote = linked && !status && !remoteLoaded;
  const subtitle = status
    ? `${status.at ? `Actualizado ${formatRelative(status.at, now)}` : "Sin fecha de actualización"}${linked ? "" : " · solo en este teléfono"}`
    : waitingRemote
      ? isOffline() ? "Sin conexión" : "Cargando…"
      : !linked
        ? isMama ? "Solo en este teléfono" : "Sin vincular"
        : isMama ? "Aún no lo has compartido" : "Sin actualizaciones";

  const body = status
    ? `«${status.text}»`
    : waitingRemote
      ? isOffline() ? "Sin conexión: no podemos mostrar el estado compartido ahora." : "Cargando el estado compartido…"
      : !linked
      ? isMama
        ? "Aún no has anotado cómo te sientes."
        : "Cuando vincules este teléfono con tu pareja, aquí verás cómo se siente."
      : isMama
        ? `Cuéntale a ${partnerLabel} cómo te sientes hoy.`
        : "Aún no ha compartido cómo se siente.";

  // El emoji es el dato que se guarda y comparte; en pantalla se muestra su nombre (sin emoji como icono).
  const moodName = status?.emoji ? (moodLabel(status.emoji) ?? status.emoji) : null;
  const mood = moodName && moodName !== status?.text ? moodName : null;

  // Fase 6: una sección de la Guía (h2 en Alegreya), sin tarjeta ni degradado. La frase de mamá se lee
  // en Alegreya itálica: es su voz.
  if (isEditing) {
    return (
      <section aria-labelledby="guia-mom-title">
        <h2 id="guia-mom-title" className="font-display text-subtitle text-ink">¿Cómo te sientes hoy?</h2>
        <p className="mt-0.5 text-meta text-ink-muted">
          {linked ? `Lo verá ${partnerLabel}.` : "Se guarda solo en este teléfono."}
        </p>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Elige cómo te sientes">
          {MOOD_OPTIONS.map(m => {
            const on = emoji === m.emoji;
            return (
              <button
                key={m.emoji}
                type="button"
                aria-pressed={on}
                aria-label={m.label}
                onClick={() => setEmoji(m.emoji)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-meta font-bold transition-colors ${FOCUS_RING} ${
                  on ? "border-sage-ink bg-sage-wash text-sage-ink" : "border-line-control text-ink hover:bg-surface-hover"
                }`}
              >
                {on && <Check size={16} strokeWidth={2} aria-hidden="true" />}
                {m.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Mensaje sobre cómo te sientes"
          placeholder={linked ? `Escribe un mensaje breve para ${partnerLabel}…` : "Escribe cómo te sientes…"}
          className={`${FIELD} mt-4 h-24 resize-none`}
        />

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setIsEditing(false)} className={`flex-1 min-h-11 rounded-full ${OUTLINE_FILL} text-meta font-bold transition-colors ${FOCUS_RING}`}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!emoji && !text.trim()}
            className={`flex-1 min-h-11 rounded-full ${TERRA_FILL} text-meta font-bold transition-colors disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-disabled disabled:hover:bg-surface-sunken ${FOCUS_RING}`}
          >
            {linked ? "Compartir estado" : "Guardar estado"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="guia-mom-title">
      {/* Sin avatar ni píldora de ánimo (no se tocan): título, línea de datos y el ánimo como texto. */}
      <div className="min-w-0">
        <h2 id="guia-mom-title" className="font-display text-subtitle text-ink">
          {isMama ? "¿Cómo te sientes hoy?" : `Estado de ${partner.partnerName || "mamá"}`}
        </h2>
        <p className="text-meta text-ink-subtle">{subtitle}</p>
      </div>

      {mood && (
        <p className="mt-3 text-meta font-bold text-ink">
          <span className="sr-only">Estado de ánimo: </span>
          {mood}
        </p>
      )}
      <p className={status ? "mt-2 font-display text-subtitle font-normal italic text-ink" : "mt-3 text-body text-ink-muted"}>
        {body}
      </p>

      {isMama ? (
        <RowButton
          onClick={() => {
            setText(status?.text || "");
            setEmoji(status?.emoji || "");
            setIsEditing(true);
          }}
          className="mt-4"
        >
          <Edit3 size={16} strokeWidth={1.75} aria-hidden="true" />
          Actualizar mi estado
        </RowButton>
      ) : linked ? (
        <RowButton onClick={sendHug} disabled={hugSent} className="mt-4 disabled:cursor-default disabled:opacity-100!">
          {hugSent
            ? <Check size={16} strokeWidth={2} className="text-sage-ink" aria-hidden="true" />
            : <Heart size={16} strokeWidth={1.75} className="text-terracotta-ink" aria-hidden="true" />}
          {hugSent ? `Abrazo enviado a ${partner.partnerName || "tu pareja"}` : "Mandar un abrazo"}
        </RowButton>
      ) : (
        <RowButton onClick={onRequestLink} className="mt-4">
          <Users size={16} strokeWidth={1.75} className="text-sage-ink" aria-hidden="true" />
          Vincular con mi pareja
        </RowButton>
      )}
    </section>
  );
}

// --- VISTA 1: GUÍA ---
// «¿Es la hora?» (36+) → semana → «Hoy» (qué toca y quién) → estado de mamá → ficha fetal → checklists.
// Catálogo de tareas: src/lib/tasks.ts. Bloques visuales: src/components/GuiaBlocks.tsx.

/** Marca local de la última vez que se abrió la Guía en este teléfono (para "desde tu última visita"). */
const guiaVisitKey = (pid: string) => `pandajr_guia_visit_${pid}`;

function GuiaPapaView({
  showToast,
  profile,
  ga,
  remoteMomStatus,
  momStatusLoaded,
  partner,
  onRequestLink,
  onConfirmDate,
  dueDateNeedsReview = false,
  events,
  eventsLoading,
  onOpenPrep,
  onOpenTool,
  onGoToAgenda,
}: {
  showToast: ShowToast;
  profile: UserProfile;
  ga: GestationalAgeState;
  remoteMomStatus: MomStatus | null;
  momStatusLoaded: boolean;
  partner: PartnerInfo;
  onRequestLink: () => void;
  onConfirmDate: () => void;
  /** La FPP compartida está fuera de rango (la semana está sin confirmar por eso). */
  dueDateNeedsReview?: boolean;
  events: AgendaEvent[];
  eventsLoading: boolean;
  onOpenPrep: (ev: AgendaEvent) => void;
  onOpenTool: (tool: GuiaTool) => void;
  onGoToAgenda: () => void;
}) {
  const reader: "mama" | "papa" = profile.role === "papa" ? "papa" : "mama";
  const otherRole: "mama" | "papa" = reader === "mama" ? "papa" : "mama";
  // Semana REAL (sin confirmar = undefined: no hay "toca hoy" ni "ya pasó").
  const realWeek = ga.source !== "unknown" ? ga.weeks : undefined;
  const pid = profile.pregnancyId || "";
  const partnerName = partner.partnerName?.trim() || undefined;
  const partnerLabel = partnerName || (reader === "mama" ? "papá" : "tu pareja");

  // Con vínculo: lo que dice Firestore (la caché local ya refleja al instante lo que marcas).
  const [remoteChecklist, setRemoteChecklist] = React.useState<{
    pid: string;
    status: Record<string, ChecklistStatusValue>;
    meta: ChecklistMeta;
    owners: TaskOwnerMap;
    ownersMeta: ChecklistMeta;
    /** false = solo caché vacía (sin respuesta del servidor): aún no se sabe qué está marcado. */
    fromServer: boolean;
  } | null>(null);
  // Sin vínculo: progreso y dueños en este teléfono (no vuelven a 0 al recargar).
  const [localChecklist, setLocalChecklist] = React.useState<Record<string, ChecklistStatusValue>>(
    () => readStored<Record<string, ChecklistStatusValue>>(LS_CHECKLIST, {})
  );
  const [localOwners, setLocalOwners] = React.useState<TaskOwnerMap>(() => readLocalTaskOwners());

  // Solo escucha; las únicas escrituras son los traspasos únicos tras el primer dato del servidor.
  useEffect(() => {
    if (!pid) return;
    let localChecked = false;
    return listenToChecklistProgress(pid, (progress, meta, docMeta, ownersInfo) => {
      const status: Record<string, ChecklistStatusValue> = {};
      for (const [k, v] of Object.entries(progress)) {
        if (v === "dismissed") status[k] = "dismissed";
        else if (v) status[k] = "completed"; // `true` = formato antiguo
      }
      const owners = ownersInfo?.owners ?? {};
      const fromServer = !(docMeta?.fromCache && !docMeta.exists);
      setRemoteChecklist({ pid, status, meta: meta ?? {}, owners, ownersMeta: ownersInfo?.ownersMeta ?? {}, fromServer });
      if (localChecked || !docMeta || docMeta.fromCache) return;
      localChecked = true;
      // Traspaso único al vincular: lo anotado "Solo en este teléfono" se suma a lo compartido
      // sin desmarcar ni reasignar nada que la pareja ya decidió.
      const linkedFromLocal = readFlag(linkedFromLocalKey(pid));
      const uid = currentUid();
      const by = uid ? { uid, name: usePandaStore.getState().profile.name || undefined } : undefined;

      const flag = localToSharedFlag("checklist", pid);
      if (!readFlag(flag)) {
        const local = readStored<Record<string, ChecklistStatusValue>>(LS_CHECKLIST, {});
        const missing = Object.entries(local).filter(([k, v]) => (v === "completed" || v === "dismissed") && !(k in progress));
        if (!linkedFromLocal || missing.length === 0) setFlag(flag);
        else Promise.all(missing.map(([k, v]) => setChecklistItem(pid, k, v, by))).then(() => setFlag(flag), () => { /* próxima apertura */ });
      }

      const ownersFlag = localToSharedFlag("task_owners", pid);
      if (!readFlag(ownersFlag)) {
        const missingOwners = ownersMissingRemotely(readLocalTaskOwners(), owners);
        if (!linkedFromLocal || missingOwners.length === 0) setFlag(ownersFlag);
        else Promise.all(missingOwners.map(([k, v]) => setTaskOwner(pid, k, v, by))).then(() => setFlag(ownersFlag), () => { /* próxima apertura */ });
      }
    });
  }, [pid]);

  // Hasta el primer dato del servidor del embarazo actual no se puede marcar (no hay estado que respetar).
  const checklistLoaded = !pid || (remoteChecklist?.pid === pid && remoteChecklist.fromServer);
  const remote = pid && remoteChecklist?.pid === pid ? remoteChecklist : null;
  const taskStatus = React.useMemo<Record<string, ChecklistStatusValue>>(
    () => (pid ? (remote ? remote.status : {}) : localChecklist),
    [pid, remote, localChecklist]
  );
  const taskMeta = React.useMemo<ChecklistMeta>(() => remote?.meta ?? {}, [remote]);
  const taskOwners = React.useMemo<TaskOwnerMap>(() => (pid ? remote?.owners ?? {} : localOwners), [pid, remote, localOwners]);
  const ownersMeta = React.useMemo<ChecklistMeta>(() => remote?.ownersMeta ?? {}, [remote]);
  const lastChecklistChange = React.useMemo(() => {
    let last: Date | null = null;
    for (const m of [...Object.values(taskMeta), ...Object.values(ownersMeta)]) if (m.at && (!last || m.at > last)) last = m.at;
    return last;
  }, [taskMeta, ownersMeta]);

  // Persistencia local del progreso sin vínculo (localStorage, no Firestore).
  useEffect(() => {
    if (!pid) writeStored(LS_CHECKLIST, localChecklist);
  }, [pid, localChecklist]);

  // --- Última visita (marca local por embarazo): se lee al abrir y se renueva después ---
  const [visit, setVisit] = useState(() => ({ pid, since: pid ? readStored<number | null>(guiaVisitKey(pid), null) : null }));
  if (visit.pid !== pid) setVisit({ pid, since: pid ? readStored<number | null>(guiaVisitKey(pid), null) : null });
  useEffect(() => {
    if (pid) writeStored(guiaVisitKey(pid), Date.now());
  }, [pid]);

  /**
   * Marca/desmarca una tarea. Con vínculo: escritura por ítem con autor (Firestore la refleja al
   * instante en la caché y la revierte sola si el servidor la rechaza) + "Reintentar".
   * Sin vínculo: localStorage.
   */
  const writeTask = (key: string, next: ChecklistStatusValue | null, label: string) => {
    if (!pid) {
      setLocalChecklist(prev => {
        const copy = { ...prev };
        if (next) copy[key] = next;
        else delete copy[key];
        return copy;
      });
      return;
    }
    const uid = partner.myUid ?? currentUid();
    setChecklistItem(pid, key, next, uid ? { uid, name: profile.name || undefined } : undefined).catch(() => {
      showToast(`No pudimos guardar «${label}».`, () => writeTask(key, next, label), "Reintentar");
    });
  };

  const toggleTask = (row: TaskRowModel) => {
    if (!checklistLoaded) return;
    writeTask(String(row.task.id), row.completed ? null : "completed", row.task.text);
  };

  const myLabel = "Tú";
  const partnerOwnerLabel = partnerName || (otherRole === "mama" ? "Mamá" : "Papá");
  const ownerLabels: OwnerLabels = {
    mama: reader === "mama" ? myLabel : partnerOwnerLabel,
    papa: reader === "papa" ? myLabel : partnerOwnerLabel,
    ambos: "Los dos",
  };
  // "ahora te toca a ti", "ahora les toca a los dos", "ahora le toca a Luis" / "a papá".
  const nowOwnedBy = (o: TaskOwner) =>
    o === "ambos"
      ? "ahora les toca a los dos"
      : o === reader
        ? "ahora te toca a ti"
        : `ahora le toca a ${partnerName || (otherRole === "mama" ? "mamá" : "papá")}`;

  /** Reasigna una tarea (volver al dueño de catálogo borra la reasignación). Con "Deshacer" real. */
  const assignTask = (row: TaskRowModel, owner: TaskOwner, announce = true) => {
    if (!checklistLoaded || owner === row.owner) return;
    const key = String(row.task.id);
    const previous = row.owner;
    const value = owner === row.task.defaultOwner ? null : owner;
    const undo = announce ? () => assignTask({ ...row, owner }, previous, false) : undefined;
    if (!pid) {
      setLocalOwners(writeLocalTaskOwner(key, value));
      if (announce) showToast(`«${row.task.text}» ${nowOwnedBy(owner)} (solo en este teléfono)`, undo);
      return;
    }
    const uid = partner.myUid ?? currentUid();
    setTaskOwner(pid, key, value, uid ? { uid, name: profile.name || undefined } : undefined).catch(() => {
      showToast(`No pudimos reasignar «${row.task.text}».`, () => assignTask(row, owner, announce), "Reintentar");
    });
    if (announce) showToast(`«${row.task.text}» ${nowOwnedBy(owner)}`, undo);
  };

  const whoFromMeta = (m: { by?: string; byName?: string } | undefined) => {
    if (!m || (!m.by && !m.byName)) return null;
    const member = m.by ? partner.members.find(x => x.uid === m.by) : undefined;
    const isMe = !!m.by && m.by === partner.myUid;
    return { isMe, role: member?.role ?? (isMe ? profile.role : undefined), name: m.byName || member?.name || (isMe ? profile.name : undefined) };
  };

  /** Quién marcó la tarea (solo con vínculo y si el dato existe). */
  const taskAuthor = (taskId: number) => {
    if (!pid) return null;
    const meta = taskMeta[String(taskId)];
    const who = whoFromMeta(meta);
    if (!who) return null;
    const when = meta?.at ? formatRelative(meta.at) : "";
    return { name: who.name, role: who.role, title: `Marcado por ${who.name || (who.role ? PERSON_LABEL[who.role] : "tu pareja")}${when ? ` ${when}` : ""}` };
  };

  const ownerNote = (key: string) => {
    if (!pid) return null;
    const m = ownersMeta[key];
    const who = whoFromMeta(m);
    if (!who) return null;
    const when = m?.at ? ` ${formatRelative(m.at)}` : "";
    return who.isMe ? `La reasignaste tú${when}` : `La reasignó ${who.name || partnerLabel}${when}`;
  };

  const buildRow = (task: (typeof ALL_TASKS)[number]): TaskRowModel => {
    const key = String(task.id);
    const completed = isTaskDone(taskStatus[key]);
    const owner = effectiveOwner(task, taskOwners);
    return {
      task,
      completed,
      owner,
      windowNote: taskWindowNote(task, realWeek, completed, owner, reader),
      author: completed ? taskAuthor(task.id) : null,
      ownerNote: ownerNote(key),
    };
  };

  // --- «Para comentar en tu próximo control» (R2 · paso 3) ---
  // Vacunas, pruebas y trámites cuya ventana ya cerró y siguen sin marcar: van en UN grupo (en «Hoy», en la
  // hoja «Todas las tareas» y en la preparación de la próxima cita), no como un muro de avisos. Solo con
  // semana conocida y con el dato del servidor: nunca se afirma que algo falta sin saberlo. Las que se
  // marcan durante la sesión siguen en su grupo (marcadas): nada se mueve bajo el dedo ni se pierde el foco.
  const discussable = (t: (typeof ALL_TASKS)[number]) => discussAtControl(t, realWeek) && taskStatus[String(t.id)] !== "dismissed";
  const discussPendingIds = checklistLoaded
    ? ALL_TASKS.filter(t => discussable(t) && !isTaskDone(taskStatus[String(t.id)])).map(t => String(t.id))
    : [];
  const [discussSeen, setDiscussSeen] = useState<{ pid: string; week?: number; ids: string[] }>({ pid, week: realWeek, ids: [] });
  let discussSeenIds = discussSeen.pid === pid && discussSeen.week === realWeek ? discussSeen.ids : [];
  if (discussSeenIds !== discussSeen.ids || discussPendingIds.some(id => !discussSeenIds.includes(id))) {
    discussSeenIds = [...new Set([...discussSeenIds, ...discussPendingIds])];
    setDiscussSeen({ pid, week: realWeek, ids: discussSeenIds });
  }
  const discussAllRows = ALL_TASKS.filter(t => discussable(t) && discussSeenIds.includes(String(t.id))).map(buildRow);
  const discussIds = new Set(discussAllRows.map(r => String(r.task.id)));
  // En «Hoy» y en la cita, solo las de ventanas que cerraron en las últimas 4 semanas (revisión clínica #18);
  // las más antiguas siguen en «Todas las tareas».
  const discussTodayRows = discussAllRows.filter(r => (realWeek ?? 0) - taskWindow(r.task).to <= 4);

  // --- «Hoy»: ventana activa (pendientes primero) + ventanas pasadas sin hacer, por dueño ---
  const forWeek = tasksForWeek(realWeek, taskStatus);
  const todayRows = [
    ...forWeek.now.filter(t => !t.completed),
    // Solo las de ventana clínica propia que cerraron en las últimas 4 semanas: los hábitos de un
    // trimestre pasado no "vencen" hoy y un muro de pendientes viejos no ayuda (siguen en los checklists).
    // Las de comentar en el control van en su grupo; aquí queda la logística («mejor cuanto antes»).
    ...forWeek.overdue.filter(t => (t.weekFrom !== undefined || t.weekTo !== undefined) && (forWeek.week ?? 0) - t.window.to <= 4),
    ...forWeek.now.filter(t => t.completed),
  ].filter(t => !discussIds.has(String(t.id))).map(t => buildRow(t));
  const todayGroups: TodayGroup[] = [
    { id: "mine", title: "Tus tareas", rows: todayRows.filter(r => r.owner === reader) },
    { id: "partner", title: `Las de ${partnerName || (otherRole === "mama" ? "mamá" : "papá")}`, rows: todayRows.filter(r => r.owner === otherRole) },
    { id: "both", title: "De los dos", rows: todayRows.filter(r => r.owner === "ambos") },
  ];

  // --- Próxima cita (solo futura; las de "todo el día" cuentan hasta que termina el día) ---
  const now = useNow(60_000);
  const nextEvent = React.useMemo(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    let best: { ev: AgendaEvent; at: Date } | null = null;
    for (const ev of events) {
      const at = parseEventDate(ev);
      if (!at) continue;
      const future = hasClockTime(ev.time) ? at.getTime() >= now.getTime() : at.getTime() >= startOfToday.getTime();
      if (future && (!best || at.getTime() < best.at.getTime())) best = { ev, at };
    }
    return best;
  }, [events, now]);
  const nextEventInfo = nextEvent
    ? {
        title: nextEvent.ev.title,
        // La fecha sale de la cita parseada, no del texto guardado (PandaIA o datos viejos pueden traer
        // "mañana" y quedaría «Mañana · mañana»).
        when: `${formatDateShort(nextEvent.at)}${hasClockTime(nextEvent.ev.time) ? ` · ${nextEvent.ev.time}` : ""}`,
        // Mismo criterio que la Agenda y la preparación: "hoy", "mañana", "en 9 días" (format.ts).
        relative: formatDayCountdown(nextEvent.at, now),
        byName: pid && nextEvent.ev.createdBy && nextEvent.ev.createdBy !== partner.myUid ? nextEvent.ev.createdByName : undefined,
      }
    : null;

  // La preparación de la próxima cita (hoja en la raíz, también desde la Agenda) muestra lo mismo que el
  // grupo de «Hoy»: se publica tras cada render (no avisa si no cambió). Memoria del teléfono, no Firebase.
  const discussForPrep = discussTodayRows
    .filter(r => !r.completed)
    .map(r => ({ id: String(r.task.id), text: r.task.text, ask: overdueAsk(r.task.kind, reader) }));
  const nextEventId = nextEvent?.ev.id ?? null;
  useEffect(() => {
    publishDiscuss({ eventId: nextEventId, items: discussForPrep });
  });
  useEffect(() => () => publishDiscuss(null), []);

  // --- "Desde tu última visita": lo que marcó o reasignó la pareja (solo con dato del servidor) ---
  const visitSince = visit.pid === pid ? visit.since : null;
  const sinceLastVisit: SinceLastVisit = (() => {
    if (!pid || !checklistLoaded || !visitSince || !partner.myUid) return null;
    const fromPartner = (m: { by?: string; at?: Date }) => !!m.at && m.at.getTime() > visitSince && !!m.by && m.by !== partner.myUid;
    const marked = Object.entries(taskMeta).filter(([k, m]) => taskStatus[k] === "completed" && fromPartner(m));
    const reassigned = Object.entries(ownersMeta).filter(([, m]) => fromPartner(m));
    if (marked.length === 0 && reassigned.length === 0) return null;
    const who = whoFromMeta((marked[0] ?? reassigned[0])[1]);
    const name = who?.name || partnerName;
    const parts: string[] = [];
    const tareas = (n: number) => (n === 1 ? "1 tarea" : `${n} tareas`);
    if (marked.length > 0) parts.push(`marcó ${tareas(marked.length)}`);
    if (reassigned.length > 0) parts.push(`reasignó ${marked.length > 0 ? reassigned.length : tareas(reassigned.length)}`);
    return {
      name,
      role: who?.role ?? partner.partnerRole,
      text: `Desde tu última visita, ${name || "tu pareja"} ${parts.join(" y ")}`,
      titles: marked.slice(0, 3).map(([k]) => ALL_TASKS.find(t => String(t.id) === k)?.text).filter((t): t is string => !!t),
    };
  })();

  // --- Checklists completos por trimestre ---
  const trimesters: TrimesterModel[] = ([1, 2, 3] as const).map(t => ({
    trimester: t,
    range: `Semanas ${TRIMESTER_WEEKS[t].from}–${TRIMESTER_WEEKS[t].to}`,
    categories: TASK_CATEGORIES.filter(c => c.trimester === t).map(c => ({
      id: c.id,
      title: c.title,
      rows: ALL_TASKS.filter(x => x.categoryId === c.id && taskStatus[String(x.id)] !== "dismissed").map(buildRow),
    })),
  }));
  const allRows = trimesters.flatMap(t => t.categories.flatMap(c => c.rows));
  const doneCount = allRows.filter(r => r.completed).length;
  const loadingText = isOffline() ? "Sin conexión: no podemos mostrar el progreso compartido ahora." : "Cargando el progreso compartido…";
  const laborReady = ga.source !== "unknown" && typeof ga.weeks === "number" && ga.weeks >= 36;
  // «Todas las tareas» (los tres trimestres) se abre en su propia hoja: en la Guía ninguna tarea se
  // repite (antes el trimestre actual, desplegado, volvía a listar las mismas tareas de «Hoy»).
  const [allTasksOpen, setAllTasksOpen] = useState(false);
  // Dónde vive el progreso de las tareas: junto a las tareas de «Hoy» y en la cabecera de la hoja.
  const checklistBadge = (
    <SyncBadge partnerName={partner.partnerName} lastSyncedAt={lastChecklistChange} waiting={!checklistLoaded} />
  );
  // Semana que se mira (R2 · paso 2): la eligen las flechas del bloque de semana y la sigue la ficha.
  const explorer = useWeekExplorer(realWeek, 12);

  // Composición (fase 6 + R2). Móvil: una columna, 40px entre secciones y más aire sobre cada título que
  // debajo. Primero el corazón de la semana (planta, semana, hito y misión), luego «Hoy» (dos tareas y la
  // cita), el estado de mamá y, al final, la ficha del bebé como detalle. ≥1280px: dos columnas en rejilla
  // (semana + misión + ficha a la izquierda, «Hoy» y el estado de mamá a la derecha) SIN cambiar el orden
  // del DOM: labor → semana → hoy → ficha, igual que en el teléfono. La fila flexible (1fr) absorbe la
  // altura de la columna derecha, así que la ficha arranca justo bajo la semana. «¿Es la hora?» ocupa las
  // dos columnas arriba.
  // 36+ en el teléfono: el ritmo se aprieta (32px entre secciones, 16px bajo la cabecera) para que la primera
  // pantalla (390×844, sobre la barra de 82px) muestre «¿Es la hora?», las llamadas, la planta, la semana y
  // el título «Hoy».
  const rhythm = laborReady ? { stack: "gap-8 pt-4", rule: "mt-5" } : { stack: "gap-10 pt-6", rule: "mt-8" };
  const rows = laborReady
    ? { grid: "xl:grid-rows-[auto_auto_1fr]", week: "xl:row-start-2", today: "xl:row-start-2 xl:row-span-2", ficha: "xl:row-start-3" }
    : { grid: "xl:grid-rows-[auto_1fr]", week: "xl:row-start-1", today: "xl:row-start-1 xl:row-span-2", ficha: "xl:row-start-2" };

  return (
    <div className={`flex flex-col ${rhythm.stack} px-[var(--gutter)] pb-10 lg:px-8 lg:pt-10 xl:grid xl:grid-cols-2 xl:items-start xl:gap-x-16 xl:gap-y-12 ${rows.grid}`}>
      {laborReady && (
        <div className="xl:col-span-2 xl:row-start-1">
          <LaborReadyBlock
            weeks={ga.weeks!}
            totalDays={ga.totalDays}
            reader={reader}
            partnerName={partnerName}
            onReviewDate={onConfirmDate}
          />
        </div>
      )}

      {/* Bloque de semana: la planta, la semana, el hito y la misión de quien lee; el ramito cierra el bloque. */}
      <div className={`xl:col-start-1 ${rows.week}`}>
        <WeekHeader
          ga={ga}
          reader={reader}
          onConfirmDate={onConfirmDate}
          needsReview={dueDateNeedsReview}
          explorer={explorer}
          partnerName={partnerName}
        />
        <BotanicalRule className={rhythm.rule} />
      </div>

      <div className={`flex flex-col gap-10 xl:col-start-2 ${rows.today}`}>
        <TodayBlock
          weekKnown={realWeek !== undefined}
          reader={reader}
          groups={todayGroups}
          ownerLabels={ownerLabels}
          loading={!checklistLoaded}
          loadingText={loadingText}
          disabled={!checklistLoaded}
          onToggleDone={toggleTask}
          onAssign={(row, o) => assignTask(row, o)}
          nextEvent={nextEventInfo}
          eventsLoading={eventsLoading}
          onOpenPrep={() => { if (nextEvent) onOpenPrep(nextEvent.ev); }}
          onGoToAgenda={onGoToAgenda}
          sinceLastVisit={sinceLastVisit}
          onOpenTool={laborReady ? onOpenTool : undefined}
          discuss={discussTodayRows}
          allTasks={{
            done: doneCount,
            total: allRows.length,
            loaded: checklistLoaded,
            onOpen: () => setAllTasksOpen(true),
            syncBadge: checklistBadge,
          }}
        />

        <MomStatusCard
          profile={profile}
          remoteMomStatus={remoteMomStatus}
          remoteLoaded={momStatusLoaded}
          partner={partner}
          showToast={showToast}
          onRequestLink={onRequestLink}
        />
      </div>

      <div className={`flex flex-col gap-10 xl:col-start-1 ${rows.ficha}`}>
        <FetalCard week={explorer.display} realWeek={realWeek} theme={profile.comparisonTheme || "frutas"} />
      </div>

      {allTasksOpen && (
        <AllTasksSheet
          onClose={() => setAllTasksOpen(false)}
          done={doneCount}
          total={allRows.length}
          loaded={checklistLoaded}
          loadingText={loadingText}
          syncBadge={checklistBadge}
          trimesters={trimesters}
          currentTrimester={realWeek !== undefined ? ga.trimester : undefined}
          ownerLabels={ownerLabels}
          disabled={!checklistLoaded}
          onToggleDone={toggleTask}
          onAssign={(row, o) => assignTask(row, o)}
          reader={reader}
          discuss={discussAllRows}
        />
      )}
    </div>
  );
}

// Mensajes del chat de PandaIA. `kind` marca burbujas especiales que no se envían como historial.
/**
 * Tarjetas bajo una respuesta de PandaIA:
 * - "appointment": cita que la persona pidió con fecha concreta y que la app agregó a la Agenda.
 * - "pending": la IA quiso agendar pero la persona no dijo la fecha: no se inventa, se pregunta.
 * - "info": tarjeta informativa (hito, recomendación); nunca dice "En Agenda".
 */
type ChatCard =
  | { kind: "appointment"; eventId: number | string; title: string; when: string; doctor?: string }
  | { kind: "pending"; title: string }
  | { kind: "info"; title: string; desc: string };

interface ChatMessage {
  id: number;
  sender: "user" | "ai";
  text: string;
  card?: ChatCard;
  /** Restaurado del historial guardado: la tarjeta de urgencia no vuelve a anunciarse como alerta. */
  restored?: boolean;
  /**
   * "urgency": tarjeta de llamada por señal de alarma que parece estar ocurriendo.
   * "notice": aviso discreto cuando la señal aparece en una pregunta general o negada.
   * "error": fallo de conexión con reintento.
   */
  kind?: "urgency" | "notice" | "error";
  /** urgency: señales detectadas localmente. */
  matches?: AlarmSign[];
  /** urgency: motivo que marcó el servidor cuando no hubo coincidencia local. */
  reason?: string;
  /** error: texto a reenviar y mensaje del usuario al que responde. */
  retryText?: string;
  sourceId?: number;
  /** error: el texto venía de una sugerencia de la app (no pasa por el detector). */
  retrySuggestion?: boolean;
  /** error: en ese intercambio ya se mostró la tarjeta de urgencia. */
  hadAlarm?: boolean;
  offline?: boolean;
}

const CHAT_TIMEOUT_MS = 45000;

// Respuesta de /api/chat (también en 4xx/5xx trae `reply` y, si aplica, `urgency`).
type ChatApiResponse = {
  reply?: unknown;
  urgency?: unknown;
  urgencyReason?: unknown;
  unavailable?: boolean;
  appointment?: { title: string; date: string; rawDate?: string; time?: string; doctor?: string };
  card?: { title: string; desc: string };
};

/**
 * Tarjeta de urgencia del chat: distinta de las burbujas normales, sin "Copiar",
 * con las acciones de llamada a un toque. El texto va en role="alert"; las acciones
 * quedan fuera del alert para que el lector de pantalla no lea todos los botones de golpe.
 */
function ChatUrgencyBubble({ id, matches, reason, live = true, role = "mama" }: { id: string; matches: AlarmSign[]; reason?: string; live?: boolean; role?: "papa" | "mama" }) {
  const titleId = React.useId();
  const first = matches[0];
  // Voz de quien lee: el papá lee la señal en tercera persona ("no la dejan retener líquidos").
  const firstCopy = first ? signCopy(first, role) : null;
  const extra = matches.length - 1;
  const signLine = firstCopy
    ? `${firstCopy.title}${extra > 0 ? ` y ${extra} ${extra === 1 ? "señal más" : "señales más"}` : ""}.`
    : reason
      ? `${reason.replace(/[.\s]+$/, "")}.`
      : "Lo que describes puede ser una señal de alarma.";
  const actionLine = first?.id === "salud-mental" && firstCopy
    ? firstCopy.detail
    : role === "papa"
      ? "Llama a emergencias o vayan a urgencias ahora."
      : "Llama a emergencias o ve a urgencias ahora.";

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="w-full shrink-0 scroll-mt-2 overflow-hidden rounded-3xl rounded-bl-md border border-terracotta-ink"
    >
      {/* La burbuja más fuerte del chat: relleno terracota (ninguna otra burbuja lo usa). */}
      <div role={live ? "alert" : undefined} className="bg-terracotta-ink px-4 py-3.5 text-on-accent">
        <p id={titleId} className="flex items-start gap-2 font-display text-subtitle">
          <AlertTriangle size={20} strokeWidth={2} className="mt-1 shrink-0" aria-hidden="true" />
          <span>Si esto está pasando ahora, no esperes</span>
        </p>
        <p className="mt-1.5 text-body font-bold">{signLine}</p>
        <p className="mt-0.5 text-body">{actionLine}</p>
      </div>
      <div className="bg-surface p-3">
        {/* Salud mental (autolesión o suicidio, también en tercera persona): la línea de crisis del país va
            justo debajo de Emergencias, que sigue siendo la más fuerte. Sin línea, solo lo de siempre. */}
        <CallActions context="chat" crisis={matches.some((m) => m.id === "salud-mental")} />
      </div>
    </section>
  );
}

/**
 * Aviso discreto (sin role="alert") cuando una señal aparece en una pregunta general
 * ("¿cómo saber si rompí fuente?") o negada ("no tengo fiebre"): no alarma, pero deja
 * las llamadas a un toque por si sí está pasando.
 */
function ChatSafetyNote({ id, role }: { id: string; role: "papa" | "mama" }) {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  return (
    <div
      id={id}
      className="w-full shrink-0 rounded-2xl border border-line bg-surface px-4 py-3"
    >
      <p className="flex items-start gap-2 text-body text-ink">
        <Info size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
        <span>
          <strong className="font-bold">{role === "papa" ? "Si le está pasando ahora," : "Si te está pasando ahora,"}</strong>{" "}
          no esperes: llama a emergencias o {role === "papa" ? "vayan" : "ve"} a urgencias.
        </span>
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
        className={`mt-1 ${TEXT_ACTION}`}
      >
        <PhoneCall size={16} strokeWidth={1.75} aria-hidden="true" />
        {open ? "Ocultar a quién llamar" : "Ver a quién llamar"}
        {open ? <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" /> : <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <div id={panelId} hidden={!open}>
        {open && <CallActions context="chat" className="mt-2" />}
      </div>
    </div>
  );
}

/** Historial guardado en este teléfono (sin errores ni avisos pasajeros). */
function loadStoredChat(key: string): ChatMessage[] | null {
  const raw = readStored<unknown>(key, null);
  if (!Array.isArray(raw)) return null;
  const list = raw.filter((m): m is ChatMessage =>
    !!m && typeof m === "object" &&
    typeof (m as ChatMessage).id === "number" &&
    ((m as ChatMessage).sender === "user" || (m as ChatMessage).sender === "ai") &&
    typeof (m as ChatMessage).text === "string"
  );
  if (list.length === 0) return null;
  return list.map((m) => (m.kind === "urgency" ? { ...m, restored: true } : m));
}

// --- VISTA: PANDAIA ---
/** Límite del anuncio de una respuesta: lo bastante para orientar; la respuesta completa está en el chat. */
const SPOKEN_REPLY_MAX = 220;

/**
 * Respuesta de PandaIA para la región viva: sin marcas de Markdown (##, **, 1., viñetas), que el lector
 * de pantalla leería como símbolos, y acotada, para no leer la respuesta entera cada vez.
 */
function spokenReply(reply: string): string {
  const sentences = reply
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^\s*#{1,6}\s+/, "")
      .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/[*_`]+/g, "")
      .trim())
    .filter(Boolean)
    .map((line) => (/[.!?:;…]$/.test(line) ? line : `${line}.`));
  const plain = sentences.join(" ").replace(/\s+/g, " ").trim();
  if (plain.length <= SPOKEN_REPLY_MAX) return plain;
  const cut = plain.slice(0, SPOKEN_REPLY_MAX);
  const end = cut.lastIndexOf(" ");
  return `${(end > 80 ? cut.slice(0, end) : cut).replace(/[\s.,;:]+$/, "")}… La respuesta completa está en el chat.`;
}

function PandaIAView({
  showToast,
  addEvent,
  events,
  profile,
  initialQuery,
  clearInitialQuery,
  setActiveTab,
  onOpenSymptoms
}: {
  showToast: ShowToast,
  addEvent: (appt: { title: string; rawDate: string; time?: string; doctor?: string }) => AgendaEvent,
  events: AgendaEvent[],
  profile: UserProfile,
  initialQuery?: string,
  clearInitialQuery?: () => void,
  setActiveTab?: (tab: Tab) => void,
  onOpenSymptoms?: () => void
}) {
  // Sin semana confirmada (null): sugerencias generales, sin trimestre ni "semana N" inventados.
  const getContextualChips = (week: number | null, role: "papa" | "mama") => {
    if (week === null) {
      return role === "papa" ? [
        "¿Qué controles se hacen en cada trimestre?",
        "¿Qué señales de alarma debo conocer para acompañarla?",
        "¿Cómo se calcula la fecha probable de parto (FPP)?",
        "¿Cómo puedo apoyar a mamá en el embarazo?"
      ] : [
        "¿Cómo calculo mi fecha probable de parto (FPP)?",
        "¿Qué controles se hacen en cada trimestre?",
        "¿Qué señales de alarma debo conocer?",
        "Agendar mi próximo control"
      ];
    }
    if (week <= 13) {
      return role === "papa" ? [
        "¿Qué alimentos aportan colina y omega-3 (DHA)?",
        "¿Cómo aliviar las náuseas matutinas de mamá?",
        "Agendar la ecografía de la semana 12 (translucencia nucal)",
        "¿Qué tareas de casa y productos de limpieza debo asumir?"
      ] : [
        "¿Es normal tener tanta fatiga y sueño?",
        "Alimentos que debo evitar en el primer trimestre",
        "¿Cuándo se empieza a notar la pancita?",
        "Agendar mi control prenatal de este mes"
      ];
    } else if (week <= 27) {
      return role === "papa" ? [
        "¿Qué revisa la ecografía morfológica (semanas 18 a 22)?",
        "¿Cuándo empezaremos a sentir las patadas?",
        "Agendar una ecografía 3D o 4D",
        "¿Cómo apoyar a mamá con los dolores de espalda?"
      ] : [
        "¿Cuándo se siente el hipo del bebé?",
        "Cuidados de la piel y del suelo pélvico en el segundo trimestre",
        "Alimentos que ayudan a prevenir la anemia",
        "¿Qué preguntar en la ecografía morfológica?"
      ];
    } else {
      return role === "papa" ? [
        "¿Qué llevar en la maleta del hospital?",
        "¿Cómo reconocer las contracciones de trabajo de parto?",
        "Agendar el monitoreo fetal",
        "¿Cómo acompañar a mamá durante el trabajo de parto?"
      ] : [
        "¿Qué señales de alarma debo conocer en el tercer trimestre?",
        "Masaje perineal: ¿cómo y cuándo empezar?",
        "¿Cómo saber si rompí fuente o es flujo?",
        "Revisar nuestro plan de parto"
      ];
    }
  };

  // Decodificador de ecografías: explica términos y siglas del informe; no interpreta resultados.
  const getUltrasoundItems = (week: number | null) => {
    if (week === null) {
      // Sin semana confirmada: los términos de las tres etapas, sin "semana N".
      return [
        {
          title: "Translucencia nucal (TN), semanas 11 a 14",
          desc: "Qué mide el tamizaje del primer trimestre",
          prompt: "¿Qué evalúan la translucencia nucal (TN) y el hueso nasal en la ecografía de las semanas 11 a 14?"
        },
        {
          title: "Medidas del bebé: LCC, DBP, LF, CA y CC",
          desc: "Longitud cráneo-caudal, diámetro biparietal, longitud del fémur y circunferencias abdominal y cefálica",
          prompt: "¿Qué significan las siglas LCC, DBP, LF, CA y CC en un informe de ecografía?"
        },
        {
          title: "Ecografía morfológica (semanas 18 a 22)",
          desc: "Qué revisa de los órganos, el corazón y el cerebro del bebé",
          prompt: "¿Qué evalúa la ecografía morfológica de las semanas 18 a 22?"
        },
        {
          title: "Índice de líquido amniótico (ILA)",
          desc: "Qué mide y cómo aparece en el informe",
          prompt: "¿Qué es el índice de líquido amniótico (ILA) y cómo se mide?"
        }
      ];
    }
    if (week <= 13) {
      return [
        {
          title: "Ecografía de las semanas 11 a 14: translucencia nucal (TN)",
          desc: "Qué mide el tamizaje del primer trimestre y por qué se revisa el hueso nasal",
          prompt: "¿Qué evalúan la translucencia nucal (TN) y el hueso nasal en la ecografía de las semanas 11 a 14?"
        },
        {
          title: `Medidas de la semana ${week}: LCC y DBP`,
          desc: "Longitud cráneo-caudal (LCC) y diámetro biparietal (DBP)",
          prompt: `¿Qué significan las medidas LCC (longitud cráneo-caudal) y DBP (diámetro biparietal) en una ecografía de la semana ${week}?`
        },
        {
          title: "Frecuencia cardíaca fetal",
          desc: "Qué mide y por qué se registra en cada ecografía",
          prompt: "¿Qué mide la frecuencia cardíaca fetal en la ecografía y por qué se registra?"
        },
        {
          title: "Hematoma subcoriónico",
          desc: "Qué significa el término si aparece en el informe. Si hay sangrado, es una señal de alarma",
          prompt: "¿Qué significa el término «hematoma subcoriónico» en un informe de ecografía?"
        }
      ];
    } else if (week <= 27) {
      return [
        {
          title: "Ecografía morfológica (semanas 18 a 22)",
          desc: "Qué revisa de los órganos, el corazón y el cerebro del bebé",
          prompt: "¿Qué evalúa la ecografía morfológica de las semanas 18 a 22?"
        },
        {
          title: "Medidas del bebé (DBP, LF, CA, CC)",
          desc: "Diámetro biparietal, longitud del fémur y circunferencias abdominal y cefálica",
          prompt: `¿Qué significan las siglas DBP, LF, CA y CC en un informe de ecografía de la semana ${week}?`
        },
        {
          title: "Percentiles de crecimiento y peso",
          desc: "Qué quiere decir que el bebé esté en el percentil 25, 50 o 90",
          prompt: `¿Qué significa el percentil de crecimiento y de peso estimado del bebé en la semana ${week}?`
        },
        {
          title: "Doppler de arterias uterinas y placenta",
          desc: "Qué mide el Doppler (el flujo de sangre) y qué es la madurez placentaria",
          prompt: `¿Qué evalúa el Doppler de arterias uterinas y qué significa el grado placentario en la semana ${week}?`
        }
      ];
    } else {
      return [
        {
          title: `Percentil de peso en el tercer trimestre (semana ${week})`,
          desc: "Peso estimado y curvas de crecimiento",
          prompt: `¿Cómo se evalúa el percentil de peso y crecimiento del bebé en la semana ${week}?`
        },
        {
          title: "Índice de líquido amniótico (ILA)",
          desc: "Qué mide y cómo aparece en el informe",
          prompt: "¿Qué es el índice de líquido amniótico (ILA) y cómo se mide?"
        },
        {
          title: "Doppler fetal (arteria umbilical y cerebral media)",
          desc: "Qué dice sobre el flujo de sangre y oxígeno que recibe el bebé",
          prompt: `¿Qué evalúa el Doppler fetal de la arteria umbilical y de la cerebral media en la semana ${week}?`
        },
        {
          title: "Posición del bebé y grado de la placenta",
          desc: "Cefálica (cabeza abajo), podálica (de nalgas) y grado placentario",
          prompt: `¿Qué significan la posición cefálica o podálica y el grado de madurez placentaria en la semana ${week}?`
        }
      ];
    }
  };

  const getWelcomeText = (week: number | null, role: "papa" | "mama", name?: string) => {
    const hello = `¡Hola, ${name || (role === "papa" ? "papá" : "mamá")}! Soy PandaIA.`;
    // Ante una alarma, la llamada va antes que el chat. Que PandaIA no diagnostica lo dice UNA vez la nota fija
    // bajo el campo (R2 · paso 5: antes se repetía aquí).
    const limits = "Si notas una señal de alarma, no esperes mi respuesta: toca **Síntomas** o llama a emergencias.";
    if (week === null) {
      return `${hello}\n\nAún no sé en qué semana están: confírmala en **Ajustes** para orientarte mejor. Mientras tanto, pregúntame lo que necesites o pídeme que **agende una cita** diciéndome el día.\n\n${limits}`;
    }
    return role === "papa"
      ? `${hello}\n\nPregúntame por el **desarrollo del bebé en la semana ${week}**, la alimentación en el embarazo, qué preguntar en el próximo control o pídeme que **agende una cita** diciéndome el día.\n\n${limits}`
      : `${hello}\n\nPregúntame por los cambios de la **semana ${week}**, la alimentación o qué preguntar en tu próximo control, o pídeme que **agende una cita** diciéndome el día.\n\n${limits}`;
  };
  // Semana que menciona PandaIA (saludo, sugerencias y decodificador). Sin confirmar → null: nunca una inventada.
  const chatWeek = profile.weekUnknown || !profile.week ? null : profile.week;
  const welcomeMessage = (): ChatMessage => ({ id: 1, sender: "ai", text: getWelcomeText(chatWeek, profile.role, profile.name) });

  // La conversación se guarda en este teléfono (últimos 60 mensajes, por embarazo o "local").
  const storageKey = chatStorageKey(profile.pregnancyId);
  const online = useOnline();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadStoredChat(storageKey);
    if (!saved) return [welcomeMessage()];
    // El saludo guardado se escribe de nuevo: así lleva el texto, la semana y el rol de hoy.
    const stored = saved.map((m) => (m.id === 1 && m.sender === "ai" && !m.kind ? { ...m, text: welcomeMessage().text } : m));
    // La app se cerró antes de la respuesta (el error no se guarda): se ofrece reintentar.
    const last = stored[stored.length - 1];
    if (last && last.sender === "user" && !last.kind && last.text) {
      const nextId = stored.reduce((max, m) => Math.max(max, m.id), 1) + 1;
      return [...stored, { id: nextId, sender: "ai", kind: "error", text: "Esta pregunta quedó sin respuesta.", retryText: last.text, sourceId: last.id }];
    }
    return stored;
  });
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [smartChips, setSmartChips] = useState<string[]>(() => getContextualChips(chatWeek, profile.role));
  const [isUltrasoundModalOpen, setIsUltrasoundModalOpen] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  // Ids crecientes (por encima de los restaurados): el mensaje del usuario y la tarjeta de urgencia se crean en el mismo instante.
  const [initialMaxId] = useState(() => messages.reduce((max, m) => Math.max(max, m.id), 1));
  const lastIdRef = React.useRef(initialMaxId);
  const makeId = () => ++lastIdRef.current;

  useEffect(() => {
    const toStore = messages.filter(m => m.kind !== "error" && m.kind !== "notice").slice(-CHAT_MAX_STORED);
    if (toStore.length === 0 || (toStore.length === 1 && toStore[0].id === 1)) {
      try { window.localStorage.removeItem(storageKey); } catch { /* sin almacenamiento */ }
      return;
    }
    writeStored(storageKey, toStore);
  }, [messages, storageKey]);
  // Tarjeta de urgencia del intercambio en curso: se mantiene a la vista aunque llegue una respuesta larga.
  const urgencyAnchorRef = React.useRef<number | null>(null);
  // Región viva propia: anuncia solo el texto nuevo (respuesta, error o aviso), nunca los botones
  // de llamada. La tarjeta de urgencia se anuncia sola con su role="alert".
  const [announcement, setAnnouncement] = useState("");
  // Semana para las reglas clínicas: sin confirmar (o de relleno) → undefined (aplican todas las señales).
  const ruleWeek = clinicalWeek(profile);

  // Auto-scroll al recibir o enviar mensajes
  useEffect(() => {
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
    const anchorId = urgencyAnchorRef.current;
    if (anchorId !== null) {
      const anchor = document.getElementById(`pandaia-msg-${anchorId}`);
      if (anchor) {
        anchor.scrollIntoView({ block: "start", behavior });
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, [messages, isTyping]);

  // Actualizar chips cuando cambia el perfil o semana
  useEffect(() => {
    setSmartChips(getContextualChips(chatWeek, profile.role));
  }, [chatWeek, profile.role]);

  // Sincronizar mensaje de bienvenida automáticamente con la semana y rol elegidos
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 1) {
        return [{ id: 1, sender: "ai", text: getWelcomeText(chatWeek, profile.role, profile.name) }];
      }
      return prev;
    });
  }, [chatWeek, profile.role, profile.name]);

  // Si se envió una consulta desde otra pantalla (ej. modal de preparación)
  useEffect(() => {
    if (initialQuery) {
      setInputText(initialQuery);
      if (clearInitialQuery) clearInitialQuery();
      textareaRef.current?.focus();
    }
  }, [initialQuery, clearInitialQuery]);

  // Decodificador de ecografías: diálogo modal (Escape, foco atrapado y de vuelta al clip, fondo inerte).
  const { dialogProps: ultrasoundDialogProps } = useModalDialog({
    open: isUltrasoundModalOpen,
    onClose: () => setIsUltrasoundModalOpen(false),
    labelledBy: "ultrasound-modal-title",
    describedBy: "ultrasound-modal-desc",
  });

  const copyMessage = async (id: number, text: string) => {
    const ok = await copyText(text);
    if (!ok) {
      showToast("No pudimos copiar la respuesta. Mantén presionado el texto para copiarlo.");
      return;
    }
    setCopiedId(id);
    showToast("Respuesta copiada");
    setTimeout(() => setCopiedId(null), 2000);
  };

  /** Reinicia la conversación; "Deshacer" la recupera tal cual estaba. */
  const clearChat = () => {
    const previous = messages;
    if (previous.length <= 1) return;
    urgencyAnchorRef.current = null;
    setMessages([welcomeMessage()]);
    setSmartChips(getContextualChips(chatWeek, profile.role));
    showToast("Conversación reiniciada", () => {
      urgencyAnchorRef.current = null;
      setMessages(previous.map(m => (m.kind === "urgency" ? { ...m, restored: true } : m)));
    });
  };

  /** Chips de "Agendar…": no se envían solos (la IA inventaría la fecha); se completan con el día. */
  const isScheduleChip = (chip: string) => /^agendar\b/i.test(chip.trim());
  const prefillInput = (text: string) => {
    setInputText(text);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const handleUltrasoundSelect = (query: string) => {
    setIsUltrasoundModalOpen(false);
    handleSend(query, undefined, "suggestion");
  };

  // Solo turnos de conversación: sin tarjetas de urgencia ni avisos de error.
  const toHistory = (list: ChatMessage[]) =>
    list
      .filter(m => !m.kind && m.text)
      .slice(-6)
      .map(m => ({ sender: m.sender, text: m.text }));

  const handleSend = async (text: string, retry?: { errorId: number; sourceId: number }, source?: "suggestion") => {
    if (!text.trim() || isTyping) return;

    // Detector local antes de la red: si hay señal de alarma que parece estar ocurriendo, la
    // tarjeta de llamada aparece ya, aunque PandaIA tarde o no responda. Las sugerencias de la
    // propia app (chips, ecografías) son preguntas educativas: no pasan por el detector.
    const alarm = source === "suggestion" ? null : detectAlarm(text, ruleWeek);
    const highAlarm = !!alarm && alarm.urgent && alarm.confidence === "high";
    const lowAlarm = !!alarm && alarm.urgent && alarm.confidence === "low";
    let urgencyShown = highAlarm;
    let sourceId: number;
    let historySource: ChatMessage[];

    if (retry) {
      // Reintento: el mensaje del usuario (y su tarjeta de urgencia, si hubo) ya están en pantalla.
      sourceId = retry.sourceId;
      const withoutError = messages.filter(m => m.id !== retry.errorId);
      const sourceIndex = withoutError.findIndex(m => m.id === retry.sourceId);
      historySource = sourceIndex >= 0 ? withoutError.slice(0, sourceIndex) : withoutError;
      setMessages(prev => prev.filter(m => m.id !== retry.errorId));
    } else {
      sourceId = makeId();
      historySource = messages;
      const added: ChatMessage[] = [{ id: sourceId, sender: "user", text }];
      urgencyAnchorRef.current = null;
      if (highAlarm && alarm) {
        const urgencyId = makeId();
        added.push({ id: urgencyId, sender: "ai", kind: "urgency", text: "", matches: alarm.matches });
        urgencyAnchorRef.current = urgencyId;
      } else if (lowAlarm) {
        added.push({ id: makeId(), sender: "ai", kind: "notice", text: "" });
        setAnnouncement(profile.role === "papa"
          ? "Si le está pasando ahora, no esperes: llama a emergencias o vayan a urgencias."
          : "Si te está pasando ahora, no esperes: llama a emergencias o ve a urgencias.");
      }
      setSmartChips(prev => prev.filter(c => c !== text));
      setMessages(prev => [...prev, ...added]);
      setInputText("");
    }
    setIsTyping(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          history: toHistory(historySource),
          context: {
            // null = semana sin confirmar: el servidor no inventa una ni la usa para las reglas.
            currentWeek: ruleWeek ?? null,
            trimester: ruleWeek === undefined ? null : ruleWeek <= 13 ? 1 : ruleWeek <= 27 ? 2 : 3,
            source: source ?? "user",
            userRole: profile.role,
            userName: profile.name || "",
            userProfile: profile.role === "papa" ? `Papá${profile.name ? ` (${profile.name})` : ""}` : `Mamá${profile.name ? ` (${profile.name})` : ""}`
            // La ciudad y las notas de Ajustes no se envían: el servidor no las usa y se guardan solo en este teléfono.
          }
        })
      });

      let data: ChatApiResponse | null = null;
      try {
        data = (await response.json()) as ChatApiResponse;
      } catch {
        data = null;
      }

      // El servidor (detector + modelo) marcó urgencia y aquí no se había mostrado la tarjeta.
      if (data?.urgency === true && !urgencyShown) {
        const urgencyId = makeId();
        const reason = typeof data.urgencyReason === "string" ? data.urgencyReason.trim().slice(0, 160) : "";
        setMessages(prev => [...prev, { id: urgencyId, sender: "ai", kind: "urgency", text: "", matches: [], reason }]);
        urgencyAnchorRef.current = urgencyId;
        urgencyShown = true;
      }

      const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
      if (!response.ok || !data || !reply) {
        throw new Error("PandaIA respondió " + response.status);
      }

      // Cita: solo se agenda si la persona escribió una fecha concreta (en este mensaje o en sus dos
      // anteriores). Si no, la tarjeta pregunta el día en lugar de guardar una fecha inventada.
      const appointment = data.appointment;
      let card: ChatCard | undefined;
      if (appointment && typeof appointment === "object" && typeof appointment.title === "string" && appointment.title.trim()) {
        const recentUserText = [
          ...historySource.filter(m => m.sender === "user" && !m.kind).slice(-2).map(m => m.text),
          text,
        ].join("\n");
        // La fecha de la cita debe ser una que la persona escribió (no basta con que haya dicho alguna).
        if (source !== "suggestion" && typeof appointment.rawDate === "string" && userDateMatches(recentUserText, appointment.rawDate)) {
          const ev = addEvent({ title: appointment.title, rawDate: appointment.rawDate, time: appointment.time, doctor: appointment.doctor });
          card = {
            kind: "appointment",
            eventId: ev.id,
            title: ev.title,
            when: [ev.date, hasClockTime(ev.time) ? ev.time : "hora por definir"].join(" · "),
            ...(ev.doctor ? { doctor: ev.doctor } : {}),
          };
        } else {
          card = { kind: "pending", title: repairMojibake(appointment.title).trim() };
        }
      } else if (data.card && typeof data.card.title === "string" && typeof data.card.desc === "string" && data.card.title.trim()) {
        card = { kind: "info", title: repairMojibake(data.card.title).trim(), desc: repairMojibake(data.card.desc).trim() };
      }
      setMessages(prev => [...prev, { id: makeId(), sender: "ai", text: reply, ...(card ? { card } : {}) }]);
      setAnnouncement(`PandaIA: ${spokenReply(reply)}`);
    } catch (err: unknown) {
      // Fallo esperado y manejado (sin red, 503, timeout): warn, no error.
      console.warn("PandaIA no respondió:", err);
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setMessages(prev => [...prev, {
        id: makeId(),
        sender: "ai",
        kind: "error",
        text: "PandaIA no pudo responder esta vez.",
        retryText: text,
        sourceId,
        retrySuggestion: source === "suggestion",
        hadAlarm: urgencyShown,
        offline
      }]);
      setAnnouncement(`PandaIA no pudo responder esta vez.${offline ? " Parece que no tienes conexión a internet." : ""} Si es urgente, llama a emergencias.`);
    } finally {
      clearTimeout(timeout);
      setIsTyping(false);
    }
  };

  // Renderizador de Markdown simple para formato clínico
  const renderFormattedMessage = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Encabezados Markdown: ### o ## (en Alegreya, como el resto de títulos de la app)
      const isHeader = trimmed.startsWith("### ") || trimmed.startsWith("## ");
      if (isHeader) {
        const headerText = trimmed.replace(/^#{2,3}\s+/, "");
        return (
          <h3 key={idx} className="mt-3 mb-1 font-display text-body font-bold text-ink first:mt-0">
            {headerText}
          </h3>
        );
      }

      // Listas numeradas: 1. , 2.
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        const num = numberedMatch[1];
        const itemContent = numberedMatch[2];
        const parts = itemContent.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={idx} className="my-1 flex items-start gap-2.5">
            <span className="mt-0.5 min-w-6 shrink-0 rounded-md bg-sage-wash px-1.5 text-center text-micro font-bold leading-5 text-sage-ink tabular-nums">{num}</span>
            <span className="flex-1 text-ink">
              {parts.map((p, pIdx) => p.startsWith("**") && p.endsWith("**") ? <strong key={pIdx} className="font-bold text-ink">{p.slice(2, -2)}</strong> : p)}
            </span>
          </div>
        );
      }

      const isBullet = trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
      const cleanLine = isBullet ? trimmed.replace(/^([•\-*]\s+)/, "") : line;

      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const content = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} className="font-bold text-ink">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        // Viñeta dibujada (un punto sage), no un glifo.
        return (
          <div key={idx} className="my-1 flex items-start gap-2.5">
            <span aria-hidden="true" className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-ink-subtle" />
            <span className="flex-1 text-ink">{content}</span>
          </div>
        );
      }

      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="mb-1 last:mb-0">
          {content}
        </p>
      );
    });
  };

  // Fase 6: el chat en la paleta. Burbuja de PandaIA en superficie con filete; la tuya en lavado sage
  // (el relleno terracota queda solo para la burbuja de urgencia, la más fuerte). Sin desenfoques ni
  // avatares: el lado de la burbuja ya dice quién habla (radios suaves solo en lo que se toca).

  return (
    <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden bg-ground">

      {/* Cabecera del chat: nombre en Alegreya, semana y estado de conexión */}
      <div className="z-10 flex shrink-0 items-center justify-between border-b border-line bg-ground px-4 py-2 lg:px-8">
        {/* Texto plano: sin avatar ni píldora (no se tocan). "Asistente" es la línea de datos. */}
        <div className="min-w-0">
          <h2 className="font-display text-subtitle text-ink">PandaIA</h2>
          <p className="text-meta text-ink-muted">
            Asistente · {profile.weekUnknown ? "Semana sin confirmar" : `Semana ${profile.week}`}
            {!online && <span className="font-bold text-amber-ink"> · Sin conexión</span>}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={clearChat}
            disabled={messages.length <= 1}
            className={`${ICON_BUTTON} disabled:cursor-default disabled:text-ink-disabled disabled:hover:bg-transparent`}
            title="Reiniciar conversación (el chat se guarda solo en este teléfono)"
            aria-label="Reiniciar conversación"
          >
            <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* CHAT AREA CON AUTO-SCROLL */}
      {/* El contenedor no es región viva: anunciaría también cada botón de llamada. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      <section
        aria-label="Conversación con PandaIA"
        className="no-scrollbar flex flex-1 flex-col space-y-4 overflow-y-auto p-4 lg:px-8"
      >
        {messages.map((msg, index) => {
          if (msg.kind === "urgency") {
            return (
              <ChatUrgencyBubble
                key={msg.id}
                id={`pandaia-msg-${msg.id}`}
                matches={msg.matches ?? []}
                reason={msg.reason}
                live={!msg.restored}
                role={profile.role}
              />
            );
          }

          if (msg.kind === "notice") {
            return <ChatSafetyNote key={msg.id} id={`pandaia-msg-${msg.id}`} role={profile.role} />;
          }

          if (msg.kind === "error") {
            const canRetry = index === messages.length - 1 && !!msg.retryText && msg.sourceId !== undefined;
            return (
              <div
                key={msg.id}
                id={`pandaia-msg-${msg.id}`}
                className="flex max-w-[88%] items-end gap-2"
              >
                <div className="rounded-3xl rounded-bl-md border border-line bg-surface p-4 text-body text-ink">
                  <p className="flex items-start gap-2 font-bold">
                    <AlertCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
                    <span>{msg.text}</span>
                  </p>
                  {msg.offline && (
                    <p className="mt-1 text-ink-muted">Parece que no tienes conexión a internet.</p>
                  )}
                  {msg.hadAlarm ? (
                    <p className="mt-1 font-bold text-ink">Usa los botones de llamada de arriba si es urgente.</p>
                  ) : index !== messages.length - 1 ? (
                    // Fallos anteriores: el botón se queda solo en el último, para no repetirlo.
                    <p className="mt-1 text-ink-muted">Si es urgente, llama a emergencias.</p>
                  ) : (
                    <div className="mt-3">
                      <p className="font-bold text-ink">Si es urgente, no esperes:</p>
                      <EmergencyCallLink className="mt-2" withNote compact />
                      {onOpenSymptoms && (
                        <button type="button" onClick={onOpenSymptoms} className={`mt-1 ${TEXT_ACTION}`}>
                          Ver señales de alarma
                          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                  {canRetry && (
                    <RowButton
                      tone="danger"
                      onClick={() => handleSend(msg.retryText as string, { errorId: msg.id, sourceId: msg.sourceId as number }, msg.retrySuggestion ? "suggestion" : undefined)}
                      disabled={isTyping}
                      className="mt-2"
                    >
                      <RotateCw size={16} strokeWidth={1.75} aria-hidden="true" />
                      Reintentar
                    </RowButton>
                  )}
                </div>
              </div>
            );
          }

          return (
          <div
            key={msg.id}
            id={`pandaia-msg-${msg.id}`}
            className={`flex max-w-[88%] items-end gap-2 ${
              msg.sender === 'user' ? 'self-end flex-row-reverse' : ''
            }`}
          >

            <div className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative rounded-3xl px-4 py-3 text-body ${
                msg.sender === 'user'
                  ? 'rounded-br-md bg-sage-wash text-ink'
                  : 'rounded-bl-md border border-line bg-surface text-ink'
              }`}>
                {msg.sender === 'ai' ? renderFormattedMessage(msg.text) : <p>{msg.text}</p>}

                {/* Copiar una respuesta de PandaIA (el saludo no: no hay nada que copiar) */}
                {msg.sender === 'ai' && msg.id !== 1 && (
                  <div className="mt-2 flex justify-end border-t border-line pt-2">
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.id, msg.text)}
                      className={`-my-2 flex min-h-11 items-center gap-1 rounded-full px-2 text-meta font-bold text-ink-muted transition-colors hover:text-ink ${FOCUS_RING}`}
                      title="Copiar respuesta"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={14} strokeWidth={2} className="text-sage-ink" aria-hidden="true" />
                          <span className="text-sage-ink">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Tarjeta bajo la respuesta: cita agregada, fecha pendiente o dato informativo */}
              {msg.card && (() => {
                const card = msg.card;
                if (card.kind === "appointment") {
                  const inAgenda = events.some(e => String(e.id) === String(card.eventId));
                  return (
                    <div className="w-full max-w-sm rounded-2xl bg-sage-wash p-4">
                      <h3 className="flex items-start gap-2 text-body font-bold text-ink">
                        {inAgenda
                          ? <CalendarCheck size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sage-ink" aria-hidden="true" />
                          : <CalendarX size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />}
                        <span>{card.title}</span>
                      </h3>
                      <p className="mt-1 text-meta text-ink-muted">
                        {card.when}{card.doctor ? ` · ${card.doctor}` : ""}
                      </p>
                      <p className={`mt-1 text-meta font-bold ${inAgenda ? "text-sage-ink" : "text-ink-muted"}`}>
                        {inAgenda ? "Está en tu Agenda" : "Ya no está en tu Agenda"}
                      </p>
                      {inAgenda && setActiveTab && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("agenda")}
                          className={`mt-3 ${WIDE_BUTTON} min-h-11 text-meta ${SAGE_FILL}`}
                        >
                          <Calendar size={16} strokeWidth={1.75} aria-hidden="true" />
                          <span>Ver en la Agenda</span>
                          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                }
                if (card.kind === "pending") {
                  return (
                    <div className="w-full max-w-sm rounded-2xl bg-amber-wash p-4">
                      <h3 className="flex items-start gap-2 text-body font-bold text-ink">
                        <CalendarClock size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-amber-ink" aria-hidden="true" />
                        <span>¿Qué día es{card.title ? ` «${card.title}»` : " la cita"}?</span>
                      </h3>
                      <p className="mt-1 text-meta text-ink-muted">
                        Aún no está en tu Agenda. Dime la fecha (por ejemplo, «el 20 de octubre a las 10:00») y la agrego.
                      </p>
                      <button
                        type="button"
                        onClick={() => prefillInput(`Agenda ${card.title || "la cita"} el día `)}
                        className={`mt-3 ${WIDE_BUTTON} min-h-11 text-meta ${OUTLINE_FILL}`}
                      >
                        Escribir la fecha
                      </button>
                    </div>
                  );
                }
                const info = card as { title?: string; desc?: string };
                if (!info.title) return null;
                return (
                  <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4">
                    <h3 className="flex items-start gap-2 text-body font-bold text-ink">
                      <Lightbulb size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sage-ink" aria-hidden="true" />
                      <span>{info.title}</span>
                    </h3>
                    {info.desc && (
                      <p className="mt-1 text-meta text-ink-muted">{info.desc}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          );
        })}

        {isTyping && (
          <div className="flex max-w-[85%] items-end gap-2">
            <div className="flex items-center gap-2 rounded-3xl rounded-bl-md border border-line bg-surface px-4 py-3">
              <div className="flex items-center gap-1" aria-hidden="true">
                <div className="size-2 rounded-full bg-ink-subtle animate-pulse motion-reduce:animate-none"></div>
                <div className="size-2 rounded-full bg-ink-subtle animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0.15s" }}></div>
                <div className="size-2 rounded-full bg-ink-subtle animate-pulse motion-reduce:animate-none" style={{ animationDelay: "0.3s" }}></div>
              </div>
              <span className="text-meta font-medium text-ink-muted">PandaIA está respondiendo…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* Entrada: sugerencias por trimestre y campo de pregunta */}
      <div className="shrink-0 border-t border-line bg-ground">
        {/* Smart Chips Dinámicos por Trimestre */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-line p-2.5 lg:px-8">
          {smartChips.map((chip, idx) => {
            const schedule = isScheduleChip(chip);
            return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (schedule) {
                  setSmartChips(prev => prev.filter(c => c !== chip));
                  prefillInput(`${chip} el día `);
                } else {
                  handleSend(chip, undefined, "suggestion");
                }
              }}
              title={schedule ? "Escribe el día de la cita para agendarla" : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-line-control px-3.5 text-meta font-bold text-ink transition-colors hover:bg-surface-hover ${FOCUS_RING}`}
            >
              {schedule && <CalendarClock size={16} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-hidden="true" />}
              {chip}
            </button>
            );
          })}
        </div>

        {/* Text Input Ergonómico */}
        <div className="p-2.5 lg:px-8">
          {/* El contenedor es el campo visible: borde ≥3:1 y anillo de tinta al escribir (el textarea no lleva el suyo). */}
          <div className="flex items-end gap-2 rounded-3xl border border-line-control bg-surface-raised p-1.5 focus-within:border-transparent focus-within:ring-2 focus-within:ring-terracotta-ink">
            <button
              type="button"
              aria-label="Preguntas sobre términos de la ecografía"
              onClick={() => setIsUltrasoundModalOpen(true)}
              className={`${ICON_BUTTON} hover:text-sage-ink`}
              title="Preguntas sobre términos de la ecografía"
            >
              <Paperclip size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <textarea
              ref={textareaRef}
              aria-label="Escribe tu pregunta para PandaIA"
              aria-describedby="pandaia-limits"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(inputText);
                }
              }}
              placeholder="Escribe tu pregunta…"
              className="no-scrollbar max-h-32 min-h-11 flex-1 resize-none overflow-y-auto border-none bg-transparent py-2.5 text-body text-ink focus:outline-none"
            />
            <button
              type="button"
              aria-label="Enviar mensaje a PandaIA"
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isTyping}
              className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors ${FOCUS_RING} ${
                inputText.trim() && !isTyping
                  ? TERRA_FILL
                  : "cursor-not-allowed bg-surface-sunken text-ink-disabled"
              }`}
            >
              <Send size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <p id="pandaia-limits" className="mt-1.5 px-1.5 text-micro font-medium text-ink-subtle">
            {profile.role === "papa"
              ? "PandaIA orienta; no diagnostica ni reemplaza al obstetra."
              : "PandaIA orienta; no diagnostica ni reemplaza a tu obstetra."}
          </p>
        </div>
      </div>

      {/* MODAL / SHEET DECODIFICADOR DE ECOGRAFíAS */}
      {isUltrasoundModalOpen && (
        <ModalPortal>
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsUltrasoundModalOpen(false); }}
          className={`fixed inset-0 ${SCRIM} ${Z_CLASS.dialog} flex items-end justify-center p-0 sm:items-center sm:p-4`}
        >
          <div
            {...ultrasoundDialogProps}
            className="w-full max-w-md overflow-hidden rounded-t-3xl border border-line bg-surface-raised text-ink shadow-sheet outline-none sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line py-3 ps-5 pe-2">
              <div className="min-w-0 pt-1">
                <h2 id="ultrasound-modal-title" className="font-display text-title text-ink">
                  Decodificador de ecografías
                </h2>
                <p className="mt-0.5 text-meta text-ink-muted">
                  Qué significa cada término del informe
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUltrasoundModalOpen(false)}
                className={ICON_BUTTON}
                aria-label="Cerrar ventana de ecografías"
              >
                <X size={22} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[70dvh] overflow-y-auto px-5 pt-3 pb-4 [--gutter:1.25rem]">
              <p id="ultrasound-modal-desc" className="mb-2 text-meta text-ink-muted">
                {profile.role === "papa"
                  ? "Elige una pregunta y PandaIA te explica el término. Lo que significan los resultados lo explica el obstetra de tu pareja."
                  : "Elige una pregunta y PandaIA te explica el término. Lo que significan tus resultados te lo explica tu obstetra."}
              </p>

              <ListGroup>
                {getUltrasoundItems(chatWeek).map((item, idx) => (
                  <ListRow
                    key={idx}
                    leading={<FileText size={20} strokeWidth={1.75} />}
                    title={item.title}
                    meta={item.desc}
                    onClick={() => handleUltrasoundSelect(item.prompt)}
                    trailing="chevron"
                  />
                ))}
              </ListGroup>
            </div>

            <div className="flex justify-end border-t border-line p-3">
              <button
                type="button"
                onClick={() => setIsUltrasoundModalOpen(false)}
                className={`min-h-11 rounded-full px-4 text-meta font-bold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink ${FOCUS_RING}`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

    </div>
  );
}

// --- VISTA 4: HERRAMIENTAS ---