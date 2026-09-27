"use client";

import { AgendaView, AppointmentPrepModal, parseEventDate } from "@/components/AgendaModule";
import { HerramientasView } from "@/components/HerramientasModule";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePandaStore } from "@/store/usePandaStore";
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
  saveMomStatus,
  listenToEvents,
  mutateEvents,
  setChecklistItem,
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
import { Compass, Calendar, Bot, Send, CheckCircle2, Circle, ChevronRight, ChevronLeft, HeartPulse, Baby, Utensils, Info, ChevronDown, ChevronUp, Sparkles, Activity, Heart, X, Users, ClipboardList, Trophy, AlertTriangle, AlertCircle, FileText, Settings, Paperclip, Share2, Bell, RotateCcw, RotateCw, Stethoscope, PhoneCall, Check, Copy, Edit3, Sun, Moon, RefreshCw, UserMinus, Lightbulb, CalendarCheck, CalendarClock, CalendarX, Smartphone, MessageCircle } from "lucide-react";
import { CallActions, EmergencyCallLink } from "@/components/CallActions";
import { CareTeamSheet } from "@/components/CareTeamForm";
import { clinicalWeek, detectAlarm, type AlarmSign } from "@/lib/urgency";

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
  if (/ecograf|ultrason|sonograf|traslucencia|morfolog/.test(t)) return "ecografia";
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

const ROLE_LABEL: Record<"mama" | "papa", string> = { mama: "Mamá", papa: "Copiloto" };

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
    status = "No pudimos comprobar la vigencia ahora.";
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
  // Al pedir confirmación, el foco va a la opción segura ("Cancelar") y la pregunta queda a la vista.
  const cancelRemoveRef = useRef<HTMLButtonElement>(null);
  const confirmingUid = confirming?.uid;
  useEffect(() => {
    if (!confirmingUid) return;
    const btn = cancelRemoveRef.current;
    btn?.focus({ preventScroll: true });
    btn?.scrollIntoView({ block: "nearest" });
  }, [confirmingUid]);

  if (!pid) {
    const last = profile.role === "mama" ? readStored<LastPregnancy | null>(LS_LAST_PREGNANCY, null) : null;
    return (
      <div className="bg-stone-50 dark:bg-[#1a1724] border border-stone-200 dark:border-white/[0.06] rounded-2xl p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-[#eae6e1]">
          <Smartphone size={16} className="shrink-0 text-stone-600 dark:text-[#a6a1b2]" aria-hidden="true" />
          Solo en este teléfono
        </p>
        <p className="mt-1 text-xs leading-snug text-stone-600 dark:text-[#a6a1b2]">
          Nadie más ve lo que registras. Al vincularte, lo que ya anotaste aquí (citas, tareas, patadas, contracciones, presupuesto, nombres, diario y plan de parto) pasa a compartirse con tu pareja.
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
          Vincular con mi pareja
        </button>
      </div>
    );
  }

  const confirmRemove = async () => {
    if (!confirming || !pid) return;
    const who = confirming.name || ROLE_LABEL[confirming.role];
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
          const who = m.name || ROLE_LABEL[m.role];
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
        <div
          role="alertdialog"
          aria-labelledby="remove-access-title"
          aria-describedby="remove-access-desc"
          className="rounded-2xl border border-terracotta-ink/30 bg-terracotta/10 dark:bg-terracotta/15 p-4"
        >
          <p id="remove-access-title" className="text-sm font-bold text-stone-900 dark:text-[#eae6e1]">
            ¿Quitar el acceso de {confirming.name || ROLE_LABEL[confirming.role]}?
          </p>
          <p id="remove-access-desc" className="mt-1 text-xs leading-snug text-stone-700 dark:text-[#d9d4de]">
            Dejará de ver y editar la agenda, las tareas y los demás datos compartidos. Para volver necesitará un código nuevo.
          </p>
          {removeError && <p role="alert" className="mt-2 text-xs font-semibold text-terracotta-ink">{removeError}</p>}
          <div className="mt-3 flex gap-2">
            <button
              ref={cancelRemoveRef}
              type="button"
              onClick={() => setConfirming(null)}
              disabled={removing}
              className="flex-1 min-h-[44px] rounded-xl border border-stone-300 dark:border-white/15 bg-white dark:bg-[#2d273a] text-sm font-bold text-stone-800 dark:text-[#eae6e1] transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmRemove}
              disabled={removing}
              className="flex-1 min-h-[44px] rounded-xl bg-terracotta-ink hover:bg-terracotta-ink-hover text-white text-sm font-bold transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            >
              {removing ? "Quitando…" : "Sí, quitar acceso"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileModal({
  profile,
  onSave,
  onClose,
  isDark,
  toggleTheme,
  partner,
  showToast,
  onStartLink,
}: {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onClose: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  partner: PartnerInfo;
  showToast: ShowToast;
  onStartLink: () => void;
}) {
  const [form, setForm] = useState(profile);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const cancelUnlinkRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!confirmUnlink) return;
    cancelUnlinkRef.current?.focus({ preventScroll: true });
    cancelUnlinkRef.current?.scrollIntoView({ block: "nearest" });
  }, [confirmUnlink]);
  const [careTeamOpen, setCareTeamOpen] = useState(false);
  const careTeam = usePandaStore(state => state.careTeam);
  const careTeamSummary = careTeam.obName || careTeam.obPhone || careTeam.hospitalName
    ? [careTeam.obName || (careTeam.obPhone ? "Obstetra" : ""), careTeam.hospitalName].filter(Boolean).join(" · ")
    : "Obstetra, hospital y emergencias";

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

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
  const partnerLabelForUnlink = partner.partnerName || (profile.role === "mama" ? "tu copiloto" : "tu pareja");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200/80 dark:border-white/[0.08] flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-stone-50 dark:bg-[#1a1724] p-4 flex justify-between items-center border-b border-stone-100 dark:border-white/[0.04]">
          <h3 id="profile-modal-title" className="font-bold text-stone-800 dark:text-[#eae6e1] flex items-center gap-2">
            <Settings size={18} className="text-stone-500" /> Ajustes
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-stone-400 hover:text-stone-800 dark:hover:text-[#eae6e1] bg-white dark:bg-[#2d273a] shadow-sm transition-colors"
            aria-label="Cerrar ventana de ajustes"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">

          {/* Vínculo Familiar */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-500 dark:text-[#a6a1b2] uppercase tracking-wider">Familia</h4>
            <div className="bg-stone-50 dark:bg-[#1a1724] border border-stone-200 dark:border-white/[0.04] rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl shrink-0 ${form.role === 'mama' ? 'bg-terracotta/10 text-terracotta-ink' : 'bg-sage/10 text-sage-ink'}`}>
                  {form.role === 'mama' ? <Baby size={20} /> : <Users size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm">
                    {form.role === 'mama' ? 'Modo Mamá' : 'Modo Copiloto'}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-[#a6a1b2] truncate">{form.name}</p>
                </div>
              </div>
              {profile.pregnancyId && !confirmUnlink && (
                <button
                  type="button"
                  onClick={() => setConfirmUnlink(true)}
                  className="shrink-0 text-xs font-bold min-h-[44px] min-w-[44px] px-4 rounded-lg shadow-sm transition-colors text-stone-600 dark:text-[#a6a1b2] bg-white dark:bg-[#2d273a] border border-stone-200 dark:border-white/[0.06]"
                >
                  Desvincular
                </button>
              )}
            </div>

            {confirmUnlink && profile.pregnancyId && (
              <div
                role="alertdialog"
                aria-labelledby="unlink-title"
                aria-describedby="unlink-desc"
                className="rounded-2xl border border-terracotta-ink/30 bg-terracotta/10 dark:bg-terracotta/15 p-4"
              >
                <p id="unlink-title" className="text-sm font-bold text-stone-900 dark:text-[#eae6e1]">¿Desvincular este teléfono?</p>
                <div id="unlink-desc" className="mt-1 space-y-1.5 text-xs leading-snug text-stone-700 dark:text-[#d9d4de]">
                  {profile.role === "mama" ? (
                    <>
                      <p>Este teléfono dejará de ver la agenda, el diario, los nombres y lo demás que comparten. {partnerLabelForUnlink.charAt(0).toLocaleUpperCase("es") + partnerLabelForUnlink.slice(1)} lo seguirá viendo.</p>
                      <p>Nada se borra: podrás volver desde Ajustes. Si lo que quieres es que tu pareja deje de ver tus datos, usa «Quitar acceso» en «Personas con acceso».</p>
                    </>
                  ) : (
                    <p>Dejarás de ver lo que comparten. Para volver, {partnerLabelForUnlink} tendrá que darte un código nuevo.</p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    ref={cancelUnlinkRef}
                    type="button"
                    onClick={() => setConfirmUnlink(false)}
                    disabled={unlinking}
                    className="flex-1 min-h-[44px] rounded-xl border border-stone-300 dark:border-white/15 bg-white dark:bg-[#2d273a] text-sm font-bold text-stone-800 dark:text-[#eae6e1] transition-colors disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => { void unlink(); }}
                    disabled={unlinking}
                    className="flex-1 min-h-[44px] rounded-xl bg-terracotta-ink hover:bg-terracotta-ink-hover text-white text-sm font-bold transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                  >
                    {unlinking ? "Desvinculando…" : "Sí, desvincular"}
                  </button>
                </div>
              </div>
            )}

            {form.role === 'papa' && (
              <div className="bg-stone-50 dark:bg-white/[0.02] p-4 rounded-2xl flex items-center justify-between border border-stone-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sage/20 dark:bg-sage/10 flex items-center justify-center text-sage-ink">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800 dark:text-white mb-0.5">Tema de Comparación</p>
                    <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Frutas o estilo Geek</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.comparisonTheme === 'geek'}
                  aria-label="Comparar con objetos geek en lugar de frutas"
                  onClick={() => setForm({...form, comparisonTheme: form.comparisonTheme === 'geek' ? 'frutas' : 'geek'})}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.comparisonTheme === 'geek' ? 'bg-sage-ink' : 'bg-stone-300 dark:bg-stone-700'}`}>
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
            <h4 className="text-xs font-bold text-stone-500 dark:text-[#a6a1b2] uppercase tracking-wider">Personas con acceso</h4>
            <AccessSection profile={profile} partner={partner} showToast={showToast} onStartLink={onStartLink} />
          </div>

          {/* Preferencias Médicas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-500 dark:text-[#a6a1b2] uppercase tracking-wider">Gestación & Detalles</h4>

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

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="settings-week" className="text-sm font-bold text-stone-700 dark:text-[#eae6e1]">{form.weekUnknown ? "Semana sin confirmar" : `Semana ${form.week}`}</label>
                <span className="text-xs text-stone-600 dark:text-[#a6a1b2]">{profile.pregnancyId ? "Se comparte con tu pareja" : "Solo en este teléfono"}</span>
              </div>
              <input
                id="settings-week"
                type="range" min="1" max="40"
                value={form.week} onChange={(e) => setForm({...form, week: parseInt(e.target.value), weekUnknown: false})}
                className="w-full accent-terracotta"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-stone-700 dark:text-[#eae6e1] block mb-1">Ciudad o País</label>
              <input
                type="text"
                value={form.location || ""}
                onChange={(e) => setForm({...form, location: e.target.value})}
                placeholder="Para recomendaciones locales"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-stone-700 dark:text-[#eae6e1] block mb-1">Notas de rutina</label>
              <textarea
                value={form.notes || ""}
                onChange={(e) => setForm({...form, notes: e.target.value})}
                placeholder="Ej. Trabajo en turnos, parto programado..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-base sm:text-sm resize-none"
              />
            </div>
          </div>

          {/* Modo Oscuro Toggle */}
          <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#1a1724] rounded-2xl border border-stone-200/80 dark:border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="bg-stone-200 dark:bg-[#2d273a] p-2 rounded-xl text-stone-600 dark:text-[#a6a1b2]">
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-stone-800 dark:text-[#eae6e1]">Modo Oscuro</p>
                <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Ideal para la noche</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="Modo oscuro"
              onClick={toggleTheme}
              className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            >
              <span aria-hidden="true" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? "bg-terracotta-ink" : "bg-stone-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? "translate-x-6" : "translate-x-1"}`} />
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 dark:border-white/[0.04] bg-white dark:bg-[#221d2d]">
          <button
            type="button"
            onClick={() => onSave(form)}
            className="w-full min-h-[44px] bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            Guardar Cambios
          </button>
        </div>
      </div>

      <CareTeamSheet open={careTeamOpen} onClose={() => setCareTeamOpen(false)} />
    </div>
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
  return `Hola, te invito a acompañarme en PandaJR${origin ? ` (${origin})` : ""}. Abre la app, elige "Soy el copiloto (pareja)" y escribe este código: ${code}. Vale por 14 días y solo sirve para una persona.`;
}

function OnboardingModal({
  onComplete,
  onSkip,
  onCancel,
  initial,
}: {
  onComplete: (profile: UserProfile) => void;
  onSkip?: () => void;
  /** Si llega, el paso 1 ofrece "Ahora no" (vuelve sin tocar el perfil) en lugar de "Explorar como invitado". */
  onCancel?: () => void;
  initial?: Partial<UserProfile>;
}) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"mama" | "papa" | null>(null);
  const [name, setName] = useState(initial?.name && initial.name !== "Invitado" ? initial.name : "");
  const [week, setWeek] = useState(initial?.week && !initial.weekUnknown ? initial.week : 14);
  // "Aún no sé mi semana": no se inventa una (ni se comparte como confirmada).
  const [weekUnknown, setWeekUnknown] = useState(!!initial?.weekUnknown);
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tempPregnancyId, setTempPregnancyId] = useState("");

  const normalizedCode = normalizeInviteCode(code);
  const partnerLabel = preview ? (preview.momName || (preview.legacy ? preview.babyName : "") || "tu pareja") : "tu pareja";

  const handleNext = async () => {
    setErrorMsg("");
    if (step === 1 && role) {
      setStep(2);
    } else if (step === 2) {
      if (role === "mama" && name.trim()) {
        setIsLoading(true);
        try {
          const uid = await ensureAuth().catch(() => undefined);
          if (!uid) { setErrorMsg(CONNECT_FAILED); return; }
          const { inviteCode, pregnancyId } = await createPregnancyForMom(uid, "", name.trim(), weekUnknown ? {} : { week });
          setGeneratedCode(inviteCode);
          setTempPregnancyId(pregnancyId);
          setStep(3); // Show code
        } catch (e) {
          setErrorMsg(humanError(e, PAIRING_MESSAGES.createFailed));
        } finally {
          setIsLoading(false);
        }
      } else if (role === "papa" && name.trim()) {
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
          else { setPreview(p); setStep(3); }
        } catch (e) {
          setErrorMsg(humanError(e, PAIRING_MESSAGES.joinFailed));
        } finally {
          setIsLoading(false);
        }
      }
    } else if (step === 3 && role === "papa") {
      if (!normalizedCode) return;
      setIsLoading(true);
      try {
        const uid = await ensureAuth().catch(() => undefined);
        if (!uid) { setErrorMsg(CONNECT_FAILED); return; }
        const res = await joinPregnancyAsDad(uid, normalizedCode.code, name.trim());
        onComplete({ role: "papa", name: name.trim(), week: res.week || 14, weekUnknown: !res.week, location: "", notes: "", pregnancyId: res.pregnancyId });
      } catch (e) {
        setErrorMsg(humanError(e, PAIRING_MESSAGES.joinFailed));
      } finally {
        setIsLoading(false);
      }
    } else if (step === 3) {
      onComplete({ role: "mama", name: name.trim(), week, weekUnknown, location: "", notes: "", pregnancyId: tempPregnancyId, inviteCode: generatedCode });
    }
  };

  const copyGenerated = async () => {
    const ok = await copyText(generatedCode);
    setCodeCopied(ok);
    if (!ok) setErrorMsg("No pudimos copiarlo: mantén presionado el código para copiarlo a mano.");
  };

  return (
    <div className="fixed inset-0 bg-stone-50 dark:bg-[#181520] z-[55] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl w-full max-w-sm overflow-y-auto max-h-full animate-in zoom-in-95 duration-500 border border-stone-200/80 dark:border-white/[0.08] p-6 text-center">

        {step === 1 && (
          <div className="space-y-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto mb-4 border border-stone-200 dark:border-white/[0.08] shadow-sm">
                <Image src="/panda-icon.jpg" alt="PandaJR Icon" width={96} height={96} className="w-full h-full object-cover" priority />
              </div>
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Bienvenido a PandaJR</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">¿Quién eres en esta hermosa aventura?</p>

            <div className="space-y-3 mt-4">
              <button
                onClick={() => setRole("mama")}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${role === "mama" ? "border-terracotta bg-terracotta/5" : "border-stone-100 dark:border-white/[0.06] hover:border-stone-300 dark:hover:border-white/[0.12]"}`}
              >
                <Baby size={28} aria-hidden="true" className={role === "mama" ? "text-terracotta-ink" : "text-stone-500 dark:text-[#a6a1b2]"} />
                <span className={`font-bold ${role === "mama" ? "text-terracotta-ink" : "text-stone-600 dark:text-[#a6a1b2]"}`}>Soy la futura mamá</span>
              </button>
              <button
                onClick={() => setRole("papa")}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${role === "papa" ? "border-sage bg-sage/5" : "border-stone-100 dark:border-white/[0.06] hover:border-stone-300 dark:hover:border-white/[0.12]"}`}
              >
                <Users size={28} aria-hidden="true" className={role === "papa" ? "text-sage-ink" : "text-stone-500 dark:text-[#a6a1b2]"} />
                <span className={`font-bold ${role === "papa" ? "text-sage-ink" : "text-stone-600 dark:text-[#a6a1b2]"}`}>Soy el copiloto (pareja)</span>
              </button>
            </div>

          {/* Botón de Skip (P0) */}
          {onCancel ? (
            <button
              onClick={onCancel}
              className="w-full mt-4 py-3 min-h-[44px] text-sm font-bold text-stone-600 hover:text-stone-800 dark:text-[#a6a1b2] dark:hover:text-white transition-colors"
            >
              Ahora no
            </button>
          ) : (
            <button
              onClick={() => onSkip && onSkip()}
              className="w-full mt-4 py-3 min-h-[44px] text-sm font-bold text-stone-600 hover:text-stone-800 dark:text-[#a6a1b2] dark:hover:text-white transition-colors"
            >
              Explorar como invitado por ahora
            </button>
          )}
            <button
              onClick={handleNext}
              disabled={!role}
              className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all mt-4"
            >
              {isLoading ? "Conectando..." : "Continuar"}
              </button>
          </div>
        )}

        {step === 2 && role === "mama" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Tu perfil</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Configura tu embarazo para personalizar la experiencia.</p>

            {errorMsg && <div role="alert" className="text-sm text-terracotta-ink bg-terracotta/10 p-3 rounded-xl border border-terracotta-ink/25">{errorMsg}</div>}
              <div className="space-y-4 text-left">
              <div>
                <label htmlFor="onb-mama-name" className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block">Tu nombre</label>
                <input
                  id="onb-mama-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Elena"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-base"
                />
              </div>
              <div>
                <label htmlFor="onb-mama-week" className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block">
                  {weekUnknown ? "Semana de embarazo: sin confirmar" : `Semana de embarazo (${week})`}
                </label>
                <input
                  id="onb-mama-week"
                  type="range" min="1" max="40"
                  value={week} onChange={(e) => setWeek(parseInt(e.target.value))}
                  disabled={weekUnknown}
                  className="w-full accent-terracotta disabled:opacity-40"
                />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={weekUnknown}
                  onClick={() => setWeekUnknown((v) => !v)}
                  className="mt-1 -ml-1 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-1 text-sm font-semibold text-stone-700 dark:text-[#d9d4de] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                >
                  {weekUnknown ? <CheckCircle2 size={18} className="text-sage-ink" aria-hidden="true" /> : <Circle size={18} className="text-stone-500 dark:text-[#a6a1b2]" aria-hidden="true" />}
                  Aún no sé mi semana
                </button>
                {weekUnknown && (
                  <p className="text-xs leading-snug text-stone-600 dark:text-[#a6a1b2]">
                    Puedes confirmarla después en Ajustes. Mientras tanto no calcularemos nada con una semana inventada.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleNext}
              disabled={!name.trim() || isLoading}
                className="w-full min-h-[44px] bg-terracotta-ink hover:bg-terracotta-ink-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isLoading ? "Generando..." : "Generar mi código"}
              </button>
          </div>
        )}

        {step === 2 && role === "papa" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Vincular Cuenta</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Pídele a tu pareja el código que aparece en su PandaJR.</p>
            {errorMsg && <div role="alert" className="text-sm text-terracotta-ink bg-terracotta/10 p-3 rounded-xl border border-terracotta-ink/25 mt-4">{errorMsg}</div>}

            <div className="pt-2 space-y-4 text-left">
              <div>
                <label htmlFor="onb-papa-name" className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block">Tu nombre</label>
                <input
                  id="onb-papa-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Así te verá tu pareja"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-base"
                />
              </div>
              <div>
                <label htmlFor="onb-papa-code" className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block">Código de invitación</label>
                <input
                  id="onb-papa-code"
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setErrorMsg(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && normalizedCode && name.trim() && !isLoading) void handleNext(); }}
                  placeholder="PANDA-XXXX-XXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby="onb-code-hint"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-center font-mono font-bold tracking-widest text-lg uppercase"
                />
                <p id="onb-code-hint" className="mt-1.5 text-xs text-stone-600 dark:text-[#a6a1b2] text-center">
                  {code.trim() && !normalizedCode ? "Revisa el código: se ve así, PANDA-XXXX-XXXX." : "Puedes escribirlo con o sin guiones."}
                </p>
              </div>
            </div>
            <button
                onClick={handleNext}
                disabled={!normalizedCode || !name.trim() || isLoading}
                className="w-full min-h-[44px] bg-sage-ink hover:bg-sage-ink-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isLoading ? "Buscando…" : "Continuar"}
                </button>
          </div>
        )}

        {step === 3 && role === "papa" && preview && (
          <div className="space-y-6">
            <div className="bg-sage/15 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="text-sage-ink" size={30} aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1] text-balance">¿Te unes al embarazo de {partnerLabel}?</h2>
            {errorMsg && <div role="alert" className="text-sm text-terracotta-ink bg-terracotta/10 p-3 rounded-xl border border-terracotta-ink/25">{errorMsg}</div>}
            <dl className="text-sm text-left border-y border-stone-200 dark:border-white/[0.08] divide-y divide-stone-200 dark:divide-white/[0.06]">
              {!preview.legacy && preview.babyName && (
                <div className="flex justify-between gap-3 px-1 py-2.5">
                  <dt className="text-stone-600 dark:text-[#a6a1b2]">Bebé</dt>
                  <dd className="font-bold text-stone-800 dark:text-[#eae6e1] text-right">{preview.babyName}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 px-1 py-2.5">
                <dt className="text-stone-600 dark:text-[#a6a1b2]">Semana</dt>
                <dd className="font-bold text-stone-800 dark:text-[#eae6e1] text-right">{preview.week ? `Semana ${preview.week}` : "Sin confirmar"}</dd>
              </div>
              <div className="flex justify-between gap-3 px-1 py-2.5">
                <dt className="text-stone-600 dark:text-[#a6a1b2]">Código</dt>
                <dd className="font-mono font-bold text-stone-800 dark:text-[#eae6e1] text-right">{normalizedCode?.code}</dd>
              </div>
            </dl>
            <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">Verán y editarán juntos la agenda, las tareas y el estado de ánimo.</p>
            <div className="space-y-3">
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full min-h-[44px] bg-sage-ink hover:bg-sage-ink-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isLoading ? "Uniéndote…" : "Sí, unirme"}
              </button>
              <button
                onClick={() => { setPreview(null); setCode(""); setErrorMsg(""); setStep(2); }}
                disabled={isLoading}
                className="w-full min-h-[44px] rounded-xl py-3 font-bold text-stone-700 dark:text-[#d9d4de] border border-stone-300 dark:border-white/15 hover:bg-stone-50 dark:hover:bg-[#2d273a] transition-colors disabled:opacity-50"
              >
                No es este
              </button>
            </div>
          </div>
        )}

        {step === 3 && role === "mama" && (
          <div className="space-y-6">
            <div className="bg-sage/10 dark:bg-sage/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="text-sage-ink" size={32} />
            </div>
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">¡Todo listo!</h2>
            <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">Comparte este código con tu pareja para que se vincule a tu embarazo. Vale por 14 días y sirve para una sola persona.</p>

            <div className="bg-stone-50 dark:bg-[#1a1724] p-4 rounded-2xl border border-stone-200 dark:border-white/[0.1]">
              <p className="font-mono text-xl font-black tracking-wider text-terracotta-ink break-all">{generatedCode}</p>
              <button
                type="button"
                onClick={copyGenerated}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-stone-700 dark:text-[#d9d4de] hover:bg-stone-100 dark:hover:bg-[#2d273a] transition-colors"
              >
                {codeCopied ? <Check size={16} className="text-sage-ink" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                <span aria-live="polite">{codeCopied ? "Copiado" : "Copiar código"}</span>
              </button>
            </div>
            {errorMsg && <p role="alert" className="text-xs text-terracotta-ink">{errorMsg}</p>}

            <button
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(inviteShareText(generatedCode))}`, '_blank', 'noopener,noreferrer');
                }}
                className="w-full min-h-[44px] bg-sage-ink hover:bg-sage-ink-hover text-white rounded-xl py-3.5 font-bold transition-all flex items-center justify-center gap-2 shadow-sm mb-3"
              >
                <Share2 size={20} aria-hidden="true" />
                Compartir por WhatsApp
              </button>

              <button
                onClick={handleNext}
                className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3.5 font-bold transition-all"
              >
                Entrar a PandaJR
              </button>
          </div>
        )}
      </div>
    </div>
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

  // Perfil global de usuario (compartido en toda la app)
  // Zustand Global Store
  const profile = usePandaStore(state => state.profile);
  const setProfile = usePandaStore(state => state.setProfile);
  const isDark = usePandaStore(state => state.isDark);
  const toggleThemeStore = usePandaStore(state => state.toggleTheme);
  const hasHydrated = usePandaStore(state => state.hasHydrated);
  const pid = profile.pregnancyId || "";
  // Miembros del embarazo (un solo listener para toda la página).
  const partner = usePartner();
  const myUid = partner.myUid;

  // --- Toast global: "Deshacer"/"Reintentar" solo si hay una acción real ---
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback<ShowToast>((message, onAction, labelOrOpts) => {
    const opts: ToastOptions = typeof labelOrOpts === "string" ? { actionLabel: labelOrOpts } : (labelOrOpts ?? {});
    const action = typeof onAction === "function" ? onAction : undefined;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, onAction: action, actionLabel: action ? (opts.actionLabel || "Deshacer") : undefined });
    toastTimerRef.current = setTimeout(() => setToast(null), opts.duration ?? (action ? 6500 : 4000));
  }, []);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  const dismissToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  // --- Firebase Real-time Sync ---
  // Semana compartida → perfil local (solo estado local, nunca escribe).
  useEffect(() => {
    if (!pid) return;
    return listenToPregnancy(pid, (data) => {
      const w = typeof data?.week === "number" && data.week >= 1 && data.week <= 42 ? data.week : undefined;
      const cur = usePandaStore.getState().profile;
      if (w && (w !== cur.week || cur.weekUnknown)) setProfile({ week: w, weekUnknown: false });
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
      const who = n.fromName || (n.fromRole === "papa" ? "Tu copiloto" : "Tu pareja");
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

  const openSymptoms = () => {
    setActiveTab("herramientas");
    setToolOpenRequest({ tool: "sos", nonce: Date.now() });
    window.scrollTo({ top: 0 });
  };

  const startLinkFlow = () => {
    setIsProfileModalOpen(false);
    setLinkFlowOpen(true);
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    toggleThemeStore();
    if (nextDark) {
      document.documentElement.classList.add("dark");
      try { localStorage.setItem("pandajr_theme", "dark"); } catch {}
    } else {
      document.documentElement.classList.remove("dark");
      try { localStorage.setItem("pandajr_theme", "light"); } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(25); } catch {}
    }
  };

  // Detectar si el usuario necesita Onboarding
  useEffect(() => {
    if (hasHydrated && !profile.name) {
      setShowOnboarding(true);
    }
  }, [hasHydrated, profile.name]);

  /** Cambia la semana para ti (y para tu pareja si hay vínculo). Revierte y ofrece "Reintentar" si falla. */
  const shareWeek = (targetPid: string, week: number, previous: { week: number; weekUnknown?: boolean }) => {
    updatePregnancyWeek(targetPid, week).catch(() => {
      if (usePandaStore.getState().profile.pregnancyId !== targetPid) return;
      setProfile({ week: previous.week, weekUnknown: previous.weekUnknown });
      showToast("No pudimos guardar la semana para tu pareja.", () => {
        setProfile({ week, weekUnknown: false });
        shareWeek(targetPid, week, previous);
      }, "Reintentar");
    });
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    const prev = usePandaStore.getState().profile;
    setProfile(updates);
    const targetPid = updates.pregnancyId ?? prev.pregnancyId;
    if (targetPid && typeof updates.week === "number" && !updates.weekUnknown && (updates.week !== prev.week || prev.weekUnknown)) {
      shareWeek(targetPid, updates.week, { week: prev.week, weekUnknown: prev.weekUnknown });
    }
  };

  /** "Guardar Cambios" de Ajustes: dice el alcance real y ofrece deshacer. */
  const saveSettings = (next: UserProfile) => {
    const prev = usePandaStore.getState().profile;
    const weekChanged = next.week !== prev.week || (!!prev.weekUnknown && !next.weekUnknown);
    const localChanged =
      (next.location || "") !== (prev.location || "") ||
      (next.notes || "") !== (prev.notes || "") ||
      (next.comparisonTheme || "frutas") !== (prev.comparisonTheme || "frutas");
    setIsProfileModalOpen(false);
    if (!weekChanged && !localChanged) return;

    const { week, weekUnknown, location, notes, comparisonTheme } = next;
    updateProfile({ week, weekUnknown, location, notes, comparisonTheme });

    const shared = weekChanged && !!prev.pregnancyId;
    const partnerLabel = partner.partnerName || "tu pareja";
    const message = weekChanged
      ? shared
        ? `Semana ${week} actualizada para ti y ${partnerLabel}${localChanged ? ". El resto, solo en este teléfono" : ""}`
        : `Semana ${week} actualizada en este teléfono`
      : "Ajustes guardados en este teléfono";

    // Sin semana previa confirmada no hay a qué volver en la cuenta compartida.
    const canUndo = !(shared && prev.weekUnknown);
    const undo = () => {
      const restore: Partial<UserProfile> = {
        location: prev.location,
        notes: prev.notes,
        comparisonTheme: prev.comparisonTheme,
      };
      if (weekChanged) {
        restore.week = prev.week;
        restore.weekUnknown = prev.weekUnknown;
      }
      updateProfile(restore);
      showToast(weekChanged ? (prev.weekUnknown ? "Volviste a semana sin confirmar" : `Volviste a la semana ${prev.week}`) : "Cambios deshechos");
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

  // Atajo de teclado: tecla Escape para cerrar modales abiertos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isProfileModalOpen) setIsProfileModalOpen(false);
        if (selectedPrepEvent) setSelectedPrepEvent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProfileModalOpen, selectedPrepEvent]);

  if (!hasHydrated) return null;

  return (
    // overflow-x-clip (no hidden): hidden crea un contenedor de scroll y anula el sticky del header.
    <div className={`flex flex-col ${activeTab === "pandaia" ? "h-dvh overflow-hidden" : "min-h-screen pb-[calc(3.5rem+var(--safe-bottom))]"} w-full max-w-md mx-auto bg-[#faf9f5] dark:bg-[#181520] text-stone-900 dark:text-[#eae6e1] font-sans relative shadow-2xl overflow-x-clip transition-colors duration-200 border-x border-stone-200/60 dark:border-white/[0.08]`}>
      {/* Header con Logo, Switch Modo Oscuro, Alerta de Cita y Selector Global de Perfil */}
      <header className="bg-white/95 dark:bg-[#181520]/95 backdrop-blur-md px-3 sm:px-4 pt-[var(--safe-top)] pb-2.5 shadow-xs border-b border-stone-200/70 dark:border-white/[0.08] sticky top-0 z-40 w-full flex items-center justify-between shrink-0 transition-colors">
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
            aria-label="Síntomas de alarma: qué hacer y a quién llamar"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full border border-stone-300 dark:border-white/15 bg-white dark:bg-[#221d2d] text-stone-800 dark:text-[#eae6e1] text-xs font-bold hover:bg-stone-50 dark:hover:bg-[#2d273a] active:scale-95 motion-reduce:active:scale-100 transition-[background-color,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
          >
            <HeartPulse size={16} className="shrink-0 text-terracotta-ink" aria-hidden="true" />
            <span>Síntomas</span>
          </button>

          <HeaderBell events={events} onOpen={(ev) => setSelectedPrepEvent(ev)} />

          {/* Botón Global de Perfil / Switcher */}
          {/* Solo icono: con el acceso a Síntomas, nombre y emoji ya no caben en un teléfono de 360-430px */}
          <button
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
            remoteMomStatus={remoteMomStatus}
            momStatusLoaded={momStatusLoaded}
            partner={partner}
            onRequestLink={startLinkFlow}
            onConfirmWeek={() => setIsProfileModalOpen(true)}
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
          onSkip={() => {
            setProfile({ name: 'Invitado', role: 'papa', week: 1, weekUnknown: true });
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
          onClose={() => setIsProfileModalOpen(false)}
          isDark={isDark}
          toggleTheme={toggleTheme}
          partner={partner}
          showToast={showToast}
          onStartLink={startLinkFlow}
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

      {/* Toast global: la región viva existe siempre para que el lector de pantalla anuncie cada mensaje. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto z-[60] pointer-events-none"
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
      <nav aria-label="Navegación principal" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-[#181520]/95 backdrop-blur-md border-t border-stone-200/80 dark:border-white/[0.08] flex justify-around items-center px-2 pt-2 pb-[var(--safe-bottom)] z-50 transition-colors">
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
      className={`flex flex-col items-center gap-1 w-full p-2 transition-colors duration-200 ${
        isActive ? "text-terracotta-ink dark:text-sage-ink font-semibold" : "text-stone-600 hover:text-stone-800 dark:text-[#a6a1b2] dark:hover:text-[#eae6e1]"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function PregnancyProgressBar({ week }: { week: number }) {
  const percent = Math.min(100, Math.max(0, (week / 40) * 100));
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2 px-1">
        <span className="text-[11px] font-medium text-stone-500 dark:text-[#a6a1b2]">Inicio dulce</span>
        <span className="text-sm font-bold text-stone-800 dark:text-[#eae6e1]">Semana {week} ({Math.round(percent)}%)</span>
        <span className="text-[11px] font-medium text-stone-500 dark:text-[#a6a1b2]">Llegada soñada</span>
      </div>
      <div className="h-2 w-full bg-stone-100 dark:bg-[#2d273a] rounded-full overflow-hidden">
        <div 
          className="h-full bg-sage rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
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
  const partnerLabel = partner.partnerName || (isMama ? "tu copiloto" : "tu pareja");

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
              className={`text-2xl min-w-[44px] min-h-[44px] p-2 rounded-xl transition-all motion-reduce:transition-none ${emoji === m.emoji ? 'bg-terracotta/20 scale-110 motion-reduce:scale-100' : 'hover:bg-stone-100 dark:hover:bg-white/5 opacity-60 hover:opacity-100'}`}
            >
              <span aria-hidden="true">{m.emoji}</span>
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Mensaje sobre cómo te sientes"
          placeholder={linked ? "Escribe un breve mensaje para tu copiloto..." : "Escribe cómo te sientes..."}
          className="w-full bg-stone-50 dark:bg-[#1a1724] rounded-xl p-3 text-base sm:text-sm border border-stone-200 dark:border-white/10 dark:text-white mb-4 resize-none h-24 focus:ring-2 focus:ring-terracotta/50 outline-none"
        />

        <div className="flex gap-2">
          <button type="button" onClick={() => setIsEditing(false)} className="flex-1 min-h-[44px] bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 font-bold py-2.5 rounded-xl transition-colors">Cancelar</button>
          <button type="button" onClick={handleSave} className="flex-1 min-h-[44px] bg-terracotta-ink hover:bg-terracotta-ink-hover text-white font-bold py-2.5 rounded-xl transition-colors">{linked ? "Compartir estado" : "Guardar estado"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-terracotta/10 to-white dark:from-[#2a222f] dark:to-[#1a1724] rounded-3xl shadow-sm border border-terracotta/20 dark:border-terracotta/10 p-6 animate-in fade-in transition-colors">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 border border-stone-200 dark:border-white/[0.06] shrink-0">
            <div className="w-full h-full bg-terracotta/20 flex items-center justify-center text-terracotta-ink font-bold text-lg" aria-hidden="true">
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
          className="w-full min-h-[44px] bg-terracotta/10 hover:bg-terracotta/20 dark:bg-terracotta/20 dark:hover:bg-terracotta/30 text-terracotta-ink border border-terracotta/20 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Edit3 size={16} aria-hidden="true" />
          Actualizar mi estado
        </button>
      ) : linked ? (
        <button
          type="button"
          onClick={sendHug}
          disabled={hugSent}
          className="w-full min-h-[44px] bg-sage/10 hover:bg-sage/20 dark:bg-sage/20 dark:hover:bg-sage/30 text-sage-ink border border-sage/25 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:cursor-default disabled:hover:bg-sage/10"
        >
          {hugSent ? <Check size={16} aria-hidden="true" /> : <Heart size={16} aria-hidden="true" />}
          {hugSent ? `Abrazo enviado a ${partner.partnerName || "tu pareja"}` : "Mandar abrazo virtual"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onRequestLink}
          className="w-full min-h-[44px] bg-sage/10 hover:bg-sage/20 dark:bg-sage/20 dark:hover:bg-sage/30 text-sage-ink border border-sage/25 rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Users size={16} aria-hidden="true" />
          Vincular con mi pareja
        </button>
      )}
    </div>
  );
}

    // --- VISTA 1: GUÍA DEL PAPÁ ---
const masterCategories = [
  // TRIMESTRE 1 (Semanas 1-13)
  {
    id: "t1_nutricion", trimester: 1, defaultExpanded: true,
    title: "Neuro-Nutrición & Clínico",
    icon: <Utensils className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
    tasks: [
      { id: 110, text: "Garantizar Ácido Fólico (mín 400 mcg/día)", detail: "Previene defectos del tubo neural (espina bífida) en esta fase crítica." },
      { id: 111, text: "Eliminar embutidos crudos, sushi y quesos no pasteurizados", detail: "Prevención estricta de Listeriosis y Toxoplasmosis." },
      { id: 112, text: "Agendar primer control y ecografía precoz (Semanas 6-8)", detail: "Para confirmar viabilidad, ubicación uterina y latido fetal." }
    ]
  },
  {
    id: "t1_entorno", trimester: 1, defaultExpanded: true,
    title: "Escudo Ambiental & Soporte",
    icon: <AlertTriangle className="text-terracotta/100" size={20} />, color: "bg-terracotta/10",
    tasks: [
      { id: 113, text: "Asumir la limpieza de cajas de arena (Gatos)", detail: "Riesgo alto de Toxoplasmosis para la madre; el copiloto debe hacerlo." },
      { id: 114, text: "Mitigar náuseas matutinas (Hiperémesis)", detail: "Tener siempre galletas saladas en su buró antes de que se levante." },
      { id: 115, text: "Revisar productos de limpieza", detail: "Alejar parabenos, ftalatos y evitar limpiar con lejía/amoniaco en espacios cerrados." }
    ]
  },
  
  // TRIMESTRE 2 (Semanas 14-27)
  {
    id: "t2_nutricion", trimester: 2, defaultExpanded: true,
    title: "Desarrollo Fetal & Clínico",
    icon: <HeartPulse className="text-sage" size={20} />, color: "bg-sage/10",
    tasks: [
      { id: 210, text: "Incrementar ingesta de Hierro y Vitamina C", detail: "El volumen de sangre materna aumenta 50%, el hierro previene la anemia." },
      { id: 211, text: "Suplementación con DHA (Omega-3)", detail: "Fundamental para la explosión sináptica del cerebro fetal y la retina." },
      { id: 212, text: "Agendar Ecografía Morfológica (Semanas 20-22)", detail: "El ultrasonido más detallado para descartar anomalías anatómicas." },
      { id: 213, text: "Test de O'Sullivan (Semanas 24-28)", detail: "Curva de tolerancia a la glucosa para descartar diabetes gestacional." }
    ]
  },
  {
    id: "t2_preparacion", trimester: 2, defaultExpanded: true,
    title: "Preparación al Parto",
    icon: <Baby className="text-sage" size={20} />, color: "bg-sage/10",
    tasks: [
      { id: 214, text: "Acondicionar ergonomía para el descanso", detail: "Conseguir almohada de embarazo (forma de U/C) para aliviar la ciática pélvica." },
      { id: 215, text: "Inscribirse en clases de psicoprofilaxis perinatal", detail: "Aprender juntos técnicas de respiración, masaje y posiciones de parto." },
      { id: 216, text: "Pintar y ventilar la habitación del bebé", detail: "Hacerlo ahora para asegurar que los gases tóxicos (COVs) se disipen a tiempo." }
    ]
  },

  // TRIMESTRE 3 (Semanas 28-40)
  {
    id: "t3_clinico", trimester: 3, defaultExpanded: true,
    title: "Recta Final & Clínica",
    icon: <Activity className="text-amber-500" size={20} />, color: "bg-amber-100/50 dark:bg-amber-500/10",
    tasks: [
      { id: 310, text: "Aplicar vacuna Tdap materno (Semanas 27-36)", detail: "Traspasa anticuerpos al bebé contra tos ferina, tétanos y difteria." },
      { id: 311, text: "Agendar Cultivo de Estreptococo Grupo B (SGB)", detail: "Semana 35-37. Previene infecciones neonatales graves durante el parto vaginal." },
      { id: 312, text: "Conocer Regla 5-1-1 y Signos de Alarma", detail: "Practica con la app para saber exactamente cuándo ir a urgencias (sangrado, baja de movimientos)." }
    ]
  },
  {
    id: "t3_logistica", trimester: 3, defaultExpanded: true,
    title: "Logística y Supervivencia",
    icon: <ClipboardList className="text-amber-500" size={20} />, color: "bg-amber-100/50 dark:bg-amber-500/10",
    tasks: [
      { id: 313, text: "Vacunar al círculo íntimo (Estrategia Capullo)", detail: "El papá y abuelos cuidadores deben tener la vacuna Tdap e Influenza al día." },
      { id: 314, text: "Instalar y certificar la silla de auto (Car Seat)", detail: "El hospital no les dará el alta si el bebé no está asegurado correctamente en el auto." },
      { id: 315, text: "Armar maleta del hospital y simular ruta", detail: "Hacer simulacro nocturno de manejo para medir tiempos y saber por qué puerta entrar de madrugada." }
    ]
  }
];;

function getWeekData(week: number, theme: "frutas"|"geek" = "frutas") {
  const weeklyDetails = [
    { w: 1, s: { f: "Preparación", g: "Loading..." }, l: "0 cm", wg: "0 g", m: "Preparación del cuerpo", dm: "Planifica una dieta sana y comiencen a tomar vitaminas prenatales.", mm: "Tu cuerpo se prepara para la ovulación. Es un buen momento para iniciar el ácido fólico." },
    { w: 2, s: { f: "Óvulo liberado", g: "Start!" }, l: "0 cm", wg: "0 g", m: "Semana de ovulación", dm: "Días clave. Mantén un ambiente relajado y romántico.", mm: "El cuerpo libera el óvulo. Relájate y mantén un estilo de vida saludable." },
    { w: 3, s: { f: "Semilla de vainilla", g: "Píxel" }, l: "0.01 cm", wg: "0 g", m: "Fecundación", dm: "Apoya a tu pareja; es un proceso invisible pero biológicamente intenso.", mm: "El óvulo fecundado viaja al útero. Puedes sentir leves calambres." },
    { w: 4, s: { f: "Semilla de amapola", g: "Dado D20 miniatura" }, l: "0.1 cm", wg: "1 g", m: "Implantación en el útero", dm: "Eviten el alcohol y el tabaco en casa. Cocina rico y sano.", mm: "El embrión se implanta. Inicia la formación del tubo neural." },
    { w: 5, s: { f: "Grano de pimienta", g: "Tecla de teclado" }, l: "0.3 cm", wg: "1 g", m: "El corazón empieza a latir", dm: "Es normal que sienta mucho cansancio. Ofrécete a hacer las tareas pesadas.", mm: "Tu volumen de sangre aumenta. Descansa siempre que lo necesites." },
    { w: 6, s: { f: "Semilla de granada", g: "Microchip" }, l: "0.6 cm", wg: "1 g", m: "Formación de rostro y extremidades", dm: "Las náuseas pueden aparecer. Ten galletas saladas junto a la cama.", mm: "Las hormonas suben. Come pequeñas porciones y mantente hidratada." },
    { w: 7, s: { f: "Arándano", g: "Dado D6 estándar" }, l: "1.0 cm", wg: "1 g", m: "Desarrollo del cerebro a gran velocidad", dm: "El cerebro fetal genera 100 neuronas por minuto. Prepara cenas ricas en DHA (salmón).", mm: "Sentirás más ganas de ir al baño. No reduzcas tu consumo de agua." },
    { w: 8, s: { f: "Frambuesa", g: "Ficha de LEGO de 1x1" }, l: "1.6 cm", wg: "1 g", m: "Se forman los deditos", dm: "Acompáñala a la primera ecografía si es posible. ¡Escucharán el corazón!", mm: "El cordón umbilical ya funciona por completo." },
    { w: 9, s: { f: "Cereza", g: "Moneda de arcade" }, l: "2.3 cm", wg: "2 g", m: "Desarrollo de articulaciones", dm: "La sensibilidad a los olores es alta. Evita perfumes fuertes o cocinar cosas intensas.", mm: "Los pechos pueden sentirse muy sensibles; usa un sostén cómodo." },
    { w: 10, s: { f: "Fresa", g: "Tamagotchi" }, l: "3.1 cm", wg: "4 g", m: "Fin de la organogénesis crítica", dm: "Los órganos vitales ya están formados. Celebra este primer gran hito con ella.", mm: "¡Termina el periodo embrionario! El riesgo de malformaciones baja drásticamente." },
    { w: 12, s: { f: "Ciruela", g: "Mouse de computadora pequeño" }, l: "5.4 cm", wg: "14 g", m: "Reflejos incipientes", dm: "Fin del primer trimestre. Es un gran momento para planear dar la noticia.", mm: "Las náuseas suelen empezar a ceder. Tu útero crece por encima de la pelvis." },
    { w: 14, s: { f: "Limón", g: "Goma de borrar" }, l: "8.7 cm", wg: "43 g", m: "Comienza el segundo trimestre", dm: "Su energía regresará. Planeen alguna salida especial o una 'babymoon'.", mm: "Empieza la etapa más cómoda. ¡Disfruta el retorno de tu energía!" },
    { w: 16, s: { f: "Aguacate", g: "Control de Switch (Joy-Con)" }, l: "11.6 cm", wg: "100 g", m: "Glándula tiroides funcional", dm: "El bebé ya escucha. Empieza a hablarle a la barriga o léele cuentos.", mm: "Puedes empezar a sentir un 'aleteo'. Es el bebé moviéndose." },
    { w: 20, s: { f: "Plátano", g: "Nintendo Game Boy" }, l: "25.6 cm", wg: "300 g", m: "Ecografía morfológica", dm: "Cita médica crucial. Se revisa toda la anatomía del bebé.", mm: "La barriga ya es evidente. Duerme de lado (preferiblemente izquierdo)." },
    { w: 24, s: { f: "Mazorca de maíz", g: "Sable de luz (mango)" }, l: "30.0 cm", wg: "600 g", m: "Viabilidad fetal", dm: "El bebé ya podría sobrevivir fuera del útero. Hora de armar el presupuesto.", mm: "Prueba de glucosa a la vista. Mantén una dieta equilibrada." },
    { w: 27, s: { f: "Coliflor", g: "iPad Mini" }, l: "36.6 cm", wg: "875 g", m: "Abre los ojos", dm: "Tercer trimestre a la vuelta. Empiecen a cotizar sillas para el auto.", mm: "Puedes sentir hipo fetal (pequeños saltitos rítmicos)." },
    { w: 30, s: { f: "Repollo", g: "Casco de realidad virtual" }, l: "39.9 cm", wg: "1319 g", m: "Desarrollo de corteza cerebral", dm: "Ensambla la cuna. Deja la logística lista en casa.", mm: "El cansancio vuelve. Descansa con las piernas en alto para evitar hinchazón." },
    { w: 34, s: { f: "Melón cantalupo", g: "Consola Steam Deck" }, l: "45.0 cm", wg: "2146 g", m: "Maduración pulmonar", dm: "Revisen la ruta al hospital. Prepara tu maleta también.", mm: "El espacio es reducido, las patadas pueden sentirse más como estiramientos." },
    { w: 38, s: { f: "Calabaza", g: "Consola Retro grande" }, l: "49.8 cm", wg: "3083 g", m: "Embarazo a término", dm: "Ten el tanque del auto lleno y el teléfono cargado siempre.", mm: "Atenta a las contracciones regulares. Descansa todo lo que puedas." },
    { w: 40, s: { f: "Sandía pequeña", g: "PlayStation 5" }, l: "51.2 cm", wg: "3462 g", m: "¡Llegada inminente!", dm: "El gran día. Mantén la calma, respira y sé su pilar de apoyo.", mm: "Confía en tu cuerpo, está diseñado para esto. ¡Ya casi conoces a tu bebé!" },
  ];

  let closest = weeklyDetails[0];
  for (const d of weeklyDetails) {
    if (d.w <= week) closest = d;
  }
  
  return {
    size: theme === "geek" ? closest.s.g : closest.s.f,
    length: closest.l,
    weight: closest.wg,
    milestone: closest.m,
    momMission: closest.mm,
    dadMission: closest.dm
  };
}

function GuiaPapaView({
  showToast,
  profile,
  remoteMomStatus,
  momStatusLoaded,
  partner,
  onRequestLink,
  onConfirmWeek,
}: {
  showToast: ShowToast;
  profile: UserProfile;
  remoteMomStatus: MomStatus | null;
  momStatusLoaded: boolean;
  partner: PartnerInfo;
  onRequestLink: () => void;
  onConfirmWeek: () => void;
}) {
  // Semana sin confirmar: se puede explorar, pero nada se presenta como "tu semana".
  const weekUnknown = !!profile.weekUnknown;
  const [week, setWeek] = useState(profile.week || 14);
  useEffect(() => {
    if (profile.week) setWeek(profile.week);
  }, [profile.week]);
  const weekData = getWeekData(week, profile.comparisonTheme || "frutas");

  // Checklist state
    const currentTrimester = React.useMemo(() => week <= 13 ? 1 : week <= 27 ? 2 : 3, [week]);

  const pid = profile.pregnancyId || "";
  // Con vínculo: lo que dice Firestore (la caché local ya refleja al instante lo que marcas).
  const [remoteChecklist, setRemoteChecklist] = React.useState<{
    pid: string;
    status: Record<string, ChecklistStatusValue>;
    meta: ChecklistMeta;
    /** false = solo caché vacía (sin respuesta del servidor): aún no se sabe qué está marcado. */
    fromServer: boolean;
  } | null>(null);
  // Sin vínculo: progreso en este teléfono (no vuelve a 0 al recargar).
  const [localChecklist, setLocalChecklist] = React.useState<Record<string, ChecklistStatusValue>>(
    () => readStored<Record<string, ChecklistStatusValue>>(LS_CHECKLIST, {})
  );

  // Solo escucha: nunca escribe desde aquí.
  useEffect(() => {
    if (!pid) return;
    let localChecked = false;
    return listenToChecklistProgress(pid, (progress, meta, docMeta) => {
      const status: Record<string, ChecklistStatusValue> = {};
      for (const [k, v] of Object.entries(progress)) {
        if (v === "dismissed") status[k] = "dismissed";
        else if (v) status[k] = "completed"; // `true` = formato antiguo
      }
      const fromServer = !(docMeta?.fromCache && !docMeta.exists);
      setRemoteChecklist({ pid, status, meta: meta ?? {}, fromServer });
      // Traspaso único al vincular (tras el primer dato del servidor): lo marcado "Solo en este
      // teléfono" se suma a lo compartido sin desmarcar nada de la pareja.
      if (!localChecked && docMeta && !docMeta.fromCache) {
        localChecked = true;
        const flag = localToSharedFlag("checklist", pid);
        if (readFlag(flag)) return;
        const local = readStored<Record<string, ChecklistStatusValue>>(LS_CHECKLIST, {});
        const missing = Object.entries(local).filter(([k, v]) => (v === "completed" || v === "dismissed") && !(k in progress));
        if (!readFlag(linkedFromLocalKey(pid)) || missing.length === 0) {
          setFlag(flag);
          return;
        }
        const uid = currentUid();
        const by = uid ? { uid, name: usePandaStore.getState().profile.name || undefined } : undefined;
        Promise.all(missing.map(([k, v]) => setChecklistItem(pid, k, v, by))).then(() => setFlag(flag), () => { /* próxima apertura */ });
      }
    });
  }, [pid]);

  // Hasta el primer dato del servidor del embarazo actual no se puede marcar (no hay estado que respetar).
  const checklistLoaded = !pid || (remoteChecklist?.pid === pid && remoteChecklist.fromServer);
  const taskStatus = React.useMemo<Record<string, ChecklistStatusValue>>(
    () => (pid ? (remoteChecklist?.pid === pid ? remoteChecklist.status : {}) : localChecklist),
    [pid, remoteChecklist, localChecklist]
  );
  const taskMeta = React.useMemo<ChecklistMeta>(
    () => (pid && remoteChecklist?.pid === pid ? remoteChecklist.meta : {}),
    [pid, remoteChecklist]
  );
  const lastChecklistChange = React.useMemo(() => {
    let last: Date | null = null;
    for (const m of Object.values(taskMeta)) if (m.at && (!last || m.at > last)) last = m.at;
    return last;
  }, [taskMeta]);

  const [expandedCats, setExpandedCats] = React.useState<Record<string, boolean>>({});

  const categories = React.useMemo(() => {
    return masterCategories
      .filter(cat => cat.trimester === currentTrimester)
      .map(cat => ({
        ...cat,
        expanded: expandedCats[cat.id] !== undefined ? expandedCats[cat.id] : cat.defaultExpanded,
        tasks: cat.tasks
          .filter(t => taskStatus[t.id] !== "dismissed")
          .map(t => ({ ...t, completed: taskStatus[t.id] === "completed" }))
      }));
  }, [currentTrimester, taskStatus, expandedCats]);

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: categories.find(c => c.id === id)?.expanded ? false : true }));
  };

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

  // Persistencia local del progreso sin vínculo (localStorage, no Firestore).
  useEffect(() => {
    if (!pid) writeStored(LS_CHECKLIST, localChecklist);
  }, [pid, localChecklist]);

  const toggleTask = (taskId: number, label: string) => {
    if (!checklistLoaded) return;
    const key = String(taskId);
    writeTask(key, taskStatus[key] === "completed" ? null : "completed", label);
  };

  /** Quién marcó la tarea (solo con vínculo y si el dato existe). */
  const taskAuthor = (taskId: number) => {
    if (!pid) return null;
    const meta = taskMeta[String(taskId)];
    if (!meta || (!meta.by && !meta.byName)) return null;
    const member = meta.by ? partner.members.find(m => m.uid === meta.by) : undefined;
    const isMe = !!meta.by && meta.by === partner.myUid;
    const role = member?.role ?? (isMe ? profile.role : undefined);
    const name = meta.byName || member?.name || (isMe ? profile.name : undefined);
    const when = meta.at ? formatRelative(meta.at) : "";
    return { name, role, title: `Marcado por ${name || (role ? ROLE_LABEL[role] : "tu pareja")}${when ? ` ${when}` : ""}` };
  };

  const totalTasks = categories.reduce((acc, cat) => acc + cat.tasks.length, 0);
  const completedTasks = categories.reduce((acc, cat) => acc + cat.tasks.filter(t => t.completed).length, 0);
  const progressPercent = Math.round((completedTasks / totalTasks) * 100) || 0;

  return (
    <div className="p-5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* 1. Week Selector & Info */}
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-sm border border-stone-200/80 dark:border-white/[0.08] overflow-hidden transition-colors">
        {/* Selector */}
        <div className="bg-sage-ink dark:bg-[#1a1724] dark:border-b dark:border-white/[0.08] p-4 text-white dark:text-[#eae6e1] flex items-center justify-between transition-colors">
          <button aria-label="Semana anterior"
            onClick={() => setWeek(w => Math.max(1, w - 1))}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <p className="text-white/90 dark:text-[#a6a1b2] text-xs font-semibold tracking-tight mb-1">
              {weekUnknown ? "Explorar semana" : "Semana de Gestación"}
            </p>
            <h2 className="text-3xl font-black">{week}</h2>
          </div>
          <button aria-label="Semana siguiente"
            onClick={() => setWeek(w => Math.min(40, w + 1))}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {weekUnknown && (
          <div className="px-5 pt-4">
            <div className="flex items-start gap-2 rounded-2xl border border-amber-700/30 bg-amber-50 dark:border-amber-300/25 dark:bg-amber-300/[0.08] p-3">
              <Info size={18} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-900 dark:text-[#eae6e1]">Semana sin confirmar</p>
                <p className="mt-0.5 text-xs leading-snug text-stone-700 dark:text-[#d9d4de]">
                  Esto es lo típico de la semana {week}, no de tu embarazo. Confirma la semana para ver lo tuyo.
                </p>
                <button
                  type="button"
                  onClick={onConfirmWeek}
                  className="mt-1 -ml-1 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-1 text-sm font-bold text-terracotta-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
                >
                  Confirmar mi semana
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fetal Size Info */}
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-stone-500 dark:text-[#a6a1b2] text-xs uppercase font-bold mb-1">Tamaño comparativo</p>
              <p className="text-2xl font-black tracking-tight text-stone-800 dark:text-[#eae6e1]">{weekData.size}</p>
            </div>
            <div className="bg-sage/10 dark:bg-[#1a1724] p-3 rounded-2xl">
              <Baby size={32} className="text-terracotta dark:text-sage" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-stone-50 dark:bg-[#2d273a] rounded-2xl p-3 border border-stone-200/80 dark:border-white/[0.06]">
              <p className="text-stone-500 dark:text-[#a6a1b2] text-xs font-bold mb-1">Longitud</p>
              <p className="font-bold text-stone-800 dark:text-[#eae6e1]">{weekData.length}</p>
            </div>
            <div className="bg-stone-50 dark:bg-[#2d273a] rounded-2xl p-3 border border-stone-200/80 dark:border-white/[0.06]">
              <p className="text-stone-500 dark:text-[#a6a1b2] text-xs font-bold mb-1">Peso est.</p>
              <p className="font-bold text-stone-800 dark:text-[#eae6e1]">{weekData.weight}</p>
            </div>
          </div>

          <div className="bg-terracotta/10 dark:bg-terracotta/10 border border-terracotta/25 dark:border-terracotta/20 rounded-2xl p-4 flex gap-3">
            <Sparkles size={24} className="text-terracotta-ink shrink-0" aria-hidden="true" />
            <div>
              <p className="text-terracotta-ink text-xs font-bold uppercase mb-1">Hito de la semana</p>
              <p className="text-stone-800 dark:text-[#eae6e1] text-sm font-medium">{weekData.milestone}</p>
            </div>
          </div>
        </div>

          {!weekUnknown && (
            <div className="border-t border-stone-100 dark:border-white/[0.06] pt-5 mt-5 pb-5">
              <PregnancyProgressBar week={week} />
            </div>
          )}
        {/* Misión */}
        <div className="bg-sage/10 dark:bg-[#1a1724] border-t border-sage/20 dark:border-white/[0.08] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-sage-ink" aria-hidden="true" />
            <h3 className="font-bold text-sage-ink text-sm">
              {profile.role === "papa" ? "Misión del Copiloto" : "Tu Misión"}
            </h3>
          </div>
          <p className="text-stone-700 dark:text-[#eae6e1] text-sm leading-relaxed">
            {profile.role === "papa" ? weekData.dadMission : weekData.momMission}
          </p>
        </div>
      </div>

      {/* 1.5 Mom Status (New Pareja Module) */}
      <div className="pt-2">
        <MomStatusCard
          profile={profile}
          remoteMomStatus={remoteMomStatus}
          remoteLoaded={momStatusLoaded}
          partner={partner}
          showToast={showToast}
          onRequestLink={onRequestLink}
        />
      </div>

      {/* 2. Checklist Module */}
      <div>
        <div className="flex justify-between items-baseline gap-3">
          <h2 className="text-2xl font-black tracking-tight text-stone-800 dark:text-[#eae6e1]">
            {profile.role === "papa" ? "Checklists del Copiloto" : "Mis Checklists"}
          </h2>
          <span className="shrink-0 text-terracotta-ink font-bold text-sm">{checklistLoaded ? `${progressPercent}% completado` : "—"}</span>
        </div>
        {/* Dónde vive este progreso: solo aquí o compartido con la pareja. */}
        <SyncBadge partnerName={partner.partnerName} lastSyncedAt={lastChecklistChange} waiting={!checklistLoaded} className="mt-1 mb-4" />
        {!checklistLoaded && (
          <p className="-mt-2 mb-4 text-xs text-stone-600 dark:text-[#a6a1b2]" aria-live="polite">
            {isOffline() ? "Sin conexión: no podemos mostrar el progreso compartido ahora." : "Cargando el progreso compartido…"}
          </p>
        )}

        {/* Progress bar */}
        <div className="w-full bg-stone-200 dark:bg-[#2d273a] rounded-full h-2.5 mb-5 overflow-hidden">
          <div className="bg-terracotta h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="flex flex-col gap-5">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white dark:bg-[#221d2d] rounded-2xl shadow-sm border border-stone-200/80 dark:border-white/[0.08] overflow-hidden transition-colors">
              <button 
                onClick={() => toggleExpand(cat.id)}
                className="w-full p-4 flex items-center justify-between bg-white dark:bg-[#221d2d] hover:bg-stone-50 dark:hover:bg-[#2d273a]/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`${cat.color} dark:bg-opacity-20 p-2 rounded-xl`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-800 dark:text-[#eae6e1] text-left">{cat.title}</h3>
                    <p className="text-xs text-stone-500 dark:text-[#a6a1b2] text-left">
                      {cat.tasks.filter(t => t.completed).length} de {cat.tasks.length} completadas
                    </p>
                  </div>
                </div>
                {cat.expanded ? <ChevronUp size={20} className="text-stone-500 dark:text-[#a6a1b2]" /> : <ChevronDown size={20} className="text-stone-500 dark:text-[#a6a1b2]" />}
              </button>
              
              {cat.expanded && (
                <div className="p-4 pt-0 border-t border-stone-100 dark:border-white/[0.06] bg-sage/5 dark:bg-[#181520]/60">
                  <div className="flex flex-col gap-2.5 mt-4">
                    {cat.tasks.map(task => {
                      const author = task.completed ? taskAuthor(task.id) : null;
                      return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => toggleTask(task.id, task.text)}
                        disabled={!checklistLoaded}
                        aria-checked={task.completed}
                        role="switch"
                        className="w-full min-h-[44px] text-left flex items-start gap-3 p-3 bg-white dark:bg-[#2d273a] rounded-xl border border-stone-200/80 dark:border-white/[0.06] cursor-pointer hover:border-sage/30 dark:hover:border-sage transition-colors group focus:outline-none focus:ring-2 focus:ring-sage/100 disabled:cursor-wait disabled:opacity-60"
                      >
                        <div className={`mt-0.5 shrink-0 transition-all duration-300 ${task.completed ? "text-sage-ink scale-110" : "text-stone-400 dark:text-[#a6a1b2] group-hover:text-sage group-hover:scale-110"}`}>
                          {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </div>
                        <span className={`flex-1 min-w-0 text-sm leading-snug ${task.completed ? "text-stone-500 dark:text-[#a6a1b2] line-through" : "text-stone-700 dark:text-[#eae6e1]"}`}>
                          {task.text}
                        </span>
                        {author && <AuthorChip size="xs" name={author.name} role={author.role} title={author.title} />}
                      </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

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
function ChatUrgencyBubble({ id, matches, reason, live = true }: { id: string; matches: AlarmSign[]; reason?: string; live?: boolean }) {
  const titleId = React.useId();
  const first = matches[0];
  const extra = matches.length - 1;
  const signLine = first
    ? `${first.title}${extra > 0 ? ` y ${extra} ${extra === 1 ? "señal más" : "señales más"}` : ""}.`
    : reason
      ? `${reason.replace(/[.\s]+$/, "")}.`
      : "Lo que describes puede ser una señal de alarma.";
  const actionLine = first?.id === "salud-mental"
    ? first.detail
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
          no esperes: llama a emergencias o ve a urgencias.
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
  const getContextualChips = (week: number, role: "papa" | "mama") => {
    if (week <= 13) {
      return role === "papa" ? [
        "Alimentos con Colina y DHA para el cerebro",
        "¿Cómo aliviar las náuseas matutinas de mamá?",
        "Agendar ecografía semana 12 (Traslucencia Nucal)",
        "Tareas domésticas y químicos que debo asumir hoy"
      ] : [
        "¿Es normal tener tanta fatiga y sueño?",
        "Alimentos que debo evitar en el 1er trimestre",
        "¿Cuándo se empieza a notar la pancita?",
        "Agendar mi control prenatal de este mes"
      ];
    } else if (week <= 27) {
      return role === "papa" ? [
        "¿Qué evalúa la ecografía morfológica (semana 20)?",
        "¿Cuándo empezaremos a sentir las patadas?",
        "Agendar cita para ecografía 3D / 4D",
        "¿Cómo apoyar a mamá con los dolores de espalda?"
      ] : [
        "¿Cuándo se siente el hipo del bebé?",
        "Cuidados de la piel y suelo pélvico en 2º trimestre",
        "Alimentos recomendados para prevenir anemia",
        "¿Qué dudas llevar a la ecografía morfológica?"
      ];
    } else {
      return role === "papa" ? [
        "Checklist esencial para la maleta del hospital",
        "¿Cómo reconocer las contracciones de parto activo?",
        "Agendar monitoreo fetal preparto",
        "¿Cómo acompañar a mamá en el dolor de parto?"
      ] : [
        "Signos de alarma en el tercer trimestre",
        "Masaje perineal: ¿cómo y cuándo empezar?",
        "¿Cómo saber si rompí bolsa o es flujo?",
        "Revisar las cláusulas de nuestro Plan de Parto"
      ];
    }
  };

  const getUltrasoundItems = (week: number) => {
    if (week <= 13) {
      return [
        {
          title: "Ecografía 11-14: Traslucencia Nucal (TN)",
          desc: "Cribado genético del primer trimestre y hueso nasal",
          prompt: `¿Qué evalúa la Traslucencia Nucal (TN) y el Hueso Nasal en la ecografía de semana ${week} (semanas 11 a 14)?`
        },
        {
          title: `Medidas en Semana ${week}: LCR y DBP`,
          desc: "Longitud cráneo-raudal y diámetro biparietal del bebé",
          prompt: `¿Qué significan las medidas LCR (longitud cráneo-raudal) y DBP en mi ecografía de semana ${week}?`
        },
        {
          title: "Frecuencia Cardíaca Fetal y Vitalidad",
          desc: "Latidos por minuto y flujo en el primer trimestre",
          prompt: `¿Cuál es el rango normal de latidos cardíacos fetales en la semana ${week} y qué indica la vitalidad?`
        },
        {
          title: "Hematomas Subcoriónicos o Cuello Uterino",
          desc: "¿Qué significa si el informe menciona hematoma o sangrado?",
          prompt: `¿Qué significa un hematoma subcoriónico en el primer trimestre (semana ${week}) y qué cuidados se recomiendan?`
        }
      ];
    } else if (week <= 27) {
      return [
        {
          title: "Ecografía Morfológica (Semana 20-22)",
          desc: "Revisión anatómica completa de órganos, corazón y cerebro",
          prompt: `¿Qué evalúa la ecografía morfológica de alta resolución en esta etapa (semana ${week})?`
        },
        {
          title: "Medidas Fetales (DBP, LF, CA, CC)",
          desc: "Diámetros craneales, longitud femoral y perímetro abdominal",
          prompt: `¿Qué significan las siglas DBP, LF, CA y CC en el informe ecográfico de la semana ${week}?`
        },
        {
          title: "Percentiles de Crecimiento y Peso Fetal",
          desc: "¿Cómo interpretar si mi bebé está en percentil 25, 50 o 90?",
          prompt: `¿Qué significa el percentil fetal de crecimiento y peso estimado en la semana ${week}?`
        },
        {
          title: "Doppler de Arterias Uterinas y Placenta",
          desc: "¿Qué evalúa el Doppler uterino y la madurez placentaria?",
          prompt: `¿Qué evalúa el Doppler de arterias uterinas y qué significa el grado placentario en la semana ${week}?`
        }
      ];
    } else {
      return [
        {
          title: `Percentil de Peso en 3er Trimestre (Sem ${week})`,
          desc: "Monitoreo del peso estimado y curvas de crecimiento",
          prompt: `¿Cómo se evalúa el percentil de peso y crecimiento fetal en la semana ${week}?`
        },
        {
          title: "índice de Líquido Amniótico (ILA)",
          desc: "¿Qué significa un índice de líquido amniótico normal o alterado?",
          prompt: `¿Qué significa el índice de Líquido Amniótico (ILA) en la semana ${week} y cuáles son sus rangos normales?`
        },
        {
          title: "Doppler Fetal (Arteria Umbilical y Cerebral Media)",
          desc: "Oxigenación fetal y bienestar hemodinámico",
          prompt: `¿Qué evalúa el Doppler fetal de arteria umbilical y cerebral media en la semana ${week}?`
        },
        {
          title: "Posición Fetal y Grado Placentario",
          desc: "¿Está en posición cefálica? Grado II / III de placenta",
          prompt: `¿Qué significa la posición cefálica o podálica y el grado de madurez placentaria en la semana ${week}?`
        }
      ];
    }
  };

  const getWelcomeText = (week: number | null, role: "papa" | "mama", name?: string) => {
    if (week === null) {
      return `¡Hola ${name || (role === "papa" ? "Papá" : "Mamá")}! Soy PandaIA.\n\nAún no sé en qué semana están: confírmala en **Ajustes** para orientarte mejor. Mientras tanto, pregúntame lo que necesites o pídeme que **agende una cita** diciéndome el día.`;
    }
    return role === "papa"
      ? `¡Hola ${name || "Papá"}! Soy PandaIA, tu copiloto clínico en esta Semana ${week}.\n\nPregúntame sobre el **desarrollo del bebé en la semana ${week}**, neuro-nutrición prenatal (DHA, colina), qué preguntar en la próxima consulta médica, o pídeme que **agende una cita médica** diciéndome el día.`
      : `¡Hola ${name || "Mamá"}! Soy PandaIA, tu espacio de orientación y tranquilidad en esta Semana ${week}.\n\nPuedes consultarme sobre los cambios y síntomas de la **semana ${week}**, nutrición o pedirme que **registre tus próximas citas médicas** diciéndome el día.`;
  };
  const welcomeWeek = profile.weekUnknown ? null : (profile.week || 14);
  const welcomeMessage = (): ChatMessage => ({ id: 1, sender: "ai", text: getWelcomeText(welcomeWeek, profile.role, profile.name) });

  // La conversación se guarda en este teléfono (últimos 60 mensajes, por embarazo o "local").
  const storageKey = chatStorageKey(profile.pregnancyId);
  const online = useOnline();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadStoredChat(storageKey);
    if (!stored) return [welcomeMessage()];
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
  const [smartChips, setSmartChips] = useState<string[]>(() => getContextualChips(profile.week || 14, profile.role));
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
    setSmartChips(getContextualChips(profile.week || 14, profile.role));
  }, [profile.week, profile.role]);

  // Sincronizar mensaje de bienvenida automáticamente con la semana y rol elegidos
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 1) {
        return [{ id: 1, sender: "ai", text: getWelcomeText(welcomeWeek, profile.role, profile.name) }];
      }
      return prev;
    });
  }, [welcomeWeek, profile.role, profile.name]);

  // Si se envió una consulta desde otra pantalla (ej. modal de preparación)
  useEffect(() => {
    if (initialQuery) {
      setInputText(initialQuery);
      if (clearInitialQuery) clearInitialQuery();
      textareaRef.current?.focus();
    }
  }, [initialQuery, clearInitialQuery]);

  // Atajo de teclado: Escape para cerrar el decodificador de ecografías
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsUltrasoundModalOpen(false);
      }
    };
    if (isUltrasoundModalOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isUltrasoundModalOpen]);

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
    setSmartChips(getContextualChips(profile.week || 14, profile.role));
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
          ? "Si le está pasando ahora, no esperes: llama a emergencias o ve a urgencias."
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
            userProfile: profile.role === "papa" ? `Papá${profile.name ? ` (${profile.name})` : ""}` : `Mamá${profile.name ? ` (${profile.name})` : ""}`,
            location: profile.location || "No especificada",
            notes: profile.notes || "Embarazo primerizo"
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
      setAnnouncement(`PandaIA: ${reply}`);
    } catch (err: unknown) {
      // Fallo esperado y manejado (sin red, 503, timeout): warn, no error.
      console.warn("PandaIA no respondió:", err);
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setMessages(prev => [...prev, {
        id: makeId(),
        sender: "ai",
        kind: "error",
        text: "No pude conectar con PandaIA ahora.",
        retryText: text,
        sourceId,
        retrySuggestion: source === "suggestion",
        hadAlarm: urgencyShown,
        offline
      }]);
      setAnnouncement(`No pude conectar con PandaIA ahora.${offline ? " Parece que no tienes conexión a internet." : ""} Si es urgente, llama a emergencias.`);
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
          <h4 key={idx} className="font-bold text-teal-950 dark:text-sage/80 text-sm mt-3 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-terracotta inline-block"></span>
            <span>{headerText}</span>
          </h4>
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
            <span className="text-xs font-bold text-sage dark:text-sage/30 bg-sage/20/90 dark:bg-[#1a1724] px-1.5 py-0.5 rounded-md shrink-0 mt-0.5">{num}</span>
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
            <span className="text-terracotta dark:text-sage font-bold shrink-0 mt-0.5">•</span>
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
            <h2 className="font-bold text-stone-900 dark:text-[#eae6e1] leading-tight flex items-center gap-1.5 text-sm">
              <span>PandaIA</span>
              <span className="text-xs font-bold text-sage-ink bg-sage/10 dark:bg-[#1a1724] border border-sage-ink/25 px-2 py-0.5 rounded-full tracking-tight">
                Asistente
              </span>
            </h2>
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
            title="Reiniciar conversación (se guarda en este teléfono)"
            aria-label="Reiniciar conversación"
          >
            <RotateCcw size={16} />
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
                <div className="bg-sage/20 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-1.5 rounded-xl shrink-0 mb-1 shadow-xs">
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
                          Ver síntomas de alarma
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
              <div className="bg-sage/20 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-1.5 rounded-xl shrink-0 mb-1 shadow-xs">
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
                      <h5 className="flex items-start gap-1.5 font-bold text-stone-900 dark:text-[#eae6e1] text-sm">
                        {inAgenda
                          ? <CalendarCheck size={16} className="mt-0.5 shrink-0 text-sage-ink" aria-hidden="true" />
                          : <CalendarX size={16} className="mt-0.5 shrink-0 text-stone-500 dark:text-[#a6a1b2]" aria-hidden="true" />}
                        <span>{card.title}</span>
                      </h5>
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
                      <h5 className="flex items-start gap-1.5 font-bold text-stone-900 dark:text-[#eae6e1] text-sm">
                        <CalendarClock size={16} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden="true" />
                        <span>¿Qué día es{card.title ? ` «${card.title}»` : " la cita"}?</span>
                      </h5>
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
                    <h5 className="flex items-start gap-1.5 font-bold text-stone-900 dark:text-[#eae6e1] text-sm">
                      <Lightbulb size={16} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
                      <span>{info.title}</span>
                    </h5>
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
            <div className="bg-sage/20 dark:bg-[#1a1724] text-sage dark:text-sage/80 p-1.5 rounded-xl shrink-0 mb-1 shadow-xs">
              <Bot size={16} />
            </div>
            <div className="bg-white dark:bg-[#221d2d] px-4 py-3 rounded-2xl rounded-bl-none shadow-xs border border-stone-100 dark:border-white/[0.08] flex gap-2 items-center">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" style={{ animationDelay: "0.15s" }}></div>
                <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" style={{ animationDelay: "0.3s" }}></div>
              </div>
              <span className="text-xs text-stone-400 dark:text-[#a6a1b2] font-medium">PandaIA está respondiendo...</span>
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
              className="whitespace-nowrap inline-flex items-center gap-1.5 bg-sage/10 dark:bg-[#2d273a] border border-sage/30 dark:border-white/10 text-sage-ink text-xs font-semibold px-3.5 py-2 min-h-[44px] rounded-full hover:bg-sage/20 dark:hover:bg-[#383147] active:scale-95 motion-reduce:active:scale-100 transition-all shadow-2xs"
            >
              {schedule && <CalendarClock size={14} className="shrink-0" aria-hidden="true" />}
              {chip}
            </button>
            );
          })}
        </div>

        {/* Text Input Ergonómico */}
        <div className="p-2.5">
          <div className="flex items-end gap-2 bg-stone-50 dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-sage/100 focus-within:border-transparent transition-all shadow-xs">
            <button 
              type="button"
              aria-label="Cargar consulta sobre ecografías"
              onClick={() => setIsUltrasoundModalOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-600 dark:text-[#a6a1b2] hover:text-sage-ink transition-colors shrink-0 rounded-xl hover:bg-white dark:hover:bg-[#221d2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
              title="Preguntas frecuentes sobre ecografías"
            >
              <Paperclip size={18} />
            </button>
            <textarea 
              ref={textareaRef}
              aria-label="Escribe tu consulta para PandaIA"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(inputText);
                }
              }}
              placeholder="Escribe tu pregunta..."
              className="flex-1 bg-transparent border-none focus:outline-none text-base sm:text-sm py-2 resize-none max-h-32 min-h-[40px] text-stone-800 dark:text-[#eae6e1] placeholder:text-stone-500 dark:placeholder:text-[#948fa1] overflow-y-auto no-scrollbar"
            />
            <button 
              type="button"
              aria-label="Enviar mensaje a PandaIA"
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isTyping}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all shrink-0 active:scale-90 motion-reduce:active:scale-100 ${
                inputText.trim() && !isTyping 
                  ? "bg-terracotta-ink text-white hover:bg-terracotta-ink-hover shadow-xs" 
                  : "bg-stone-200 dark:bg-[#2a2e37] text-stone-400 dark:text-[#a6a1b2]/60 cursor-not-allowed"
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL / SHEET DECODIFICADOR DE ECOGRAFíAS */}
      {isUltrasoundModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="ultrasound-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setIsUltrasoundModalOpen(false); }}
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-[#221d2d] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-200 border border-stone-100 dark:border-white/[0.08]">
            <div className="bg-sage-ink p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="bg-white/10 p-2 rounded-xl">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 id="ultrasound-modal-title" className="font-bold text-sm leading-tight">
                    Decodificador de Ecografía
                  </h3>
                  <p className="text-xs text-white/90">
                    Preguntas rápidas para interpretar tu ecografía
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsUltrasoundModalOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Cerrar ventana de ecografías"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mb-3">
                Selecciona una consulta frecuente para que PandaIA te explique los valores clínicos con calma:
              </p>

              {getUltrasoundItems(profile.week || 14).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleUltrasoundSelect(item.prompt)}
                  className="w-full text-left p-3.5 rounded-2xl border border-stone-100 dark:border-white/[0.08] bg-stone-50/70 dark:bg-[#2d273a]/60 hover:bg-sage/10/60 dark:hover:bg-[#2d273a] hover:border-sage/30 dark:hover:border-sage/100/30 transition-all flex items-start justify-between gap-3 group active:scale-[0.99]"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-900 dark:text-[#eae6e1] group-hover:text-sage dark:group-hover:text-sage/80 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0"></span>
                      <span>{item.title}</span>
                    </p>
                    <p className="text-xs text-stone-500 dark:text-[#a6a1b2] mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-stone-400 dark:text-[#a6a1b2] group-hover:text-terracotta dark:group-hover:text-sage/80 shrink-0 mt-1" />
                </button>
              ))}
            </div>

            <div className="p-3 bg-stone-50 dark:bg-[#221d2d] border-t border-stone-100 dark:border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setIsUltrasoundModalOpen(false)}
                className="min-h-[44px] px-4 text-sm font-semibold text-stone-600 dark:text-[#a6a1b2] hover:text-stone-800 dark:hover:text-[#eae6e1] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- VISTA 4: HERRAMIENTAS ---