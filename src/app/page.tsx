"use client";

import { AgendaView, AppointmentPrepModal, parseEventDate } from "@/components/AgendaModule";
import { HerramientasView } from "@/components/HerramientasModule";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  PAIRING_MESSAGES,
  type ChecklistMeta,
  type InvitePreview,
  type Member,
  type MomStatus,
} from "@/lib/firebase/pairing";
import { SyncBadge, useOnline, usePartner, type PartnerInfo } from "@/components/SyncBadge";
import { AuthorChip } from "@/components/AuthorChip";
import { formatDateShort, formatRelative, repairMojibake } from "@/lib/format";
import { isLegacySeedEvent, linkedFromLocalKey, localToSharedFlag } from "@/lib/seeds";
import Image from "next/image";
import { Compass, Calendar, Bot, Send, CheckCircle2, ChevronRight, ChevronLeft, HeartPulse, Baby, Info, ChevronDown, ChevronUp, Sparkles, Activity, Heart, X, Users, AlertTriangle, AlertCircle, FileText, Settings, Paperclip, Share2, Bell, RotateCcw, RotateCw, Stethoscope, PhoneCall, Check, Copy, Edit3, Sun, Moon, SunMoon, RefreshCw, UserMinus, Lightbulb, CalendarCheck, CalendarClock, CalendarX, Smartphone, MessageCircle } from "lucide-react";
import { CallActions, EmergencyCallLink } from "@/components/CallActions";
import { CareTeamSheet } from "@/components/CareTeamForm";
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
  FetalCard,
  LaborReadyBlock,
  TodayBlock,
  TrimesterChecklists,
  WeekHeader,
  taskWindowNote,
  type GuiaTool,
  type OwnerLabels,
  type SinceLastVisit,
  type TaskRowModel,
  type TodayGroup,
  type TrimesterModel,
} from "@/components/GuiaBlocks";

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
        className={`fixed inset-0 ${Z_CLASS.careTeam} flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150`}
        onClick={(e) => { if (e.target === e.currentTarget) cancel(); }}
      >
        <div
          {...dialogProps}
          className="w-full max-w-sm rounded-3xl border border-terracotta-ink/30 bg-white dark:bg-[#221d2d] p-5 shadow-xl outline-none animate-in zoom-in-95 duration-200"
        >
          <h2 id={titleId} className="text-base font-bold leading-snug text-stone-900 dark:text-[#eae6e1] text-balance">{title}</h2>
          <div id={descId} className="mt-1.5 space-y-1.5 text-sm leading-snug text-stone-700 dark:text-[#d9d4de]">{children}</div>
          {error && <p role="alert" className="mt-2 text-sm font-semibold leading-snug text-terracotta-ink">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={cancel}
              disabled={busy}
              className="flex-1 min-h-[44px] rounded-xl border border-stone-300 dark:border-white/15 bg-white dark:bg-[#2d273a] text-sm font-bold text-stone-800 dark:text-[#eae6e1] hover:bg-stone-50 dark:hover:bg-[#352e44] transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 min-h-[44px] rounded-xl bg-terracotta-ink hover:bg-terracotta-ink-hover text-white text-sm font-bold transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
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

  return (
    <div className="bg-stone-900 dark:bg-[#2d273a] text-white p-4 rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-stone-300 font-bold mb-0.5">Código para tu pareja</p>
          <p className="font-mono font-bold tracking-wide text-base whitespace-nowrap">{code || "Sin código"}</p>
        </div>
        {code && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 min-w-[44px] min-h-[44px] px-3 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={copied ? "Código copiado" : "Copiar código"}
          >
            {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-stone-300 mt-2 leading-snug" aria-live="polite">
        {copyFailed ? "No pudimos copiarlo: mantén presionado el código para copiarlo a mano." : status}
      </p>
      <button
        type="button"
        onClick={regenerate}
        disabled={busy}
        className={`mt-3 w-full min-h-[44px] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${needsNew ? "bg-terracotta-ink hover:bg-terracotta-ink-hover text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
      >
        <RefreshCw size={16} className={busy ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
        {busy ? "Generando…" : "Generar código nuevo"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-[#f6c3b4] leading-snug">{error}</p>}
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
      <div className="bg-stone-50 dark:bg-[#1a1724] border border-stone-200 dark:border-white/[0.06] rounded-2xl p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-[#eae6e1]">
          <Smartphone size={16} className="shrink-0 text-stone-600 dark:text-[#a6a1b2]" aria-hidden="true" />
          {guest ? "Estás explorando como invitado" : "Solo en este teléfono"}
        </p>
        <p className="mt-1 text-xs leading-snug text-stone-600 dark:text-[#a6a1b2]">
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
            className="mt-3 w-full min-h-[44px] rounded-xl border border-sage-ink/40 bg-white dark:bg-[#2d273a] text-sage-ink text-sm font-bold transition-colors hover:bg-sage/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
          >
            Volver a mi embarazo compartido
          </button>
        )}
        <button
          type="button"
          onClick={onStartLink}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-sage-ink hover:bg-sage-ink-hover text-white text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
        >
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
    <div className="space-y-3">
      <ul className="rounded-2xl border border-stone-200 dark:border-white/[0.06] bg-stone-50 dark:bg-[#1a1724] divide-y divide-stone-200 dark:divide-white/[0.06]">
        {!partner.loaded && (
          <li className="p-3 text-xs text-stone-600 dark:text-[#a6a1b2]" aria-live="polite">Cargando quién tiene acceso…</li>
        )}
        {partner.loaded && partner.members.length === 0 && (
          <li className="p-3 text-xs leading-snug text-stone-600 dark:text-[#a6a1b2]">
            Aún no vemos la lista de personas vinculadas. Aparecerá cuando este teléfono termine de conectarse.
          </li>
        )}
        {partner.members.map((m) => {
          const isMe = m.uid === myUid;
          const who = m.name || PERSON_LABEL[m.role];
          return (
            <li key={m.uid} className="flex items-center gap-3 p-3">
              <AuthorChip name={m.name} role={m.role} title={who} decorative />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-800 dark:text-[#eae6e1] truncate">
                  {who}
                  {isMe && <span className="font-normal text-stone-600 dark:text-[#a6a1b2]"> (tú)</span>}
                </p>
                <p className="text-xs text-stone-600 dark:text-[#a6a1b2]">
                  {ROLE_LABEL[m.role]}
                  {m.joinedAt ? ` · desde el ${formatDateShort(m.joinedAt)}` : ""}
                </p>
              </div>
              {iAmMama && !isMe && (
                <button
                  type="button"
                  onClick={() => { setRemoveError(""); setConfirming(m); }}
                  aria-haspopup="dialog"
                  className="shrink-0 min-h-[44px] px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold text-terracotta-ink hover:bg-terracotta/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                >
                  <UserMinus size={16} aria-hidden="true" />
                  Quitar acceso
                </button>
              )}
            </li>
          );
        })}
        {partner.loaded && partner.members.length > 0 && others.length === 0 && (
          <li className="p-3 text-xs leading-snug text-stone-600 dark:text-[#a6a1b2]">
            {iAmMama ? "Tu pareja aún no se une. Compártele tu código." : "Tu pareja aparecerá aquí cuando se conecte."}
          </li>
        )}
      </ul>

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
const SETTINGS_INPUT =
  "w-full px-4 py-3 rounded-xl border border-stone-500 dark:border-white/40 bg-stone-50 dark:bg-[#1a1724] text-stone-900 dark:text-[#eae6e1] text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-terracotta-ink";

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
  return (
    <div className="p-4 bg-stone-50 dark:bg-[#1a1724] rounded-2xl border border-stone-200/80 dark:border-white/[0.04]">
      <div className="flex items-center gap-3">
        <div className="bg-stone-200 dark:bg-[#2d273a] p-2 rounded-xl text-stone-600 dark:text-[#a6a1b2]" aria-hidden="true">
          {resolved === "dark" ? <Moon size={18} /> : <Sun size={18} />}
        </div>
        <div className="min-w-0 text-left">
          <p id="theme-choice-label" className="text-sm font-bold text-stone-800 dark:text-[#eae6e1]">Apariencia</p>
          <p id="theme-choice-hint" className="text-xs text-stone-600 dark:text-[#a6a1b2]">{hint}</p>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="theme-choice-label"
        aria-describedby="theme-choice-hint"
        onKeyDown={onKeyDown}
        className="mt-3 flex flex-wrap gap-1 rounded-xl bg-stone-200/80 dark:bg-[#2d273a] p-1"
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
              className={`flex-1 min-h-[44px] rounded-lg px-1.5 flex items-center justify-center gap-1 whitespace-nowrap text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink ${
                checked
                  ? "bg-terracotta-ink text-white dark:bg-[var(--terracotta-ink)] dark:text-stone-900 shadow-sm"
                  : "text-stone-700 dark:text-[#d9d4de] hover:bg-white/70 dark:hover:bg-white/[0.06]"
              }`}
            >
              <o.Icon size={16} className="shrink-0 max-[380px]:hidden" aria-hidden="true" />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileModal({
  profile,
  onSave,
  onClose,
  focusDating = false,
  partner,
  showToast,
  onStartLink,
  dueDateNeedsReview = false,
  afterUnlinkFocusRef,
}: {
  profile: UserProfile;
  /** `dating` solo llega si la persona editó la fecha (si no, la fecha compartida no se toca). */
  onSave: (p: UserProfile, dating?: DatingChoice) => void;
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
  const { dialogProps } = useModalDialog({ open: true, onClose, labelledBy: "profile-modal-title" });
  const themePreference = usePandaStore(state => state.themePreference);
  const resolvedTheme = usePandaStore(state => state.resolvedTheme);
  const setThemePreference = usePandaStore(state => state.setThemePreference);
  const [form, setForm] = useState(profile);
  // Fecha: el editor solo se abre a propósito; cerrado, "Guardar" no envía nada de la fecha.
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
  const careTeam = usePandaStore(state => state.careTeam);
  const careTeamSummary = careTeam.obName || careTeam.obPhone || careTeam.hospitalName
    ? [careTeam.obName || (careTeam.obPhone ? "Obstetra" : ""), careTeam.hospitalName].filter(Boolean).join(" · ")
    : "Obstetra, hospital y emergencias";

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

  return (
    <ModalPortal>
    <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm ${Z_CLASS.dialog} flex items-center justify-center p-4 animate-in fade-in`}>
      <div
        {...dialogProps}
        className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200/80 dark:border-white/[0.08] flex flex-col max-h-[85dvh] outline-none"
      >

        {/* Header */}
        <div className="bg-stone-50 dark:bg-[#1a1724] p-4 flex justify-between items-center border-b border-stone-100 dark:border-white/[0.04]">
          <h2 id="profile-modal-title" className="font-bold text-stone-800 dark:text-[#eae6e1] flex items-center gap-2">
            <Settings size={18} className="text-stone-600 dark:text-[#a6a1b2]" aria-hidden="true" /> Ajustes
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-stone-600 dark:text-[#a6a1b2] hover:text-stone-900 dark:hover:text-[#eae6e1] bg-white dark:bg-[#2d273a] shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            aria-label="Cerrar ventana de ajustes"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">

          {/* Vínculo Familiar */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-500 dark:text-[#a6a1b2] uppercase tracking-wider">Familia</h3>
            <div className="bg-stone-50 dark:bg-[#1a1724] border border-stone-200 dark:border-white/[0.04] rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl shrink-0 ${form.role === 'mama' ? 'bg-terracotta/10 text-terracotta-ink' : 'bg-sage/10 text-sage-ink'}`} aria-hidden="true">
                  {form.role === 'mama' ? <Baby size={20} /> : <Users size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm">
                    {form.role === 'mama' ? 'Modo mamá' : 'Modo copiloto'}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-[#a6a1b2] truncate">{form.name}</p>
                </div>
              </div>
              {profile.pregnancyId && (
                <button
                  type="button"
                  onClick={() => setConfirmUnlink(true)}
                  aria-haspopup="dialog"
                  className="shrink-0 text-xs font-bold min-h-[44px] min-w-[44px] px-4 rounded-lg shadow-sm transition-colors text-stone-600 dark:text-[#a6a1b2] hover:text-stone-900 dark:hover:text-[#eae6e1] bg-white dark:bg-[#2d273a] border border-stone-200 dark:border-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                >
                  Desvincular
                </button>
              )}
            </div>

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

            {form.role === 'papa' && (
              <div className="bg-stone-50 dark:bg-white/[0.02] p-4 rounded-2xl flex items-center justify-between border border-stone-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sage/20 dark:bg-sage/10 flex items-center justify-center text-sage-ink" aria-hidden="true">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800 dark:text-white mb-0.5">Comparación de tamaño</p>
                    <p className="text-xs text-stone-600 dark:text-[#a6a1b2]">Con frutas o con objetos de tecnología y juegos</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.comparisonTheme === 'geek'}
                  aria-label="Comparar con objetos de tecnología y juegos en lugar de frutas"
                  onClick={() => setForm({...form, comparisonTheme: form.comparisonTheme === 'geek' ? 'frutas' : 'geek'})}
                  className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
                >
                  <span aria-hidden="true" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.comparisonTheme === 'geek' ? 'bg-sage-ink' : 'bg-stone-500 dark:bg-[#756e86]'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.comparisonTheme === 'geek' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </button>
              </div>
            )}

            {form.role === 'mama' && profile.pregnancyId && (
              <InviteCodePanel
                pregnancyId={profile.pregnancyId}
                code={form.inviteCode}
                myUid={partner.myUid}
                onCodeChange={(inviteCode) => {
                  // También en el formulario: "Guardar Cambios" no debe volver al código anterior.
                  usePandaStore.getState().setProfile({ inviteCode });
                  setForm(f => ({ ...f, inviteCode }));
                  showToast("Código nuevo listo. El anterior ya no sirve.");
                }}
              />
            )}
          </div>

          {/* Personas con acceso a los datos compartidos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-500 dark:text-[#a6a1b2] uppercase tracking-wider">Personas con acceso</h3>
            <AccessSection profile={profile} partner={partner} showToast={showToast} onStartLink={onStartLink} />
          </div>

          {/* Preferencias Médicas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-500 dark:text-[#a6a1b2] uppercase tracking-wider">Embarazo</h3>

            {/* Equipo de salud: a quién llamar y a dónde ir (compartido con la pareja) */}
            <button
              type="button"
              onClick={() => setCareTeamOpen(true)}
              aria-haspopup="dialog"
              className="w-full min-h-[56px] flex items-center gap-3 p-3.5 text-left bg-stone-50 dark:bg-[#1a1724] rounded-2xl border border-stone-200/80 dark:border-white/[0.06] hover:bg-stone-100 dark:hover:bg-[#2d273a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            >
              <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-sage/15 text-sage-ink">
                <Stethoscope size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-stone-800 dark:text-[#eae6e1]">Equipo de salud</span>
                <span className="block truncate text-xs text-stone-600 dark:text-[#a6a1b2]">{careTeamSummary}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-stone-500 dark:text-[#a6a1b2]" aria-hidden="true" />
            </button>

            <div ref={datingRef} className="scroll-mt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-800 dark:text-[#eae6e1]">{currentGa.label}</p>
                  <p className="mt-0.5 text-xs leading-snug text-stone-600 dark:text-[#a6a1b2]">{datingSourceText}</p>
                  <p className="mt-0.5 text-xs text-stone-600 dark:text-[#a6a1b2]">
                    {profile.pregnancyId ? `Se comparte con ${partner.partnerName || "tu pareja"}` : "Solo en este teléfono"}
                  </p>
                </div>
                {!datingOpen && (
                  <button
                    type="button"
                    onClick={() => { setDatingDraft(draftFromProfile(profile)); setDatingOpen(true); }}
                    className="shrink-0 min-h-[44px] rounded-xl border border-stone-300 dark:border-white/15 bg-white dark:bg-[#2d273a] px-3 text-xs font-bold text-stone-800 dark:text-[#eae6e1] hover:bg-stone-100 dark:hover:bg-[#352e44] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                  >
                    {currentGa.source === "unknown" ? "Confirmar fecha" : "Cambiar fecha"}
                  </button>
                )}
              </div>
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
                  <button
                    type="button"
                    onClick={() => { setDatingOpen(false); setDatingDraft(draftFromProfile(profile)); }}
                    className="mt-2 -ml-1 min-h-[44px] rounded-lg px-1 text-sm font-bold text-stone-700 dark:text-[#d9d4de] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                  >
                    Dejar la fecha como estaba
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="settings-location" className="text-sm font-bold text-stone-700 dark:text-[#eae6e1] block mb-1">Ciudad o país</label>
              <input
                id="settings-location"
                type="text"
                value={form.location || ""}
                onChange={(e) => setForm({...form, location: e.target.value})}
                placeholder="Ej. Lima, Perú"
                className={SETTINGS_INPUT}
              />
            </div>

            <div>
              <label htmlFor="settings-notes" className="text-sm font-bold text-stone-700 dark:text-[#eae6e1] block mb-1">Notas de rutina</label>
              <textarea
                id="settings-notes"
                value={form.notes || ""}
                onChange={(e) => setForm({...form, notes: e.target.value})}
                placeholder="Ej. Trabajo por turnos, parto programado…"
                rows={2}
                aria-describedby="settings-local-hint"
                className={`${SETTINGS_INPUT} resize-none`}
              />
              <p id="settings-local-hint" className="mt-1 text-xs leading-snug text-stone-600 dark:text-[#a6a1b2]">
                La ciudad y las notas se guardan solo en este teléfono. Por ahora la app no las usa.
              </p>
            </div>
          </div>

          {/* Tema: sistema (sigue al teléfono), claro u oscuro */}
          <ThemeChoice
            preference={themePreference}
            resolved={resolvedTheme}
            onChange={(p) => {
              if (p === themePreference) return;
              setThemePreference(p);
              try { navigator.vibrate?.(25); } catch { /* sin vibración */ }
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 dark:border-white/[0.04] bg-white dark:bg-[#221d2d]">
          {datingBlocked && (
            <p className="mb-2 text-xs leading-snug text-stone-700 dark:text-[#d9d4de]" aria-live="polite">
              Completa la fecha o toca «Dejar la fecha como estaba» para guardar.
            </p>
          )}
          <button
            type="button"
            onClick={() => onSave(form, pendingDating)}
            disabled={datingBlocked}
            className="w-full min-h-[44px] bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 disabled:shadow-none dark:disabled:bg-white/[0.06] dark:disabled:text-[#a6a1b2]"
          >
            Guardar cambios
          </button>
        </div>
      </div>

      <CareTeamSheet open={careTeamOpen} onClose={() => setCareTeamOpen(false)} onSaved={() => showToast("Equipo de salud guardado")} />
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

const ONB_CTA =
  "w-full min-h-[48px] rounded-xl py-3.5 font-bold transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 disabled:shadow-none dark:disabled:bg-white/[0.06] dark:disabled:text-[#a6a1b2]";
const ONB_CTA_MAMA = `${ONB_CTA} bg-terracotta-ink hover:bg-terracotta-ink-hover text-white focus-visible:outline-terracotta-ink`;
const ONB_CTA_PAPA = `${ONB_CTA} bg-sage-ink hover:bg-sage-ink-hover text-white focus-visible:outline-sage-ink`;
// Anillo en tinta terracota: stone-900 desaparecía sobre el panel oscuro (1.07:1).
const ONB_CTA_NEUTRAL = `${ONB_CTA} bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white focus-visible:outline-terracotta-ink`;
const ONB_INPUT =
  "w-full min-h-[48px] px-4 py-3 rounded-xl border border-stone-500 dark:border-white/40 bg-white dark:bg-[#1a1724] text-stone-900 dark:text-[#eae6e1] text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-terracotta-ink";

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
  initial,
}: {
  onComplete: (profile: UserProfile) => void;
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
  const spinner = <span aria-hidden="true" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin motion-reduce:animate-none" />;
  const headingClass = "text-2xl font-black text-stone-900 dark:text-[#eae6e1] text-balance outline-none";
  const subClass = "mt-1 text-sm leading-snug text-stone-600 dark:text-[#a6a1b2]";
  const errorBox = errorMsg ? (
    <div role="alert" className="mt-4 text-sm leading-snug text-terracotta-ink bg-terracotta/10 p-3 rounded-xl border border-terracotta-ink/25">{errorMsg}</div>
  ) : null;

  return (
    <ModalPortal>
    <div className={`fixed inset-0 bg-stone-50 dark:bg-[#181520] ${Z_CLASS.dialog} flex items-center justify-center p-4 animate-in fade-in duration-300`}>
      <div
        {...dialogProps}
        className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl w-full max-w-sm overflow-y-auto max-h-full animate-in zoom-in-95 duration-500 border border-stone-200/80 dark:border-white/[0.08] p-6 outline-none"
      >
        {step !== "role" && role && (
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              aria-disabled={isLoading || undefined}
              className="-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 text-sm font-bold text-stone-700 dark:text-[#d9d4de] hover:bg-stone-100 dark:hover:bg-[#2d273a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            >
              <ChevronLeft size={18} aria-hidden="true" />
              Atrás
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-600 dark:text-[#a6a1b2]">Paso {stepIndex + 1} de {steps.length}</span>
              <span aria-hidden="true" className="flex gap-1">
                {steps.map((s, i) => (
                  <span key={s} className={`h-1.5 w-5 rounded-full ${i <= stepIndex ? accent : "bg-stone-200 dark:bg-white/10"}`} />
                ))}
              </span>
            </div>
          </div>
        )}

        {step === "role" && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto mb-5 border border-stone-200 dark:border-white/[0.08] shadow-sm">
              <Image src="/panda-icon.jpg" alt="" width={96} height={96} className="w-full h-full object-cover" priority />
            </div>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>Te damos la bienvenida a PandaJR</h2>
            <p className={subClass}>Cuéntanos quién eres para acompañarte mejor.</p>

            <div className="space-y-3 mt-6">
              <button
                type="button"
                aria-pressed={role === "mama"}
                onClick={() => setRole("mama")}
                className={`w-full min-h-[64px] p-4 rounded-2xl border-2 transition-colors flex flex-col items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink ${role === "mama" ? "border-terracotta bg-terracotta/5" : "border-stone-200 dark:border-white/[0.08] hover:border-stone-300 dark:hover:border-white/[0.14]"}`}
              >
                <Baby size={28} aria-hidden="true" className={role === "mama" ? "text-terracotta-ink" : "text-stone-500 dark:text-[#a6a1b2]"} />
                <span className={`font-bold ${role === "mama" ? "text-terracotta-ink" : "text-stone-700 dark:text-[#d9d4de]"}`}>Soy la futura mamá</span>
              </button>
              <button
                type="button"
                aria-pressed={role === "papa"}
                onClick={() => setRole("papa")}
                className={`w-full min-h-[64px] p-4 rounded-2xl border-2 transition-colors flex flex-col items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink ${role === "papa" ? "border-sage bg-sage/5" : "border-stone-200 dark:border-white/[0.08] hover:border-stone-300 dark:hover:border-white/[0.14]"}`}
              >
                <Users size={28} aria-hidden="true" className={role === "papa" ? "text-sage-ink" : "text-stone-500 dark:text-[#a6a1b2]"} />
                <span className={`font-bold ${role === "papa" ? "text-sage-ink" : "text-stone-700 dark:text-[#d9d4de]"}`}>Soy el copiloto (pareja)</span>
              </button>
            </div>

            <button type="button" onClick={() => role && setStep("name")} disabled={!role} className={`${ONB_CTA_NEUTRAL} mt-6`}>
              Continuar
            </button>
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="w-full mt-2 min-h-[44px] rounded-xl text-sm font-bold text-stone-600 hover:text-stone-900 dark:text-[#a6a1b2] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
              >
                Ahora no
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSkip?.(role)}
                className="w-full mt-2 min-h-[44px] rounded-xl text-sm font-bold text-stone-600 underline-offset-4 hover:underline hover:text-stone-900 dark:text-[#a6a1b2] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
              >
                Explorar como invitado
              </button>
            )}
          </div>
        )}

        {step === "name" && role && (
          <div>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>¿Cómo te llamas?</h2>
            <p className={subClass}>Así te verá tu pareja en PandaJR.</p>
            {errorBox}
            <div className="mt-5">
              <label htmlFor={role === "mama" ? "onb-mama-name" : "onb-papa-name"} className="text-xs font-bold text-stone-700 dark:text-[#d9d4de] mb-1 block">Tu nombre</label>
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
            <div className="bg-sage/10 dark:bg-sage/20 w-14 h-14 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="text-sage-ink" size={28} aria-hidden="true" />
            </div>
            <h2 id="onb-title" ref={headingRef} tabIndex={-1} className={headingClass}>Tu espacio está listo</h2>
            <p className={subClass}>Comparte este código con tu pareja para que se vincule a tu embarazo. Vale por 14 días y sirve para una sola persona.</p>

            <div className="mt-5 bg-stone-50 dark:bg-[#1a1724] p-4 rounded-2xl border border-stone-200 dark:border-white/[0.1] text-center">
              <p className="font-mono text-xl font-black tracking-wider text-terracotta-ink break-all">{generatedCode}</p>
              <button
                type="button"
                onClick={copyGenerated}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-stone-700 dark:text-[#d9d4de] hover:bg-stone-100 dark:hover:bg-[#2d273a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
              >
                {codeCopied ? <Check size={16} className="text-sage-ink" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                <span aria-live="polite">{codeCopied ? "Copiado" : "Copiar código"}</span>
              </button>
            </div>
            {errorMsg && <p role="alert" className="mt-2 text-xs text-terracotta-ink">{errorMsg}</p>}

            <button
              type="button"
              onClick={() => {
                window.open(`https://wa.me/?text=${encodeURIComponent(inviteShareText(generatedCode))}`, "_blank", "noopener,noreferrer");
              }}
              className={`${ONB_CTA_PAPA} mt-5 shadow-sm`}
            >
              <Share2 size={20} aria-hidden="true" />
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
              <label htmlFor="onb-papa-code" className="text-xs font-bold text-stone-700 dark:text-[#d9d4de] mb-1 block">Código de invitación</label>
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
                className={`${ONB_INPUT} text-center font-mono font-bold tracking-widest text-lg uppercase`}
              />
              <p id="onb-code-hint" className="mt-1.5 text-xs text-stone-600 dark:text-[#a6a1b2] text-center">
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
            <dl className="mt-4 text-sm border-y border-stone-200 dark:border-white/[0.08] divide-y divide-stone-200 dark:divide-white/[0.06]">
              {!preview.legacy && preview.babyName && (
                <div className="flex justify-between gap-3 px-1 py-2.5">
                  <dt className="text-stone-600 dark:text-[#a6a1b2]">Bebé</dt>
                  <dd className="font-bold text-stone-800 dark:text-[#eae6e1] text-right">{preview.babyName}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 px-1 py-2.5">
                <dt className="text-stone-600 dark:text-[#a6a1b2]">Semana</dt>
                <dd className="font-bold text-stone-800 dark:text-[#eae6e1] text-right">
                  {previewWeekLabel(preview)}
                </dd>
              </div>
              {preview.dueDate && (
                <div className="flex justify-between gap-3 px-1 py-2.5">
                  <dt className="text-stone-600 dark:text-[#a6a1b2]">Fecha probable</dt>
                  <dd className="font-bold text-stone-800 dark:text-[#eae6e1] text-right">{formatDateLong(parseISODate(preview.dueDate) ?? new Date())}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 px-1 py-2.5">
                <dt className="text-stone-600 dark:text-[#a6a1b2]">Código</dt>
                <dd className="font-mono font-bold text-stone-800 dark:text-[#eae6e1] text-right">{normalizedCode?.code}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-stone-600 dark:text-[#a6a1b2]">Verán y editarán juntos la agenda, las tareas y el estado de ánimo. La semana se toma de su embarazo.</p>
            <div className="mt-5 space-y-3">
              <button type="button" onClick={() => { void confirmJoin(); }} aria-disabled={isLoading || undefined} className={ONB_CTA_PAPA}>
                {isLoading && spinner}
                {isLoading ? "Uniéndote…" : "Sí, unirme"}
              </button>
              <button
                type="button"
                onClick={() => { if (isLoading) return; setPreview(null); setCode(""); setErrorMsg(""); setStep("code"); }}
                className="w-full min-h-[44px] rounded-xl py-3 font-bold text-stone-700 dark:text-[#d9d4de] border border-stone-300 dark:border-white/15 hover:bg-stone-50 dark:hover:bg-[#2d273a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
              >
                No es este
              </button>
            </div>
          </div>
        )}
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
 * Campana del encabezado: solo aparece con una cita FUTURA (nunca cae a una pasada).
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
  const label = `${soon ? "Cita en menos de 48 horas" : "Próxima cita"}: ${next.ev.title}, ${next.ev.date}${hasClockTime(next.ev.time) ? ` a las ${next.ev.time}` : ""}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(next.ev)}
      className={`min-w-[44px] min-h-[44px] p-2.5 rounded-full border transition-colors active:scale-95 motion-reduce:active:scale-100 relative flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink ${
        soon
          ? "bg-terracotta/10 dark:bg-terracotta/15 border-terracotta-ink/30 text-terracotta-ink hover:bg-terracotta/20"
          : "bg-white dark:bg-[#221d2d] border-stone-300 dark:border-white/15 text-stone-700 dark:text-[#d9d4de] hover:bg-stone-50 dark:hover:bg-[#2d273a]"
      }`}
      title={label}
      aria-label={label}
    >
      <Bell size={16} aria-hidden="true" />
      {soon && (
        <span aria-hidden="true" className="absolute top-2 right-2 w-2 h-2 bg-terracotta-ink rounded-full ring-2 ring-white dark:ring-[#181520]"></span>
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

  /** Cambios LOCALES del perfil (ciudad, notas, tema). La fecha y la semana van por applyDating. */
  const updateProfile = (updates: Partial<UserProfile>) => {
    const rest: Partial<UserProfile> = { ...updates };
    delete rest.week;
    delete rest.weekUnknown;
    delete rest.dueDate;
    delete rest.dueDateSource;
    setProfile(rest);
  };

  /**
   * "Guardar cambios" de Ajustes. La fecha solo se escribe si se editó (`dating`): guardar la
   * ciudad o las notas nunca toca la FPP compartida. Dice el alcance real y ofrece deshacer.
   */
  const saveSettings = (next: UserProfile, dating?: DatingChoice) => {
    const prev = usePandaStore.getState().profile;
    const datingChanged = !!dating && !sameDating(dating, prev);
    const localChanged =
      (next.location || "") !== (prev.location || "") ||
      (next.notes || "") !== (prev.notes || "") ||
      (next.comparisonTheme || "frutas") !== (prev.comparisonTheme || "frutas");
    closeSettings();
    if (!datingChanged && !localChanged) return;

    if (localChanged) updateProfile({ location: next.location, notes: next.notes, comparisonTheme: next.comparisonTheme });
    const shared = datingChanged && dating ? applyDating(dating) : false;

    const partnerLabel = partner.partnerName || "tu pareja";
    const what = dating?.kind === "manual"
      ? `Semana ${dating.week} actualizada`
      : dating?.kind === "unknown"
        ? "Semana marcada como sin confirmar"
        : "Fecha actualizada";
    let message = "Ajustes guardados en este teléfono";
    if (datingChanged) {
      message = shared
        ? isOffline()
          ? `${what}. Se compartirá con ${partnerLabel} al volver la señal (no cierres la app)`
          : `${what} para ti y ${partnerLabel}`
        : `${what} en este teléfono`;
      if (localChanged) message += ". El resto, solo en este teléfono";
    }

    // Sin fecha ni semana previas no hay a qué volver en la cuenta compartida.
    const prevChoice = choiceFromProfile(prev);
    const canUndo = !(datingChanged && shared && prevChoice.kind === "unknown");
    const undo = () => {
      if (localChanged) updateProfile({ location: prev.location, notes: prev.notes, comparisonTheme: prev.comparisonTheme });
      if (datingChanged) applyDating(prevChoice);
      showToast(
        !datingChanged
          ? "Cambios deshechos"
          : prevChoice.kind === "dueDate"
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

  return (
    // overflow-x-clip (no hidden): hidden crea un contenedor de scroll y anula el sticky del header.
    <div className={`flex flex-col ${activeTab === "pandaia" ? "h-dvh overflow-hidden" : "min-h-dvh pb-[calc(3.5rem+var(--safe-bottom))]"} w-full max-w-md mx-auto bg-[#faf9f5] dark:bg-[#181520] text-stone-900 dark:text-[#eae6e1] font-sans relative shadow-2xl overflow-x-clip transition-colors duration-200 border-x border-stone-200/60 dark:border-white/[0.08]`}>
      {/* Header con Logo, Switch Modo Oscuro, Alerta de Cita y Selector Global de Perfil */}
      <header className={`bg-white/95 dark:bg-[#181520]/95 backdrop-blur-md px-3 sm:px-4 pt-[var(--safe-top)] pb-2.5 shadow-xs border-b border-stone-200/70 dark:border-white/[0.08] sticky top-0 [@media(max-height:500px)]:static ${Z_CLASS.header} w-full flex items-center justify-between shrink-0 transition-colors`}>
        <div className="flex items-center min-w-0 shrink">
          <h1 className="sr-only">PandaJR</h1>
          <Image
            src="/logo.png"
            alt="PandaJR"
            width={136}
            height={36}
            priority
            className="h-7 min-[400px]:h-8 sm:h-9 w-auto max-w-full object-contain object-left dark:brightness-110"
          />
        </div>

        <div className="flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2 shrink-0">
          {/* Acceso a síntomas de alarma desde cualquier pestaña */}
          <button
            type="button"
            onClick={openSymptoms}
            aria-label="Síntomas: señales de alarma y a quién llamar"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full border border-stone-300 dark:border-white/15 bg-white dark:bg-[#221d2d] text-stone-800 dark:text-[#eae6e1] text-xs font-bold hover:bg-stone-50 dark:hover:bg-[#2d273a] active:scale-95 motion-reduce:active:scale-100 transition-[background-color,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
          >
            <HeartPulse size={16} className="shrink-0 text-terracotta-ink" aria-hidden="true" />
            <span>Síntomas</span>
          </button>

          <HeaderBell events={events} onOpen={(ev) => setSelectedPrepEvent(ev)} />

          {/* Botón Global de Perfil / Switcher */}
          {/* Solo icono: con el acceso a Síntomas, nombre y emoji ya no caben en un teléfono de 360-430px */}
          <button
            ref={settingsButtonRef}
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            aria-haspopup="dialog"
            aria-label={`Ajustes y perfil${profile.name ? ` de ${profile.name}` : ""}`}
            className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-full border border-stone-300 dark:border-white/15 bg-white dark:bg-[#221d2d] text-stone-700 dark:text-[#d9d4de] hover:bg-stone-50 dark:hover:bg-[#2d273a] hover:text-stone-900 dark:hover:text-[#eae6e1] active:scale-95 motion-reduce:active:scale-100 transition-[background-color,color,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            title="Ajustes y perfil"
          >
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {/* Sin overflow en las pestañas con scroll de documento (el sticky de las herramientas depende de ello).
          En PandaIA, el espacio inferior es la altura real de la nav fija (84px) más el área segura. */}
      <main className={`flex-1 w-full ${activeTab === "pandaia" ? "overflow-hidden flex flex-col pb-[calc(5.25rem+var(--safe-bottom))]" : "pb-6"}`}>
        {accessLost && (
          <div role="alert" className="mx-4 mt-3 rounded-2xl border border-amber-700/30 bg-amber-50 dark:border-amber-300/25 dark:bg-amber-300/[0.08] p-3">
            <p className="flex items-start gap-2 text-sm leading-snug text-stone-800 dark:text-[#eae6e1]">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden="true" />
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
                className="mt-2 min-h-[44px] px-3 rounded-xl bg-sage-ink hover:bg-sage-ink-hover text-white text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
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
        />
      )}

      {/* Profile Modal Global */}
      {isProfileModalOpen && (
        <ProfileModal
          profile={profile}
          onSave={saveSettings}
          onClose={closeSettings}
          focusDating={settingsFocusDating}
          partner={partner}
          showToast={showToast}
          onStartLink={startLinkFlow}
          dueDateNeedsReview={dueDateNeedsReview}
          afterUnlinkFocusRef={settingsButtonRef}
        />
      )}

      {/* Modal Guía de Preparación y Recordatorio de Cita */}
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
        />
      )}

      {/* Toast global: la región viva existe siempre para que el lector de pantalla anuncie cada mensaje.
          Exenta de inert y por encima de los diálogos: "Deshacer"/"Reintentar" se anuncian y se tocan con uno abierto. */}
      <div
        ref={toastRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-inert-exempt=""
        className={`fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto ${Z_CLASS.toast} pointer-events-none`}
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto bg-stone-900/95 text-white pl-4 pr-2 py-2 min-h-[52px] rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 motion-reduce:animate-none backdrop-blur-sm border border-stone-800"
          >
            <span className="text-sm font-medium leading-snug min-w-0 py-1">{toast.message}</span>
            {toast.onAction && (
              <button
                type="button"
                onClick={() => { const action = toast.onAction; dismissToast(); action?.(); }}
                className="shrink-0 min-h-[44px] px-3 rounded-xl bg-white/10 hover:bg-white/20 text-[#b5dcc6] text-sm font-bold active:scale-95 motion-reduce:active:scale-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav aria-label="Navegación principal" className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-[#181520]/95 backdrop-blur-md border-t border-stone-200/80 dark:border-white/[0.08] grid grid-cols-4 items-center px-2 pt-2 pb-[var(--safe-bottom)] ${Z_CLASS.nav} transition-colors`}>
        <NavItem
          icon={<Compass size={24} />}
          label="Guía"
          isActive={activeTab === "planificacion"}
          onClick={() => setActiveTab("planificacion")}
        />
        <NavItem
          icon={<Calendar size={24} />}
          label="Agenda"
          isActive={activeTab === "agenda"}
          onClick={() => setActiveTab("agenda")}
        />
        <NavItem
          icon={<Activity size={24} />}
          label="Herramientas"
          isActive={activeTab === "herramientas"}
          onClick={() => setActiveTab("herramientas")}
        />
        <NavItem
          icon={<Bot size={24} />}
          label="PandaIA"
          isActive={activeTab === "pandaia"}
          onClick={() => setActiveTab("pandaia")}
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-1 w-full min-w-0 min-h-[48px] p-2 rounded-xl transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta-ink ${
        isActive ? "text-terracotta-ink dark:text-sage-ink font-semibold" : "text-stone-600 hover:text-stone-800 dark:text-[#a6a1b2] dark:hover:text-[#eae6e1]"
      }`}
    >
      {icon}
      {/* Por debajo de 300px (zoom del 200% en un teléfono) no caben cuatro etiquetas: el icono queda
          visible y la etiqueta sigue siendo el nombre accesible del botón. */}
      <span className="text-xs font-medium max-[300px]:sr-only">{label}</span>
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
  const [emoji, setEmoji] = React.useState("😊");
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
    const statusText = text.trim() || "Me siento bien";
    const chosen = emoji;
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

  const momInitial = isMama
    ? (profile.name ? profile.name.charAt(0).toUpperCase() : "M")
    : (partner.partnerName ? partner.partnerName.charAt(0).toUpperCase() : "M");

  if (isEditing) {
    return (
      <div className="bg-gradient-to-br from-terracotta/10 to-white dark:from-[#2a222f] dark:to-[#1a1724] rounded-3xl shadow-sm border border-terracotta/20 dark:border-terracotta/10 p-6 animate-in fade-in transition-colors">
        <h3 className="text-base font-black text-stone-800 dark:text-[#eae6e1]">¿Cómo te sientes hoy?</h3>
        <p className="text-xs text-stone-600 dark:text-[#a6a1b2] mt-1 mb-3">
          {linked ? `Lo verá ${partnerLabel}.` : "Se guarda solo en este teléfono."}
        </p>

        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Elige cómo te sientes">
          {MOOD_OPTIONS.map(m => (
            <button
              key={m.emoji}
              type="button"
              aria-pressed={emoji === m.emoji}
              aria-label={m.label}
              title={m.label}
              onClick={() => setEmoji(m.emoji)}
              className={`text-2xl min-w-[44px] min-h-[44px] p-2 rounded-xl transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink ${emoji === m.emoji ? 'bg-terracotta/20 ring-2 ring-inset ring-terracotta-ink scale-110 motion-reduce:scale-100' : 'hover:bg-stone-100 dark:hover:bg-white/5 opacity-60 hover:opacity-100'}`}
            >
              <span aria-hidden="true">{m.emoji}</span>
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Mensaje sobre cómo te sientes"
          placeholder={linked ? `Escribe un mensaje breve para ${partnerLabel}…` : "Escribe cómo te sientes…"}
          className="w-full bg-stone-50 dark:bg-[#1a1724] rounded-xl p-3 text-base sm:text-sm border border-stone-500 dark:border-white/40 text-stone-900 dark:text-white mb-4 resize-none h-24 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-terracotta-ink"
        />

        <div className="flex gap-2">
          <button type="button" onClick={() => setIsEditing(false)} className="flex-1 min-h-[44px] bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 font-bold py-2.5 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink">Cancelar</button>
          <button type="button" onClick={handleSave} className="flex-1 min-h-[44px] bg-terracotta-ink hover:bg-terracotta-ink-hover text-white font-bold py-2.5 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink">{linked ? "Compartir estado" : "Guardar estado"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-terracotta/10 to-white dark:from-[#2a222f] dark:to-[#1a1724] rounded-3xl shadow-sm border border-terracotta/20 dark:border-terracotta/10 p-6 animate-in fade-in transition-colors">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 dark:bg-[#2d273a] border border-stone-200 dark:border-white/[0.06] shrink-0">
            <div className="w-full h-full bg-terracotta/20 flex items-center justify-center text-terracotta-ink-hover dark:text-terracotta-ink font-bold text-lg" aria-hidden="true">
              {momInitial}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-stone-800 dark:text-[#eae6e1] tracking-tight leading-tight">
              {isMama ? "¿Cómo te sientes hoy?" : `Estado de ${partner.partnerName || "mamá"}`}
            </h3>
            <p className="text-xs text-stone-600 dark:text-[#a6a1b2] mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-w-[44px] h-11 bg-terracotta/10 dark:bg-[#2d273a] px-3 rounded-full border border-terracotta/20 dark:border-white/[0.06] shrink-0">
          {status?.emoji
            ? <span className="text-xl" role="img" aria-label={`Estado de ánimo: ${moodLabel(status.emoji) ?? status.emoji}`}>{status.emoji}</span>
            : <MessageCircle size={18} className="text-stone-500 dark:text-[#a6a1b2]" aria-hidden="true" />}
        </div>
      </div>

      <div className="bg-stone-50 dark:bg-[#1a1724] rounded-2xl p-4 mb-4 border border-stone-100 dark:border-white/[0.04] relative">
        <p className={`text-sm text-stone-700 dark:text-[#eae6e1]/90 ${status ? "italic" : ""}`}>
          {body}
        </p>
      </div>

      {isMama ? (
        <button
          type="button"
          onClick={() => {
            setText(status?.text || "");
            setEmoji(status?.emoji || "😊");
            setIsEditing(true);
          }}
          className="w-full min-h-[44px] bg-terracotta/10 hover:bg-terracotta/20 dark:bg-terracotta/20 dark:hover:bg-terracotta/30 text-terracotta-ink border border-terracotta/20 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
        >
          <Edit3 size={16} aria-hidden="true" />
          Actualizar mi estado
        </button>
      ) : linked ? (
        <button
          type="button"
          onClick={sendHug}
          disabled={hugSent}
          className="w-full min-h-[44px] bg-sage/10 hover:bg-sage/20 dark:bg-sage/20 dark:hover:bg-sage/30 text-sage-ink border border-sage/25 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:cursor-default disabled:hover:bg-sage/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
        >
          {hugSent ? <Check size={16} aria-hidden="true" /> : <Heart size={16} aria-hidden="true" />}
          {hugSent ? `Abrazo enviado a ${partner.partnerName || "tu pareja"}` : "Mandar un abrazo"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onRequestLink}
          className="w-full min-h-[44px] bg-sage/10 hover:bg-sage/20 dark:bg-sage/20 dark:hover:bg-sage/30 text-sage-ink border border-sage/25 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
        >
          <Users size={16} aria-hidden="true" />
          Vincular con mi pareja
        </button>
      )}
    </div>
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

  // --- «Hoy»: ventana activa (pendientes primero) + ventanas pasadas sin hacer, por dueño ---
  const forWeek = tasksForWeek(realWeek, taskStatus);
  const todayRows = [
    ...forWeek.now.filter(t => !t.completed),
    // Solo las de ventana clínica propia que cerraron en las últimas 4 semanas: los hábitos de un
    // trimestre pasado no "vencen" hoy y un muro de pendientes viejos no ayuda (siguen en los checklists).
    ...forWeek.overdue.filter(t => (t.weekFrom !== undefined || t.weekTo !== undefined) && (forWeek.week ?? 0) - t.window.to <= 4),
    ...forWeek.now.filter(t => t.completed),
  ].map(t => buildRow(t));
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
        when: `${nextEvent.ev.date}${hasClockTime(nextEvent.ev.time) ? ` · ${nextEvent.ev.time}` : ""}`,
        relative: !hasClockTime(nextEvent.ev.time) && nextEvent.at.toDateString() === now.toDateString() ? "hoy" : formatRelative(nextEvent.at, now),
        byName: pid && nextEvent.ev.createdBy && nextEvent.ev.createdBy !== partner.myUid ? nextEvent.ev.createdByName : undefined,
      }
    : null;

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

  return (
    <div className="p-5 space-y-9 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {laborReady && (
        <LaborReadyBlock
          weeks={ga.weeks!}
          totalDays={ga.totalDays}
          reader={reader}
          partnerName={partnerName}
          onOpenTool={onOpenTool}
          onReviewDate={onConfirmDate}
        />
      )}

      <WeekHeader ga={ga} reader={reader} onConfirmDate={onConfirmDate} needsReview={dueDateNeedsReview} />

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
      />

      <MomStatusCard
        profile={profile}
        remoteMomStatus={remoteMomStatus}
        remoteLoaded={momStatusLoaded}
        partner={partner}
        showToast={showToast}
        onRequestLink={onRequestLink}
      />

      <FetalCard
        realWeek={realWeek}
        fallbackWeek={12}
        theme={profile.comparisonTheme || "frutas"}
        reader={reader}
        partnerName={partnerName}
      />

      <section aria-labelledby="guia-check-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="guia-check-title" className="text-2xl font-black tracking-tight text-stone-900 dark:text-[#eae6e1]">
            Tareas por trimestre
          </h2>
          <span className="shrink-0 text-sm font-bold text-stone-600 dark:text-[#a6a1b2] tabular-nums">
            {checklistLoaded ? `${doneCount} de ${allRows.length}` : "—"}
          </span>
        </div>
        {/* Dónde vive este progreso: solo aquí o compartido con la pareja. */}
        <SyncBadge partnerName={partner.partnerName} lastSyncedAt={lastChecklistChange} waiting={!checklistLoaded} className="mt-1" />
        {!checklistLoaded && (
          <p className="mt-1 text-xs text-stone-600 dark:text-[#a6a1b2]" aria-live="polite">{loadingText}</p>
        )}
        <p className="mt-2 mb-3 text-sm leading-snug text-stone-600 dark:text-[#a6a1b2]">
          Toca una tarea para ver por qué importa y a quién le toca.
        </p>
        <TrimesterChecklists
          trimesters={trimesters}
          currentTrimester={realWeek !== undefined ? ga.trimester : undefined}
          ownerLabels={ownerLabels}
          disabled={!checklistLoaded}
          onToggleDone={toggleTask}
          onAssign={(row, o) => assignTask(row, o)}
        />
      </section>
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
      className="w-full shrink-0 scroll-mt-2 overflow-hidden rounded-3xl rounded-bl-none border border-terracotta-ink/40 shadow-[0_4px_16px_-6px_rgba(165,72,51,0.45)] animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
    >
      <div role={live ? "alert" : undefined} className="bg-terracotta-ink text-white px-4 py-3.5">
        <p id={titleId} className="flex items-start gap-2 text-base font-black leading-snug text-balance">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Si esto está pasando ahora, no esperes</span>
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-snug">{signLine}</p>
        <p className="mt-0.5 text-sm leading-snug">{actionLine}</p>
      </div>
      <div className="bg-[#fdfbf7] dark:bg-[#221d2d] p-3">
        <CallActions context="chat" />
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
      className="w-full shrink-0 rounded-2xl border border-stone-200 dark:border-white/10 bg-[#fdfbf7] dark:bg-[#221d2d] px-4 py-3 animate-in fade-in duration-200 motion-reduce:animate-none"
    >
      <p className="flex items-start gap-2 text-sm leading-snug text-stone-800 dark:text-[#eae6e1]">
        <Info size={16} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
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
        className="mt-1 -ml-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-bold text-terracotta-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
      >
        <PhoneCall size={16} aria-hidden="true" />
        {open ? "Ocultar a quién llamar" : "Ver a quién llamar"}
        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
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
    // Límites en una línea: orienta, no diagnostica. Ante una alarma, la llamada va antes que el chat.
    const limits = role === "papa"
      ? "Te doy información general: no diagnostico ni reemplazo al obstetra de tu pareja. Si notas una señal de alarma, no esperes mi respuesta: toca **Síntomas** o llama a emergencias."
      : "Te doy información general: no diagnostico ni reemplazo a tu obstetra. Si notas una señal de alarma, no esperes mi respuesta: toca **Síntomas** o llama a emergencias.";
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

      // Encabezados Markdown: ### o ##
      const isHeader = trimmed.startsWith("### ") || trimmed.startsWith("## ");
      if (isHeader) {
        const headerText = trimmed.replace(/^#{2,3}\s+/, "");
        return (
          <h3 key={idx} className="font-bold text-stone-900 dark:text-[#eae6e1] text-sm mt-3 mb-1.5 first:mt-0 flex items-center gap-1.5">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-terracotta-ink inline-block shrink-0"></span>
            <span>{headerText}</span>
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
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-xs font-bold text-sage-ink bg-sage/20 dark:bg-[#1a1724] px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 tabular-nums">{num}</span>
            <span className="flex-1 leading-relaxed text-stone-700 dark:text-[#eae6e1]/90">
              {parts.map((p, pIdx) => p.startsWith("**") && p.endsWith("**") ? <strong key={pIdx} className="font-bold text-stone-900 dark:text-[#eae6e1]">{p.slice(2, -2)}</strong> : p)}
            </span>
          </div>
        );
      }

      const isBullet = trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
      const cleanLine = isBullet ? trimmed.replace(/^([•\-*]\s+)/, "") : line;

      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const content = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} className="font-bold text-stone-900 dark:text-[#eae6e1]">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span aria-hidden="true" className="text-terracotta-ink dark:text-sage-ink font-bold shrink-0 mt-0.5">•</span>
            <span className="flex-1 leading-relaxed text-stone-700 dark:text-[#eae6e1]/90">{content}</span>
          </div>
        );
      }

      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="leading-relaxed mb-1 last:mb-0">
          {content}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full animate-in fade-in duration-300 bg-[#faf9f5] dark:bg-[#181520] relative overflow-hidden">
      
      {/* HEADER CON ESTADO Y ACCIONES */}
      <div className="px-4 py-2.5 border-b border-stone-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#181520]/95 backdrop-blur-sm shadow-xs flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-sage/20 dark:bg-[#1a1724] text-sage-ink p-2 rounded-2xl shadow-xs">
            <Bot size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-stone-900 dark:text-[#eae6e1] leading-tight text-sm">PandaIA</h2>
              <span className="text-xs font-bold text-sage-ink bg-sage/10 dark:bg-[#1a1724] border border-sage-ink/25 px-2 py-0.5 rounded-full tracking-tight">
                Asistente
              </span>
            </div>
            <p className="text-xs font-semibold text-sage-ink">
              {profile.weekUnknown ? "Semana sin confirmar" : `Semana ${profile.week}`}
              {!online && <span className="text-amber-800 dark:text-amber-300"> · Sin conexión</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={clearChat}
            disabled={messages.length <= 1}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-600 dark:text-[#a6a1b2] hover:text-stone-800 dark:hover:text-[#eae6e1] hover:bg-stone-100 dark:hover:bg-[#2d273a] rounded-xl transition-all active:scale-95 motion-reduce:active:scale-100 disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            title="Reiniciar conversación (el chat se guarda solo en este teléfono)"
            aria-label="Reiniciar conversación"
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* CHAT AREA CON AUTO-SCROLL */}
      {/* El contenedor no es región viva: anunciaría también cada botón de llamada. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      <section
        aria-label="Conversación con PandaIA"
        className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col no-scrollbar"
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
                className="flex items-end gap-2 max-w-[88%] animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
              >
                <div className="bg-sage/20 dark:bg-[#1a1724] text-sage-ink p-1.5 rounded-xl shrink-0 mb-1 shadow-xs" aria-hidden="true">
                  <Bot size={16} aria-hidden="true" />
                </div>
                <div className="p-4 rounded-3xl rounded-bl-none bg-white dark:bg-[#221d2d] border border-stone-200 dark:border-white/[0.08] text-sm text-stone-800 dark:text-[#eae6e1] shadow-xs">
                  <p className="flex items-start gap-2 font-semibold leading-snug">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
                    <span>{msg.text}</span>
                  </p>
                  {msg.offline && (
                    <p className="mt-1 leading-snug text-stone-600 dark:text-[#a6a1b2]">Parece que no tienes conexión a internet.</p>
                  )}
                  {msg.hadAlarm ? (
                    <p className="mt-1 leading-snug font-semibold text-stone-900 dark:text-[#eae6e1]">Usa los botones de llamada de arriba si es urgente.</p>
                  ) : index !== messages.length - 1 ? (
                    // Fallos anteriores: el botón se queda solo en el último, para no repetirlo.
                    <p className="mt-1 leading-snug text-stone-600 dark:text-[#a6a1b2]">Si es urgente, llama a emergencias.</p>
                  ) : (
                    <div className="mt-3">
                      <p className="leading-snug font-semibold text-stone-900 dark:text-[#eae6e1]">Si es urgente, no esperes:</p>
                      <EmergencyCallLink className="mt-2" withNote compact />
                      {onOpenSymptoms && (
                        <button
                          type="button"
                          onClick={onOpenSymptoms}
                          className="mt-1 -ml-1 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-1 text-sm font-bold text-terracotta-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                        >
                          Ver señales de alarma
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                  {canRetry && (
                    <button
                      type="button"
                      onClick={() => handleSend(msg.retryText as string, { errorId: msg.id, sourceId: msg.sourceId as number }, msg.retrySuggestion ? "suggestion" : undefined)}
                      disabled={isTyping}
                      className="mt-2 -ml-2 inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-terracotta-ink hover:bg-terracotta/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                    >
                      <RotateCw size={16} aria-hidden="true" />
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
          <div
            key={msg.id}
            id={`pandaia-msg-${msg.id}`}
            className={`flex items-end gap-2 max-w-[88%] animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              msg.sender === 'user' ? 'self-end flex-row-reverse' : ''
            }`}
          >
            {msg.sender === 'ai' && (
              <div className="bg-sage/20 dark:bg-[#1a1724] text-sage-ink p-1.5 rounded-xl shrink-0 mb-1 shadow-xs" aria-hidden="true">
                <Bot size={16} />
              </div>
            )}
            
            <div className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-3xl shadow-xs text-sm relative group ${
                msg.sender === 'user' 
                  ? 'bg-terracotta-ink text-white rounded-br-none' 
                  : 'bg-white dark:bg-[#221d2d] border border-stone-100 dark:border-white/[0.08] text-stone-800 dark:text-[#eae6e1] rounded-bl-none shadow-xs'
              }`}>
                {msg.sender === 'ai' ? renderFormattedMessage(msg.text) : <p className="leading-relaxed">{msg.text}</p>}

                {/* Botón de Copiar para Mensajes del Asistente */}
                {msg.sender === 'ai' && (
                  <div className="pt-2 mt-2 border-t border-stone-100 dark:border-white/[0.06] flex justify-end">
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.id, msg.text)}
                      className="min-h-[44px] -my-2 px-2 text-xs font-bold text-stone-600 dark:text-[#a6a1b2] hover:text-stone-900 dark:hover:text-[#eae6e1] flex items-center gap-1 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                      title="Copiar respuesta"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} className="text-sage-ink" aria-hidden="true" />
                          <span className="text-sage-ink">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
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
                    <div className="bg-sage/10 dark:bg-[#1f2622] border border-sage/30 dark:border-sage/25 shadow-xs rounded-2xl p-4 w-full max-w-sm animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
                      <h3 className="flex items-start gap-1.5 font-bold text-stone-900 dark:text-[#eae6e1] text-sm">
                        {inAgenda
                          ? <CalendarCheck size={16} className="mt-0.5 shrink-0 text-sage-ink" aria-hidden="true" />
                          : <CalendarX size={16} className="mt-0.5 shrink-0 text-stone-500 dark:text-[#a6a1b2]" aria-hidden="true" />}
                        <span>{card.title}</span>
                      </h3>
                      <p className="text-xs text-stone-700 dark:text-[#d9d4de] mt-1 leading-relaxed">
                        {card.when}{card.doctor ? ` · ${card.doctor}` : ""}
                      </p>
                      <p className={`text-xs font-semibold mt-1 ${inAgenda ? "text-sage-ink" : "text-stone-600 dark:text-[#a6a1b2]"}`}>
                        {inAgenda ? "Está en tu Agenda" : "Ya no está en tu Agenda"}
                      </p>
                      {inAgenda && setActiveTab && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("agenda")}
                          className="mt-3 w-full min-h-[44px] bg-sage-ink hover:bg-sage-ink-hover active:scale-95 motion-reduce:active:scale-100 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
                        >
                          <Calendar size={14} aria-hidden="true" />
                          <span>Ver en la Agenda</span>
                          <ChevronRight size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                }
                if (card.kind === "pending") {
                  return (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-300/70 dark:border-amber-400/25 shadow-xs rounded-2xl p-4 w-full max-w-sm animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
                      <h3 className="flex items-start gap-1.5 font-bold text-stone-900 dark:text-[#eae6e1] text-sm">
                        <CalendarClock size={16} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden="true" />
                        <span>¿Qué día es{card.title ? ` «${card.title}»` : " la cita"}?</span>
                      </h3>
                      <p className="text-xs text-stone-700 dark:text-[#d9d4de] mt-1 leading-relaxed">
                        Aún no está en tu Agenda. Dime la fecha (por ejemplo, «el 20 de octubre a las 10:00») y la agrego.
                      </p>
                      <button
                        type="button"
                        onClick={() => prefillInput(`Agenda ${card.title || "la cita"} el día `)}
                        className="mt-3 w-full min-h-[44px] rounded-xl border border-amber-400/60 dark:border-amber-300/30 bg-white dark:bg-[#221d2d] text-sm font-bold text-stone-800 dark:text-[#eae6e1] hover:bg-amber-100/60 dark:hover:bg-amber-500/15 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                      >
                        Escribir la fecha
                      </button>
                    </div>
                  );
                }
                const info = card as { title?: string; desc?: string };
                if (!info.title) return null;
                return (
                  <div className="bg-[#fdfbf7] dark:bg-[#221d2d] border border-stone-200 dark:border-white/[0.08] shadow-xs rounded-2xl p-4 w-full max-w-sm animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
                    <h3 className="flex items-start gap-1.5 font-bold text-stone-900 dark:text-[#eae6e1] text-sm">
                      <Lightbulb size={16} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
                      <span>{info.title}</span>
                    </h3>
                    {info.desc && (
                      <p className="text-xs text-stone-700 dark:text-[#d9d4de] mt-1 leading-relaxed">{info.desc}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          );
        })}

        {isTyping && (
          <div className="flex items-end gap-2 max-w-[85%] animate-in fade-in duration-150">
            <div className="bg-sage/20 dark:bg-[#1a1724] text-sage-ink p-1.5 rounded-xl shrink-0 mb-1 shadow-xs" aria-hidden="true">
              <Bot size={16} />
            </div>
            <div className="bg-white dark:bg-[#221d2d] px-4 py-3 rounded-2xl rounded-bl-none shadow-xs border border-stone-100 dark:border-white/[0.08] flex gap-2 items-center">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" style={{ animationDelay: "0.15s" }}></div>
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" style={{ animationDelay: "0.3s" }}></div>
              </div>
              <span className="text-xs text-stone-600 dark:text-[#a6a1b2] font-medium">PandaIA está respondiendo…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* INPUT AREA CON SMART CHIPS CONTEXTUALES */}
      <div className="bg-white dark:bg-[#221d2d] border-t border-stone-200 dark:border-white/[0.08] shrink-0">
        {/* Smart Chips Dinámicos por Trimestre */}
        <div className="flex overflow-x-auto gap-2 p-2.5 no-scrollbar border-b border-stone-100 dark:border-white/[0.06]">
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
              className="whitespace-nowrap inline-flex items-center gap-1.5 bg-sage/10 dark:bg-[#2d273a] border border-sage/30 dark:border-white/10 text-sage-ink text-xs font-semibold px-3.5 py-2 min-h-[44px] rounded-full hover:bg-sage/20 dark:hover:bg-[#383147] active:scale-95 motion-reduce:active:scale-100 transition-all shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
            >
              {schedule && <CalendarClock size={14} className="shrink-0" aria-hidden="true" />}
              {chip}
            </button>
            );
          })}
        </div>

        {/* Text Input Ergonómico */}
        <div className="p-2.5">
          {/* El contenedor es el campo visible: borde ≥3:1 y anillo de tinta al escribir (el textarea no lleva el suyo). */}
          <div className="flex items-end gap-2 bg-stone-50 dark:bg-[#2d273a] border border-stone-500 dark:border-white/40 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-sage-ink focus-within:border-transparent transition-all shadow-xs">
            <button 
              type="button"
              aria-label="Preguntas sobre términos de la ecografía"
              onClick={() => setIsUltrasoundModalOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-600 dark:text-[#a6a1b2] hover:text-sage-ink transition-colors shrink-0 rounded-xl hover:bg-white dark:hover:bg-[#221d2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
              title="Preguntas sobre términos de la ecografía"
            >
              <Paperclip size={18} aria-hidden="true" />
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
              className="flex-1 bg-transparent border-none focus:outline-none text-base sm:text-sm py-2.5 resize-none max-h-32 min-h-[44px] text-stone-800 dark:text-[#eae6e1] placeholder:text-stone-500 dark:placeholder:text-[#948fa1] overflow-y-auto no-scrollbar"
            />
            <button 
              type="button"
              aria-label="Enviar mensaje a PandaIA"
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isTyping}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all shrink-0 active:scale-90 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink ${
                inputText.trim() && !isTyping 
                  ? "bg-terracotta-ink text-white hover:bg-terracotta-ink-hover shadow-xs" 
                  : "bg-stone-200 dark:bg-[#2a2e37] text-stone-400 dark:text-[#a6a1b2]/60 cursor-not-allowed"
              }`}
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </div>
          <p id="pandaia-limits" className="mt-1.5 px-1 text-xs leading-snug text-stone-600 dark:text-[#a6a1b2]">
            {profile.role === "papa"
              ? "PandaIA orienta; no diagnostica ni reemplaza al obstetra."
              : "PandaIA orienta; no diagnostica ni reemplaza a tu obstetra."}
          </p>
        </div>
      </div>

      {/* MODAL / SHEET DECODIFICADOR DE ECOGRAFíAS */}
      {isUltrasoundModalOpen && (
        <ModalPortal>
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsUltrasoundModalOpen(false); }}
          className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs ${Z_CLASS.dialog} flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150`}
        >
          <div
            {...ultrasoundDialogProps}
            className="bg-white dark:bg-[#221d2d] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-200 border border-stone-100 dark:border-white/[0.08] outline-none"
          >
            <div className="bg-sage-ink p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="bg-white/10 p-2 rounded-xl" aria-hidden="true">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 id="ultrasound-modal-title" className="font-bold text-base leading-tight">
                    Decodificador de ecografías
                  </h2>
                  <p className="text-xs text-white/90">
                    Qué significa cada término del informe
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsUltrasoundModalOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Cerrar ventana de ecografías"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[70dvh] overflow-y-auto">
              <p id="ultrasound-modal-desc" className="text-xs text-stone-600 dark:text-[#a6a1b2] mb-3">
                {profile.role === "papa"
                  ? "Elige una pregunta y PandaIA te explica el término. Lo que significan los resultados lo explica el obstetra de tu pareja."
                  : "Elige una pregunta y PandaIA te explica el término. Lo que significan tus resultados te lo explica tu obstetra."}
              </p>

              {getUltrasoundItems(chatWeek).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleUltrasoundSelect(item.prompt)}
                  className="w-full min-h-[44px] text-left p-3.5 rounded-2xl border border-stone-200 dark:border-white/[0.08] bg-stone-50/70 dark:bg-[#2d273a]/60 hover:bg-sage/10 dark:hover:bg-[#2d273a] hover:border-sage-ink/40 dark:hover:border-sage/30 transition-colors flex items-start justify-between gap-3 group active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-900 dark:text-[#eae6e1] group-hover:text-sage-ink flex items-center gap-1.5">
                      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0"></span>
                      <span>{item.title}</span>
                    </p>
                    <p className="text-xs text-stone-600 dark:text-[#a6a1b2] mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-stone-500 dark:text-[#a6a1b2] group-hover:text-terracotta-ink dark:group-hover:text-sage-ink shrink-0 mt-1" aria-hidden="true" />
                </button>
              ))}
            </div>

            <div className="p-3 bg-stone-50 dark:bg-[#221d2d] border-t border-stone-100 dark:border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setIsUltrasoundModalOpen(false)}
                className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-stone-600 dark:text-[#a6a1b2] hover:text-stone-900 dark:hover:text-[#eae6e1] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
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