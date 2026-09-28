"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";
import { getWeekData } from "./weekData";
import { usePandaStore } from "@/store/usePandaStore";
import {
  listenToKickSessions,
  mutateKickSessions,
  listenToContractions,
  mutateContractions,
  listenToBudget,
  mutateBudgetItems,
  saveBudgetCap,
  listenToBudgetCap,
  listenToBirthPlan,
  saveBirthPlan,
  listenToBabyNamesV2,
  addBabyName,
  voteBabyName,
  migrateLegacyBabyNames,
  isMatch,
  babyNameKey,
  listenToJournal,
  addJournalEntry,
  importJournalEntries,
  deleteJournalEntry,
  listenToGoBag,
  toggleGoBagItem,
  type BabyName,
  type Member,
  type SharedDocMeta,
} from "@/lib/firebase/pairing";
import { formatDateShort, formatMoney, formatRelative, repairMojibake, toDateSafe } from "@/lib/format";
import { LEGACY_SEED_NAMES, isLegacySeedKickSession, isLegacySeedNameItem, linkedFromLocalKey, localToSharedFlag } from "@/lib/seeds";
import { AuthorChip } from "@/components/AuthorChip";
import { SyncBadge, useOnline, usePartner } from "@/components/SyncBadge";
import { CallActions, EmergencyCallLink } from "@/components/CallActions";
import { useDetectedEmergency } from "@/lib/useCareTeam";
import { URGENT_SIGNS, CALL_TODAY_SIGNS, clinicalWeek, isPreterm, telHref, type AlarmSign } from "@/lib/urgency";
import { signCopy } from "@/lib/urgencyCopy";
import { ModalPortal } from "@/components/ModalPortal";
import { useModalDialog } from "@/lib/useModalDialog";
import { Z_CLASS } from "@/lib/layers";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Baby, BookOpen, CalendarClock, Camera, Check, CheckCircle, CheckCircle2,
  ChevronDown, ChevronRight, ChevronUp, Circle, CircleAlert, ClipboardList, Clock, CloudOff, Edit3, FileText, Flame, HeartHandshake,
  Heart, HeartPulse, History, ImagePlus, Info, LoaderCircle, Minus, Moon, Music, Package, Pencil, Phone, PhoneCall, Play,
  Plus, Printer, RefreshCw, RotateCcw, Send, Share2, Siren, Sparkles, Square, Tag, Timer, Trash2, Trophy, Undo2, Users, Utensils,
  Wallet, Wand2, Waves, X,
} from "lucide-react";


export interface UserProfile {
  role: "papa" | "mama";
  name: string;
  week: number;
  /** Semana sin confirmar: las reglas clínicas la tratan como desconocida. */
  weekUnknown?: boolean;
  location?: string;
  notes?: string;
  pregnancyId?: string;
  inviteCode?: string;
    comparisonTheme?: "frutas" | "geek";
}


type SosLinkTool = "patadas" | "contracciones";

/**
 * Semana gestacional usable (entera y positiva) o undefined si no se conoce o no está
 * confirmada (registro omitido): nunca se aplica una regla clínica a una semana de relleno.
 */
function knownWeek(profile?: UserProfile): number | undefined {
  // Misma regla que el chat y el servidor: sin confirmar o menor de 4 → desconocida.
  return clinicalWeek(profile);
}

/**
 * Emergencias siempre a un toque; obstetra y hospital plegados debajo.
 * Para los contadores, donde las llamadas deben estar a mano sin tapar el cronómetro.
 */
function QuickCallBlock({ context, children }: { context: "patadas" | "contracciones"; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = React.useId();
  return (
    <div className="rounded-3xl border border-stone-200 dark:border-white/[0.08] bg-[#fdfbf7] dark:bg-[#221d2d] p-4">
      {children}
      <EmergencyCallLink className="mt-3" withNote />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`mt-1 -ml-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-bold text-terracotta-ink underline-offset-4 hover:underline ${sosFocusRing}`}
      >
        <Phone size={16} aria-hidden="true" />
        {open ? "Ocultar obstetra y hospital" : "Obstetra y hospital"}
        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>
      <div id={panelId} hidden={!open}>
        {open && <CallActions context={context} showEmergency={false} className="mt-2" />}
      </div>
    </div>
  );
}

/** Lee JSON de localStorage sin romper en modo privado o SSR. */
function readStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeStored(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento local: el estado en memoria sigue.
  }
}

// ---------------------------------------------------------------------------
// Utilidades compartidas: sincronización honesta con la pareja (fase 2)
// ---------------------------------------------------------------------------

/** Contrato del toast de page.tsx: solo pinta "Deshacer" si llega onUndo (nunca pases () => {}). */
export type ShowToast = (message: string, onUndo?: () => void) => void;
type Role = "mama" | "papa";

const noopSubscribe = () => () => {};
/** true en el cliente y false en el servidor (para portales sin setState en efectos). */
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Reloj que se refresca cada `intervalMs` mientras `active` (para "hace 5 minutos" y cronómetros). */
function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [intervalMs, active]);
  return now;
}

/**
 * Marca de tiempo para manejadores de evento. (El linter del compilador de React no distingue
 * algunos manejadores que escriben refs de código de render; aquí nunca se llama al renderizar.)
 */
function nowMs(): number {
  return Date.now();
}

/** Id para ítems nuevos. */
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // contexto no seguro: seguimos con el respaldo
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
/** Texto limpio (repara mojibake antiguo) o "" si no es texto. */
function cleanStr(v: unknown, max = 200): string {
  return typeof v === "string" ? repairMojibake(v).trim().slice(0, max) : "";
}
function finiteNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function omitKey<V>(o: Record<string, V>, key: string): Record<string, V> {
  if (!(key in o)) return o;
  const next = { ...o };
  delete next[key];
  return next;
}

/** Quién marcó algo en una lista compartida. */
type Authored = { byUid?: string; byName?: string; byRole?: Role };

function authoredFrom(r: Record<string, unknown>): Authored {
  const byRole = r.byRole === "mama" || r.byRole === "papa" ? r.byRole : undefined;
  return {
    byUid: typeof r.byUid === "string" ? r.byUid : undefined,
    byName: cleanStr(r.byName, 60) || undefined,
    byRole,
  };
}

/** Identidad de este teléfono en el embarazo compartido (sin vínculo: solo nombre y rol). */
function useMe() {
  const pid = usePandaStore((s) => s.profile.pregnancyId);
  const name = usePandaStore((s) => s.profile.name);
  const role = usePandaStore((s) => s.profile.role);
  const partner = usePartner(!!pid);
  return { pid, name, role, partner, myUid: partner.myUid, members: partner.members };
}

type Me = ReturnType<typeof useMe>;

/**
 * Textos de los contadores según quién los lee: la mamá ("recuéstate") o el copiloto, que
 * acompaña ("pídele a Ana que se recueste"). `her` es el nombre de la pareja o "tu pareja".
 */
function companionVoice(me: Me) {
  const isPapa = me.role === "papa";
  const her = me.partner.partnerName?.trim() || "tu pareja";
  const Her = her.charAt(0).toLocaleUpperCase("es") + her.slice(1);
  return { isPapa, her, Her };
}

/** Firma para lo que registra este teléfono (solo con vínculo: sin pareja no hay a quién mostrarlo). */
function authorStamp(me: Me): Authored {
  if (!me.pid) return {};
  return { byUid: me.myUid ?? undefined, byName: me.name?.trim() || undefined, byRole: me.role };
}

/** Inicial de quien marcó el ítem. Usa el nombre actual del miembro si sigue en el embarazo. */
function ItemAuthor({ item, members, size = "xs" }: { item: Authored; members: Member[]; size?: "xs" | "sm" }) {
  if (!item.byRole && !item.byName && !item.byUid) return null;
  const member = item.byUid ? members.find((m) => m.uid === item.byUid) : undefined;
  return <AuthorChip name={member?.name ?? item.byName} role={member?.role ?? item.byRole} size={size} />;
}

// --- Aviso de error con "Reintentar" (el toast de page.tsx solo sabe "Deshacer") ---

type RetryState = { message: string; retry: () => void } | null;

function useRetry() {
  const [retryState, setRetryState] = useState<RetryState>(null);
  const fail = useCallback((message: string, retry: () => void) => setRetryState({ message, retry }), []);
  const clearRetry = useCallback(() => setRetryState(null), []);
  return { retryState, fail, clearRetry };
}

function RetryNotice({ state, onDismiss, className = "" }: { state: RetryState; onDismiss?: () => void; className?: string }) {
  if (!state) return null;
  return (
    <div
      role="alert"
      className={`flex items-center gap-2 rounded-2xl border border-terracotta-ink/30 bg-terracotta/10 py-1 pl-4 pr-1 dark:bg-terracotta/[0.12] ${className}`}
    >
      <CircleAlert size={18} className="shrink-0 text-terracotta-ink" aria-hidden="true" />
      <p className="min-w-0 flex-1 py-2 text-sm leading-snug text-stone-800 dark:text-[#eae6e1]">{state.message}</p>
      <button
        type="button"
        onClick={() => {
          onDismiss?.();
          state.retry();
        }}
        className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-terracotta-ink hover:bg-terracotta/15 ${sosFocusRing}`}
      >
        <RefreshCw size={15} aria-hidden="true" />
        Reintentar
      </button>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-stone-600 hover:bg-terracotta/15 dark:text-[#a6a1b2] ${sosFocusRing}`}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Aviso cuando no se pudo leer lo compartido (sin permisos o sin red). */
function LoadErrorNotice({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <RetryNotice state={{ message: `No pudimos cargar ${what}. Revisa tu conexión.`, retry: onRetry }} />
  );
}

// --- Listas compartidas (patadas, contracciones, presupuesto) ---

type SharedListSpec<T extends { id: string | number }> = {
  /** Clave de localStorage para el modo sin vínculo. */
  localKey: string;
  listen: (pid: string, cb: (items: unknown[], meta: SharedDocMeta) => void, onError?: (e: Error) => void) => () => void;
  mutate: (pid: string, fn: (items: T[]) => T[]) => Promise<T[]>;
  /** Valida, limpia y ordena lo que llega (sin semillas). Debe ser una función estable (de módulo). */
  sanitize: (raw: unknown[]) => T[];
  /** Semillas antiguas que se purgan UNA vez por embarazo, tras el primer snapshot del servidor. */
  seed?: { name: string; is: (item: unknown) => boolean };
  /**
   * Traspaso único de lo guardado en este teléfono (localKey) al embarazo compartido:
   * - siempre que el teléfono se vincula después de registrar sin vínculo (marca linkedFromLocalKey);
   * - con `upgrade: true`, también para parejas ya vinculadas cuya versión anterior guardaba esta
   *   lista SOLO en el teléfono (patadas y contracciones).
   */
  localMerge: { tool: string; upgrade: boolean };
};

type PendingOp<T> = { key: number; pid: string; fn: (items: T[]) => T[]; committed: boolean };

/** Purga única e idempotente de semillas (marca en localStorage por embarazo). */
function purgeSeedsOnce<T extends { id: string | number }>(pid: string, spec: SharedListSpec<T>, raw: unknown[]) {
  const seed = spec.seed;
  if (!seed) return;
  const flag = `pandajr_mig_${seed.name}_${pid}`;
  if (readStored(flag)) return;
  if (!raw.some(seed.is)) {
    writeStored(flag, true);
    return;
  }
  spec.mutate(pid, (items) => items.filter((item) => !seed.is(item))).then(
    () => writeStored(flag, true),
    () => {
      // Se intentará la próxima vez que se abra la herramienta; mientras, la UI ya las oculta.
    }
  );
}

/**
 * Traspaso único (por herramienta, embarazo y teléfono) de lo que había "Solo en este teléfono"
 * al embarazo compartido. Solo agrega por id lo que falte: nunca pisa ni borra lo remoto.
 */
function mergeLocalOnce<T extends { id: string | number }>(
  pid: string,
  spec: SharedListSpec<T>,
  raw: unknown[],
  stamp: Authored
) {
  const flag = localToSharedFlag(spec.localMerge.tool, pid);
  if (readStored(flag)) return;
  if (!spec.localMerge.upgrade && !readStored(linkedFromLocalKey(pid))) {
    writeStored(flag, true);
    return;
  }
  const remoteIds = new Set(spec.sanitize(raw).map((i) => String(i.id)));
  const missing = spec
    .sanitize(asArray(readStored(spec.localKey)))
    .filter((i) => !remoteIds.has(String(i.id)))
    // Lo registrado sin vínculo no tenía firma: se firma con quien lo sube (sin pisar una firma existente).
    .map((i) => {
      const item = i as T & Authored;
      return {
        ...item,
        byUid: item.byUid ?? stamp.byUid,
        byName: item.byName ?? stamp.byName,
        byRole: item.byRole ?? stamp.byRole,
      } as T;
    });
  if (!missing.length) {
    writeStored(flag, true);
    return;
  }
  spec.mutate(pid, restoreItems(missing)).then(
    () => writeStored(flag, true),
    () => {
      // Se intentará la próxima vez que se abra la herramienta.
    }
  );
}

const outboxKey = (localKey: string, pid: string) => `pandajr_outbox_${localKey}_${pid}`;

// Bandeja de salida en localStorage como "store externo" (texto crudo: estable entre renders).
const outboxListeners = new Set<() => void>();
function subscribeOutbox(cb: () => void) {
  outboxListeners.add(cb);
  return () => {
    outboxListeners.delete(cb);
  };
}
function notifyOutbox() {
  outboxListeners.forEach((l) => l());
}
function readRawStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Lista compartida con UI optimista y sin bucles (PRODUCT.md §2):
 * - Con vínculo: el listener solo actualiza estado; `apply(fn)` escribe con una transacción
 *   (mutate*) desde el manejador y muestra el cambio al instante como operación pendiente.
 *   `fn` debe ser pura e idempotente (agregar/quitar/editar por id), porque se aplica sobre
 *   la versión del servidor y puede volver a aplicarse sobre el siguiente snapshot.
 * - `add(item)`: los registros NUEVOS van además a una bandeja de salida en localStorage
 *   (por embarazo). Si la transacción falla o la app se cierra sin señal, el registro no se
 *   pierde: se sigue viendo ("Sin enviar"), cuenta para las alertas y se reenvía al volver la
 *   conexión o al abrir la herramienta.
 * - "Cargado" = llegó un dato del servidor (un snapshot vacío que viene solo de la caché no
 *   cuenta: sería un estado vacío falso).
 * - Sin vínculo: localStorage (se lee al abrir y se escribe en cada cambio).
 */
function useSharedList<T extends { id: string | number }>(pid: string | undefined, spec: SharedListSpec<T>, stamp?: Authored) {
  const { localKey, listen, mutate, sanitize } = spec;
  const [local, setLocal] = useState<T[]>(() => sanitize(asArray(readStored(localKey))));
  const localRef = useRef(local);
  const [remote, setRemote] = useState<{ pid: string; items: T[]; meta: SharedDocMeta } | null>(null);
  const [errorPid, setErrorPid] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ops, setOps] = useState<PendingOp<T>[]>([]);
  const opKey = useRef(0);
  const flushingRef = useRef(false);
  // Registros nuevos cuya transacción sigue en curso: con señal no se marcan "Sin enviar" todavía.
  const [inflight, setInflight] = useState<ReadonlySet<string>>(() => new Set());
  const online = useOnline();
  const stampRef = useRef(stamp);
  useEffect(() => {
    stampRef.current = stamp;
  });

  const editOutbox = useCallback(
    (p: string, fn: (items: T[]) => T[]) => {
      const key = outboxKey(localKey, p);
      const next = fn(sanitize(asArray(readStored(key))));
      writeStored(key, next.length ? next : null);
      notifyOutbox();
    },
    [localKey, sanitize]
  );

  /** Reenvía la bandeja de salida (agregar por id: idempotente). */
  const flushOutbox = useCallback(
    (p: string) => {
      const pending = sanitize(asArray(readStored(outboxKey(localKey, p))));
      if (!pending.length || flushingRef.current) return;
      flushingRef.current = true;
      const sent = new Set(pending.map((i) => String(i.id)));
      mutate(p, restoreItems(pending))
        .then(
          () => editOutbox(p, (items) => items.filter((i) => !sent.has(String(i.id)))),
          () => {
            // Sigue en la bandeja: se reintenta con la próxima conexión o al volver a abrir.
          }
        )
        .finally(() => {
          flushingRef.current = false;
        });
    },
    [localKey, mutate, sanitize, editOutbox]
  );

  useEffect(() => {
    if (!pid) return;
    let firstServerSnapshot = true;
    return listen(
      pid,
      (raw, meta) => {
        setRemote({ pid, items: sanitize(raw), meta });
        setErrorPid(null);
        // Las operaciones ya confirmadas vienen incluidas en este snapshot.
        setOps((prev) => (prev.some((o) => o.committed) ? prev.filter((o) => !o.committed) : prev));
        // Migraciones y reenvíos de una vez por apertura, solo con datos del servidor.
        if (firstServerSnapshot && !meta.fromCache) {
          firstServerSnapshot = false;
          purgeSeedsOnce(pid, spec, raw);
          mergeLocalOnce(pid, spec, raw, stampRef.current ?? {});
          flushOutbox(pid);
        }
      },
      () => setErrorPid(pid)
    );
    // `spec` es una constante de módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, attempt]);

  // Al volver la señal se reenvía lo que quedó sin enviar (manejador de evento, no de snapshot).
  useEffect(() => {
    if (!pid) return;
    const onOnline = () => flushOutbox(pid);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [pid, flushOutbox]);

  const current = pid && remote?.pid === pid ? remote : null;
  // Snapshot vacío que viene solo de la caché (sin señal o el servidor aún no responde): no es "vacío".
  const serverLoaded = !!current && !(current.meta.fromCache && !current.meta.exists);

  const outboxStorageKey = pid ? outboxKey(localKey, pid) : "";
  const outboxRaw = useSyncExternalStore(
    subscribeOutbox,
    () => (outboxStorageKey ? readRawStored(outboxStorageKey) : null),
    () => null
  );
  const outbox = useMemo(() => {
    if (!outboxRaw) return [];
    try {
      return sanitize(asArray(JSON.parse(outboxRaw)));
    } catch {
      return [];
    }
  }, [outboxRaw, sanitize]);

  // Sin useMemo: con la bandeja de salida el compilador de React no puede conservarlo, y la lista
  // es corta (sin operaciones pendientes devuelve el mismo array del snapshot).
  const items = (() => {
    if (!pid) return local;
    const base = current?.items ?? [];
    const mine = ops.filter((o) => o.pid === pid);
    if (!mine.length && !outbox.length) return base;
    const withOps = mine.reduce((list, op) => op.fn(list), base);
    // Lo que sigue en la bandeja de salida y aún no está en la lista (agregar por id).
    const present = new Set(withOps.map((i) => String(i.id)));
    const unsent = outbox.filter((o) => !present.has(String(o.id)));
    return sanitize([...unsent, ...withOps]);
  })();

  /** Ids de registros propios que aún no llegan al servidor (sin contar los que se están enviando con señal). */
  const unsentIds = useMemo(() => {
    if (!pid || !outbox.length) return new Set<string>();
    const onServer = new Set((current?.items ?? []).map((i) => String(i.id)));
    return new Set(
      outbox.map((i) => String(i.id)).filter((id) => !onServer.has(id) && (!online || !inflight.has(id)))
    );
  }, [pid, outbox, current, online, inflight]);

  const apply = useCallback(
    (fn: (items: T[]) => T[]): Promise<boolean> => {
      if (!pid) {
        const next = sanitize(fn(localRef.current.slice()));
        localRef.current = next;
        setLocal(next);
        writeStored(localKey, next);
        return Promise.resolve(true);
      }
      const key = ++opKey.current;
      const opPid = pid;
      // Borrar o editar un registro que sigue en la bandeja también lo cambia ahí (sin agregar otros).
      const inOutbox = new Set(sanitize(asArray(readStored(outboxKey(localKey, opPid)))).map((i) => String(i.id)));
      if (inOutbox.size) editOutbox(opPid, (list) => fn(list).filter((i) => inOutbox.has(String(i.id))));
      setOps((prev) => [...prev, { key, pid: opPid, fn, committed: false }]);
      return mutate(opPid, fn).then(
        () => {
          setOps((prev) => prev.map((o) => (o.key === key ? { ...o, committed: true } : o)));
          return true;
        },
        () => {
          setOps((prev) => prev.filter((o) => o.key !== key));
          return false;
        }
      );
    },
    [pid, localKey, mutate, sanitize, editOutbox]
  );

  /**
   * Registro nuevo. Con vínculo queda en la bandeja de salida hasta que el servidor lo confirma:
   * nunca desaparece por un fallo de red (no hace falta "Reintentar", se reenvía solo).
   */
  const add = useCallback(
    (item: T): Promise<boolean> => {
      if (!pid) return apply(upsertFirst(item));
      const p = pid;
      const id = String(item.id);
      editOutbox(p, (list) => [item, ...list.filter((i) => String(i.id) !== id)]);
      setInflight((prev) => new Set(prev).add(id));
      return apply(upsertFirst(item)).then((ok) => {
        if (ok) editOutbox(p, (list) => list.filter((i) => String(i.id) !== id));
        setInflight((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return ok;
      });
    },
    [pid, apply, editOutbox]
  );

  return {
    items,
    linked: !!pid,
    loaded: !pid || serverLoaded,
    meta: current?.meta ?? null,
    loadError: !!pid && errorPid === pid && !serverLoaded,
    retryLoad: () => setAttempt((a) => a + 1),
    apply,
    add,
    unsentIds,
    retryUnsent: () => {
      if (pid) flushOutbox(pid);
    },
  };
}

/** Aviso de registros propios que aún no llegan a la pareja (se reenvían solos). */
function UnsentNotice({ count, onRetry, one, many }: { count: number; onRetry: () => void; one: string; many: string }) {
  const online = useOnline();
  if (count === 0) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-2xl border border-amber-700/30 bg-amber-50 py-1 pl-4 pr-1 dark:border-amber-300/25 dark:bg-amber-300/[0.08]">
      <CloudOff size={18} className="shrink-0 text-amber-800 dark:text-amber-300" aria-hidden="true" />
      <p className="min-w-0 flex-1 py-2 text-sm leading-snug text-stone-800 dark:text-[#eae6e1]">
        {count === 1 ? `1 ${one} aún sin enviar a tu pareja.` : `${count} ${many} aún sin enviar a tu pareja.`}{" "}
        {online ? "No se pierde: queda en este teléfono y se reenvía." : "No se pierde: queda en este teléfono y se enviará al volver la señal."}
      </p>
      {online && (
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-300/10 ${sosFocusRing}`}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}

/** Carga de lo compartido: distingue "conectando" de "sin señal" (nunca un vacío falso). */
function SharedLoading({ what }: { what: string }) {
  const online = useOnline();
  return (
    <p role="status" className="py-6 text-center text-sm text-stone-600 dark:text-[#a6a1b2]">
      {online
        ? `Cargando ${what}…`
        : `Sin conexión: no podemos mostrar ${what}. Lo que registres aquí se guarda en este teléfono.`}
    </p>
  );
}

/** Agrega (o reemplaza) por id al principio: idempotente. */
function upsertFirst<T extends { id: string | number }>(item: T) {
  return (items: T[]) => [item, ...items.filter((i) => String(i.id) !== String(item.id))];
}
function removeById<T extends { id: string | number }>(id: string | number) {
  return (items: T[]) => items.filter((i) => String(i.id) !== String(id));
}
function patchById<T extends { id: string | number }>(id: string | number, patch: Partial<T>) {
  return (items: T[]) => items.map((i) => (String(i.id) === String(id) ? { ...i, ...patch } : i));
}
/** Vuelve a poner ítems borrados (deshacer) sin duplicar los que ya estén. */
function restoreItems<T extends { id: string | number }>(restored: T[]) {
  return (items: T[]) => {
    const present = new Set(items.map((i) => String(i.id)));
    return [...restored.filter((r) => !present.has(String(r.id))), ...items];
  };
}

/** "Hoy, 10:30" / "Ayer, 10:30" / "12 oct, 10:30" a partir de un timestamp. */
function formatDayTime(ts: number, now: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  const today = new Date(now);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (days === 0) return `Hoy, ${time}`;
  if (days === 1) return `Ayer, ${time}`;
  return `${formatDateShort(d)}, ${time}`;
}

/**
 * Atajos de teclado de los contadores: no deben disparar cuando el foco está en un
 * control (botón, enlace, campo) ni dentro de un diálogo como la hoja del equipo de salud.
 */
function isControlTarget(target: EventTarget | null): boolean {
  // Con un diálogo modal abierto (p. ej. el equipo de salud), el contador de fondo no escucha el teclado.
  if (typeof document !== "undefined" && document.querySelector('[aria-modal="true"]')) return true;
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  return !!target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]');
}

const sosFocusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
/** Anillo sobre rellenos de color (tarjeta sage-ink): la tinta terracota no se distingue ahí (1.05:1); el blanco sí (≥5.6:1). */
const onFillFocusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
/**
 * Campos de texto: borde ≥3:1 con lo que lo rodea (WCAG 1.4.11; stone-500 ≥4.59:1 en claro,
 * white/35 ≥3.1:1 en oscuro) y foco con la tinta, como el resto de controles.
 */
const fieldBorder = "border border-stone-500 dark:border-white/35";
const fieldFocus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
// Placeholder: sin utilidad propia, manda ::placeholder de globals.css (--placeholder: ≥5.2:1 claro, ≥5.7:1 oscuro;
// el #8f899c de antes daba 4.26:1 sobre #2d273a).

/** Herramientas que se abren como diálogo modal (tienen su propio título y botón de cerrar). */
const MODAL_TOOLS = ["presupuesto", "story", "reproductor"];

/** Herramientas que HerramientasView puede abrir por `openRequest`. */
const OPENABLE_TOOLS = [
  "sos", "contracciones", "patadas", "diario", "maleta", "nombres", "parto", "lecturas", "presupuesto", "story", "reproductor",
];

// `tips`/`alarm` hablan a la mamá; `tipsPartner`/`alarmPartner` dicen lo mismo al papá.
const COMMON_DISCOMFORTS: {
  id: string;
  title: string;
  icon: React.ReactNode;
  tips: { lead: string; text: string }[];
  alarm: string;
  tipsPartner: { lead: string; text: string }[];
  alarmPartner: string;
}[] = [
  {
    id: "nauseas",
    title: "Náuseas y vómitos",
    icon: <Utensils size={20} aria-hidden="true" />,
    tips: [
      { lead: "Antes de levantarte:", text: "come unas galletas saladas o pan tostado." },
      { lead: "Líquidos en sorbos:", text: "agua fría en tragos pequeños y frecuentes. A algunas personas les ayuda el jengibre o el limón." },
      { lead: "Consulta a tu obstetra si:", text: "bajas de peso, la orina se ve muy oscura o las náuseas no te dejan comer. Puede indicarte un tratamiento (por ejemplo, vitamina B6 con doxilamina)." },
    ],
    alarm: "Si vomitas todo y no retienes ni el agua, es una señal de alarma: ve a urgencias.",
    tipsPartner: [
      { lead: "Antes de que se levante:", text: "déjale unas galletas saladas o pan tostado junto a la cama." },
      { lead: "Líquidos en sorbos:", text: "agua fría en tragos pequeños y frecuentes. A algunas personas les ayuda el jengibre o el limón." },
      { lead: "Que consulte a su obstetra si:", text: "baja de peso, la orina se ve muy oscura o las náuseas no la dejan comer. Puede indicarle un tratamiento (por ejemplo, vitamina B6 con doxilamina)." },
    ],
    alarmPartner: "Si vomita todo y no retiene ni el agua, es una señal de alarma: vayan a urgencias.",
  },
  {
    id: "acidez",
    title: "Acidez y reflujo",
    icon: <Flame size={20} aria-hidden="true" />,
    tips: [
      { lead: "Poco y seguido:", text: "5 o 6 comidas pequeñas al día en lugar de 3 grandes." },
      { lead: "Dale tiempo a la digestión:", text: "espera al menos 2 horas después de cenar para acostarte y eleva la cabecera con una almohada extra." },
      { lead: "Consulta a tu obstetra si:", text: "la acidez no cede, te despierta seguido o te cuesta tragar." },
    ],
    alarm: "Si el dolor es fuerte o está bajo las costillas del lado derecho, sobre todo con dolor de cabeza o visión borrosa, es una señal de alarma: ve a urgencias.",
    tipsPartner: [
      { lead: "Poco y seguido:", text: "5 o 6 comidas pequeñas al día en lugar de 3 grandes." },
      { lead: "Tiempo para la digestión:", text: "que espere al menos 2 horas después de cenar para acostarse. Elevar la cabecera con una almohada extra ayuda." },
      { lead: "Que consulte a su obstetra si:", text: "la acidez no cede, la despierta seguido o le cuesta tragar." },
    ],
    alarmPartner: "Si el dolor es fuerte o está bajo las costillas del lado derecho, sobre todo con dolor de cabeza o visión borrosa, es una señal de alarma: vayan a urgencias.",
  },
  {
    id: "ciatica",
    title: "Dolor pélvico y ciática",
    icon: <Activity size={20} aria-hidden="true" />,
    tips: [
      { lead: "Calor local:", text: "compresas tibias en la espalda baja durante 15 a 20 minutos; tu pareja puede preparártelas." },
      { lead: "Postura y soporte:", text: "una faja o cinturón pélvico para embarazo puede ayudar si tu obstetra lo aprueba. Para dormir, acuéstate de lado, de preferencia el izquierdo, con una almohada entre las rodillas." },
      { lead: "Estiramientos suaves:", text: "yoga prenatal o ejercicios guiados por una persona profesional." },
    ],
    alarm: "Si el dolor lumbar va y viene a ritmo o sientes presión en la pelvis antes de la semana 37, puede ser parto pretérmino: llama ya.",
    tipsPartner: [
      { lead: "Calor local:", text: "compresas tibias en la espalda baja durante 15 a 20 minutos; puedes prepararlas tú." },
      { lead: "Postura y soporte:", text: "una faja o cinturón pélvico para embarazo puede ayudar si su obstetra lo aprueba. Para dormir, de lado, de preferencia el izquierdo, con una almohada entre las rodillas." },
      { lead: "Estiramientos suaves:", text: "yoga prenatal o ejercicios guiados por una persona profesional." },
    ],
    alarmPartner: "Si el dolor lumbar le va y viene a ritmo o siente presión en la pelvis antes de la semana 37, puede ser parto pretérmino: llama ya.",
  },
];

/**
 * SOS Síntomas: ruta de urgencia. Las señales urgentes son una lista estática siempre
 * visible (fuente única: URGENT_SIGNS en src/lib/urgency.ts) con las llamadas justo
 * debajo del título; después "llama hoy", salud emocional y, al final, molestias comunes.
 * La cabecera de la herramienta ya muestra "SOS Síntomas": aquí no se repite.
 */
export function SOSSintomas({ profile, onOpenTool }: { profile?: UserProfile; onOpenTool?: (tool: SosLinkTool) => void }) {
  const [openDiscomfort, setOpenDiscomfort] = React.useState<string | null>(null);
  const baseId = React.useId();
  const obPhone = usePandaStore((s) => s.careTeam?.obPhone?.trim() || "");
  const obName = usePandaStore((s) => s.careTeam?.obName?.trim() || "");
  const customEmergency = usePandaStore((s) => s.careTeam?.emergencyNumber?.trim() || "");
  const detectedEmergency = useDetectedEmergency();
  const emergencyNumber = customEmergency || detectedEmergency.number;

  const week = knownWeek(profile);
  const preterm = isPreterm(week);
  const highlightMovement = typeof week === "number" && week >= 28;
  // Quien lee: la mamá ("si tienes…") o el papá, que acompaña ("si ella tiene…").
  const isPapa = profile?.role === "papa";

  const callTodaySigns = CALL_TODAY_SIGNS.filter((s) => s.id !== "animo");
  const moodSign = CALL_TODAY_SIGNS.find((s) => s.id === "animo");
  const harmSign = URGENT_SIGNS.find((s) => s.id === "salud-mental");

  const signNote = (sign: AlarmSign): { text: string; tool?: SosLinkTool; toolLabel?: string } | null => {
    if (typeof week !== "number") {
      if (sign.id === "movimientos") {
        return {
          text: isPapa ? "Desde la semana 28, cuenten sus movimientos cada día." : "Desde la semana 28, cuenta sus movimientos cada día.",
          tool: "patadas",
          toolLabel: "Abrir el contador de patadas",
        };
      }
      if (sign.id === "pretermino") {
        return {
          text: isPapa ? "Si ella tiene contracciones, el contador te dice cuándo llamar." : "Si tienes contracciones, el contador te dice cuándo llamar.",
          tool: "contracciones",
          toolLabel: "Abrir el contador de contracciones",
        };
      }
      return null;
    }
    if (sign.id === "movimientos") {
      if (week >= 28) {
        return {
          text: isPapa
            ? `Están en la semana ${week}: cuenten sus movimientos cada día, en un momento tranquilo.`
            : `Estás en la semana ${week}: cuenta sus movimientos cada día, en un momento tranquilo.`,
          tool: "patadas",
          toolLabel: "Abrir el contador de patadas",
        };
      }
      if (week < 20) {
        return {
          text: isPapa
            ? `En la semana ${week} es normal que ella todavía no sienta sus movimientos.`
            : `En la semana ${week} es normal que todavía no sientas sus movimientos.`,
        };
      }
    }
    if (sign.id === "pretermino") {
      return preterm
        ? {
            text: isPapa
              ? `Están en la semana ${week}: si ella tiene 4 o más contracciones en 1 hora, llama ya.`
              : `Estás en la semana ${week}: si cuentas 4 o más contracciones en 1 hora, llama ya.`,
            tool: "contracciones",
            toolLabel: "Abrir el contador de contracciones",
          }
        : {
            text: isPapa
              ? `Ya están en la semana ${week}: las contracciones regulares pueden ser trabajo de parto. El contador te indica cuándo llamar.`
              : `Ya estás en la semana ${week}: las contracciones regulares pueden ser trabajo de parto. El contador te indica cuándo llamar.`,
            tool: "contracciones",
            toolLabel: "Abrir el contador de contracciones",
          };
    }
    return null;
  };

  const listSurface =
    "rounded-3xl border bg-[#fdfbf7] dark:bg-[#1c1826] divide-y divide-stone-200/80 dark:divide-white/[0.07]";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-10 pb-8 animate-in fade-in duration-300">
      {/* Señales urgentes + llamadas */}
      <section aria-labelledby={`${baseId}-urgente`}>
        <h3 id={`${baseId}-urgente`} className="flex items-center gap-2 text-2xl font-black leading-tight text-terracotta-ink">
          <Siren size={24} className="shrink-0" aria-hidden="true" />
          {isPapa ? "Vayan a urgencias ya" : "Ve a urgencias ya"}
        </h3>
        <p className="mt-1.5 text-base leading-relaxed text-stone-700 dark:text-[#eae6e1]">
          {isPapa
            ? "Si ella tiene cualquiera de estas señales, llama a emergencias o llévala al hospital ahora. No esperen a ver si se pasa."
            : "Si tienes cualquiera de estas señales, llama a emergencias o ve al hospital ahora. No esperes a ver si se pasa."}
        </p>

        <CallActions context="sos" className="mt-4" />

        <ul className={`mt-5 ${listSurface} border-terracotta-ink/25`}>
          {URGENT_SIGNS.map((sign) => {
            const note = signNote(sign);
            const emphasized = sign.id === "movimientos" && highlightMovement;
            const copy = signCopy(sign, profile?.role);
            return (
              <li
                key={sign.id}
                className={`px-4 py-3.5 first:rounded-t-3xl last:rounded-b-3xl ${emphasized ? "bg-terracotta/10 dark:bg-terracotta/[0.12]" : ""}`}
              >
                <p className={`text-base font-bold leading-snug ${emphasized ? "text-terracotta-ink" : "text-stone-900 dark:text-[#eae6e1]"}`}>
                  {copy.title}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-stone-700 dark:text-[#a6a1b2]">{copy.detail}</p>
                {note && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold leading-snug text-stone-900 dark:text-[#eae6e1]">{note.text}</p>
                    {note.tool && onOpenTool && (
                      <button
                        type="button"
                        onClick={() => onOpenTool(note.tool as SosLinkTool)}
                        className={`mt-0.5 -ml-1 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-1 text-sm font-bold text-terracotta-ink underline-offset-4 hover:underline ${sosFocusRing}`}
                      >
                        {note.toolLabel}
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Llama hoy */}
      <section aria-labelledby={`${baseId}-hoy`}>
        <h3 id={`${baseId}-hoy`} className="flex items-center gap-2 text-xl font-black leading-tight text-stone-900 dark:text-[#eae6e1]">
          <CalendarClock size={22} className="shrink-0 text-terracotta-ink" aria-hidden="true" />
          {isPapa ? "Llama hoy a su obstetra" : "Llama hoy a tu obstetra"}
        </h3>
        <p className="mt-1.5 text-base leading-relaxed text-stone-700 dark:text-[#a6a1b2]">
          {isPapa ? "No es una emergencia, pero conviene que la revisen pronto." : "No es una emergencia, pero conviene que te revisen pronto."}
        </p>
        <ul className={`mt-4 ${listSurface} border-stone-200 dark:border-white/[0.08]`}>
          {callTodaySigns.map((sign) => {
            const copy = signCopy(sign, profile?.role);
            return (
              <li key={sign.id} className="px-4 py-3.5">
                <p className="text-base font-bold leading-snug text-stone-900 dark:text-[#eae6e1]">{copy.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-stone-700 dark:text-[#a6a1b2]">{copy.detail}</p>
              </li>
            );
          })}
        </ul>
        {obPhone && (
          <a
            href={telHref(obPhone)}
            className={`@container mt-3 flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-stone-900 transition-colors hover:bg-stone-50 active:scale-[0.98] motion-reduce:active:scale-100 dark:border-white/10 dark:bg-[#2d273a] dark:text-[#eae6e1] dark:hover:bg-[#352e44] ${sosFocusRing}`}
          >
            {/* Con zoom al 200% el icono cede su sitio y el texto pasa de línea en vez de cortarse (1.4.4). */}
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage/15 text-sage-ink @max-[11rem]:hidden">
              <Phone size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-base font-bold leading-tight">{obName ? `Llamar a ${obName}` : isPapa ? "Llamar a su obstetra" : "Llamar a tu obstetra"}</span>
              <span className="block break-words text-sm leading-snug tabular-nums text-stone-600 dark:text-[#a6a1b2]">{obPhone}</span>
            </span>
          </a>
        )}
      </section>

      {/* Salud emocional */}
      <section aria-labelledby={`${baseId}-emocional`}>
        <h3 id={`${baseId}-emocional`} className="flex items-center gap-2 text-xl font-black leading-tight text-stone-900 dark:text-[#eae6e1]">
          <HeartHandshake size={22} className="shrink-0 text-sage-ink" aria-hidden="true" />
          {isPapa ? "Su salud emocional" : "Tu salud emocional"}
        </h3>
        <p className="mt-1.5 text-base leading-relaxed text-stone-700 dark:text-[#a6a1b2]">
          {isPapa
            ? "Lo que ella siente también cuenta. Si notas estas señales, ayúdala a pedir ayuda."
            : "Lo que sientes también cuenta. Hablarlo es parte de cuidarte."}
        </p>
        <div className={`mt-4 ${listSurface} border-stone-200 dark:border-white/[0.08]`}>
          {moodSign && (
            <div className="px-4 py-3.5">
              <p className="text-base font-bold leading-snug text-stone-900 dark:text-[#eae6e1]">{signCopy(moodSign, profile?.role).title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-stone-700 dark:text-[#a6a1b2]">{signCopy(moodSign, profile?.role).detail}</p>
            </div>
          )}
          {harmSign && (
            <div className="rounded-b-3xl bg-terracotta/10 px-4 py-3.5 dark:bg-terracotta/[0.12]">
              <p className="text-base font-bold leading-snug text-terracotta-ink">{signCopy(harmSign, profile?.role).title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-stone-800 dark:text-[#eae6e1]">{signCopy(harmSign, profile?.role).detail}</p>
              <a
                href={telHref(emergencyNumber)}
                aria-label={`Llamar a emergencias, ${emergencyNumber}`}
                className={`@container mt-3 flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-terracotta-ink px-3.5 py-2.5 text-white transition-[background-color,transform] hover:bg-terracotta-ink-hover active:scale-[0.98] motion-reduce:active:scale-100 ${sosFocusRing}`}
              >
                {/* Igual que CallActions: en un botón estrecho los iconos ceden su sitio a "Emergencias". */}
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 @max-[11rem]:hidden">
                  <Siren size={22} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 break-words hyphens-auto text-lg font-bold leading-tight">
                  Emergencias <span className="whitespace-nowrap">· <span className="tabular-nums">{emergencyNumber}</span></span>
                </span>
                <PhoneCall size={18} className="shrink-0 @max-[15rem]:hidden" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Molestias comunes (secundario) */}
      <section aria-labelledby={`${baseId}-molestias`}>
        <h3 id={`${baseId}-molestias`} className="text-lg font-bold leading-tight text-stone-800 dark:text-[#eae6e1]">
          Molestias comunes
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
          {isPapa
            ? "Son frecuentes y suelen mejorar con cuidados en casa; en varios puedes ayudar tú. Ante la duda, que lo consulte con su obstetra."
            : "Son frecuentes y suelen mejorar con cuidados en casa. Ante la duda, consulta a tu obstetra."}
        </p>
        <ul className={`mt-3 ${listSurface} border-stone-200 dark:border-white/[0.08]`}>
          {COMMON_DISCOMFORTS.map((d) => {
            const open = openDiscomfort === d.id;
            const panelId = `${baseId}-${d.id}`;
            return (
              <li key={d.id} className="p-1.5">
                <h4>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenDiscomfort(open ? null : d.id)}
                    className={`flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-base font-bold text-stone-800 transition-colors hover:bg-stone-100 dark:text-[#eae6e1] dark:hover:bg-white/[0.05] ${sosFocusRing}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-stone-500 dark:text-[#a6a1b2]">{d.icon}</span>
                      {d.title}
                    </span>
                    <ChevronDown
                      size={20}
                      aria-hidden="true"
                      className={`shrink-0 text-stone-500 transition-transform duration-200 motion-reduce:transition-none dark:text-[#a6a1b2] ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                </h4>
                <div id={panelId} hidden={!open} className="px-3 pb-3 pt-1">
                  <ul className="space-y-2 text-sm leading-relaxed text-stone-700 dark:text-[#a6a1b2]">
                    {(isPapa ? d.tipsPartner : d.tips).map((t) => (
                      <li key={t.lead}>
                        <strong className="font-semibold text-stone-900 dark:text-[#eae6e1]">{t.lead}</strong> {t.text}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm font-semibold leading-snug text-terracotta-ink">{isPapa ? d.alarmPartner : d.alarm}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
          {isPapa
            ? "Esta guía no reemplaza la valoración de su obstetra. Si algo les preocupa, llama."
            : "Esta guía no reemplaza la valoración de tu obstetra. Si algo te preocupa, llama."}
        </p>
      </section>
    </div>
  );
}


type JournalEntry = {
  id: string;
  authorRole?: string;
  authorName?: string;
  authorUid?: string | null;
  text: string;
  tag?: string | null;
  mood?: string | null;
  createdAt?: unknown;
};

const LOCAL_JOURNAL_KEY = "pandajr_journal_local";
const JOURNAL_TAGS = ["Mensaje al bebé", "Hito médico", "Antojo", "Pensamiento", "Recuerdo"];
const JOURNAL_MOODS: { emoji: string; label: string }[] = [
  { emoji: "🥰", label: "Con mucho amor" },
  { emoji: "😊", label: "Contenta o contento" },
  { emoji: "😭", label: "Sensible" },
  { emoji: "😴", label: "Con sueño" },
  { emoji: "🤢", label: "Con náuseas" },
  { emoji: "🤔", label: "Pensativa o pensativo" },
];

function sanitizeJournal(raw: unknown[]): JournalEntry[] {
  const out: JournalEntry[] = [];
  for (const r of raw) {
    if (!isRecord(r)) continue;
    const text = typeof r.text === "string" ? repairMojibake(r.text) : "";
    const id = typeof r.id === "string" || typeof r.id === "number" ? String(r.id) : "";
    if (!text || !id) continue;
    out.push({
      id,
      authorRole: typeof r.authorRole === "string" ? r.authorRole : undefined,
      authorName: cleanStr(r.authorName, 60) || undefined,
      authorUid: typeof r.authorUid === "string" ? r.authorUid : null,
      text,
      tag: cleanStr(r.tag, 40) || null,
      mood: typeof r.mood === "string" ? r.mood : null,
      createdAt: r.createdAt,
    });
  }
  return out;
}

function journalDate(v: unknown): Date | null {
  return toDateSafe(v as Parameters<typeof toDateSafe>[0]);
}

/** Traspaso único al vincular: los recuerdos "Solo en este teléfono" pasan al diario compartido. */
function mergeLocalJournalOnce(pid: string) {
  const flag = localToSharedFlag("journal", pid);
  if (readStored(flag)) return;
  const local = sanitizeJournal(asArray(readStored(LOCAL_JOURNAL_KEY)));
  if (!readStored(linkedFromLocalKey(pid)) || !local.length) {
    writeStored(flag, true);
    return;
  }
  importJournalEntries(
    pid,
    local.map((e) => ({
      id: e.id,
      authorRole: e.authorRole,
      authorName: e.authorName,
      text: e.text,
      tag: e.tag,
      mood: e.mood,
      createdAt: typeof e.createdAt === "number" ? e.createdAt : undefined,
    }))
  ).then(
    () => writeStored(flag, true),
    () => {
      // Se intentará la próxima vez que se abra el Diario (ids deterministas: no duplica).
    }
  );
}

export function DiarioView({ profile, showToast }: { profile: UserProfile; onClose?: () => void; showToast?: ShowToast }) {
  const me = useMe();
  const pid = me.pid;
  const [localEntries, setLocalEntries] = useState<JournalEntry[]>(() => sanitizeJournal(asArray(readStored(LOCAL_JOURNAL_KEY))));
  const localRef = useRef(localEntries);
  const [remote, setRemote] = useState<{ pid: string; entries: JournalEntry[] } | null>(null);
  const [errorPid, setErrorPid] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [newEntry, setNewEntry] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const { retryState, fail, clearRetry } = useRetry();
  const baseId = React.useId();

  useEffect(() => {
    if (!pid) return;
    let merged = false;
    return listenToJournal(
      pid,
      (data) => {
        setRemote({ pid, entries: sanitizeJournal(data) });
        setErrorPid(null);
        // Una sola vez, tras el primer snapshot (nunca como reacción a los siguientes).
        if (!merged) {
          merged = true;
          mergeLocalJournalOnce(pid);
        }
      },
      () => setErrorPid(pid)
    );
  }, [pid, attempt]);

  const linked = !!pid;
  const current = linked && remote?.pid === pid ? remote : null;
  const entries = linked ? current?.entries ?? [] : localEntries;
  const loading = linked && !current && errorPid !== pid;

  const commitLocal = (next: JournalEntry[]) => {
    localRef.current = next;
    setLocalEntries(next);
    writeStored(LOCAL_JOURNAL_KEY, next);
  };

  const post = (text: string, tag: string | null, mood: string | null) => {
    if (!linked || !pid) {
      commitLocal([
        { id: newId(), authorRole: profile.role, authorName: profile.name, authorUid: null, text, tag, mood, createdAt: nowMs() },
        ...localRef.current,
      ]);
      return;
    }
    const entryPid = pid;
    // Firestore muestra la entrada al instante (caché local) y la envía al reconectar.
    function send() {
      addJournalEntry(entryPid, profile.role, profile.name, text, tag || undefined, mood || undefined).catch(() => {
        setNewEntry((draft) => draft || text);
        fail("No se guardó tu recuerdo. Lo dejamos en el cuadro de texto.", () => {
          setNewEntry((draft) => (draft === text ? "" : draft));
          send();
        });
      });
    }
    send();
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newEntry.trim();
    if (!text) return;
    clearRetry();
    post(text, selectedTag, selectedMood);
    setNewEntry("");
    setSelectedTag(null);
    setSelectedMood(null);
  };

  /** Solo quien escribió puede borrar: por uid; las entradas antiguas sin uid, por nombre y rol. */
  const canDelete = (entry: JournalEntry) => {
    if (!linked) return true;
    if (entry.authorUid) return !!me.myUid && entry.authorUid === me.myUid;
    return !!entry.authorName && entry.authorName === profile.name && entry.authorRole === profile.role;
  };

  const handleDelete = (entry: JournalEntry) => {
    if (!linked || !pid) {
      const index = localRef.current.findIndex((x) => x.id === entry.id);
      commitLocal(localRef.current.filter((x) => x.id !== entry.id));
      showToast?.("Recuerdo eliminado", () => {
        if (localRef.current.some((x) => x.id === entry.id)) return;
        const next = [...localRef.current];
        next.splice(Math.max(0, index), 0, entry);
        commitLocal(next);
      });
      return;
    }
    if (!confirm("¿Eliminar este recuerdo? Se borrará también para tu pareja y no se puede deshacer.")) return;
    deleteJournalEntry(pid, entry.id).catch(() => fail("No se pudo eliminar el recuerdo. Revisa tu conexión.", () => handleDelete(entry)));
  };

  return (
    <div className="w-full flex flex-col pb-20 animate-in fade-in duration-300">
      <div className="p-4 max-w-lg mx-auto w-full flex-1 flex flex-col gap-6">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-stone-900 dark:text-[#eae6e1]">Diario del bebé</h3>
          <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">
            {linked ? "Recuerdos que escriben entre los dos." : "Tus recuerdos de este viaje."}
          </p>
          <SyncBadge />
        </div>

        <RetryNotice state={retryState} onDismiss={clearRetry} />

        {/* Editor de nueva entrada */}
        <form
          onSubmit={handlePost}
          className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 shadow-sm border border-stone-200 dark:border-white/[0.08]"
        >
          <label htmlFor={`${baseId}-texto`} className="sr-only">Nuevo recuerdo</label>
          <textarea
            id={`${baseId}-texto`}
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            maxLength={2000}
            placeholder="Escribe un recuerdo, un hito o un mensaje para el bebé…"
            className={`w-full bg-stone-50 dark:bg-[#181520] rounded-2xl p-3 resize-none h-24 text-base text-stone-800 dark:text-white ${fieldBorder} ${fieldFocus}`}
          />

          <fieldset className="mt-3">
            <legend className="sr-only">Etiqueta</legend>
            <div className="flex flex-wrap gap-2">
              {JOURNAL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={tag === selectedTag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`min-h-[44px] px-3 rounded-full text-xs font-bold border transition-colors ${sosFocusRing} ${
                    tag === selectedTag
                      ? "bg-sage-ink text-white border-transparent"
                      : "bg-stone-50 dark:bg-[#181520] text-stone-600 dark:text-[#a6a1b2] border-stone-200 dark:border-white/10 hover:border-sage-ink/50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-3">
            <legend className="sr-only">Cómo te sientes</legend>
            <div className="flex flex-wrap gap-1">
              {JOURNAL_MOODS.map((mood) => (
                <button
                  key={mood.emoji}
                  type="button"
                  aria-pressed={mood.emoji === selectedMood}
                  aria-label={mood.label}
                  title={mood.label}
                  onClick={() => setSelectedMood(mood.emoji === selectedMood ? null : mood.emoji)}
                  className={`grid h-11 w-11 place-items-center rounded-full text-lg transition-colors ${sosFocusRing} ${
                    mood.emoji === selectedMood ? "bg-terracotta/20 ring-2 ring-terracotta-ink/50" : "hover:bg-stone-100 dark:hover:bg-white/10"
                  }`}
                >
                  <span aria-hidden="true">{mood.emoji}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-white/5 flex justify-end">
            <button
              type="submit"
              disabled={!newEntry.trim()}
              className={`min-h-[44px] bg-terracotta-ink text-white px-5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center gap-2 hover:bg-terracotta-ink-hover active:scale-95 ${sosFocusRing}`}
            >
              <Send size={16} aria-hidden="true" /> Guardar
            </button>
          </div>
        </form>

        {errorPid === pid && linked && !current && (
          <LoadErrorNotice what="el diario compartido" onRetry={() => setAttempt((a) => a + 1)} />
        )}

        {/* Línea de tiempo */}
        <div className="relative pl-4 mt-2">
          {entries.length > 0 && <div className="absolute left-[35px] top-4 bottom-0 w-px bg-stone-200 dark:bg-white/10" aria-hidden="true" />}

          {linked && !current && errorPid === pid ? null : loading ? (
            <p className="py-10 text-center text-sm text-stone-600 dark:text-[#a6a1b2]" role="status">
              Cargando el diario compartido…
            </p>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-sage/15 rounded-full flex items-center justify-center mx-auto mb-4 text-sage-ink">
                <FileText size={24} aria-hidden="true" />
              </div>
              <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] mb-1">El diario está vacío</h4>
              <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">Escribe arriba el primero: un antojo, una ecografía o un mensaje para el bebé.</p>
            </div>
          ) : (
            <ol className="flex flex-col gap-6 relative">
              {entries.map((entry) => {
                const date = journalDate(entry.createdAt);
                const isMama = entry.authorRole === "mama";
                const initial = Array.from((entry.authorName || (isMama ? "Mamá" : "Papá")).trim())[0]?.toLocaleUpperCase("es") ?? "?";
                return (
                  <li key={entry.id} className="flex gap-4">
                    <div
                      aria-hidden="true"
                      className={`relative mt-1 w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black border-4 border-[#faf9f5] dark:border-[#181520] ${
                        isMama ? "bg-terracotta/20 text-terracotta-ink" : "bg-sage/20 text-sage-ink"
                      }`}
                    >
                      {initial}
                    </div>

                    <article className="min-w-0 bg-white dark:bg-[#221d2d] rounded-3xl rounded-tl-sm p-4 shadow-sm border border-stone-200/60 dark:border-white/[0.08] flex-1">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-bold text-stone-800 dark:text-[#eae6e1]">
                            <span className="truncate">{entry.authorName || (isMama ? "Mamá" : "Papá")}</span>
                            {entry.mood && (
                              <span role="img" aria-label={JOURNAL_MOODS.find((m) => m.emoji === entry.mood)?.label ?? "Estado de ánimo"}>{entry.mood}</span>
                            )}
                          </p>
                          <p className="text-xs text-stone-600 dark:text-[#a6a1b2]">
                            {date
                              ? date.toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "Guardando…"}
                          </p>
                        </div>
                        {canDelete(entry) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            aria-label="Eliminar este recuerdo"
                            className={`-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-terracotta/10 hover:text-terracotta-ink dark:text-[#a6a1b2] transition-colors ${sosFocusRing}`}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {entry.tag && (
                        <span className="inline-block px-2 py-0.5 bg-stone-100 dark:bg-[#181520] text-stone-600 dark:text-[#a6a1b2] rounded-md text-xs font-bold mb-2">
                          {entry.tag}
                        </span>
                      )}

                      <p className="text-stone-700 dark:text-[#eae6e1]/90 text-sm whitespace-pre-wrap break-words leading-relaxed">{entry.text}</p>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

const LOCAL_GOBAG_KEY = "pandajr_gobag";

export function MaletaView({ profile }: { profile: UserProfile; onClose?: () => void }) {
  const pid = profile.pregnancyId;
  const [localBag, setLocalBag] = useState<Record<string, boolean>>(() => {
    const saved = readStored<unknown>(LOCAL_GOBAG_KEY);
    return isRecord(saved) ? (saved as Record<string, boolean>) : {};
  });
  const [remote, setRemote] = useState<{ pid: string; bag: Record<string, boolean> } | null>(null);
  const [overlay, setOverlay] = useState<Record<string, boolean>>({});
  const { retryState, fail, clearRetry } = useRetry();

  useEffect(() => {
    if (!pid) return;
    return listenToGoBag(pid, (data) => setRemote({ pid, bag: isRecord(data) ? (data as Record<string, boolean>) : {} }));
  }, [pid]);

  const bag: Record<string, boolean> = pid ? { ...(remote?.pid === pid ? remote.bag : {}), ...overlay } : localBag;

  const toggleItem = (id: string) => {
    const next = !bag[id];
    if (!pid) {
      const updated = { ...localBag, [id]: next };
      setLocalBag(updated);
      writeStored(LOCAL_GOBAG_KEY, updated);
      return;
    }
    setOverlay((o) => ({ ...o, [id]: next }));
    toggleGoBagItem(pid, id, next).then(
      () => setOverlay((o) => omitKey(o, id)),
      () => {
        setOverlay((o) => omitKey(o, id));
        fail("No se guardó el cambio en la maleta.", () => toggleItem(id));
      }
    );
  };

  const items = {
    mama: [
      { id: 'm1', label: 'Documentos médicos y de identidad' },
      { id: 'm2', label: 'Ropa cómoda y batas (abiertas adelante)' },
      { id: 'm3', label: 'Pantuflas y calcetines gruesos' },
      { id: 'm4', label: 'Artículos de aseo personal' },
      { id: 'm5', label: 'Ropa interior desechable o grande' },
      { id: 'm6', label: 'Ropa para salir del hospital' }
    ],
    bebe: [
      { id: 'b1', label: 'Pañales de recién nacido' },
      { id: 'b2', label: 'Toallitas húmedas' },
      { id: 'b3', label: 'Bodys y pijamas (3-4 mudas)' },
      { id: 'b4', label: 'Manta de algodón o lana' },
      { id: 'b5', label: 'Gorrito y calcetines' },
      { id: 'b6', label: 'Asiento de auto (instalado)' }
    ],
    papa: [
      { id: 'p1', label: 'Algo de comer y botellas de agua' },
      { id: 'p2', label: 'Cargador de celular (cable largo)' },
      { id: 'p3', label: 'Ropa de cambio cómoda' },
      { id: 'p4', label: 'Artículos de aseo personal' },
      { id: 'p5', label: 'Cámara o espacio en celular' }
    ]
  };

  return (
    <div className="w-full">
      <div className="p-4 max-w-lg mx-auto space-y-6 pb-20">
        <SyncBadge />
        <RetryNotice state={retryState} onDismiss={clearRetry} />

        {Object.entries(items).map(([category, list]) => (
          <section key={category} aria-label={category === 'mama' ? 'Para mamá' : category === 'bebe' ? 'Para el bebé' : 'Para papá'}>
            <h3 className="font-bold text-sm text-stone-600 dark:text-[#a6a1b2] mb-3">
              {category === 'mama' ? 'Para mamá' : category === 'bebe' ? 'Para el bebé' : 'Para papá'}
            </h3>
            <ul className="bg-white dark:bg-[#181a20] rounded-2xl shadow-sm border border-stone-200 dark:border-white/[0.05] overflow-hidden divide-y divide-stone-100 dark:divide-white/5">
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={!!bag[item.id]}
                    onClick={() => toggleItem(item.id)}
                    className={`flex w-full min-h-[52px] items-center gap-3 p-4 text-left transition-colors hover:bg-stone-50 dark:hover:bg-white/[0.02] ${sosFocusRing}`}
                  >
                    {/* Círculo sin marcar ≥3:1 con el fondo (WCAG 1.4.11): stone-500 4.8:1 claro, stone-400 6.9:1 oscuro. */}
                    <span aria-hidden="true" className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${bag[item.id] ? 'bg-sage-ink border-transparent text-white' : 'border-stone-500 dark:border-stone-400'}`}>
                      {bag[item.id] && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className={`text-sm font-medium ${bag[item.id] ? 'text-stone-500 dark:text-stone-400 line-through' : 'text-stone-700 dark:text-stone-200'}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

const LECTURAS: Record<1 | 2 | 3, { title: string; desc: string; type: string }[]> = {
  1: [
    { title: "Náuseas del primer trimestre", desc: "Qué ayuda con las náuseas y la hidratación en las primeras semanas.", type: "Guía" },
    { title: "El ácido fólico y el tubo neural", desc: "Por qué este suplemento es clave en el primer trimestre.", type: "Nutrición" },
    { title: "Cómo y cuándo dar la noticia", desc: "Ideas para contarlo a la familia, a tus amistades y en el trabajo.", type: "Guía" },
  ],
  2: [
    { title: "Omega-3 (DHA) y desarrollo cerebral", desc: "El pescado bajo en mercurio y otras fuentes en el segundo trimestre.", type: "Nutrición" },
    { title: "Conectar con tu bebé", desc: "Su oído se desarrolla: cómo sus voces forman parte de su día.", type: "Guía" },
    { title: "Preparar el cuarto sin riesgos", desc: "Qué evitar al pintar o armar muebles nuevos.", type: "Guía" },
  ],
  3: [
    { title: "Entender las contracciones", desc: "Contracciones de práctica y trabajo de parto: la regla 5-1-1.", type: "Guía" },
    { title: "Masaje perineal", desc: "Cómo preparar el periné antes de un parto vaginal.", type: "Guía" },
    { title: "El posparto", desc: "Salud mental, sueño y cómo papá puede encargarse de la casa.", type: "Guía" },
  ],
};

export function LecturasView({ profile }: { profile?: UserProfile; onClose?: () => void; showToast?: ShowToast }) {
  const week = knownWeek(profile);
  const currentTrimester: 1 | 2 | 3 | undefined = typeof week === "number" ? (week <= 13 ? 1 : week <= 27 ? 2 : 3) : undefined;
  const [selectedTri, setSelectedTri] = useState<1 | 2 | 3>(currentTrimester ?? 1);

  return (
    <div className="w-full flex flex-col h-full animate-in fade-in duration-300">
      <p className="text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
        {profile?.role === "papa"
          ? "Estas lecturas aún no están disponibles. Mientras tanto, ante cualquier duda, consulten con su obstetra."
          : "Estas lecturas aún no están disponibles. Mientras tanto, ante cualquier duda, consulta a tu obstetra."}
      </p>

      <div className="mt-3 mb-2 flex gap-2 overflow-x-auto hide-scrollbar shrink-0 py-1" role="group" aria-label="Trimestre">
        {([1, 2, 3] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={selectedTri === t}
            onClick={() => setSelectedTri(t)}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${sosFocusRing} ${
              selectedTri === t ? "bg-terracotta-ink text-white" : "bg-stone-200 dark:bg-[#2d273a] text-stone-700 dark:text-[#a6a1b2]"
            }`}
          >
            Trimestre {t}
            {currentTrimester === t && <span className="sr-only"> (trimestre actual)</span>}
          </button>
        ))}
      </div>

      <ul className="flex-1 space-y-3 pb-12">
        {LECTURAS[selectedTri].map((art) => (
          <li key={art.title} className="bg-white dark:bg-[#221d2d] border border-stone-200 dark:border-white/[0.06] rounded-2xl p-4">
            <h3 className="text-base font-bold text-stone-800 dark:text-[#eae6e1] leading-tight">{art.title}</h3>
            <p className="mt-1.5 text-sm text-stone-600 dark:text-[#a6a1b2] leading-relaxed">{art.desc}</p>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-[#a6a1b2]">
              <Clock size={13} aria-hidden="true" />
              {art.type} · Próximamente
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HerramientasView({ showToast, profile, openRequest }: { showToast: ShowToast, profile?: UserProfile, openRequest?: { tool: string; nonce: number } }) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const toolHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusedRequestRef = useRef<number | null>(null);
  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Al cambiar de vista el botón pulsado desaparece: el foco va al título de la herramienta al abrirla
  // y a su tarjeta del hub al volver (también al cerrar Presupuesto, PandaStory o Panda Audio).
  const pendingFocusRef = useRef<{ to: "heading" } | { to: "tile"; id: string } | null>(null);

  const requestedTool = openRequest?.tool;
  const requestNonce = openRequest?.nonce;

  // Apertura externa (p. ej. el acceso a SOS del header): cada nonce nuevo abre esa herramienta.
  // Se ajusta el estado durante el render al cambiar el nonce (patrón de React para derivar
  // estado de props) en lugar de un setState dentro de un efecto.
  const [handledNonce, setHandledNonce] = useState<number | undefined>(undefined);
  if (requestNonce !== undefined && requestNonce !== handledNonce) {
    setHandledNonce(requestNonce);
    if (requestedTool && OPENABLE_TOOLS.includes(requestedTool)) setActiveTool(requestedTool);
  }

  // Ya abierta: vuelve arriba y lleva el foco al título de la herramienta (una vez por petición).
  useEffect(() => {
    if (requestNonce === undefined || focusedRequestRef.current === requestNonce) return;
    if (!requestedTool || activeTool !== requestedTool) return;
    focusedRequestRef.current = requestNonce;
    window.scrollTo({ top: 0 });
    toolHeadingRef.current?.focus({ preventScroll: true });
  }, [activeTool, requestNonce, requestedTool]);

  useEffect(() => {
    const want = pendingFocusRef.current;
    if (!want) return;
    pendingFocusRef.current = null;
    if (want.to === "heading") toolHeadingRef.current?.focus({ preventScroll: true });
    else tileRefs.current[want.id]?.focus();
  }, [activeTool]);

  const openTool = (id: string) => {
    // Los diálogos (Presupuesto, PandaStory, Panda Audio) llevan el foco dentro por su cuenta.
    pendingFocusRef.current = MODAL_TOOLS.includes(id) ? null : { to: "heading" };
    setActiveTool(id);
  };

  const closeTool = () => {
    if (activeTool) pendingFocusRef.current = { to: "tile", id: activeTool };
    setActiveTool(null);
  };

  const openToolFromSos = (tool: "patadas" | "contracciones") => {
    pendingFocusRef.current = { to: "heading" };
    setActiveTool(tool);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const tools = [
    {
      id: "reproductor",
      icon: <Music className="text-sage-ink" size={26} />,
      label: "Panda Audio",
      desc: "Música para relajarte",
      color: "bg-sage/10 dark:bg-stone-800/40 border-sage/20 dark:border-sage/20"
    },

    {
      id: "story",
      icon: <Camera className="text-terracotta-ink" size={26} />,
      label: "PandaStory",
      desc: "Tarjeta de la semana",
      color: "bg-terracotta/10 dark:bg-terracotta/20 border-terracotta/20 dark:border-terracotta/30"
    },

    {
      id: "presupuesto",
      icon: <Wallet className="text-sage-ink" size={26} />,
      label: "Presupuesto",
      desc: "Control de gastos",
      color: "bg-sage/20 dark:bg-sage/20 border-sage/30 dark:border-sage/20",
    },

    // SOS se pinta aparte (tarjeta ancha en terracota de tinta); estos colores solo lo describen.
    { id: "sos", label: "SOS Síntomas", icon: <HeartPulse size={24} />, desc: "Señales de alarma y a quién llamar", color: "bg-terracotta/10 text-terracotta-ink", border: "border-terracotta/20" },
    { id: "contracciones", label: "Contracciones", icon: <Timer size={24} />, desc: "Frecuencia y duración", color: "bg-terracotta/10 text-terracotta-ink", border: "border-terracotta/20" },
    { id: "patadas", label: "Patadas", icon: <Baby size={24} />, desc: "Conteo desde la semana 28", color: "bg-sage/10 text-sage-ink", border: "border-sage/20" },
    { id: "diario", label: "Diario", icon: <FileText size={24} />, desc: "Recuerdos del embarazo", color: "bg-sage/10 text-sage-ink", border: "border-sage/20 dark:border-sage/20" },
    { id: "maleta", label: "Maleta", icon: <Package size={24} />, desc: "Para el hospital", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", border: "border-amber-100 dark:border-amber-500/20" },
    { id: "nombres", label: "Nombres", icon: <Users size={24} />, desc: "Voten por separado", color: "bg-terracotta/10 text-terracotta-ink", border: "border-terracotta/20" },
    { id: "parto", label: "Plan de parto", icon: <ClipboardList size={24} />, desc: "Preferencias para el hospital", color: "bg-sage/10 text-sage-ink", border: "border-sage/20" },
    { id: "lecturas", label: "Lecturas", icon: <BookOpen size={24} />, desc: "Próximamente", color: "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-[#a6a1b2]", border: "border-stone-200 dark:border-white/10" },
  ];

  // Orden según la semana (la semana manda): desde la 36, Contracciones y Maleta primero; de la 28
  // a la 35, Patadas. SOS sigue siempre arriba y a lo ancho.
  const hubWeek = knownWeek(profile);
  const priority: string[] = hubWeek === undefined ? [] : hubWeek >= 36 ? ["contracciones", "maleta"] : hubWeek >= 28 ? ["patadas"] : [];
  const orderedTools = [
    ...priority.map((id) => tools.find((t) => t.id === id)).filter((t): t is (typeof tools)[number] => !!t),
    ...tools.filter((t) => !priority.includes(t.id)),
  ];

  if (activeTool) {
    const tool = tools.find(t => t.id === activeTool);
    return (
      <div className="flex flex-col h-full w-full bg-stone-50 dark:bg-[#120f18] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Only show generic header if it's not one of our new custom modal tools */}
        {!MODAL_TOOLS.includes(activeTool) && (
          <div data-tool-header className="sticky top-[calc(3.4375rem+var(--safe-top))] [@media(max-height:500px)]:static z-20 bg-white/90 dark:bg-[#181520]/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-stone-200 dark:border-white/5">

          <button type="button" onClick={closeTool} aria-label="Volver a Herramientas" className="w-11 h-11 shrink-0 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <div>
            <h2 ref={toolHeadingRef} tabIndex={-1} className="font-bold text-lg text-stone-800 dark:text-white leading-tight outline-none">{tool?.label}</h2>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-[#a6a1b2] font-bold">{tool?.desc}</p>
          </div>
        </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTool === 'diario' && profile && <DiarioView profile={profile} showToast={showToast} />}
          {activeTool === 'maleta' && profile && <MaletaView profile={profile} />}
          {activeTool === 'sos' && <SOSSintomas profile={profile} onOpenTool={openToolFromSos} />}
          {activeTool === 'patadas' && <ContadorPatadas showToast={showToast} profile={profile} />}
          {activeTool === 'contracciones' && <ContadorContracciones showToast={showToast} profile={profile} />}
          {activeTool === 'nombres' && <VotadorNombres showToast={showToast} />}
          {activeTool === 'parto' && <PlanParto profile={profile} showToast={showToast} />}
          {activeTool === 'lecturas' && <LecturasView profile={profile} />}
          {activeTool === 'presupuesto' && <CalculadoraPresupuesto profile={profile} onClose={closeTool} showToast={showToast} />}
          {activeTool === 'story' && <PandaStoryGenerator profile={profile} onClose={closeTool} />}
          {activeTool === 'reproductor' && <ReproductorView onClose={closeTool} />}

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-stone-50 dark:bg-[#120f18] p-5 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6 mt-4">
        {/* h2: el h1 de la página es "PandaJR" (una vista, un encabezado principal). */}
        <h2 className="text-2xl font-black text-stone-800 dark:text-white tracking-tight leading-none mb-1">
          Herramientas
        </h2>
        <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">
          {priority.length > 0 ? `Semana ${hubWeek}: primero lo que más vas a usar.` : "Todo lo que necesitas a un toque de distancia."}
        </p>
      </div>

      <div className="grid grid-cols-2 max-[300px]:grid-cols-1 gap-4 pb-24">
        {/* SOS takes full width */}
        <button
          ref={(el) => { tileRefs.current.sos = el; }}
          type="button"
          onClick={() => openTool('sos')}
          className="col-span-2 max-[300px]:col-span-1 bg-terracotta-ink hover:bg-terracotta-ink-hover text-white rounded-2xl p-4 min-h-[72px] flex items-center justify-between shadow-sm transition-colors group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
        >
          {/* Con zoom al 200% (<300px) los iconos decorativos ceden su sitio al texto, que pasa de línea. */}
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-12 h-12 shrink-0 rounded-full bg-white/15 flex items-center justify-center group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform max-[300px]:hidden">
              <HeartPulse size={28} aria-hidden="true" />
            </div>
            <div className="min-w-0 text-left">
              <h3 className="font-bold text-lg leading-tight break-words">SOS Síntomas</h3>
              <p className="text-white text-sm leading-snug break-words">Cuándo ir a urgencias y a quién llamar</p>
            </div>
          </div>
          <ChevronRight size={24} aria-hidden="true" className="shrink-0 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 transition-all max-[300px]:hidden" />
        </button>

        {/* Other tools */}
        {orderedTools.filter(t => t.id !== 'sos').map(tool => (
          <button
            key={tool.id}
            ref={(el) => { tileRefs.current[tool.id] = el; }}
            type="button"
            onClick={() => openTool(tool.id)}
            aria-haspopup={MODAL_TOOLS.includes(tool.id) ? "dialog" : undefined}
            className={`bg-white dark:bg-[#181520] rounded-2xl p-4 flex flex-col gap-3 shadow-sm border border-stone-200/60 dark:border-white/[0.04] hover:border-stone-300 dark:hover:border-white/10 hover:shadow-md transition-all text-left group ${sosFocusRing}`}
          >
            <div className={`w-12 h-12 rounded-2xl ${tool.color} border ${tool.border} flex items-center justify-center group-hover:scale-105 transition-transform`}>
              {tool.icon}
            </div>
            <div>
              <h3 className="font-bold text-stone-800 dark:text-white text-sm break-words">{tool.label}</h3>
              <p className="text-[11px] text-stone-500 dark:text-[#a6a1b2] font-medium leading-tight mt-0.5">{tool.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


interface KickRecord {
  id: number;
  timeStr: string;
  intervalSecs: number | null;
}

type KickSessionItem = {
  id: number;
  timestamp: number;
  dateFormatted: string;
  count: number;
  durationSeconds: number;
  durationFormatted: string;
  note?: string;
} & Authored;

const KICK_SESSIONS_KEY = "pandajr_kick_sessions";
const ACTIVE_KICK_KEY = "pandajr_kick_active";
// Más allá de 3 horas, una sesión abierta es un registro olvidado: no se restaura.
const ACTIVE_KICK_MAX_MS = 3 * 60 * 60 * 1000;
type ActiveKickSession = { startTime: number; kicks: KickRecord[] };

/** Sesión de conteo en curso guardada en el teléfono (sobrevive a cambiar de herramienta). */
function loadActiveKickSession(): ActiveKickSession | null {
  const s = readStored<ActiveKickSession>(ACTIVE_KICK_KEY);
  if (!s || typeof s.startTime !== "number" || !Array.isArray(s.kicks)) return null;
  const age = Date.now() - s.startTime;
  if (age < 0 || age > ACTIVE_KICK_MAX_MS || s.kicks.length >= 10) return null;
  return s;
}

/** Historial válido, sin las sesiones de ejemplo que versiones anteriores guardaban como reales. */
function sanitizeKickSessions(raw: unknown[]): KickSessionItem[] {
  const out: KickSessionItem[] = [];
  const seen = new Set<number>();
  for (const r of raw) {
    if (!isRecord(r) || isLegacySeedKickSession(r)) continue;
    const id = finiteNum(r.id);
    if (id === null || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      timestamp: finiteNum(r.timestamp) ?? (id > 1e11 ? id : 0),
      dateFormatted: cleanStr(r.dateFormatted, 60) || cleanStr(r.date, 60),
      count: finiteNum(r.count) ?? 10,
      durationSeconds: finiteNum(r.durationSeconds) ?? 0,
      durationFormatted: cleanStr(r.durationFormatted, 30) || cleanStr(r.duration, 30),
      note: cleanStr(r.note, 60) || undefined,
      ...authoredFrom(r),
    });
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

const KICK_LIST: SharedListSpec<KickSessionItem> = {
  localKey: KICK_SESSIONS_KEY,
  listen: listenToKickSessions,
  mutate: mutateKickSessions,
  sanitize: sanitizeKickSessions,
  seed: { name: "kickseeds", is: (item) => isRecord(item) && isLegacySeedKickSession(item) },
  // La versión anterior guardaba las patadas solo en el teléfono, aun con vínculo.
  localMerge: { tool: "kicks", upgrade: true },
};

export function ContadorPatadas({ showToast, profile }: { showToast: ShowToast, profile?: UserProfile }) {
  const week = knownWeek(profile);
  const me = useMe();
  const { isPapa, her, Her } = companionVoice(me);
  const callPanelId = React.useId();
  // Sesión en curso restaurada: abrir Síntomas u otra herramienta no la pierde.
  const [restored] = useState(loadActiveKickSession);
  const [count, setCount] = useState(restored ? restored.kicks.length : 0);
  const [startTime, setStartTime] = useState<number | null>(restored ? restored.startTime : null);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => (restored ? Math.floor((Date.now() - restored.startTime) / 1000) : 0));
  const [kicks, setKicks] = useState<KickRecord[]>(restored ? restored.kicks : []);
  const [showGuide, setShowGuide] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [completedSession, setCompletedSession] = useState<KickSessionItem | null>(null);
  const [selectedNote, setSelectedNote] = useState<string>("");

  // Historial: solo conteos reales. Con vínculo se comparte (y se ven los de la pareja);
  // sin vínculo vive en este teléfono.
  const history = useSharedList(me.pid, KICK_LIST, authorStamp(me));
  const sessions = history.items;
  const { retryState, fail, clearRetry } = useRetry();
  const listNow = useNow(60_000);

  // Mutación deliberada (PRODUCT.md §2): el historial se guarda solo desde manejadores de
  // evento, nunca como efecto de que cambie `sessions`.
  const commitSessions = (fn: (items: KickSessionItem[]) => KickSessionItem[], failMessage: string) => {
    function run() {
      history.apply(fn).then((ok) => {
        if (!ok) fail(failMessage, run);
      });
    }
    run();
  };

  // Sesión en curso en el teléfono (o se borra al terminar / reiniciar).
  const persistActive = (start: number | null, list: KickRecord[]) => {
    writeStored(ACTIVE_KICK_KEY, start !== null && list.length < 10 ? { startTime: start, kicks: list } : null);
  };

  // Cronómetro activo durante la sesión
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && count < 10) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, count]);

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDurationText = (totalSecs: number) => {
    if (totalSecs < 60) return `${totalSecs} seg`;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} seg`;
  };

  const formatCurrentDate = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Hoy, ${time}`;
  };

  const handleKick = () => {
    const now = Date.now();
    const newCount = count + 1;
    let actualStart = startTime;

    // El tiempo arranca con la primera patada, salvo que la sesión ya se haya iniciado sin movimientos.
    if (!startTime) {
      actualStart = now;
      setStartTime(now);
      setElapsedSeconds(0);
    }

    // Vibración táctil si el dispositivo lo soporta (iPhone/Android)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch {
        // sin vibración
      }
    }

    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const intervalSecs = kicks.length > 0 && actualStart 
      ? Math.floor((now - (kicks[kicks.length - 1]?.id || actualStart)) / 1000) 
      : null;

    const nextKicks = [...kicks, { id: now, timeStr, intervalSecs }];
    setKicks(nextKicks);
    setCount(newCount);
    persistActive(newCount >= 10 ? null : actualStart, nextKicks);

    if (newCount === 10) {
      const durSecs = Math.floor((now - (actualStart || now)) / 1000);
      const newSessionItem: KickSessionItem = {
        id: now,
        timestamp: now,
        dateFormatted: formatCurrentDate(),
        count: 10,
        durationSeconds: durSecs,
        durationFormatted: formatDurationText(durSecs),
        note: "",
        ...authorStamp(me),
      };
      setCompletedSession(newSessionItem);
      // Registro nuevo: si no llega al servidor queda "Sin enviar" en este teléfono y se reenvía solo.
      void history.add(newSessionItem);
      setStartTime(null);
      showToast("Listo: 10 movimientos contados");
    }
  };

  const handleUndo = () => {
    if (count <= 0) return;
    const nextKicks = kicks.slice(0, -1);
    setCount(nextKicks.length);
    setKicks(nextKicks);
    // Si el tiempo empezó con esa patada se vuelve al inicio; si la sesión se inició sin
    // movimientos, el tiempo sigue corriendo.
    const startedWithKick = kicks[0]?.id === startTime;
    const nextStart = nextKicks.length === 0 && startedWithKick ? null : startTime;
    if (nextStart === null) {
      setStartTime(null);
      setElapsedSeconds(0);
    }
    persistActive(nextStart, nextKicks);
    showToast("Quitamos el último movimiento");
  };

  // Empezar a medir sin haber sentido ningún movimiento: así los avisos de 90 min y 2 h
  // también funcionan cuando el bebé no se mueve, que es el caso que más importa.
  const startEmptySession = () => {
    if (startTime) return;
    const now = Date.now();
    setStartTime(now);
    setElapsedSeconds(0);
    persistActive(now, kicks);
  };

  // Atajo de teclado: Barra espaciadora para registrar patada. El listener se registra una
  // vez y llama siempre al manejador del último render (sin cierres con estado viejo).
  const kickKeyRef = useRef<{ count: number; handleKick: () => void }>({ count, handleKick });
  useEffect(() => {
    kickKeyRef.current = { count, handleKick };
  });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Sobre un botón o enlace, Espacio activa ese control (el botón grande ya registra
      // con su propio clic); dentro de la hoja del equipo de salud no debe contar.
      if (isControlTarget(e.target)) return;

      if ((e.code === "Space" || e.key === " ") && kickKeyRef.current.count < 10) {
        e.preventDefault();
        kickKeyRef.current.handleKick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const reset = () => {
    setCount(0);
    setStartTime(null);
    setElapsedSeconds(0);
    setKicks([]);
    persistActive(null, []);
    setSelectedNote("");
    setCompletedSession(null);
    setShowTimeline(false);
  };

  const deleteSession = (session: KickSessionItem) => {
    commitSessions(removeById<KickSessionItem>(session.id), "No se pudo eliminar la sesión.");
    showToast("Sesión eliminada del historial", () =>
      commitSessions(restoreItems([session]), "No se pudo recuperar la sesión.")
    );
  };

  const saveSessionNote = (noteText: string) => {
    if (!completedSession) return;
    commitSessions(patchById<KickSessionItem>(completedSession.id, { note: noteText }), "No se guardó la nota de la sesión.");
    setSelectedNote(noteText);
  };

  // Estadísticas inteligentes
  const validSessions = sessions.filter(s => s.count === 10);
  const avgDurationMinutes = validSessions.length > 0
    ? Math.round(validSessions.reduce((acc, s) => acc + (s.durationSeconds / 60), 0) / validSessions.length)
    : null;

  // Sesión recién terminada frente a lo habitual de ESTE bebé (su promedio sin contarla a ella).
  // "Lenta": más de 60 minutos, o más del doble del promedio (desde 10 minutos, para no avisar
  // por diferencias de segundos).
  const priorSessions = completedSession ? validSessions.filter(s => s.id !== completedSession.id) : [];
  const priorAvgRaw = priorSessions.length > 0
    ? priorSessions.reduce((acc, s) => acc + (s.durationSeconds / 60), 0) / priorSessions.length
    : null;
  const completedMinutes = completedSession ? completedSession.durationSeconds / 60 : 0;
  const slowSession = !!completedSession && (
    completedMinutes > 60 || (priorAvgRaw !== null && completedMinutes >= 10 && completedMinutes > 2 * priorAvgRaw)
  );
  const slowLead = priorAvgRaw !== null && completedMinutes > priorAvgRaw
    ? `Hoy tardó más que ${isPapa ? "su" : "tu"} promedio (~${Math.max(1, Math.round(priorAvgRaw))} min).`
    : "Hoy tardó más de 1 hora.";

  // Alerta de más de 90 min (Cardiff timeout warning) y, a las 2 horas, indicación de llamar.
  const isOvertime = startTime !== null && elapsedSeconds >= 5400 && count < 10;
  const isTwoHours = isOvertime && elapsedSeconds >= 7200;

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full space-y-6">
      
      {/* ENCABEZADO CON MÉTODO CARDIFF Y GUÍA */}
      <div className="text-center">
        <h3 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Cuenta sus movimientos</h3>
        <p className="text-sm text-stone-600 dark:text-[#a6a1b2] max-w-xs mx-auto mt-1 leading-relaxed">
          {isPapa
            ? `Con el método Cardiff se cuentan 10 movimientos del bebé: cada vez que ${her} sienta un movimiento, regístralo aquí. Lo habitual es llegar a 10 en menos de 2 horas.`
            : "Con el método Cardiff cuentas 10 movimientos del bebé. Lo habitual es llegar a 10 en menos de 2 horas."}
        </p>
        {typeof week === "number" && week < 28 && (
          <p className="mt-2 mx-auto max-w-xs inline-flex items-start gap-1.5 text-left text-sm leading-snug text-stone-600 dark:text-[#a6a1b2]">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>El conteo de movimientos suele empezar en la semana 28. {isPapa ? `${Her} está en la semana ${week}.` : `Estás en la semana ${week}.`}</span>
          </p>
        )}

        {/* Botón para desplegar la guía */}
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          aria-expanded={showGuide}
          aria-controls={`${callPanelId}-guia`}
          className={`mt-3 min-h-[44px] text-xs font-bold text-sage-ink hover:underline underline-offset-4 inline-flex items-center gap-1 bg-sage/10 dark:bg-[#1a1724] hover:bg-sage/20 dark:hover:bg-[#19322c] px-3 py-1.5 rounded-xl border border-sage/30 dark:border-sage/25 transition-colors ${sosFocusRing}`}
        >
          <Info size={14} className="text-sage-ink" />
          <span>{showGuide ? "Ocultar la guía" : "¿Cómo y cuándo contar patadas?"}</span>
          {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* GUÍA DESPLEGABLE (alineada con guías públicas; no sustituye al obstetra) */}
      {showGuide && (
        <div id={`${callPanelId}-guia`} className="bg-gradient-to-br from-sage/10 to-emerald-50/70 dark:from-[#221d2d] dark:to-[#1a1724] border border-sage/30 dark:border-sage/25 rounded-3xl p-5 text-left text-xs text-stone-700 dark:text-[#eae6e1]/90 space-y-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <h4 className="font-bold text-sage-ink text-sm flex items-center gap-2">
            <ClipboardList size={16} className="text-sage-ink" aria-hidden="true" /> Cómo contar movimientos (método Cardiff)
          </h4>
          <ul className="space-y-2 leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
            <li className="flex items-start gap-2">
              <span className="text-terracotta-ink font-bold">1.</span>
              <span><strong>¿Cuándo empezar?</strong> Lo habitual es desde la semana 28, o antes si {isPapa ? "su obstetra" : "tu obstetra"} lo indica.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-terracotta-ink font-bold">2.</span>
              <span><strong>Mejor momento:</strong> 30 a 60 minutos después de comer o por la noche, cuando el bebé recibe más glucosa y {isPapa ? `${her} está` : "estás"} en reposo.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-terracotta-ink font-bold">3.</span>
              <span><strong>Postura recomendada:</strong> {isPapa ? `Pídele a ${her} que se recueste de lado (izquierdo o derecho) y que evite estar boca arriba.` : "Recuéstate de lado (izquierdo o derecho) y evita estar boca arriba."}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-terracotta-ink font-bold">4.</span>
              <span><strong>¿Qué cuenta como movimiento?</strong> Patadas, aleteos, giros o presiones claras. El hipo rítmico no se cuenta como patada voluntaria.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-terracotta-ink font-bold">5.</span>
              <span><strong>Meta:</strong> {isPapa ? `que ${her} sienta 10 movimientos en menos de 2 horas.` : "sentir 10 movimientos en menos de 2 horas."} Lo importante es notar si tarda mucho más de lo habitual para {isPapa ? "su" : "tu"} bebé.</span>
            </li>
          </ul>
        </div>
      )}

      {/* ALERTA CARDIFF: A LOS 90 MIN SIN 10 MOVIMIENTOS; A LAS 2 H, LLAMAR */}
      {isOvertime && (
        <section
          aria-labelledby={`${callPanelId}-alerta`}
          className="rounded-3xl border border-terracotta-ink/35 bg-terracotta/10 dark:bg-terracotta/[0.12] p-4 text-left animate-in fade-in"
        >
          <div role="alert" aria-live="assertive" className="flex gap-3 items-start">
            <AlertTriangle className="text-terracotta-ink shrink-0 mt-0.5" size={22} aria-hidden="true" />
            <div className="min-w-0">
              <h4 id={`${callPanelId}-alerta`} className="text-base font-bold leading-snug text-terracotta-ink">
                {isTwoHours ? "Pasaron 2 horas sin llegar a 10 movimientos" : "Van 90 minutos sin llegar a 10 movimientos"}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-stone-800 dark:text-[#eae6e1]">
                {isTwoHours
                  ? isPapa
                    ? "Llama ahora a su obstetra o vayan a urgencias para que revisen al bebé."
                    : "Llama ahora a tu obstetra o ve a urgencias para que revisen al bebé."
                  : isPapa
                    ? `Pídele a ${her} que se recueste de lado y sigan contando con calma. Si a las 2 horas no llegan a 10 movimientos, llama a su obstetra o vayan a urgencias.`
                    : "Recuéstate de lado y sigue contando con calma. Si a las 2 horas no llegas a 10 movimientos, llama a tu obstetra o ve a urgencias."}
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-900 dark:text-[#eae6e1]">
                {isPapa
                  ? `Si ${her} nota que se mueve menos de lo habitual, no esperen a completar el conteo: llama.`
                  : "Si notas que se mueve menos de lo habitual, no esperes a completar el conteo: llama."}
              </p>
            </div>
          </div>
          <CallActions context="patadas" className="mt-4" />
        </section>
      )}

      {/* TRACKER VISUAL DE 10 PASOS */}
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 shadow-xs border border-stone-100 dark:border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-stone-700 dark:text-[#eae6e1]">Progreso de la sesión</span>
          {/* Región viva: cada toque se anuncia ("3 de 10 movimientos") sin mover el foco del botón grande. */}
          <span className="text-sage-ink" aria-live="polite" aria-atomic="true">{count} de 10 movimientos</span>
        </div>

        {/* 10 Pills Indicadoras (decorativas: el conteo ya se dice en texto) */}
        <div className="grid grid-cols-10 gap-1.5" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, idx) => {
            const isDone = idx < count;
            const isCurrent = idx === count && startTime !== null;
            return (
              <div
                key={idx}
                className={`h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? "bg-terracotta-ink text-white shadow-xs scale-100"
                    : isCurrent
                    ? "bg-terracotta/20 dark:bg-[#241b12] text-terracotta-ink border-2 border-terracotta-ink animate-pulse motion-reduce:animate-none scale-105"
                    : "bg-stone-100 dark:bg-[#2d273a] text-stone-600 dark:text-[#a6a1b2]"
                }`}
              >
                {isDone ? <Check size={14} /> : idx + 1}
              </div>
            );
          })}
        </div>

        {/* Barra de progreso suave */}
        <div className="w-full bg-stone-100 dark:bg-[#2d273a] rounded-full h-2 overflow-hidden" aria-hidden="true">
          <div
            className="bg-sage-ink h-full transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, (count / 10) * 100)}%` }}
          />
        </div>
      </div>

      {/* BOTÓN PRINCIPAL DE CONTEO ERGONÓMICO */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <button 
          type="button"
          onClick={handleKick}
          disabled={count >= 10}
          aria-label={count >= 10 ? "Conteo completo: 10 de 10 movimientos" : "Registrar movimiento del bebé"}
          className={`relative z-10 w-60 h-60 rounded-full shadow-2xl flex flex-col items-center justify-center transition-all duration-200 transform active:scale-95 motion-reduce:active:scale-100 select-none ${sosFocusRing} bg-sage-ink text-white border-4 border-white dark:border-white/15 ${
            count >= 10 ? "cursor-default" : "hover:bg-sage-ink-hover hover:scale-[1.02] motion-reduce:hover:scale-100"
          }`}
        >
          {count < 10 ? (
            <>
              <span className="text-8xl font-black tracking-tighter leading-none">{count}</span>
              <span className="text-sm font-bold mt-2 bg-black/20 px-3 py-1 rounded-full text-white">
                {count === 0 && !startTime ? (isPapa ? "Toca cuando lo sienta" : "Toca en cada movimiento") : "Registrar movimiento"}
              </span>
              <span className="text-xs text-white mt-1 font-medium">
                {count === 0 ? (startTime ? "El tiempo ya corre" : "El primero inicia el tiempo") : `Faltan ${10 - count} para la meta`}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 size={40} className="mb-1" aria-hidden="true" />
              <span className="text-4xl font-black tracking-tight leading-tight tabular-nums">10 de 10</span>
              <span className="text-xs font-bold tracking-tight text-white mt-1">Conteo completo</span>
            </>
          )}
        </button>

        {/* Botón Deshacer (-1) cuando hay conteo activo */}
        {count > 0 && count < 10 && (
          <button
            type="button"
            onClick={handleUndo}
            className={`mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-[#eae6e1] hover:text-stone-900 dark:hover:text-white bg-white dark:bg-[#2d273a] border border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-[#2a2e37] px-3.5 py-1.5 rounded-full shadow-xs active:scale-95 transition-all ${sosFocusRing}`}
          >
            <Undo2 size={13} aria-hidden="true" /> Deshacer último movimiento
          </button>
        )}

        {count === 0 && !startTime && (
          <button
            type="button"
            onClick={startEmptySession}
            className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-stone-300 dark:border-white/15 bg-white dark:bg-[#2d273a] px-4 text-sm font-bold text-stone-800 dark:text-[#eae6e1] hover:bg-stone-50 dark:hover:bg-[#352e44] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
          >
            <Clock size={16} aria-hidden="true" />
            {isPapa ? "Aún no lo siente: iniciar el tiempo" : "Aún no lo siento: iniciar el tiempo"}
          </button>
        )}

        {/* Atajo de teclado accesible */}
        {count < 10 && (
          <div className="mt-3 text-xs text-stone-500 dark:text-[#a6a1b2] font-medium flex items-center gap-1.5 select-none">
            <span>Con teclado, pulsa</span>
            <kbd className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-stone-100 dark:bg-[#2d273a] border border-stone-300 dark:border-white/10 rounded text-stone-700 dark:text-[#eae6e1] shadow-2xs">
              Espacio
            </kbd>
            <span>para registrar un movimiento</span>
          </div>
        )}
      </div>

      {/* LLAMAR SIN ESPERAR AL CONTEO (la alerta de 90 min ya trae sus propias llamadas) */}
      {!isOvertime && (
        <QuickCallBlock context="patadas">
          <p className="text-sm leading-relaxed text-stone-700 dark:text-[#eae6e1]">
            {isPapa ? (
              <><strong className="font-bold text-stone-900 dark:text-[#eae6e1]">Si {her} nota que se mueve menos de lo habitual,</strong> no esperen a completar el conteo: llama.</>
            ) : (
              <><strong className="font-bold text-stone-900 dark:text-[#eae6e1]">Si notas que se mueve menos de lo habitual,</strong> no esperes a completar el conteo: llama.</>
            )}
          </p>
        </QuickCallBlock>
      )}

      {/* TARJETA DE CRONÓMETRO Y ACCIONES DE SESIÓN */}
      <div className="bg-white dark:bg-[#221d2d] w-full rounded-3xl shadow-xs border border-stone-100 dark:border-white/[0.08] p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-sage/10 dark:bg-[#1a1724] text-sage-ink p-2.5 rounded-2xl">
              <Clock size={22} className={startTime ? "animate-pulse motion-reduce:animate-none text-sage-ink" : ""} />
            </div>
            <div>
              <p className="text-xs text-sage-ink font-bold tracking-tight">Tiempo de la sesión</p>
              <p className="text-2xl font-black text-stone-800 dark:text-[#eae6e1] tracking-tight font-mono tabular-nums">{formatTimer(elapsedSeconds)}</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={reset} 
            className="min-h-[44px] text-terracotta-ink font-bold text-xs bg-terracotta/10 hover:bg-terracotta/20 dark:bg-terracotta/[0.12] dark:hover:bg-terracotta/20 px-3.5 py-2 rounded-xl transition-colors tracking-tight flex items-center gap-1.5 active:scale-95 border border-terracotta-ink/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            title="Borra los movimientos y el tiempo de esta sesión"
          >
            <RotateCcw size={13} aria-hidden="true" /> Descartar conteo
          </button>
        </div>

        {/* Desplegable de Ritmo/Timeline de Patadas Registradas */}
        {kicks.length > 0 && (
          <div className="pt-2 border-t border-stone-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              aria-expanded={showTimeline}
              aria-controls={`${callPanelId}-ritmo`}
              className={`w-full min-h-[44px] flex items-center justify-between rounded-lg text-xs font-bold text-stone-600 dark:text-[#a6a1b2] hover:text-stone-900 dark:hover:text-[#eae6e1] py-1 transition-colors ${sosFocusRing}`}
            >
              <span className="flex items-center gap-1.5">
                <Activity size={14} className="text-sage-ink" />
                <span>Ver ritmo de movimientos ({kicks.length} registrados)</span>
              </span>
              {showTimeline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTimeline && (
              <div id={`${callPanelId}-ritmo`} className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pt-1">
                {kicks.map((k, idx) => (
                  <div key={k.id} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-[#2d273a]/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/[0.06]">
                    <span className="font-bold text-stone-700 dark:text-[#eae6e1]">Movimiento {idx + 1}</span>
                    <span className="text-stone-500 dark:text-[#a6a1b2] font-mono">{k.timeStr}</span>
                    <span className="text-sage-ink font-semibold text-xs">
                      {k.intervalSecs !== null ? `+${formatDurationText(k.intervalSecs)}` : "Inicio"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TARJETA DE CELEBRACIÓN Y NOTA AL COMPLETAR */}
      {completedSession && (
        <div className="bg-sage-ink text-white rounded-3xl p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-2xl">
                <CheckCircle2 size={24} aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-lg font-black leading-tight">Sesión guardada</h4>
                <p className="text-xs text-white mt-0.5">10 movimientos completados en {completedSession.durationFormatted}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCompletedSession(null)}
              className={`text-white hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-colors ${onFillFocusRing}`}
              aria-label="Cerrar aviso de sesión completada"
            >
              <X size={18} />
            </button>
          </div>

          <p className={`text-xs text-white leading-relaxed bg-black/15 p-3 rounded-2xl${slowSession ? " font-semibold" : ""}`}>
            {slowSession
              ? isPapa
                ? `${slowLead} Si ${her} siente que se mueve menos de lo habitual, llama hoy a su obstetra.`
                : `${slowLead} Si sientes que se mueve menos de lo habitual, llama hoy a tu obstetra.`
              : isPapa
                ? `Si algún día ${her} nota que tarda mucho más de lo habitual o se mueve menos, llama a su obstetra ese mismo día.`
                : "Si algún día notas que tarda mucho más de lo habitual o se mueve menos, llama a tu obstetra ese mismo día."}
          </p>

          {/* El aviso dice "llama hoy": la llamada tiene que estar aquí mismo, a un toque. */}
          {slowSession && <CallActions context="patadas" />}

          <div>
            <p className="text-xs font-bold tracking-tight text-white mb-2">Agrega una nota a la sesión:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Después de comer",
                  "En reposo",
                  "Con música",
                  "Por la noche",
                  "En la mañana",
                  "Tras caminar"
                ].map(note => (
                <button
                  key={note}
                  type="button"
                  onClick={() => saveSessionNote(note)}
                  aria-pressed={selectedNote === note}
                  className={`min-h-[44px] text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${onFillFocusRing} ${
                    selectedNote === note
                      ? "bg-white text-sage-ink dark:text-sage-ink-hover font-bold shadow-sm"
                      : "bg-black/15 text-white hover:bg-black/25"
                  }`}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            // Blanco en ambos temas: en oscuro la tinta de texto (#89bca0) daría 2.15:1; la de relleno oscuro da 7.1:1.
            className={`w-full min-h-[48px] py-3 bg-white text-sage-ink dark:text-sage-ink-hover rounded-2xl font-bold text-sm hover:bg-stone-100 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 ${onFillFocusRing}`}
          >
            <RotateCcw size={14} aria-hidden="true" /> Iniciar una sesión nueva
          </button>
        </div>
      )}

      {/* PROMEDIO PERSONAL (sin juicios clínicos: solo tu referencia) */}
      {avgDurationMinutes !== null && (
        <div className="bg-sage/10 dark:bg-[#221d2d] rounded-3xl p-4 border border-sage/20 dark:border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-sage/20 dark:bg-[#1a1724] text-sage-ink p-2.5 rounded-2xl">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-800 dark:text-[#eae6e1]">{isPapa ? "Su promedio para llegar a 10" : "Tu promedio para llegar a 10"}</p>
              <p className="text-lg font-black text-sage-ink tabular-nums">~{avgDurationMinutes} minutos</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-stone-600 dark:text-[#a6a1b2] tabular-nums">
            {validSessions.length} {validSessions.length === 1 ? "sesión" : "sesiones"}
          </span>
        </div>
      )}

      {/* HISTORIAL DE SESIONES */}
      <div>
        <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 mb-3">
          <h4 className="font-bold text-stone-800 dark:text-[#eae6e1] flex items-center gap-2 text-sm">
            <History size={18} className="text-sage-ink" aria-hidden="true" /> Historial ({sessions.length})
          </h4>
          <SyncBadge lastSyncedAt={history.meta?.updatedAt ?? null} waiting={!history.loaded} />
        </div>

        <RetryNotice state={retryState} onDismiss={clearRetry} className="mb-3" />
        {history.unsentIds.size > 0 && (
          <div className="mb-3">
            <UnsentNotice count={history.unsentIds.size} onRetry={history.retryUnsent} one="sesión" many="sesiones" />
          </div>
        )}
        {history.loadError && (
          <div className="mb-3">
            <LoadErrorNotice what="el historial compartido" onRetry={history.retryLoad} />
          </div>
        )}

        {history.loadError ? null : !history.loaded && sessions.length === 0 ? (
          <SharedLoading what="el historial compartido" />
        ) : sessions.length === 0 ? (
          <div className="bg-stone-50 dark:bg-[#221d2d]/60 rounded-2xl p-6 text-center border border-dashed border-stone-200 dark:border-white/[0.08]">
            <Baby className="mx-auto text-stone-400 dark:text-[#a6a1b2]/50 mb-2" size={32} aria-hidden="true" />
            <p className="text-stone-600 dark:text-[#a6a1b2] text-sm">Aún no hay sesiones guardadas. Completa 10 movimientos para guardar la primera.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map(s => (
              <div key={s.id} className="bg-white dark:bg-[#221d2d] p-3.5 rounded-2xl border border-stone-200/80 dark:border-white/[0.08] shadow-xs flex justify-between items-center group hover:border-sage/30 dark:hover:border-sage/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 dark:bg-[#1a1724] text-sage-hover dark:text-sage/80 p-2 rounded-xl shrink-0">
                    <CheckCircle size={18}/>
                  </div>
                  <div className="min-w-0">
                    <span className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-[#eae6e1] text-xs leading-tight">
                      {s.timestamp > 0 ? formatDayTime(s.timestamp, listNow) : s.dateFormatted}
                      {history.linked && <ItemAuthor item={s} members={me.members} />}
                    </span>
                    {history.unsentIds.has(String(s.id)) && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        <CloudOff size={12} aria-hidden="true" /> Sin enviar
                      </span>
                    )}
                    {s.note && (
                      <span className="text-xs font-medium text-sage-ink bg-sage/10 dark:bg-[#1a1724] px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {s.note}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-black text-stone-800 dark:text-[#eae6e1]">{s.count} movimientos</p>
                    <p className="text-xs font-semibold text-stone-500 dark:text-[#a6a1b2] font-mono">en {s.durationFormatted}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSession(s)}
                    aria-label={`Eliminar sesión de ${s.timestamp > 0 ? formatDayTime(s.timestamp, listNow) : s.dateFormatted}`}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 dark:text-[#a6a1b2] hover:text-terracotta-ink hover:bg-stone-100 dark:hover:bg-[#2d273a] p-2 rounded-xl transition-colors ${sosFocusRing}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

type ContractionItem = { id: number; start: number; duration: number; interval: number | null } & Authored;

/** Ventana móvil sobre la que se evalúan las reglas: los últimos 60 minutos. */
const CONTRACTION_WINDOW_MS = 60 * 60 * 1000;
/**
 * Tolerancia en los bordes de la ventana para decir que el registro "cubre la hora":
 * la primera contracción de la ventana debe caer en sus primeros 7,5 min (1,5 × 5 min)
 * y la última no puede tener más de 7,5 min (el patrón sigue activo).
 */
const CONTRACTION_EDGE_MS = 7.5 * 60 * 1000;

/**
 * Reglas de contracciones sobre la ventana móvil de 60 min.
 * - Antes de la semana 37: 4 o más en la última hora → posible parto pretérmino (llamar ya).
 * - Semana 37 o más: 5-1-1 → intervalo medio ≤ 5 min, duración media ≥ 60 s y el registro
 *   cubre la hora completa.
 * - Semana desconocida: se vigilan las dos (ante la duda, avisar).
 */
function analyzeContractions(history: ContractionItem[], now: number, week?: number) {
  const windowStart = now - CONTRACTION_WINDOW_MS;
  // Con vínculo, mamá y copiloto pueden cronometrar la MISMA contracción en dos teléfonos:
  // las que se solapan en el tiempo cuentan una sola vez (no inflan el conteo de la alerta).
  const recent: ContractionItem[] = [];
  for (const h of history.filter((x) => x.start >= windowStart).sort((a, b) => a.start - b.start)) {
    const prev = recent[recent.length - 1];
    if (prev && h.start <= prev.start + prev.duration * 1000) continue;
    recent.push(h);
  }
  const count = recent.length;
  const avgDuration = count > 0 ? Math.round(recent.reduce((acc, h) => acc + h.duration, 0) / count) : 0;
  const avgInterval = count > 1 ? Math.round((recent[count - 1].start - recent[0].start) / 1000 / (count - 1)) : 0;
  const weekKnown = typeof week === "number";
  const preterm = isPreterm(week);
  const pretermAlert = (preterm || !weekKnown) && count >= 4;
  const coversHour =
    count >= 3 &&
    recent[0].start - windowStart <= CONTRACTION_EDGE_MS &&
    now - recent[count - 1].start <= CONTRACTION_EDGE_MS;
  const activeLabor = !preterm && coversHour && avgInterval > 0 && avgInterval <= 300 && avgDuration >= 60;
  return { count, avgDuration, avgInterval, preterm, weekKnown, pretermAlert, activeLabor };
}

const ACTIVE_CONTRACTION_KEY = "pandajr_contraction_active";
// Una contracción dura 1 o 2 minutos: más de 10 minutos abierta es un registro olvidado.
const ACTIVE_CONTRACTION_MAX_MS = 10 * 60 * 1000;

const CONTRACTIONS_KEY = "pandajr_contractions_history";

function sanitizeContractions(raw: unknown[]): ContractionItem[] {
  const out: ContractionItem[] = [];
  const seen = new Set<number>();
  for (const r of raw) {
    if (!isRecord(r)) continue;
    const id = finiteNum(r.id);
    const start = finiteNum(r.start);
    const duration = finiteNum(r.duration);
    if (id === null || start === null || duration === null || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, start, duration, interval: finiteNum(r.interval), ...authoredFrom(r) });
  }
  return out.sort((a, b) => b.start - a.start);
}

const CONTRACTION_LIST: SharedListSpec<ContractionItem> = {
  localKey: CONTRACTIONS_KEY,
  listen: listenToContractions,
  mutate: mutateContractions,
  sanitize: sanitizeContractions,
  // La versión anterior guardaba las contracciones solo en el teléfono, aun con vínculo.
  localMerge: { tool: "contractions", upgrade: true },
};

/** Inicio de la contracción que se estaba cronometrando (sobrevive a cambiar de herramienta). */
function loadActiveContraction(): number | null {
  const s = readStored<{ startTime?: unknown }>(ACTIVE_CONTRACTION_KEY);
  const t = s && typeof s.startTime === "number" ? s.startTime : null;
  if (t === null) return null;
  const age = Date.now() - t;
  return age >= 0 && age <= ACTIVE_CONTRACTION_MAX_MS ? t : null;
}

export function ContadorContracciones({ showToast, profile }: { showToast: ShowToast, profile?: UserProfile }) {
  const week = knownWeek(profile);
  const me = useMe();
  const { isPapa, her, Her } = companionVoice(me);
  const alertId = React.useId();
  // Contracción en curso restaurada: abrir Síntomas u otra herramienta no la pierde.
  const [restoredStart] = useState(loadActiveContraction);
  const [isRecording, setIsRecording] = useState(restoredStart !== null);
  const [startTime, setStartTime] = useState<number | null>(restoredStart);
  const [currentDuration, setCurrentDuration] = useState(() => (restoredStart ? Math.floor((Date.now() - restoredStart) / 1000) : 0));
  // Reloj de la ventana móvil: se refresca cada 15 s y al registrar/quitar contracciones.
  const [now, setNow] = useState(() => Date.now());

  // Historial: con vínculo se comparte (el listener trae las de la pareja); sin vínculo, en este teléfono.
  const shared = useSharedList(me.pid, CONTRACTION_LIST, authorStamp(me));
  const history = shared.items;
  const { retryState, fail, clearRetry } = useRetry();

  // El descanso cuenta desde la última contracción registrada por cualquiera (id = fin de la contracción).
  const latestEnd = history.reduce((max, h) => Math.max(max, h.id), 0);
  const lastEndedAt = latestEnd > 0 && now - latestEnd < CONTRACTION_WINDOW_MS ? latestEnd : null;
  const restClock = useNow(1000, !isRecording && lastEndedAt !== null);
  const restSeconds = lastEndedAt ? Math.max(0, Math.floor((restClock - lastEndedAt) / 1000)) : 0;

  // Mutación deliberada (PRODUCT.md §2): guardar solo desde manejadores de evento,
  // nunca como efecto secundario de que cambie `history`.
  const commitHistory = (fn: (items: ContractionItem[]) => ContractionItem[], failMessage: string) => {
    setNow(Date.now());
    function run() {
      shared.apply(fn).then((ok) => {
        if (!ok) fail(failMessage, run);
      });
    }
    run();
  };

  useEffect(() => {
    if (history.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, [history.length]);

  // Cronómetro de contracción activa
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && startTime) {
      interval = setInterval(() => {
        setCurrentDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  const toggleRecording = () => {
    const now = Date.now();
    if (!isRecording) {
      setStartTime(now);
      setCurrentDuration(0);
      setIsRecording(true);
      writeStored(ACTIVE_CONTRACTION_KEY, { startTime: now });
    } else {
      writeStored(ACTIVE_CONTRACTION_KEY, null);
      if (startTime) {
        const durationSecs = Math.max(1, Math.floor((now - startTime) / 1000));
        let intervalSecs: number | null = null;
        if (history.length > 0) {
          const lastStart = history[0].start;
          intervalSecs = Math.floor((startTime - lastStart) / 1000);
        }
        // Registro nuevo: si no llega al servidor queda "Sin enviar" en este teléfono, sigue contando
        // para las alertas y se reenvía solo (nunca se pierde por un fallo de red).
        setNow(Date.now());
        void shared.add({ id: now, start: startTime, duration: durationSecs, interval: intervalSecs, ...authorStamp(me) });
      }
      setIsRecording(false);
      setStartTime(null);
    }
  };

  // Atajo de teclado: Barra espaciadora para iniciar/detener (siempre con el manejador del último render).
  const toggleKeyRef = useRef(toggleRecording);
  useEffect(() => {
    toggleKeyRef.current = toggleRecording;
  });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Sobre un botón o enlace, Espacio activa ese control (el botón grande ya alterna
      // con su propio clic); dentro de la hoja del equipo de salud no debe contar.
      if ((e.code === "Space" || e.key === " ") && !isControlTarget(e.target)) {
        e.preventDefault();
        toggleKeyRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const clearHistory = () => {
    if (history.length === 0) return;
    const backup = [...history];
    const ids = new Set(backup.map((h) => h.id));
    // Quita solo lo que se veía (si la pareja registra otra en ese instante, se conserva).
    commitHistory((items) => items.filter((h) => !ids.has(h.id)), "No se pudo borrar el historial.");
    showToast("Historial de contracciones borrado", () =>
      commitHistory(restoreItems(backup), "No se pudo recuperar el historial.")
    );
  };

  const deleteItem = (item: ContractionItem) => {
    commitHistory(removeById<ContractionItem>(item.id), "No se pudo eliminar la contracción.");
    showToast("Contracción eliminada", () => commitHistory(restoreItems([item]), "No se pudo recuperar la contracción."));
  };

  // Promedios y reglas sobre la ventana móvil de los últimos 60 minutos
  const { count: recentCount, avgDuration, avgInterval, preterm, weekKnown, pretermAlert, activeLabor } = analyzeContractions(history, now, week);
  // Con semana desconocida y 5-1-1 cumplido, basta la alerta de trabajo de parto (también pide llamar).
  const showPretermAlert = pretermAlert && !activeLabor;

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full space-y-4">

      {/* Alerta: posible parto pretérmino (antes de la semana 37, 4 o más en 1 hora) */}
      {showPretermAlert && (
        <section
          aria-labelledby={`${alertId}-pretermino`}
          className="rounded-3xl border border-terracotta-ink/35 bg-terracotta/10 dark:bg-terracotta/[0.12] p-4 animate-in slide-in-from-top-3"
        >
          <div role="alert" aria-live="assertive" className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-terracotta-ink text-white">
              <AlertTriangle size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id={`${alertId}-pretermino`} className="text-base font-bold leading-snug text-terracotta-ink">
                {weekKnown ? "Posible parto pretérmino" : "4 o más contracciones en la última hora"}
              </h3>
              {weekKnown ? (
                <p className="mt-1 text-sm leading-relaxed text-stone-800 dark:text-[#eae6e1]">
                  {isPapa
                    ? `Registraron ${recentCount} contracciones en la última hora y ${her} está en la semana ${week}.`
                    : `Registraste ${recentCount} contracciones en la última hora y estás en la semana ${week}.`}{" "}
                  <strong className="font-bold text-stone-900 dark:text-white">{isPapa ? "Llama ya a su obstetra o a emergencias." : "Llama ya a tu obstetra o a emergencias."}</strong>{" "}
                  {isPapa ? "No esperen a que se detengan." : "No esperes a que se detengan."}
                </p>
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-stone-800 dark:text-[#eae6e1]">
                  {isPapa ? `Registraron ${recentCount} contracciones en la última hora.` : `Registraste ${recentCount} contracciones en la última hora.`}{" "}
                  <strong className="font-bold text-stone-900 dark:text-white">
                    {isPapa ? `Si ${her} está antes de la semana 37, llama ya a su obstetra o a emergencias:` : "Si estás antes de la semana 37, llama ya a tu obstetra o a emergencias:"}
                  </strong>{" "}
                  puede ser parto pretérmino. {isPapa ? "Indiquen la semana en Ajustes para que el aviso sea exacto." : "Indica tu semana en Ajustes para que el aviso sea exacto."}
                </p>
              )}
            </div>
          </div>
          <CallActions context="pretermino" className="mt-4" />
        </section>
      )}

      {/* Alerta: posible trabajo de parto activo (regla 5-1-1, semana 37 o más) */}
      {activeLabor && (
        <section
          aria-labelledby={`${alertId}-511`}
          className="rounded-3xl border border-terracotta-ink/35 bg-terracotta/10 dark:bg-terracotta/[0.12] p-4 animate-in slide-in-from-top-3"
        >
          <div role="alert" aria-live="assertive" className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-terracotta-ink text-white">
              <AlertTriangle size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id={`${alertId}-511`} className="text-base font-bold leading-snug text-terracotta-ink">
                Posible trabajo de parto activo
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-800 dark:text-[#eae6e1]">
                En la última hora {isPapa ? "sus" : "tus"} contracciones llegaron cada {formatTime(avgInterval)} en promedio y duraron unos {formatTime(avgDuration)}.{" "}
                <strong className="font-bold text-stone-900 dark:text-white">{isPapa ? "Es momento de llamar a su obstetra o ir al hospital." : "Es momento de llamar a tu obstetra o ir al hospital."}</strong>
              </p>
            </div>
          </div>
          <CallActions context="contracciones" className="mt-4" />
        </section>
      )}

      {/* Tarjetas de Promedios (última hora) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 shadow-xs border border-stone-100 dark:border-white/[0.08] flex flex-col items-center justify-center text-center">
          <p className="text-xs text-stone-600 dark:text-[#a6a1b2] font-bold tracking-tight mb-1">Duración media</p>
          <p className="text-xl font-black text-sage-ink tabular-nums">{recentCount > 0 ? formatTime(avgDuration) : "—"}</p>
          <p className="text-xs text-stone-600 dark:text-[#a6a1b2] mt-0.5">última hora</p>
        </div>
        <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 shadow-xs border border-stone-100 dark:border-white/[0.08] flex flex-col items-center justify-center text-center">
          <p className="text-xs text-stone-600 dark:text-[#a6a1b2] font-bold tracking-tight mb-1">Frecuencia media</p>
          <p className="text-xl font-black text-terracotta-ink tabular-nums">{avgInterval ? formatTime(avgInterval) : "—"}</p>
          <p className="text-xs text-stone-600 dark:text-[#a6a1b2] mt-0.5">última hora</p>
        </div>
      </div>

      {/* Botón Principal del Cronómetro */}
      <button
        type="button"
        onClick={toggleRecording}
        className={`w-full py-7 rounded-3xl shadow-xl text-white font-bold text-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 motion-reduce:active:scale-100 ${sosFocusRing} ${
          isRecording
            ? "bg-terracotta-ink-hover ring-4 ring-terracotta/35"
            : "bg-terracotta-ink hover:bg-terracotta-ink-hover"
        }`}
        aria-label={isRecording ? "Detener registro de contracción" : "Iniciar registro de contracción"}
      >
        <div className="flex items-center gap-2">
          {isRecording ? <Square size={32} /> : <Play size={32} />}
          <span className="text-2xl font-black tracking-tight tabular-nums">
            {isRecording ? formatTime(currentDuration) : "Iniciar contracción"}
          </span>
        </div>
        <span className="text-xs font-medium">
          {isRecording
            ? isPapa ? `Toca cuando ${her} te diga que terminó` : "Toca o presiona Espacio al terminar"
            : isPapa ? `Toca cuando ${her} te diga que empieza` : "Toca o presiona Espacio al sentir que inicia"}
        </span>
      </button>

      {/* La regla que aplica y las llamadas, siempre a un toque (las alertas traen las suyas) */}
      {!showPretermAlert && !activeLabor && (
        <QuickCallBlock context="contracciones">
          <div className="flex gap-3">
            <Info size={20} className="mt-0.5 shrink-0 text-terracotta-ink" aria-hidden="true" />
            {preterm ? (
              <p className="text-sm leading-relaxed text-stone-700 dark:text-[#eae6e1]">
                {isPapa ? `${Her} está en la semana ${week}.` : `Estás en la semana ${week}.`} Antes de la semana 37, <strong className="font-bold text-stone-900 dark:text-white">4 o más contracciones en 1 hora</strong>, presión en la pelvis o dolor lumbar que va y viene son motivo para llamar ya.
                {recentCount > 0 && ` En la última hora ${isPapa ? "llevan" : "llevas"} ${recentCount} ${recentCount === 1 ? "contracción" : "contracciones"}.`}
              </p>
            ) : !weekKnown ? (
              <p className="text-sm leading-relaxed text-stone-700 dark:text-[#eae6e1]">
                {isPapa ? "No tenemos confirmada la semana" : "No tenemos confirmada tu semana"}, así que vigilamos las dos reglas. <strong className="font-bold text-stone-900 dark:text-white">Antes de la semana 37:</strong> 4 o más contracciones en 1 hora son motivo para llamar ya. <strong className="font-bold text-stone-900 dark:text-white">Desde la semana 37:</strong> cada 5 minutos o menos, de 1 minuto, durante 1 hora (5-1-1).
                {recentCount > 0 && ` En la última hora ${isPapa ? "llevan" : "llevas"} ${recentCount} ${recentCount === 1 ? "contracción" : "contracciones"}.`}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-stone-700 dark:text-[#eae6e1]">
                {isPapa ? (
                  <><strong className="font-bold text-stone-900 dark:text-white">Si se rompe la fuente, {her} tiene sangrado o el bebé se mueve menos,</strong> no esperen a la regla 5-1-1 (contracciones cada 5 minutos, de 1 minuto, durante 1 hora): llama.</>
                ) : (
                  <><strong className="font-bold text-stone-900 dark:text-white">Si se rompe la fuente, tienes sangrado o el bebé se mueve menos,</strong> no esperes a la regla 5-1-1 (contracciones cada 5 minutos, de 1 minuto, durante 1 hora): llama.</>
                )}
              </p>
            )}
          </div>
        </QuickCallBlock>
      )}

      {/* MODO RECUPERACIÓN Y RESPIRACIÓN GUIADA ENTRE CONTRACCIONES */}
      {!isRecording && history.length > 0 && (
        <div className="bg-sage/[0.08] dark:bg-[#221d2d] rounded-3xl p-5 border border-sage/30 dark:border-white/[0.08] space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-sage/20 dark:border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sage-ink animate-ping motion-reduce:animate-none" aria-hidden="true"></span>
              <h3 className="text-xs font-bold text-stone-900 dark:text-[#eae6e1] tracking-tight">Descanso entre contracciones</h3>
            </div>
            <span className="text-xs font-bold text-sage-ink font-mono tabular-nums">
              Descanso: {formatTime(restSeconds)}
            </span>
          </div>

          {/* Pacer Visual de Respiración */}
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sage/20 to-emerald-400/30 border-2 border-sage flex items-center justify-center animate-pulse motion-reduce:animate-none">
              <HeartPulse size={32} className="text-sage-ink" aria-hidden="true" />
            </div>
            <p className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm mt-3">
              {isPapa ? "Respiren juntos: inhalen lento en 4 s… exhalen suave en 6 s" : "Inhala lento en 4 s… exhala suave en 6 s"}
            </p>
            <p className="text-xs text-stone-600 dark:text-[#a6a1b2] max-w-xs mt-0.5">
              {isPapa ? `Recuérdale a ${her} soltar la mandíbula y los hombros: la ayuda a relajarse entre contracciones.` : "Suelta la mandíbula y los hombros: ayuda a relajarte entre contracciones."}
            </p>
          </div>

          {/* Guía Rápida para el Acompañante */}
          <div className="border-t border-sage/20 dark:border-white/[0.08] pt-4 text-sm space-y-1.5">
            <p className="font-bold text-sage-ink flex items-center gap-1.5">
              <HeartHandshake size={14} className="shrink-0" aria-hidden="true" />
              <span>{isPapa ? "Tú, entre contracciones:" : "Para tu acompañante:"}</span>
            </p>
            <ul className="list-disc space-y-1 pl-5 text-stone-600 dark:text-[#a6a1b2] leading-relaxed marker:text-sage-ink">
              <li>Ofrece un sorbo pequeño de agua fresca o bálsamo labial.</li>
              <li>Aplica contrapresión firme con el talón de la mano en el sacro (espalda baja).</li>
              <li>Recuérdale con voz serena: <em>“Respira profundo, lo estás haciendo genial.”</em></li>
            </ul>
          </div>
        </div>
      )}

      {/* Dónde vive el historial y avisos de guardado */}
      <div className="flex flex-col gap-2">
        <SyncBadge lastSyncedAt={shared.meta?.updatedAt ?? null} waiting={!shared.loaded} />
        <RetryNotice state={retryState} onDismiss={clearRetry} />
        <UnsentNotice count={shared.unsentIds.size} onRetry={shared.retryUnsent} one="contracción" many="contracciones" />
        {shared.loadError && <LoadErrorNotice what="el historial compartido" onRetry={shared.retryLoad} />}
      </div>

      {/* Historial o Estado Inicial */}
      {shared.loadError ? null : !shared.loaded && history.length === 0 ? (
        <SharedLoading what="el historial compartido" />
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-[#221d2d] rounded-3xl p-6 border border-dashed border-stone-200 dark:border-white/[0.08] text-center shadow-xs">
          <div className="bg-sage/10 dark:bg-[#1a1724] w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-sage-ink">
            <HeartPulse size={24} />
          </div>
          <h3 className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm mb-1">Sin contracciones registradas</h3>
          <p className="text-sm text-stone-600 dark:text-[#a6a1b2] max-w-xs mx-auto leading-relaxed">
            {isPapa
              ? preterm || !weekKnown
                ? `Cuando ${her} sienta que su vientre se endurece, toca el botón grande al empezar y otra vez al terminar. Les avisamos si registran 4 o más contracciones en 1 hora (antes de la semana 37) o si se cumple la regla 5-1-1.`
                : `Cuando ${her} sienta que su vientre se endurece, toca el botón grande al empezar y otra vez al terminar. Medimos la última hora y les avisamos cuando se cumpla la regla 5-1-1: cada 5 minutos o menos, de 1 minuto o más, durante 1 hora.`
              : preterm || !weekKnown
                ? "Cuando sientas que tu vientre se endurece, toca el botón grande al empezar y otra vez al terminar. Te avisamos si registras 4 o más contracciones en 1 hora (antes de la semana 37) o si se cumple la regla 5-1-1."
                : "Cuando sientas que tu vientre se endurece, toca el botón grande al empezar y otra vez al terminar. Medimos la última hora y te avisamos cuando se cumpla la regla 5-1-1: cada 5 minutos o menos, de 1 minuto o más, durante 1 hora."}
          </p>
          {!preterm && (
            <p className="mt-2 text-sm text-stone-600 dark:text-[#a6a1b2] max-w-xs mx-auto leading-relaxed">
              Las contracciones de práctica (Braxton Hicks) suelen ser irregulares y se calman al descansar; las de trabajo de parto se vuelven regulares, más largas y más seguidas.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 id={`${alertId}-historial`} className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm flex items-center gap-2">
              <Timer size={18} className="text-terracotta-ink" aria-hidden="true" /> Historial ({history.length})
            </h3>
            <button
              type="button"
              onClick={clearHistory}
              className="min-h-[44px] px-2 -mr-2 rounded-lg text-xs font-bold text-stone-600 dark:text-[#a6a1b2] hover:text-terracotta-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink"
            >
              Borrar historial
            </button>
          </div>

          {/* Tabla con semántica ARIA: el lector anuncia la columna (Hora, Duración…) de cada dato. */}
          <div role="table" aria-labelledby={`${alertId}-historial`} className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xs border border-stone-200/80 dark:border-white/[0.08] overflow-hidden">
            <div role="rowgroup">
              <div role="row" className="grid grid-cols-4 bg-stone-50 dark:bg-[#2d273a]/50 p-3 text-xs font-bold text-stone-600 dark:text-[#a6a1b2] tracking-tight text-center">
                <div role="columnheader">Hora</div>
                <div role="columnheader">Duración</div>
                <div role="columnheader">Frecuencia</div>
                <div role="columnheader">Eliminar</div>
              </div>
            </div>
            <div role="rowgroup" className="divide-y divide-stone-100 dark:divide-white/[0.06] text-xs text-center">
              {history.map((item) => (
                <div key={item.id} role="row" className="grid grid-cols-4 px-3 py-1.5 items-center hover:bg-stone-50/70 dark:hover:bg-[#2d273a]/40 transition-colors">
                  <div role="cell" className="flex items-center justify-center gap-1.5 text-stone-700 dark:text-[#a6a1b2] font-medium tabular-nums">
                    {shared.linked && <ItemAuthor item={item} members={me.members} />}
                    {new Date(item.start).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    {shared.unsentIds.has(String(item.id)) && (
                      <span role="img" aria-label="Sin enviar" title="Sin enviar a tu pareja" className="text-amber-800 dark:text-amber-300">
                        <CloudOff size={12} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div role="cell">
                    <span className="font-bold text-sage-ink bg-sage/10 dark:bg-[#1a1724] py-1 px-2 rounded-lg inline-block tabular-nums">
                      {formatTime(item.duration)}
                    </span>
                  </div>
                  <div role="cell" className="font-bold text-terracotta-ink tabular-nums">
                    {item.interval ? formatTime(item.interval) : "—"}
                  </div>
                  <div role="cell">
                    <button
                      type="button"
                      onClick={() => deleteItem(item)}
                      aria-label={`Eliminar la contracción de las ${new Date(item.start).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`}
                      className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-stone-500 dark:text-[#a6a1b2] hover:text-terracotta-ink hover:bg-stone-100 dark:hover:bg-[#2d273a] p-2 rounded-xl transition-colors ${sosFocusRing}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- NOMBRES: votos por persona (subcolección baby_names) ---

type NameGender = NonNullable<BabyName["gender"]>;
type NameFilter = "todos" | NameGender;
type NameVote = "like" | "nope";

const NAME_FILTERS: { id: NameFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "nina", label: "Niña" },
  { id: "nino", label: "Niño" },
  { id: "unisex", label: "Unisex" },
];
const GENDER_LABEL: Record<NameGender, string> = { nina: "Niña", nino: "Niño", unisex: "Unisex" };
/** Lo que entiende /api/names. */
const API_GENDER: Record<NameFilter, string> = { todos: "todos", nina: "niña", nino: "niño", unisex: "neutro" };

/** Nombre en este teléfono (modo sin vínculo): solo MI voto. */
type LocalName = {
  id: string;
  name: string;
  gender?: NameGender;
  origin?: string;
  meaning?: string;
  source?: BabyName["source"];
  vote?: NameVote;
  createdAt: number;
};

const LOCAL_NAMES_KEY = "pandajr_baby_names_v2";
const LEGACY_LOCAL_NAMES_KEY = "pandajr_baby_names";
/** Mi voto optimista mientras Firestore lo confirma (se retira con el siguiente snapshot). */
type VoteOverlay = { vote: NameVote | null; confirmed: boolean };
const EMPTY_VOTES: Record<string, VoteOverlay> = {};

function toGender(g: unknown): NameGender | undefined {
  if (typeof g !== "string") return undefined;
  const k = babyNameKey(g);
  if (k === "nina" || k === "f" || k === "femenino") return "nina";
  if (k === "nino" || k === "m" || k === "masculino") return "nino";
  if (k === "unisex" || k === "neutro") return "unisex";
  return undefined;
}

function sanitizeLocalNames(raw: unknown[]): LocalName[] {
  const seen = new Set<string>();
  const out: LocalName[] = [];
  raw.forEach((r, index) => {
    if (!isRecord(r)) return;
    const name = cleanStr(r.name ?? r.text, 60);
    const key = babyNameKey(name);
    if (!name || !key || seen.has(key)) return;
    seen.add(key);
    const source = r.source === "user" || r.source === "ai" || r.source === "suggestion" ? r.source : undefined;
    out.push({
      id: typeof r.id === "string" && r.id ? r.id : `local-${key}`,
      name,
      gender: toGender(r.gender),
      origin: cleanStr(r.origin) || undefined,
      meaning: cleanStr(r.meaning, 400) || undefined,
      source,
      vote: r.vote === "like" || r.vote === "nope" ? r.vote : undefined,
      createdAt: finiteNum(r.createdAt) ?? index,
    });
  });
  return out;
}

/**
 * Nombres de este teléfono. La primera vez convierte el formato antiguo: quita los 6 nombres
 * de ejemplo (traían "votos de la pareja" inventados) y conserva el `status` como voto propio,
 * porque sin vínculo solo votaba quien usa este teléfono.
 */
function loadLocalNames(): LocalName[] {
  const v2 = readStored<unknown>(LOCAL_NAMES_KEY);
  if (Array.isArray(v2)) return sanitizeLocalNames(v2);
  const legacy = readStored<unknown>(LEGACY_LOCAL_NAMES_KEY);
  if (!Array.isArray(legacy)) return [];
  return sanitizeLocalNames(
    legacy
      .filter((item) => isRecord(item) && !isLegacySeedNameItem(item))
      .map((item) => {
        const r = item as Record<string, unknown>;
        return {
          ...r,
          id: undefined,
          source: "ai",
          vote: r.status === "liked" ? "like" : r.status === "disliked" ? "nope" : undefined,
        };
      })
  );
}

/** Migración única por embarazo del formato antiguo compartido (sin semillas y sin votos). */
function migrateNamesOnce(pid: string) {
  const flag = `pandajr_mig_babynames_${pid}`;
  if (readStored(flag)) return;
  migrateLegacyBabyNames(pid, LEGACY_SEED_NAMES).then(
    () => writeStored(flag, true),
    () => {
      // Sin conexión o sin permisos: se intentará la próxima vez que se abra Nombres.
    }
  );
}

/**
 * Traspaso único al vincular: los nombres que había solo en este teléfono pasan al embarazo
 * compartido con MI voto (nunca votos de la pareja). addBabyName usa id estable por nombre:
 * si ya existe no duplica ni borra votos. Idempotente.
 */
function mergeLocalNamesOnce(pid: string, uid: string, myName?: string) {
  const flag = localToSharedFlag("names", pid);
  if (readStored(flag)) return;
  if (!readStored(linkedFromLocalKey(pid))) {
    writeStored(flag, true);
    return;
  }
  const local = loadLocalNames();
  if (!local.length) {
    writeStored(flag, true);
    return;
  }
  Promise.all(
    local.map(async (n) => {
      const id = await addBabyName(pid, {
        name: n.name,
        gender: n.gender,
        origin: n.origin,
        meaning: n.meaning,
        source: n.source ?? "user",
        addedBy: uid,
        addedByName: myName?.trim() || undefined,
      });
      if (n.vote) await voteBabyName(pid, id, uid, n.vote);
    })
  ).then(
    () => writeStored(flag, true),
    () => {
      // Se intentará la próxima vez que se abra Nombres (idempotente).
    }
  );
}

type NameCard = {
  id: string;
  name: string;
  gender?: NameGender;
  origin?: string;
  meaning?: string;
  source?: BabyName["source"];
  addedByName?: string;
  votes: Record<string, NameVote>;
  myVote?: NameVote;
};

function sourceLabel(card: NameCard): string {
  if (card.source === "ai") return "Sugerencia de PandaIA";
  if (card.source === "suggestion") return "De la lista de ideas de PandaJR";
  if (card.addedByName) return `Lo agregó ${card.addedByName}`;
  return "Agregado a mano";
}

export function VotadorNombres({ showToast }: { showToast: ShowToast }) {
  const me = useMe();
  const { pid, myUid, members } = me;
  const linked = !!pid;
  const online = useOnline();
  const baseId = React.useId();
  const { retryState, fail, clearRetry } = useRetry();

  // Sin vínculo: localStorage con solo mis votos.
  const [localNames, setLocalNames] = useState<LocalName[]>(loadLocalNames);
  const localRef = useRef(localNames);
  const commitLocal = (next: LocalName[]) => {
    localRef.current = next;
    setLocalNames(next);
    writeStored(LOCAL_NAMES_KEY, next);
  };

  // Con vínculo: subcolección compartida; mis votos optimistas encima mientras se confirman.
  const [remote, setRemote] = useState<{ pid: string; names: BabyName[] } | null>(null);
  const [errorPid, setErrorPid] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [overlay, setOverlay] = useState<{ pid: string; votes: Record<string, VoteOverlay> }>({ pid: "", votes: {} });

  useEffect(() => {
    if (!pid) return;
    let migrationChecked = false;
    return listenToBabyNamesV2(
      pid,
      (names) => {
        setRemote({ pid, names });
        setErrorPid(null);
        // Los votos ya confirmados vienen incluidos en este snapshot.
        setOverlay((o) => {
          if (o.pid !== pid) return o;
          const pending = Object.entries(o.votes).filter(([, v]) => !v.confirmed);
          return pending.length === Object.keys(o.votes).length ? o : { pid, votes: Object.fromEntries(pending) };
        });
        // Una sola vez por embarazo, tras el primer snapshot (nunca como reacción a los siguientes).
        if (!migrationChecked) {
          migrationChecked = true;
          migrateNamesOnce(pid);
        }
      },
      () => setErrorPid(pid)
    );
  }, [pid, attempt]);

  const [filter, setFilter] = useState<NameFilter>("todos");
  const [lastVote, setLastVote] = useState<{ id: string; name: string; prev?: NameVote } | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const current = linked && remote?.pid === pid ? remote : null;
  const overlayVotes = overlay.pid === pid ? overlay.votes : EMPTY_VOTES;

  // Traspaso único de los nombres "Solo en este teléfono" al vincular: después del primer snapshot
  // y con el uid ya conocido (para firmar mi voto). La bandera evita que se repita.
  const namesReady = !!current;
  const myNameRef = useRef(me.name);
  useEffect(() => {
    myNameRef.current = me.name;
  });
  useEffect(() => {
    if (!pid || !myUid || !namesReady) return;
    mergeLocalNamesOnce(pid, myUid, myNameRef.current);
  }, [pid, myUid, namesReady]);
  const loaded = !linked || (!!current && !!myUid);
  const loadError = linked && errorPid === pid && !current;

  const cards: NameCard[] = useMemo(() => {
    if (!linked) {
      return localNames.map((n) => ({ ...n, votes: {}, myVote: n.vote }));
    }
    if (!current) return [];
    return current.names.map((n) => {
      const votes = { ...n.votes };
      if (myUid && n.id in overlayVotes) {
        const v = overlayVotes[n.id].vote;
        if (v) votes[myUid] = v;
        else delete votes[myUid];
      }
      return {
        id: n.id,
        name: n.name,
        gender: n.gender,
        origin: n.origin,
        meaning: n.meaning,
        source: n.source,
        addedByName: n.addedByName,
        votes,
        myVote: myUid ? votes[myUid] : undefined,
      };
    });
  }, [linked, localNames, current, myUid, overlayVotes]);

  const memberUids = useMemo(() => members.map((m) => m.uid), [members]);
  const others = members.filter((m) => m.uid !== myUid);
  const partnerMember = others.length > 0 ? others[others.length - 1] : undefined;
  const partnerName = partnerMember?.name || (partnerMember ? (partnerMember.role === "mama" ? "mamá" : "papá") : undefined);
  const PartnerName = partnerName ? partnerName.charAt(0).toLocaleUpperCase("es") + partnerName.slice(1) : "Tu pareja";
  const canMatch = linked && !!myUid && memberUids.length >= 2 && !!partnerMember;

  // Con roles: hace falta el "me gusta" de la mamá y el del copiloto (dos uids de la misma persona no bastan).
  const matches = canMatch ? cards.filter((c) => isMatch(c, members)) : [];
  const matchIds = new Set(matches.map((m) => m.id));
  const favorites = cards.filter((c) => c.myVote === "like" && !matchIds.has(c.id));
  const discarded = cards.filter((c) => c.myVote === "nope");
  const pending = cards.filter((c) => !c.myVote && (filter === "todos" || c.gender === filter));
  const card = pending[0];

  const setVote = (target: { id: string; name: string }, vote: NameVote | null) => {
    if (!linked) {
      commitLocal(localRef.current.map((n) => (n.id === target.id ? { ...n, vote: vote ?? undefined } : n)));
      return;
    }
    if (!pid || !myUid) return;
    const votePid = pid;
    const entry: VoteOverlay = { vote, confirmed: false };
    setOverlay((o) => ({ pid: votePid, votes: { ...(o.pid === votePid ? o.votes : {}), [target.id]: entry } }));
    const isMine = (o: { pid: string; votes: Record<string, VoteOverlay> }) => o.pid === votePid && o.votes[target.id] === entry;
    voteBabyName(votePid, target.id, myUid, vote).then(
      () => setOverlay((o) => (isMine(o) ? { pid: votePid, votes: { ...o.votes, [target.id]: { vote, confirmed: true } } } : o)),
      () => {
        setOverlay((o) => (isMine(o) ? { pid: votePid, votes: omitKey(o.votes, target.id) } : o));
        fail(`No se guardó tu voto por ${target.name}.`, () => setVote(target, vote));
      }
    );
  };

  const vote = (target: NameCard, v: NameVote) => {
    setLastVote({ id: target.id, name: target.name, prev: target.myVote });
    setVote(target, v);
  };

  const unlike = (target: NameCard) => {
    setLastVote({ id: target.id, name: target.name, prev: target.myVote });
    setVote(target, null);
  };

  const undoLastVote = () => {
    if (!lastVote) return;
    setVote(lastVote, lastVote.prev ?? null);
    setLastVote(null);
  };

  /** Solo quita MIS "no": los votos de la pareja no se tocan. */
  const revoteDiscarded = () => {
    const targets = discarded.map((c) => ({ id: c.id, name: c.name }));
    if (targets.length === 0) return;
    targets.forEach((t) => setVote(t, null));
    setLastVote(null);
    showToast(
      targets.length === 1 ? "Volvió 1 nombre que habías descartado" : `Volvieron ${targets.length} nombres que habías descartado`,
      () => targets.forEach((t) => setVote(t, "nope"))
    );
  };

  const submitName = (name: string) => {
    if (!linked || !pid) {
      commitLocal([...localRef.current, { id: newId(), name, source: "user", createdAt: nowMs() }]);
      return;
    }
    const namePid = pid;
    const data = { name, source: "user" as const, addedBy: myUid ?? undefined, addedByName: me.name?.trim() || undefined };
    function send() {
      setAdding((a) => [...a, name]);
      addBabyName(namePid, data)
        .catch(() => fail(`No se pudo agregar ${name}.`, send))
        .finally(() => setAdding((a) => a.filter((x) => x !== name)));
    }
    send();
  };

  const addName = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!name) return;
    const key = babyNameKey(name);
    setDraft("");
    if (cards.some((c) => babyNameKey(c.name) === key) || adding.some((a) => babyNameKey(a) === key)) {
      showToast(`${name} ya está en la lista`);
      return;
    }
    submitName(name);
  };

  const requestMoreNames = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    clearRetry();
    try {
      const res = await fetch("/api/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: API_GENDER[filter], existingNames: cards.map((c) => c.name), count: 6 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      const incoming = isRecord(data) ? asArray(data.names) : [];
      const source: BabyName["source"] = isRecord(data) && data.source === "gemini" ? "ai" : "suggestion";
      const seen = new Set(cards.map((c) => babyNameKey(c.name)));
      const fresh: Omit<LocalName, "id" | "createdAt">[] = [];
      for (const item of incoming) {
        if (!isRecord(item)) continue;
        const name = cleanStr(item.text ?? item.name, 60);
        const key = babyNameKey(name);
        if (!name || !key || seen.has(key)) continue;
        seen.add(key);
        fresh.push({ name, gender: toGender(item.gender), origin: cleanStr(item.origin) || undefined, meaning: cleanStr(item.meaning, 400) || undefined, source });
      }
      if (fresh.length === 0) {
        showToast("No encontramos nombres nuevos para este filtro. Prueba con otro.");
        return;
      }
      if (!linked || !pid) {
        const now = nowMs();
        commitLocal([...localRef.current, ...fresh.map((f, i) => ({ ...f, id: newId(), createdAt: now + i }))]);
      } else {
        const results = await Promise.allSettled(
          fresh.map((f) => addBabyName(pid, { ...f, addedBy: myUid ?? undefined, addedByName: me.name?.trim() || undefined }))
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed === fresh.length) throw new Error("add failed");
        if (failed > 0) {
          showToast(`No se pudieron agregar ${failed} de los nombres sugeridos. Vuelve a pedir ideas en un momento.`);
          return;
        }
      }
      const n = fresh.length;
      showToast(
        source === "ai"
          ? `PandaIA sugirió ${n} ${n === 1 ? "nombre nuevo" : "nombres nuevos"}`
          : `Agregamos ${n} ${n === 1 ? "idea" : "ideas"} de nuestra lista`
      );
    } catch {
      showToast("No pudimos traer más nombres. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Deslizar: derecha = me gusta, izquierda = no.
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const onTouchEnd = () => {
    if (card && swipeOffset > 80) vote(card, "like");
    else if (card && swipeOffset < -80) vote(card, "nope");
    setTouchStart(null);
    setSwipeOffset(0);
  };

  const likersOf = (c: NameCard) => members.filter((m) => c.votes[m.uid] === "like");

  const intro = !linked
    ? "Vota los nombres que te gusten. Invita a tu pareja para votar por separado y ver en qué coinciden."
    : partnerMember
      ? `Voten por separado. Cuando a ti y a ${partnerName} les guste el mismo nombre, aparece en Coincidieron.`
      : "Vota los nombres que te gusten. Cuando tu pareja se una, verán en qué coinciden.";

  const pillButton = `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors active:scale-95 motion-reduce:active:scale-100 ${sosFocusRing}`;

  return (
    <div className="flex w-full flex-col gap-6 py-2 animate-in fade-in duration-300">
      <header className="space-y-1.5">
        <h3 className="text-xl font-black leading-tight text-stone-900 dark:text-[#eae6e1]">Nombres del bebé</h3>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">{intro}</p>
        <SyncBadge />
      </header>

      <RetryNotice state={retryState} onDismiss={clearRetry} />
      {loadError && <LoadErrorNotice what="los nombres compartidos" onRetry={() => setAttempt((a) => a + 1)} />}

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1" role="group" aria-label="Filtrar por género">
          {NAME_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`${pillButton} whitespace-nowrap ${
                filter === f.id
                  ? "bg-terracotta-ink text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#2d273a] dark:text-[#a6a1b2] dark:hover:bg-[#383147]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {lastVote && (
          <button
            type="button"
            onClick={undoLastVote}
            aria-label={`Deshacer tu voto por ${lastVote.name}`}
            className={`${pillButton} shrink-0 border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 dark:border-white/10 dark:bg-[#2d273a] dark:text-[#eae6e1] dark:hover:bg-[#383147]`}
          >
            <Undo2 size={15} aria-hidden="true" /> Deshacer
          </button>
        )}
      </div>

      {loadError ? null : !loaded ? (
        <div role="status" className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-600 dark:border-white/[0.08] dark:bg-[#221d2d] dark:text-[#a6a1b2]">
          Cargando los nombres compartidos…
        </div>
      ) : card ? (
        <article
          aria-labelledby={`${baseId}-nombre`}
          onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
          onTouchMove={(e) => {
            if (touchStart !== null) setSwipeOffset(e.targetTouches[0].clientX - touchStart);
          }}
          onTouchEnd={onTouchEnd}
          style={{
            transform: touchStart !== null ? `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)` : undefined,
            transition: touchStart !== null ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="w-full select-none touch-pan-y rounded-3xl border border-stone-200 bg-white px-6 py-8 text-center shadow-[0_12px_32px_-16px_rgba(60,40,30,0.35)] dark:border-white/[0.08] dark:bg-[#221d2d]"
        >
          <h4 id={`${baseId}-nombre`} className="break-words text-4xl font-black leading-tight text-stone-900 dark:text-[#eae6e1]">
            {card.name}
          </h4>
          {(card.origin || card.gender) && (
            <p className="mt-2 text-sm font-semibold text-sage-ink">
              {[card.origin, card.gender ? GENDER_LABEL[card.gender] : ""].filter(Boolean).join(" · ")}
            </p>
          )}
          {card.meaning && (
            <p className="mx-auto mt-3 max-w-xs text-base italic leading-relaxed text-stone-700 dark:text-[#cfcad8]">“{card.meaning}”</p>
          )}
          <p className="mt-3 text-xs text-stone-600 dark:text-[#a6a1b2]">{sourceLabel(card)}</p>

          <div className="mt-6 flex justify-center gap-6">
            <button
              type="button"
              onClick={() => vote(card, "nope")}
              aria-label={`No me gusta ${card.name}`}
              className={`grid h-16 w-16 place-items-center rounded-full border-2 border-stone-200 bg-white text-stone-600 transition-transform hover:bg-stone-50 active:scale-90 motion-reduce:active:scale-100 dark:border-white/10 dark:bg-[#2d273a] dark:text-[#a6a1b2] dark:hover:bg-[#383147] ${sosFocusRing}`}
            >
              <X size={30} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => vote(card, "like")}
              aria-label={`Me gusta ${card.name}`}
              className={`grid h-16 w-16 place-items-center rounded-full bg-terracotta-ink text-white shadow-md transition-transform hover:bg-terracotta-ink-hover active:scale-90 motion-reduce:active:scale-100 ${sosFocusRing}`}
            >
              <Heart size={30} fill="currentColor" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-4 text-xs text-stone-600 dark:text-[#a6a1b2]">
            {pending.length === 1 ? "Es el último por votar" : `Quedan ${pending.length} por votar`}
            {filter !== "todos" && ` en ${NAME_FILTERS.find((f) => f.id === filter)?.label.toLowerCase()}`}
          </p>
        </article>
      ) : (
        <div className="flex w-full flex-col items-center rounded-3xl border border-stone-200 bg-white p-7 text-center dark:border-white/[0.08] dark:bg-[#221d2d]">
          <h4 className="text-lg font-bold text-stone-900 dark:text-[#eae6e1]">
            {cards.length === 0 ? "Aún no hay nombres en la lista" : "No quedan nombres por votar"}
          </h4>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
            {cards.length === 0
              ? "Escribe uno que te guste o pide ideas a PandaIA."
              : filter !== "todos"
                ? "Prueba con otro filtro, escribe un nombre o pide más ideas."
                : matches.length > 0
                  ? `Coinciden en ${matches.length} ${matches.length === 1 ? "nombre" : "nombres"}. Puedes seguir buscando.`
                  : "Escribe un nombre o pide más ideas a PandaIA."}
          </p>
          {discarded.length > 0 && (
            <button
              type="button"
              onClick={revoteDiscarded}
              className={`mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-stone-700 underline-offset-4 hover:underline dark:text-[#eae6e1] ${sosFocusRing}`}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Volver a votar los que descartaste ({discarded.length})
            </button>
          )}
        </div>
      )}

      {/* Agregar nombres: a mano o con ideas de PandaIA */}
      <div className="space-y-3">
        <form onSubmit={addName} className="flex gap-2">
          <label htmlFor={`${baseId}-nuevo`} className="sr-only">Agregar un nombre</label>
          <input
            id={`${baseId}-nuevo`}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={60}
            placeholder="Escribe un nombre que te guste"
            autoComplete="off"
            className={`min-h-[44px] min-w-0 flex-1 rounded-xl bg-white px-4 text-base text-stone-900 dark:bg-[#221d2d] dark:text-[#eae6e1] ${fieldBorder} ${fieldFocus}`}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-sage-ink px-4 text-sm font-bold text-white transition-colors hover:bg-sage-ink-hover disabled:opacity-50 ${sosFocusRing}`}
          >
            <Plus size={16} aria-hidden="true" /> Agregar
          </button>
        </form>
        {adding.length > 0 && (
          <p role="status" className="text-xs text-stone-600 dark:text-[#a6a1b2]">
            {online ? `Agregando ${adding.join(", ")}…` : `Sin conexión: ${adding.join(", ")} se agregará al reconectar.`}
          </p>
        )}
        <button
          type="button"
          onClick={() => void requestMoreNames()}
          disabled={isLoadingMore}
          className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white text-sm font-bold text-stone-800 transition-colors hover:bg-stone-50 disabled:opacity-60 dark:border-white/10 dark:bg-[#221d2d] dark:text-[#eae6e1] dark:hover:bg-[#2d273a] ${sosFocusRing}`}
        >
          {isLoadingMore ? (
            <>
              <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Buscando nombres…
            </>
          ) : (
            <>
              <Sparkles size={18} className="text-terracotta-ink" aria-hidden="true" />
              Pedir ideas a PandaIA
            </>
          )}
        </button>
      </div>

      {matches.length > 0 && (
        <section aria-labelledby={`${baseId}-coinciden`}>
          <h4 id={`${baseId}-coinciden`} className="flex items-center gap-2 text-base font-bold text-stone-900 dark:text-[#eae6e1]">
            <Heart size={18} className="text-terracotta-ink" fill="currentColor" aria-hidden="true" />
            ¡Coincidieron!
          </h4>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-[#a6a1b2]">
            {partnerName ? `A ti y a ${partnerName} les gustan estos nombres.` : "A los dos les gustan estos nombres."}
          </p>
          <ul className="mt-3 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-[#221d2d]">
            {matches.map((m) => (
              <li key={m.id} className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate text-lg font-bold text-stone-900 dark:text-[#eae6e1]">{m.name}</span>
                <span className="flex shrink-0 -space-x-1">
                  {likersOf(m).map((liker) => (
                    <AuthorChip key={liker.uid} name={liker.name} role={liker.role} title={`A ${liker.name ?? "esta persona"} le gusta`} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {favorites.length > 0 && (
        <section aria-labelledby={`${baseId}-favoritos`}>
          <h4 id={`${baseId}-favoritos`} className="text-base font-bold text-stone-900 dark:text-[#eae6e1]">Tus favoritos</h4>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-[#a6a1b2]">
            {!linked
              ? "Invita a tu pareja para ver en qué coinciden."
              : !partnerMember
                ? "Cuando tu pareja se una, verán en qué coinciden."
                : "Los nombres que te gustan y aún no coinciden."}
          </p>
          <ul className="mt-3 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-[#221d2d]">
            {favorites.map((f) => {
              const partnerVote = partnerMember ? f.votes[partnerMember.uid] : undefined;
              return (
                <li key={f.id} className="flex min-h-[56px] items-center gap-3 py-1.5 pl-4 pr-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-stone-900 dark:text-[#eae6e1]">{f.name}</p>
                    {canMatch && (
                      <p className="text-xs text-stone-600 dark:text-[#a6a1b2]">
                        {partnerVote === "nope" ? `A ${partnerName} no le convenció` : `${PartnerName} aún no lo vota`}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => unlike(f)}
                    aria-label={`Quitar ${f.name} de tus favoritos`}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-[#a6a1b2] dark:hover:bg-white/5 ${sosFocusRing}`}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// --- PLAN DE PARTO: tres estados por opción, sin nada marcado de antemano ---

type PlanPref = "want" | "avoid" | "discuss";
type PlanPrefs = Record<string, PlanPref>;
type PlanPatient = { motherName: string; partnerName: string; hospital: string; doctor: string; notes: string };

const PLAN_PREFS: { id: PlanPref; label: string }[] = [
  { id: "want", label: "Lo deseo" },
  { id: "avoid", label: "Prefiero evitarlo" },
  { id: "discuss", label: "Lo hablaré con mi obstetra" },
];
const PLAN_PRINT_GROUP: Record<PlanPref, string> = {
  want: "Deseo",
  avoid: "Prefiero evitar",
  discuss: "Lo hablaré con mi obstetra",
};

interface PlanOption {
  id: string;
  label: string;
  desc: string;
}

interface PlanSection {
  id: number;
  category: string;
  title: string;
  subtitle: string;
  options: PlanOption[];
}

const PLAN_SECTIONS: PlanSection[] = [
  {
    id: 1,
    category: "Ambiente",
    title: "Acompañamiento y ambiente",
    subtitle: "El entorno y la compañía durante el trabajo de parto.",
    options: [
      { id: "a1", label: "Acompañante en todo momento", desc: "Que mi pareja o acompañante esté presente en la dilatación, el expulsivo y la recuperación." },
      { id: "a2", label: "Luz tenue y silencio", desc: "Reducir la luz y el ruido en la sala para favorecer un ambiente tranquilo." },
      { id: "a3", label: "Música propia y ropa cómoda", desc: "Llevar mi propia música y ropa personal en lugar de la bata del hospital." },
      { id: "a4", label: "Libertad de movimiento", desc: "Poder caminar, cambiar de postura y usar una pelota durante la dilatación." },
      { id: "a5", label: "Beber líquidos claros", desc: "Poder tomar agua, infusiones o caldos ligeros durante el trabajo de parto." },
      { id: "a6", label: "Ducha o agua tibia", desc: "Usar la ducha o el agua tibia para aliviar el dolor de las contracciones." },
    ],
  },
  {
    id: 2,
    category: "Dolor y procedimientos",
    title: "Manejo del dolor y procedimientos",
    subtitle: "Alivio del dolor y procedimientos médicos durante el trabajo de parto.",
    options: [
      { id: "d1", label: "Alivio sin medicamentos primero", desc: "Masajes, respiración guiada, compresas y cambios de postura antes que otros métodos." },
      { id: "d2", label: "Anestesia epidural cuando la pida", desc: "Que la epidural esté disponible y se aplique cuando yo la solicite." },
      { id: "d3", label: "Rotura espontánea de la fuente", desc: "Dejar que la fuente se rompa sola, sin romperla de rutina (amniotomía)." },
      { id: "d4", label: "Oxitocina solo si hace falta", desc: "No usar goteo de oxitocina de rutina para acelerar el parto, salvo indicación médica." },
      { id: "d5", label: "Pocos tactos vaginales", desc: "Hacer exploraciones vaginales solo cuando sean necesarias y avisándome antes." },
    ],
  },
  {
    id: 3,
    category: "Expulsivo",
    title: "Expulsivo y nacimiento",
    subtitle: "La etapa de pujar (expulsivo) y el momento del nacimiento.",
    options: [
      { id: "e1", label: "Elegir la postura para pujar", desc: "Parir en la postura más cómoda para mí (semisentada, en cuclillas, de lado o en cuatro apoyos)." },
      { id: "e2", label: "Pujos espontáneos", desc: "Pujar cuando mi cuerpo lo pida, en lugar de pujos dirigidos." },
      { id: "e3", label: "Episiotomía solo si es necesaria", desc: "Proteger el periné con compresas tibias y masaje; episiotomía (un corte en el periné) solo si hay un motivo médico." },
      { id: "e4", label: "Que mi acompañante corte el cordón", desc: "Que mi acompañante pueda cortar el cordón umbilical con la guía del equipo." },
      { id: "e5", label: "Ver o tocar al bebé al coronar", desc: "Poder ver con un espejo o tocar la cabeza de mi bebé cuando empiece a asomar." },
    ],
  },
  {
    id: 4,
    category: "Recién nacido",
    title: "Primeros cuidados del recién nacido",
    subtitle: "Apego, cordón y alimentación en la primera hora de vida.",
    options: [
      { id: "n1", label: "Corte tardío del cordón", desc: "Esperar al menos 1 a 3 minutos, o hasta que el cordón deje de latir, antes de cortarlo." },
      { id: "n2", label: "Contacto piel con piel inmediato", desc: "Poner a mi bebé sobre mi pecho al nacer durante la primera hora." },
      { id: "n3", label: "Retrasar lo que no sea urgente", desc: "Pesar, medir y bañar a mi bebé después de la primera hora de contacto." },
      { id: "n4", label: "Lactancia en la primera hora", desc: "Recibir apoyo para el primer agarre al pecho durante la primera hora." },
      { id: "n5", label: "Sin fórmula ni chupete salvo indicación", desc: "Lactancia exclusiva salvo indicación médica, hablada antes con nosotros." },
    ],
  },
  {
    id: 5,
    category: "Cesárea",
    title: "Si hay cesárea",
    subtitle: "Preferencias por si el parto termina en cesárea.",
    options: [
      { id: "c1", label: "Acompañante en el quirófano", desc: "Que mi pareja esté a mi lado durante la cesárea y en la recuperación." },
      { id: "c2", label: "Piel con piel en el quirófano o con mi pareja", desc: "Si yo no puedo, que mi pareja haga el contacto piel con piel sin separarse del bebé." },
      { id: "c3", label: "Bajar la pantalla al nacer", desc: "Poder ver el momento en que nace mi bebé si las condiciones lo permiten." },
      { id: "c4", label: "Alojamiento conjunto", desc: "Que mi bebé se quede conmigo en la habitación, sin traslados de rutina a otra sala." },
    ],
  },
];

const PLAN_OPTION_IDS = new Set(PLAN_SECTIONS.flatMap((s) => s.options.map((o) => o.id)));
/** Opciones que la versión anterior marcaba solas (todas menos e5): sirven para reconocer un plan sin tocar. */
const LEGACY_DEFAULT_CHECKED = new Set([...PLAN_OPTION_IDS].filter((id) => id !== "e5"));
const LEGACY_HOSPITAL_PLACEHOLDER = "Hospital / Clínica de Maternidad";
const LOCAL_PLAN_KEY = "pandajr_birth_plan_v2";

function isPlanPref(v: unknown): v is PlanPref {
  return v === "want" || v === "avoid" || v === "discuss";
}

function planOptionsOf(raw: unknown[]) {
  return raw.flatMap((sec) => (isRecord(sec) ? asArray(sec.options) : [])).filter(isRecord);
}

/** Plan del formato antiguo ({ id, checked }) que la persona sí modificó respecto de lo premarcado. */
function isTouchedLegacyPlan(raw: unknown[]): boolean {
  const options = planOptionsOf(raw);
  if (!options.some((o) => typeof o.checked === "boolean")) return false;
  return !options.every((o) => Boolean(o.checked) === LEGACY_DEFAULT_CHECKED.has(String(o.id)));
}

/**
 * Lee las preferencias guardadas. Formato nuevo: { id, pref? }. Formato antiguo: { id, checked }.
 * Del formato antiguo solo cuenta lo que la persona eligió activamente (lo que difiere de lo que
 * venía premarcado): las opciones que quedaron marcadas "de fábrica" nunca pasan al documento
 * médico como "Lo deseo". La UI pide revisar el plan (isTouchedLegacyPlan).
 */
function parsePlanSections(raw: unknown[]): PlanPrefs {
  const options = planOptionsOf(raw);
  const prefs: PlanPrefs = {};
  const legacy = options.some((o) => typeof o.checked === "boolean");
  if (!legacy) {
    for (const o of options) {
      const id = String(o.id ?? "");
      if (PLAN_OPTION_IDS.has(id) && isPlanPref(o.pref)) prefs[id] = o.pref;
    }
    return prefs;
  }
  for (const o of options) {
    const id = String(o.id ?? "");
    if (PLAN_OPTION_IDS.has(id) && o.checked === true && !LEGACY_DEFAULT_CHECKED.has(id)) prefs[id] = "want";
  }
  return prefs;
}

function toStoredSections(prefs: PlanPrefs) {
  return PLAN_SECTIONS.map((s) => ({
    id: s.id,
    options: s.options.map((o) => (prefs[o.id] ? { id: o.id, pref: prefs[o.id] } : { id: o.id })),
  }));
}

function parsePatient(raw: unknown, defaults: PlanPatient): PlanPatient {
  if (!isRecord(raw) || Object.keys(raw).length === 0) return defaults;
  const text = (v: unknown, max = 120) => (typeof v === "string" ? repairMojibake(v).slice(0, max) : "");
  const hospital = text(raw.hospital);
  return {
    motherName: text(raw.motherName, 80),
    partnerName: text(raw.partnerName, 80),
    hospital: hospital.trim() === LEGACY_HOSPITAL_PLACEHOLDER ? "" : hospital,
    doctor: text(raw.doctor, 80),
    notes: text(raw.notes, 600),
  };
}

type LoadedPlan = { prefs: PlanPrefs; patient: PlanPatient; savedAt: number | null; needsReview: boolean };

/** Plan guardado en este teléfono (sin vínculo), con conversión única del formato antiguo. */
function loadLocalPlan(defaults: PlanPatient): LoadedPlan {
  const saved = readStored<unknown>(LOCAL_PLAN_KEY);
  if (isRecord(saved)) {
    return {
      prefs: parsePlanSections(asArray(saved.sections)),
      patient: parsePatient(saved.patient, defaults),
      savedAt: finiteNum(saved.savedAt),
      needsReview: isTouchedLegacyPlan(asArray(saved.sections)),
    };
  }
  const legacySections = asArray(readStored<unknown>("pandajr_birth_plan_sections"));
  const legacyPatient = readStored<unknown>("pandajr_birth_plan_patient");
  return {
    prefs: parsePlanSections(legacySections),
    patient: parsePatient(legacyPatient, defaults),
    savedAt: null,
    needsReview: isTouchedLegacyPlan(legacySections),
  };
}

/** ¿El plan local tiene algo que la persona escribió o eligió? (para no subir un plan vacío). */
function planHasContent(plan: LoadedPlan, defaults: PlanPatient): boolean {
  if (Object.keys(plan.prefs).length > 0) return true;
  const p = plan.patient;
  return (
    !!p.notes.trim() ||
    (!!p.doctor.trim() && p.doctor.trim() !== defaults.doctor.trim()) ||
    (!!p.hospital.trim() && p.hospital.trim() !== defaults.hospital.trim())
  );
}

function planCounts(prefs: PlanPrefs) {
  const values = Object.values(prefs);
  return {
    marked: values.length,
    want: values.filter((v) => v === "want").length,
    avoid: values.filter((v) => v === "avoid").length,
    discuss: values.filter((v) => v === "discuss").length,
  };
}

type SaveStatus = "idle" | "pending" | "error";

export function PlanParto({ profile, showToast }: { profile?: UserProfile; showToast: ShowToast }) {
  const me = useMe();
  const pid = me.pid;
  // El plan habla con la voz de la mamá; al papá se le explica y se le habla de "su" obstetra.
  const { isPapa, her } = companionVoice(me);
  const careTeam = usePandaStore((s) => s.careTeam);
  const week = knownWeek(profile);
  const baseId = React.useId();
  const isClient = useIsClient();
  const { retryState, fail, clearRetry } = useRetry();

  const defaults: PlanPatient = {
    motherName: profile?.role === "mama" ? profile.name : "",
    partnerName: profile?.role === "papa" ? profile.name : "",
    hospital: careTeam?.hospitalName?.trim() || "",
    doctor: careTeam?.obName?.trim() || "",
    notes: "",
  };

  // Sin vínculo se lee del teléfono al abrir; con vínculo se espera al primer snapshot.
  const [initialLocal] = useState(() => (pid ? null : loadLocalPlan(defaults)));
  // Plan antiguo que venía premarcado: pedimos revisarlo (solo se conservaron las elecciones activas).
  const [needsReview, setNeedsReview] = useState(() => !!initialLocal?.needsReview);
  const [prefs, setPrefs] = useState<PlanPrefs>(() => initialLocal?.prefs ?? {});
  const [patient, setPatient] = useState<PlanPatient>(() => initialLocal?.patient ?? defaults);
  const [readyPid, setReadyPid] = useState<string | null>(null);
  const [errorPid, setErrorPid] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [savedAt, setSavedAt] = useState<number | null>(() => initialLocal?.savedAt ?? null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [step, setStep] = useState(1);
  const [viewMode, setViewMode] = useState<"wizard" | "document">("wizard");

  const latestRef = useRef<{ prefs: PlanPrefs; patient: PlanPatient }>({ prefs, patient });
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultsRef = useRef(defaults);
  const now = useNow(60_000, savedAt !== null);

  useEffect(() => {
    defaultsRef.current = defaults;
  });

  useEffect(() => {
    if (!pid) return;
    let localChecked = false;
    return listenToBirthPlan(
      pid,
      (data, meta) => {
        setErrorPid(null);
        // Sin conexión y sin copia local no sabemos si ya hay un plan: no lo pisamos.
        if (meta.fromCache && !meta.exists) return;
        setReadyPid(pid);
        if (meta.updatedAt) setSavedAt(meta.updatedAt.getTime());
        // No pisar cambios locales que aún no se confirman (el eco de mi propia escritura llega igual).
        if (dirtyRef.current) return;
        let next = {
          prefs: meta.exists ? parsePlanSections(data.sections) : {},
          patient: meta.exists ? parsePatient(data.patient, defaultsRef.current) : defaultsRef.current,
        };
        let review = meta.exists && isTouchedLegacyPlan(asArray(data.sections));
        // Traspaso único (tras el primer dato del servidor): la versión anterior guardaba el plan
        // SOLO en el teléfono, aun con vínculo; y al vincular, lo hecho sin vínculo. Solo si el
        // compartido no existe: nunca pisa un plan que ya esté en el embarazo.
        if (!localChecked && !meta.fromCache) {
          localChecked = true;
          const flag = localToSharedFlag("birthplan", pid);
          if (!readStored(flag)) {
            const local = loadLocalPlan(defaultsRef.current);
            if (!meta.exists && planHasContent(local, defaultsRef.current)) {
              next = { prefs: local.prefs, patient: local.patient };
              review = local.needsReview;
              saveBirthPlan(pid, local.patient, toStoredSections(local.prefs)).then(
                () => writeStored(flag, true),
                () => {
                  // Se intentará la próxima vez que se abra el plan.
                }
              );
            } else {
              writeStored(flag, true);
            }
          }
        }
        latestRef.current = next;
        setPrefs(next.prefs);
        setPatient(next.patient);
        setNeedsReview(review);
      },
      () => setErrorPid(pid)
    );
  }, [pid, attempt]);

  const flushRef = useRef<() => void>(() => {});
  const flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!pid || !dirtyRef.current) return;
    const snapshot = latestRef.current;
    setSaveStatus("pending");
    saveBirthPlan(pid, snapshot.patient, toStoredSections(snapshot.prefs)).then(
      () => {
        if (latestRef.current !== snapshot) return; // hubo cambios nuevos: los guarda su propio envío
        dirtyRef.current = false;
        setSaveStatus("idle");
        setSavedAt(nowMs());
      },
      () => {
        setSaveStatus("error");
        fail("No se guardó el plan de parto. Los cambios siguen aquí.", () => {
          dirtyRef.current = true;
          flushRef.current();
        });
      }
    );
  };
  useEffect(() => {
    flushRef.current = flush;
  });

  // Si se cierra la herramienta con un guardado en espera, se envía (continúa el manejador).
  useEffect(() => () => flushRef.current(), []);

  /** Guardado desde los manejadores: local al instante; compartido con espera de 800 ms. */
  const commit = (next: { prefs: PlanPrefs; patient: PlanPatient }) => {
    latestRef.current = next;
    setPrefs(next.prefs);
    setPatient(next.patient);
    clearRetry();
    if (!pid) {
      const at = nowMs();
      writeStored(LOCAL_PLAN_KEY, { sections: toStoredSections(next.prefs), patient: next.patient, savedAt: at });
      setSavedAt(at);
      return;
    }
    dirtyRef.current = true;
    setSaveStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current(), 800);
  };

  const setPref = (optionId: string, pref: PlanPref) => {
    const nextPrefs = { ...latestRef.current.prefs };
    if (nextPrefs[optionId] === pref) delete nextPrefs[optionId];
    else nextPrefs[optionId] = pref;
    commit({ prefs: nextPrefs, patient: latestRef.current.patient });
  };

  const setPatientField = (field: keyof PlanPatient, value: string) => {
    commit({ prefs: latestRef.current.prefs, patient: { ...latestRef.current.patient, [field]: value } });
  };

  const clearAll = () => {
    const previous = latestRef.current;
    if (Object.keys(previous.prefs).length === 0) return;
    commit({ prefs: {}, patient: previous.patient });
    showToast("Quitamos todas las marcas del plan", () => commit({ prefs: previous.prefs, patient: latestRef.current.patient }));
  };

  const ready = !pid || readyPid === pid;
  const counts = planCounts(prefs);
  const currentSection = PLAN_SECTIONS.find((s) => s.id === step) ?? PLAN_SECTIONS[0];

  const handlePrint = () => {
    flush();
    window.print();
  };

  const sharePlan = async () => {
    if (counts.marked === 0) {
      showToast("Marca al menos una preferencia para compartir el plan");
      return;
    }
    const lines: string[] = ["*Plan de parto*"];
    if (patient.motherName.trim()) lines.push(`Madre: ${patient.motherName.trim()}`);
    if (patient.partnerName.trim()) lines.push(`Acompañante: ${patient.partnerName.trim()}`);
    if (typeof week === "number") lines.push(`Semana de gestación: ${week}`);
    if (patient.hospital.trim()) lines.push(`Hospital o clínica: ${patient.hospital.trim()}`);
    if (patient.doctor.trim()) lines.push(`Obstetra: ${patient.doctor.trim()}`);
    for (const pref of ["want", "avoid", "discuss"] as const) {
      const chosen = PLAN_SECTIONS.flatMap((s) => s.options.filter((o) => prefs[o.id] === pref).map((o) => `• ${o.label}`));
      if (chosen.length) lines.push("", `*${PLAN_PRINT_GROUP[pref]}*`, ...chosen);
    }
    if (patient.notes.trim()) lines.push("", `Observaciones: ${patient.notes.trim()}`);
    lines.push("", "Hecho con PandaJR");
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Plan de parto", text });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") showToast("No se pudo abrir el menú para compartir. Prueba con Imprimir o PDF.");
    }
  };

  const statusText = !pid
    ? savedAt
      ? `Guardado en este teléfono · ${formatRelative(savedAt, new Date(now))}`
      : ""
    : saveStatus === "pending"
      ? "Guardando…"
      : saveStatus === "error"
        ? "No se guardó"
        : savedAt
          ? `Guardado · ${formatRelative(savedAt, new Date(now))}`
          : "";

  const inputClass =
    `w-full min-h-[44px] bg-stone-50 dark:bg-[#2d273a] rounded-xl px-3 py-2 text-base text-stone-800 dark:text-[#eae6e1] ${fieldBorder} ${fieldFocus}`;

  const printValue = (v: string) =>
    v.trim() ? <span>{v.trim()}</span> : <span className="inline-block w-48 border-b border-stone-400 align-bottom" />;

  // Documento para imprimir: se monta en <body> para que no lo recorte el contenedor con scroll.
  const printDoc = (
    <div className="pandajr-print-root hidden print:block text-black bg-white p-8 text-sm">
      <style>{`@media print { body > *:not(.pandajr-print-root) { display: none !important; } .pandajr-print-root { display: block !important; } }`}</style>
      {/* div y no <header>: globals.css oculta header/nav/button al imprimir */}
      <div className="border-b-2 border-stone-800 pb-3 flex justify-between items-end gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Plan de parto</h1>
          <p className="text-xs text-stone-700 mt-0.5">Preferencias para la atención del parto y del recién nacido</p>
        </div>
        <div className="text-right text-xs text-stone-700 shrink-0">
          <p>Hecho con PandaJR</p>
          <p>Fecha: {new Date(now).toLocaleDateString("es")}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        <div><dt className="inline font-bold">Madre: </dt><dd className="inline">{printValue(patient.motherName)}</dd></div>
        <div><dt className="inline font-bold">Acompañante: </dt><dd className="inline">{printValue(patient.partnerName)}</dd></div>
        <div><dt className="inline font-bold">Semana de gestación: </dt><dd className="inline">{printValue(typeof week === "number" ? String(week) : "")}</dd></div>
        <div><dt className="inline font-bold">Hospital o clínica: </dt><dd className="inline">{printValue(patient.hospital)}</dd></div>
        <div><dt className="inline font-bold">Obstetra: </dt><dd className="inline">{printValue(patient.doctor)}</dd></div>
        {patient.notes.trim() && (
          <div className="col-span-2"><dt className="inline font-bold">Observaciones o alergias: </dt><dd className="inline whitespace-pre-wrap">{patient.notes.trim()}</dd></div>
        )}
      </dl>

      <p className="mt-4 border border-stone-300 rounded-lg px-4 py-3 text-xs text-stone-800 leading-relaxed break-inside-avoid">
        Al equipo obstétrico y pediátrico: este plan expresa nuestras preferencias para el parto y el posparto inmediato.
        Entendemos que la salud y la seguridad de la madre y del bebé están primero ante cualquier situación médica imprevista.
      </p>

      {counts.marked === 0 ? (
        <p className="mt-6 text-xs italic">Aún no hay preferencias marcadas.</p>
      ) : (
        <div className="mt-5 space-y-5">
          {PLAN_SECTIONS.map((sec) => {
            const marked = sec.options.filter((o) => prefs[o.id]);
            if (marked.length === 0) return null;
            return (
              <section key={sec.id} className="break-inside-avoid">
                <h2 className="font-bold text-sm border-b border-stone-300 pb-1">{sec.title}</h2>
                {(["want", "avoid", "discuss"] as const).map((pref) => {
                  const group = marked.filter((o) => prefs[o.id] === pref);
                  if (group.length === 0) return null;
                  return (
                    <div key={pref} className="mt-2">
                      <h3 className="text-xs font-bold">{PLAN_PRINT_GROUP[pref]}</h3>
                      <ul className="mt-1 space-y-1 text-xs">
                        {group.map((o) => (
                          <li key={o.id} className="flex items-start gap-2 break-inside-avoid">
                            {pref === "want" ? (
                              <Check size={12} strokeWidth={3} className="mt-0.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <Minus size={12} strokeWidth={3} className="mt-0.5 shrink-0" aria-hidden="true" />
                            )}
                            <span>
                              <strong>{o.label}</strong>
                              {pref === "want" && <span className="text-stone-700">. {o.desc}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}

      <div className="pt-8 mt-10 grid grid-cols-3 gap-6 text-center text-xs break-inside-avoid">
        <div className="border-t border-stone-500 pt-2">
          <p className="font-bold">{patient.motherName.trim() || " "}</p>
          <p className="text-stone-700">Firma de la madre</p>
        </div>
        <div className="border-t border-stone-500 pt-2">
          <p className="font-bold">{patient.partnerName.trim() || " "}</p>
          <p className="text-stone-700">Firma del acompañante</p>
        </div>
        <div className="border-t border-stone-500 pt-2">
          <p className="font-bold">{" "}</p>
          <p className="text-stone-700">Recibido por el equipo de salud</p>
        </div>
      </div>
    </div>
  );

  const segmented = (active: boolean) =>
    `flex-1 min-h-[44px] px-2 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${sosFocusRing} ${
      active ? "bg-white dark:bg-[#2d273a] text-stone-900 dark:text-[#eae6e1] shadow-sm" : "text-stone-600 dark:text-[#a6a1b2] hover:text-stone-900 dark:hover:text-[#eae6e1]"
    }`;

  const prefButton = (pref: PlanPref, active: boolean) => {
    const on =
      pref === "want"
        ? "bg-sage-ink text-white border-transparent"
        : pref === "avoid"
          ? "bg-terracotta-ink text-white border-transparent"
          : "bg-stone-800 text-white border-transparent dark:bg-[#eae6e1] dark:text-[#181520]";
    return `min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition-colors ${sosFocusRing} ${
      active ? on : "border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-white/15 dark:text-[#cfcad8] dark:hover:bg-white/5"
    }`;
  };

  return (
    <div className="flex flex-col py-2 animate-in fade-in duration-300 w-full">
      {isClient && createPortal(printDoc, document.body)}

      <div className="no-print space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-2xl font-black text-stone-900 dark:text-[#eae6e1]">{isPapa ? `El plan de parto de ${her}` : "Tu plan de parto"}</h3>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
            {isPapa
              ? `Está escrito con la voz de ${her}: complétenlo juntos. En cada opción, marquen si la desea, si prefiere evitarla o si la hablará con su obstetra. Pueden dejar opciones sin marcar.`
              : "Para cada opción, elige si la deseas, si prefieres evitarla o si la hablarás con tu obstetra. Puedes dejar opciones sin marcar."}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SyncBadge waiting={!ready} />
            {statusText && (
              <span role="status" className={`text-[13px] leading-5 ${saveStatus === "error" ? "text-terracotta-ink font-semibold" : "text-stone-600 dark:text-[#a6a1b2]"}`}>
                {statusText}
              </span>
            )}
          </div>
        </div>

        <RetryNotice state={retryState} onDismiss={clearRetry} />
        {pid && errorPid === pid && !ready && (
          <LoadErrorNotice what="el plan de parto compartido" onRetry={() => setAttempt((a) => a + 1)} />
        )}
        {needsReview && (
          <div role="note" className="flex items-start gap-2 rounded-2xl border border-amber-700/30 bg-amber-50 p-3 dark:border-amber-300/25 dark:bg-amber-300/[0.08]">
            <Info size={18} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm leading-snug text-stone-800 dark:text-[#eae6e1]">
              El plan anterior venía con casi todo marcado de antemano. Solo conservamos las opciones que se cambiaron a mano: revisa cada una antes de imprimirlo.
            </p>
            <button
              type="button"
              onClick={() => setNeedsReview(false)}
              aria-label="Cerrar aviso"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-300/10 ${sosFocusRing}`}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex bg-stone-100 dark:bg-[#221d2d] p-1 rounded-2xl" role="group" aria-label="Vista del plan">
          <button type="button" aria-pressed={viewMode === "wizard"} onClick={() => setViewMode("wizard")} className={segmented(viewMode === "wizard")}>
            <Edit3 size={15} aria-hidden="true" /> Preferencias
          </button>
          <button type="button" aria-pressed={viewMode === "document"} onClick={() => setViewMode("document")} className={segmented(viewMode === "document")}>
            <FileText size={15} aria-hidden="true" /> Documento
            <span className="font-semibold text-stone-600 dark:text-[#a6a1b2]">· {counts.marked}</span>
          </button>
        </div>
      </div>

      {!ready ? (
        <p role="status" className="no-print mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600 dark:border-white/[0.08] dark:bg-[#221d2d] dark:text-[#a6a1b2]">
          Cargando el plan de parto compartido…
        </p>
      ) : viewMode === "wizard" ? (
        <div className="no-print mt-4 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-1.5">
              {PLAN_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  aria-label={`Ir al paso ${s.id}: ${s.category}`}
                  aria-current={s.id === step ? "step" : undefined}
                  className={`flex-1 min-h-[44px] flex items-center rounded-full ${sosFocusRing}`}
                >
                  <span className={`h-2 w-full rounded-full transition-colors ${s.id <= step ? "bg-sage-ink" : "bg-stone-200 dark:bg-[#2d273a]"}`} />
                </button>
              ))}
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-600 dark:text-[#a6a1b2]">Paso {step} de {PLAN_SECTIONS.length}</span>
          </div>

          <section aria-labelledby={`${baseId}-seccion`} className="bg-white dark:bg-[#221d2d] rounded-3xl border border-stone-200/80 dark:border-white/[0.08]">
            <div className="px-5 pt-5 pb-3">
              <h4 id={`${baseId}-seccion`} className="text-lg font-black text-stone-900 dark:text-[#eae6e1] leading-tight">{currentSection.title}</h4>
              <p className="text-sm text-stone-600 dark:text-[#a6a1b2] mt-1">{currentSection.subtitle}</p>
            </div>
            <ul className="divide-y divide-stone-100 dark:divide-white/[0.06]">
              {currentSection.options.map((opt) => (
                <li key={opt.id} className="px-5 py-4">
                  <p id={`${baseId}-${opt.id}`} className="text-sm font-bold leading-snug text-stone-900 dark:text-[#eae6e1]">{opt.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">{opt.desc}</p>
                  <div role="group" aria-labelledby={`${baseId}-${opt.id}`} className="mt-3 flex flex-wrap gap-2">
                    {PLAN_PREFS.map((p) => (
                      <button key={p.id} type="button" aria-pressed={prefs[opt.id] === p.id} onClick={() => setPref(opt.id, p.id)} className={prefButton(p.id, prefs[opt.id] === p.id)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className={`min-h-[48px] px-4 bg-stone-100 dark:bg-[#2d273a] text-stone-800 dark:text-[#eae6e1] rounded-2xl hover:bg-stone-200 dark:hover:bg-[#383147] transition-colors font-bold text-sm flex items-center gap-1.5 ${sosFocusRing}`}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Anterior
              </button>
            )}
            {step < PLAN_SECTIONS.length ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(PLAN_SECTIONS.length, s + 1))}
                className={`flex-1 min-h-[48px] px-5 bg-terracotta-ink hover:bg-terracotta-ink-hover text-white rounded-2xl font-bold text-sm flex justify-center items-center gap-2 transition-colors ${sosFocusRing}`}
              >
                Siguiente <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode("document")}
                className={`flex-1 min-h-[48px] px-5 bg-stone-900 dark:bg-[#eae6e1] text-white dark:text-[#181520] rounded-2xl font-bold text-sm flex justify-center items-center gap-2 transition-colors ${sosFocusRing}`}
              >
                <FileText size={16} aria-hidden="true" /> Ver el documento
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="no-print mt-4 space-y-5">
          <section aria-labelledby={`${baseId}-datos`} className="bg-white dark:bg-[#221d2d] rounded-3xl p-5 border border-stone-200/80 dark:border-white/[0.08] space-y-3">
            <div>
              <h4 id={`${baseId}-datos`} className="text-base font-bold text-stone-900 dark:text-[#eae6e1]">Datos del documento</h4>
              <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">Lo que dejes vacío se imprime como una línea para completar a mano.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["motherName", "Nombre de la madre", "Ej. Sofía Martínez"],
                  ["partnerName", "Acompañante", "Ej. Carlos Pérez"],
                  ["hospital", "Hospital o clínica", "Ej. Hospital Materno Infantil"],
                  ["doctor", "Obstetra", "Ej. Dra. Gómez"],
                ] as const
              ).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label htmlFor={`${baseId}-${field}`} className="text-sm font-semibold text-stone-700 dark:text-[#eae6e1] block mb-1">{label}</label>
                  <input
                    id={`${baseId}-${field}`}
                    type="text"
                    value={patient[field]}
                    maxLength={80}
                    onChange={(e) => setPatientField(field, e.target.value)}
                    onBlur={flush}
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
            <div>
              <label htmlFor={`${baseId}-notes`} className="text-sm font-semibold text-stone-700 dark:text-[#eae6e1] block mb-1">Observaciones o alergias</label>
              <textarea
                id={`${baseId}-notes`}
                rows={2}
                maxLength={600}
                value={patient.notes}
                onChange={(e) => setPatientField("notes", e.target.value)}
                onBlur={flush}
                placeholder="Ej. Alergia a la penicilina, deseo donar sangre del cordón…"
                className={`${inputClass} resize-none`}
              />
            </div>
            <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">
              {typeof week === "number" ? `Semana de gestación: ${week} (se toma de Ajustes).` : "La semana no está confirmada: se imprimirá una línea para completarla a mano."}
            </p>
          </section>

          <section aria-labelledby={`${baseId}-resumen`} className="bg-white dark:bg-[#221d2d] rounded-3xl p-5 border border-stone-200/80 dark:border-white/[0.08]">
            <h4 id={`${baseId}-resumen`} className="text-base font-bold text-stone-900 dark:text-[#eae6e1]">Resumen</h4>
            <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">
              {counts.marked === 0
                ? "Aún no marcaste ninguna preferencia."
                : `${counts.want} ${counts.want === 1 ? "deseo" : "deseos"} · ${counts.avoid} para evitar · ${counts.discuss} para hablar con ${isPapa ? "su" : "tu"} obstetra`}
            </p>
            <div className="mt-3 divide-y divide-stone-100 dark:divide-white/[0.06]">
              {PLAN_SECTIONS.map((sec) => {
                const marked = sec.options.filter((o) => prefs[o.id]);
                return (
                  <div key={sec.id} className="py-3">
                    <p className="flex justify-between gap-3 text-sm font-bold text-stone-900 dark:text-[#eae6e1]">
                      <span>{sec.title}</span>
                      <span className="shrink-0 font-normal text-stone-600 dark:text-[#a6a1b2]">{marked.length} de {sec.options.length}</span>
                    </p>
                    {marked.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {marked.map((o) => (
                          <li key={o.id} className="flex items-start justify-between gap-3 text-sm text-stone-700 dark:text-[#cfcad8]">
                            <span>{o.label}</span>
                            <span className={`shrink-0 text-xs font-bold ${prefs[o.id] === "want" ? "text-sage-ink" : prefs[o.id] === "avoid" ? "text-terracotta-ink" : "text-stone-600 dark:text-[#a6a1b2]"}`}>
                              {PLAN_PREFS.find((p) => p.id === prefs[o.id])?.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="space-y-2">
            <p className="text-sm text-stone-600 dark:text-[#a6a1b2]">Imprime dos copias (una para la historia clínica y otra para el equipo que atienda el parto) o guárdalo como PDF.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className={`min-h-[48px] px-4 bg-stone-900 dark:bg-[#eae6e1] text-white dark:text-[#181520] font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 ${sosFocusRing}`}
              >
                <Printer size={16} aria-hidden="true" /> Imprimir o PDF
              </button>
              <button
                type="button"
                onClick={() => void sharePlan()}
                className={`min-h-[48px] px-4 bg-terracotta-ink hover:bg-terracotta-ink-hover text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 ${sosFocusRing}`}
              >
                <Share2 size={16} aria-hidden="true" /> Compartir
              </button>
            </div>
            {counts.marked > 0 && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={clearAll}
                  className={`min-h-[44px] px-3 rounded-xl text-sm font-semibold text-stone-600 dark:text-[#a6a1b2] underline-offset-4 hover:underline ${sosFocusRing}`}
                >
                  Quitar todas las marcas
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- PRESUPUESTO DEL BEBÉ: tope y gastos compartidos (o solo en este teléfono) ---

type BudgetItem = { id: string; name: string; amount: number; category: string; isPurchased: boolean } & Authored;

const LOCAL_BUDGET_KEY = "pandajr_budget_expenses";
const LOCAL_BUDGET_CAP_KEY = "pandajr_budget_cap";
const BUDGET_CATEGORIES = ["Cuidado", "Habitación", "Transporte", "Médico", "Ropa", "Otros"];
const BUDGET_IDEAS: { name: string; category: string }[] = [
  { name: "Cuna", category: "Habitación" },
  { name: "Cochecito", category: "Transporte" },
  { name: "Pañales", category: "Cuidado" },
  { name: "Silla de auto", category: "Transporte" },
];
const MAX_AMOUNT = 100_000_000;

function sanitizeBudget(raw: unknown[]): BudgetItem[] {
  const out: BudgetItem[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!isRecord(r)) continue;
    const id = typeof r.id === "string" || typeof r.id === "number" ? String(r.id) : "";
    const name = cleanStr(r.name, 80);
    const amount = finiteNum(r.amount);
    if (!id || seen.has(id) || !name || amount === null || amount < 0) continue;
    seen.add(id);
    out.push({ id, name, amount, category: cleanStr(r.category, 30) || "Otros", isPurchased: r.isPurchased === true, ...authoredFrom(r) });
  }
  return out;
}

const BUDGET_LIST: SharedListSpec<BudgetItem> = {
  localKey: LOCAL_BUDGET_KEY,
  listen: listenToBudget,
  mutate: mutateBudgetItems,
  sanitize: sanitizeBudget,
  // Con vínculo la versión anterior ya guardaba el presupuesto en Firestore: solo se traspasa al vincular.
  localMerge: { tool: "budget", upgrade: false },
};

/** "1500", "1500.50" o "1500,50" → número; vacío, negativo o absurdo → null. */
function parseAmount(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
  return Math.round(n * 100) / 100;
}

function readLocalCap(): number | null {
  const v = readStored<unknown>(LOCAL_BUDGET_CAP_KEY);
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export function CalculadoraPresupuesto({ onClose, showToast }: { profile?: UserProfile; onClose: () => void; showToast?: ShowToast }) {
  const me = useMe();
  const pid = me.pid;
  const list = useSharedList(pid, BUDGET_LIST, authorStamp(me));
  const { retryState, fail, clearRetry } = useRetry();
  const baseId = React.useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // --- Tope ---
  const [localCap, setLocalCap] = useState<number | null>(readLocalCap);
  const [remoteCap, setRemoteCap] = useState<{ pid: string; cap: number | null } | null>(null);
  const [capOverride, setCapOverride] = useState<{ pid: string; cap: number; confirmed?: boolean } | null>(null);
  const [editingCap, setEditingCap] = useState(false);
  const [capDraft, setCapDraft] = useState("");
  const [capError, setCapError] = useState<string | null>(null);
  const [capLoadErrorPid, setCapLoadErrorPid] = useState<string | null>(null);
  const [capAttempt, setCapAttempt] = useState(0);

  useEffect(() => {
    if (!pid) return;
    let checkedLocalCap = false;
    return listenToBudgetCap(
      pid,
      (value, meta) => {
        // Sin respuesta del servidor (solo caché vacía) no sabemos si hay tope: seguimos cargando.
        // Si no, pediríamos un tope nuevo que podría pisar el que ya guardó la pareja.
        if (meta?.fromCache && !meta.exists) return;
        setRemoteCap({ pid, cap: value });
        setCapLoadErrorPid(null);
        // Mi tope optimista se retira cuando llega (o cuando ya se confirmó y hay un snapshot nuevo).
        setCapOverride((o) => (o && o.pid === pid && (o.confirmed || o.cap === value) ? null : o));
        // Traspaso único al vincular: el tope que había solo en este teléfono, si el compartido no tiene.
        if (!checkedLocalCap && !meta?.fromCache) {
          checkedLocalCap = true;
          const flag = localToSharedFlag("budgetcap", pid);
          const localValue = readLocalCap();
          if (!readStored(flag)) {
            if (value === null && localValue !== null && readStored(linkedFromLocalKey(pid))) {
              saveBudgetCap(pid, localValue).then(() => writeStored(flag, true), () => {});
            } else {
              writeStored(flag, true);
            }
          }
        }
      },
      // Sin leer el tope no pedimos uno nuevo (podría pisar el que ya guardó la pareja).
      () => setCapLoadErrorPid(pid)
    );
  }, [pid, capAttempt]);

  const cap = !pid
    ? localCap
    : capOverride?.pid === pid
      ? capOverride.cap
      : remoteCap?.pid === pid
        ? remoteCap.cap
        : null;
  const capLoaded = !pid || remoteCap?.pid === pid;
  const capLoadError = !!pid && capLoadErrorPid === pid && !capLoaded;

  const saveCap = (value: number) => {
    if (!pid) {
      setLocalCap(value);
      writeStored(LOCAL_BUDGET_CAP_KEY, value);
      return;
    }
    const capPid = pid;
    const isMine = (o: { pid: string; cap: number } | null) => !!o && o.pid === capPid && o.cap === value;
    setCapOverride({ pid: capPid, cap: value });
    saveBudgetCap(capPid, value).then(
      () => setCapOverride((o) => (isMine(o) ? { pid: capPid, cap: value, confirmed: true } : o)),
      () => {
        setCapOverride((o) => (isMine(o) ? null : o));
        fail("No se guardó el tope del presupuesto.", () => saveCap(value));
      }
    );
  };

  const submitCap = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmount(capDraft);
    if (value === null || value < 1) {
      setCapError("Escribe un monto mayor que 0.");
      return;
    }
    setCapError(null);
    setEditingCap(false);
    setCapDraft("");
    clearRetry();
    saveCap(Math.round(value));
  };

  // --- Gastos ---
  const [newItem, setNewItem] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Cuidado");
  const [formError, setFormError] = useState<string | null>(null);

  const commit = (fn: (items: BudgetItem[]) => BudgetItem[], failMessage: string) => {
    function run() {
      list.apply(fn).then((ok) => {
        if (!ok) fail(failMessage, run);
      });
    }
    run();
  };

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItem.trim().replace(/\s+/g, " ").slice(0, 80);
    const amount = parseAmount(newAmount);
    if (!name) {
      setFormError("Escribe qué quieres comprar.");
      return;
    }
    if (amount === null || amount <= 0) {
      setFormError("Escribe un monto mayor que 0.");
      amountRef.current?.focus();
      return;
    }
    setFormError(null);
    const item: BudgetItem = { id: newId(), name, amount, category: newCategory, isPurchased: false, ...authorStamp(me) };
    // Gasto nuevo: si no llega al servidor queda "Sin enviar" en este teléfono y se reenvía solo.
    void list.add(item);
    setNewItem("");
    setNewAmount("");
  };

  const togglePurchased = (item: BudgetItem) => {
    commit(patchById<BudgetItem>(item.id, { isPurchased: !item.isPurchased }), `No se guardó el cambio en "${item.name}".`);
  };

  // "Quitar" desaparece con su fila: el foco pasa al "Quitar" de la fila siguiente (o de la anterior,
  // o al campo "Agregar un gasto") en vez de caer a body, donde el teclado pierde su sitio.
  const removeRefs = useRef(new Map<BudgetItem["id"], HTMLButtonElement>());
  const itemInputRef = useRef<HTMLInputElement>(null);
  const focusAfterRemoveRef = useRef<{ removed: BudgetItem["id"]; next: BudgetItem["id"] | null } | null>(null);

  const removeExpense = (item: BudgetItem) => {
    const current = list.items;
    const at = current.findIndex((i) => i.id === item.id);
    const neighbour = current[at + 1] ?? current[at - 1] ?? null;
    focusAfterRemoveRef.current = { removed: item.id, next: neighbour ? neighbour.id : null };
    commit(removeById<BudgetItem>(item.id), `No se pudo quitar "${item.name}".`);
    showToast?.(`Quitamos ${item.name}`, () => commit(restoreItems([item]), `No se pudo volver a agregar "${item.name}".`));
  };

  const pickIdea = (idea: { name: string; category: string }) => {
    setNewItem(idea.name);
    setNewCategory(idea.category);
    setFormError(null);
    amountRef.current?.focus();
  };

  // Diálogo modal: Escape, foco inicial en "Cerrar", trampa de Tab, fondo inerte y scroll bloqueado.
  const { dialogProps } = useModalDialog({ open: true, onClose, initialFocusRef: closeRef, labelledBy: `${baseId}-titulo` });

  const items = list.items;

  useEffect(() => {
    const pending = focusAfterRemoveRef.current;
    if (!pending || items.some((i) => i.id === pending.removed)) return; // la fila sigue ahí
    focusAfterRemoveRef.current = null;
    const doc = itemInputRef.current?.ownerDocument;
    const active = doc?.activeElement;
    if (doc && active && active !== doc.body && active.isConnected) return; // el foco ya está en otro sitio
    const target = (pending.next !== null ? removeRefs.current.get(pending.next) : undefined) ?? itemInputRef.current;
    target?.focus();
  }, [items]);

  const totalPlanned = items.reduce((acc, i) => acc + i.amount, 0);
  const totalPurchased = items.filter((i) => i.isPurchased).reduce((acc, i) => acc + i.amount, 0);
  const remaining = cap !== null ? cap - totalPlanned : null;
  const over = remaining !== null && remaining < 0;
  const plannedPct = cap ? Math.min(100, (totalPlanned / cap) * 100) : 0;
  const purchasedPct = cap ? Math.min(100, (totalPurchased / cap) * 100) : 0;
  const plural = !!pid;

  const fieldClass =
    `min-h-[44px] rounded-xl bg-white text-base text-stone-900 dark:bg-[#221d2d] dark:text-[#eae6e1] ${fieldBorder} ${fieldFocus}`;

  const capForm = (
    <form onSubmit={submitCap} className="space-y-2" noValidate>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-stone-600 dark:text-[#a6a1b2]" aria-hidden="true">$</span>
          <input
            id={`${baseId}-tope`}
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            value={capDraft}
            onChange={(e) => setCapDraft(e.target.value)}
            placeholder="Ej. 5000"
            aria-invalid={!!capError}
            aria-describedby={capError ? `${baseId}-tope-error` : undefined}
            className={`${fieldClass} w-full pl-7 pr-3 font-bold tabular-nums`}
          />
        </div>
        <button
          type="submit"
          className={`min-h-[44px] shrink-0 rounded-xl bg-sage-ink px-4 text-sm font-bold text-white transition-colors hover:bg-sage-ink-hover ${sosFocusRing}`}
        >
          Guardar
        </button>
        {cap !== null && (
          <button
            type="button"
            onClick={() => {
              setEditingCap(false);
              setCapError(null);
            }}
            className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-bold text-stone-700 hover:bg-stone-200 dark:text-[#eae6e1] dark:hover:bg-white/10 ${sosFocusRing}`}
          >
            Cancelar
          </button>
        )}
      </div>
      {capError && (
        <p id={`${baseId}-tope-error`} role="alert" className="text-sm font-semibold text-terracotta-ink">{capError}</p>
      )}
    </form>
  );

  return (
    <ModalPortal>
    <div
      className={`fixed inset-0 ${Z_CLASS.dialog} flex items-end justify-center bg-black/60 p-0 animate-in fade-in duration-200 sm:items-center sm:p-4 dark:bg-black/80`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        {...dialogProps}
        className="flex h-[88dvh] max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#fdfbf7] shadow-2xl outline-none animate-in slide-in-from-bottom-8 sm:h-auto sm:rounded-3xl dark:border-white/10 dark:bg-[#1a1625]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-200 px-5 pb-3 pt-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 id={`${baseId}-titulo`} className="flex items-center gap-2 text-xl font-black text-stone-900 dark:text-[#eae6e1]">
              <Wallet size={22} className="shrink-0 text-sage-ink" aria-hidden="true" />
              Presupuesto del bebé
            </h2>
            <SyncBadge lastSyncedAt={list.meta?.updatedAt ?? null} waiting={!list.loaded} className="mt-1" />
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar presupuesto"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200 dark:bg-white/5 dark:text-[#eae6e1] dark:hover:bg-white/10 ${sosFocusRing}`}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <RetryNotice state={retryState} onDismiss={clearRetry} />
          <UnsentNotice count={list.unsentIds.size} onRetry={list.retryUnsent} one="gasto" many="gastos" />
          {list.loadError && <LoadErrorNotice what="el presupuesto compartido" onRetry={list.retryLoad} />}

          {/* Resumen: cuánto queda o cuánto se pasaron */}
          <section aria-label="Resumen del presupuesto" className="rounded-3xl bg-white p-5 shadow-[0_6px_20px_-12px_rgba(60,40,30,0.25)] dark:bg-[#221d2d]">
            {capLoadError ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-stone-700 dark:text-[#eae6e1]">No pudimos cargar el tope. Revisa tu conexión.</p>
                <button
                  type="button"
                  onClick={() => setCapAttempt((a) => a + 1)}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-terracotta-ink hover:bg-terracotta/10 ${sosFocusRing}`}
                >
                  <RefreshCw size={15} aria-hidden="true" /> Reintentar
                </button>
              </div>
            ) : !capLoaded ? (
              <SharedLoading what="el presupuesto compartido" />
            ) : cap === null ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor={`${baseId}-tope`} className="block text-base font-bold text-stone-900 dark:text-[#eae6e1]">
                    ¿Cuánto {plural ? "quieren" : "quieres"} destinar en total?
                  </label>
                  <p className="mt-0.5 text-sm text-stone-600 dark:text-[#a6a1b2]">
                    Así {plural ? "sabrán" : "sabrás"} cuánto queda. {plural ? "Pueden cambiarlo cuando quieran." : "Puedes cambiarlo cuando quieras."}
                    {totalPlanned > 0 && ` Planeado hasta ahora: ${formatMoney(totalPlanned)}.`}
                  </p>
                </div>
                {capForm}
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-600 dark:text-[#a6a1b2]">{over ? "Por encima del tope" : "Quedan"}</p>
                    <p className={`text-3xl font-black tracking-tight tabular-nums ${over ? "text-terracotta-ink" : "text-sage-ink"}`}>
                      {/* "Por encima del tope: $500" (sin signo menos ni culpa: la etiqueta ya dice que es de más). */}
                      {formatMoney(over ? Math.abs(remaining ?? 0) : (remaining ?? 0))}
                    </p>
                  </div>
                  {!editingCap && (
                    <button
                      type="button"
                      onClick={() => {
                        setCapDraft(String(cap));
                        setEditingCap(true);
                      }}
                      aria-label={`Cambiar el tope, ahora ${formatMoney(cap)}`}
                      className={`-mr-2 inline-flex min-h-[44px] shrink-0 flex-col items-end justify-center rounded-xl px-2 text-right hover:bg-stone-100 dark:hover:bg-white/5 ${sosFocusRing}`}
                    >
                      <span className="text-xs text-stone-600 dark:text-[#a6a1b2]">Tope</span>
                      <span className="flex items-center gap-1 font-bold tabular-nums text-stone-900 dark:text-[#eae6e1]">
                        {formatMoney(cap)} <Pencil size={13} aria-hidden="true" />
                      </span>
                    </button>
                  )}
                </div>

                {editingCap && (
                  <div className="mt-3">
                    <label htmlFor={`${baseId}-tope`} className="mb-1 block text-sm font-semibold text-stone-700 dark:text-[#eae6e1]">Nuevo tope</label>
                    {capForm}
                  </div>
                )}

                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={cap}
                  aria-valuenow={Math.min(totalPlanned, cap)}
                  aria-valuetext={`Planeado ${formatMoney(totalPlanned)} de ${formatMoney(cap)}${over ? ", por encima del tope" : ""}`}
                  className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-black/30"
                >
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${over ? "bg-terracotta-ink" : "bg-sage/45"}`}
                    style={{ width: `${plannedPct}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${over ? "bg-terracotta-ink-hover" : "bg-sage-ink"}`}
                    style={{ width: `${purchasedPct}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-[#a6a1b2]">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${over ? "bg-terracotta-ink-hover" : "bg-sage-ink"}`} aria-hidden="true" />
                    Comprado <span className="tabular-nums">{formatMoney(totalPurchased)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${over ? "bg-terracotta-ink" : "bg-sage/45"}`} aria-hidden="true" />
                    Planeado <span className="tabular-nums">{formatMoney(totalPlanned)}</span>
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Agregar gasto */}
          <form onSubmit={addExpense} className="space-y-2" noValidate>
            <label htmlFor={`${baseId}-item`} className="block text-sm font-bold text-stone-900 dark:text-[#eae6e1]">Agregar un gasto</label>
            <input
              ref={itemInputRef}
              id={`${baseId}-item`}
              type="text"
              placeholder="Ej. cuna, pañales…"
              maxLength={80}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className={`${fieldClass} w-full px-4`}
            />
            <div className="flex gap-2">
              <label htmlFor={`${baseId}-categoria`} className="sr-only">Categoría</label>
              <select
                id={`${baseId}-categoria`}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={`${fieldClass} w-[8.5rem] shrink-0 px-3 text-sm font-semibold`}
              >
                {BUDGET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="relative min-w-0 flex-1">
                <label htmlFor={`${baseId}-monto`} className="sr-only">Monto</label>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-stone-600 dark:text-[#a6a1b2]" aria-hidden="true">$</span>
                <input
                  ref={amountRef}
                  id={`${baseId}-monto`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className={`${fieldClass} w-full pl-7 pr-3 font-bold tabular-nums`}
                />
              </div>
              <button
                type="submit"
                aria-label="Agregar gasto"
                className={`grid min-h-[44px] w-12 shrink-0 place-items-center rounded-xl bg-sage-ink text-white transition-colors hover:bg-sage-ink-hover ${sosFocusRing}`}
              >
                <Plus size={22} aria-hidden="true" />
              </button>
            </div>
            {formError && <p role="alert" className="text-sm font-semibold text-terracotta-ink">{formError}</p>}
          </form>

          {list.loadError ? null : !list.loaded && items.length === 0 ? (
            <SharedLoading what="los gastos compartidos" />
          ) : items.length === 0 ? (
            <div className="py-4 text-center">
              <p className="mb-3 text-sm text-stone-600 dark:text-[#a6a1b2]">
                Aún no hay gastos. ¿Por dónde empezar? Toca una idea y escribe cuánto cuesta.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {BUDGET_IDEAS.map((idea) => (
                  <button
                    key={idea.name}
                    type="button"
                    onClick={() => pickIdea(idea)}
                    className={`inline-flex min-h-[44px] items-center gap-1 rounded-full bg-stone-100 px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-200 dark:bg-white/5 dark:text-[#eae6e1] dark:hover:bg-white/10 ${sosFocusRing}`}
                  >
                    <Plus size={14} aria-hidden="true" /> {idea.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-[#221d2d]">
              {items.map((expense) => (
                <li key={expense.id} className="flex items-center gap-2 py-1.5 pl-1.5 pr-1">
                  <button
                    type="button"
                    onClick={() => togglePurchased(expense)}
                    aria-pressed={expense.isPurchased}
                    aria-label={`${expense.name}: ya comprado`}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 ${sosFocusRing}`}
                  >
                    {expense.isPurchased ? (
                      <CheckCircle2 size={22} className="text-sage-ink" aria-hidden="true" />
                    ) : (
                      <Circle size={22} className="text-stone-500 dark:text-[#a6a1b2]" aria-hidden="true" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-bold ${expense.isPurchased ? "text-stone-500 line-through dark:text-[#8f899c]" : "text-stone-900 dark:text-[#eae6e1]"}`}>
                      {expense.name}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-[#a6a1b2]">
                      <Tag size={11} aria-hidden="true" /> {expense.category}
                      {list.linked && <ItemAuthor item={expense} members={me.members} />}
                    </p>
                  </div>
                  <span className={`shrink-0 font-black tabular-nums ${expense.isPurchased ? "text-stone-500 dark:text-[#8f899c]" : "text-stone-800 dark:text-[#eae6e1]"}`}>
                    {formatMoney(expense.amount)}
                  </span>
                  <button
                    ref={(el) => { if (el) removeRefs.current.set(expense.id, el); else removeRefs.current.delete(expense.id); }}
                    type="button"
                    onClick={() => removeExpense(expense)}
                    aria-label={`Quitar ${expense.name}`}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-stone-500 transition-colors hover:bg-terracotta/10 hover:text-terracotta-ink dark:text-[#a6a1b2] ${sosFocusRing}`}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

// --- PANDA STORY: tarjeta 9:16 para compartir la semana ---

const STORY_HITOS: [number, string][] = [
  [6, "Su corazón empieza a formarse"],
  [9, "Su corazón ya late"],
  [13, "Ya tiene deditos en manos y pies"],
  [17, "Sus movimientos son cada vez más coordinados"],
  [22, "Sus movimientos se sienten cada vez más"],
  [26, "Ya puede oír sonidos y voces"],
  [30, "Abre y cierra sus ojitos"],
  [34, "Sus pulmones siguen madurando"],
  [37, "Reconoce voces familiares"],
];

function storyMilestone(week: number): string {
  for (const [limit, text] of STORY_HITOS) if (week <= limit) return text;
  return "Casi listo para conocer el mundo";
}

// Emoji al final del texto de tamaño ("Mazorca de maíz 🌽"): se separa para ilustrar la tarjeta.
const TRAILING_EMOJI = new RegExp("^(.*?)\\s*((?:\\p{Extended_Pictographic}|\\uFE0F|\\u200D)+)\\s*$", "u");

function splitSize(size: string): { label: string; emoji: string } {
  const m = size.match(TRAILING_EMOJI);
  return m ? { label: m[1].trim(), emoji: m[2] } : { label: size.trim(), emoji: "" };
}

const STORY_STYLES = [
  {
    id: "botanico",
    name: "Botánico",
    container: "bg-gradient-to-br from-[#e8efe9] via-[#faf9f5] to-[#f6e4dc]",
    primary: "text-[#44695a]",
    secondary: "text-[#a54833]",
    card: "bg-white/85 border-[#44695a]/15",
    cardText: "text-stone-700",
    cardStrong: "text-stone-900",
  },
  {
    id: "nocturno",
    name: "Nocturno",
    container: "bg-gradient-to-br from-[#181520] via-[#221d2d] to-[#2d2338]",
    primary: "text-[#eae6e1]",
    secondary: "text-[#eb9279]",
    card: "bg-white/10 border-white/15",
    cardText: "text-[#cfcad8]",
    cardStrong: "text-white",
  },
  {
    id: "amanecer",
    name: "Amanecer",
    container: "bg-gradient-to-tr from-[#f8e1d7] via-[#fbf1e6] to-[#f3d9c9]",
    primary: "text-[#8f3c2a]",
    secondary: "text-[#44695a]",
    card: "bg-white/80 border-[#a54833]/15",
    cardText: "text-stone-700",
    cardStrong: "text-stone-900",
  },
  {
    id: "limpio",
    name: "Limpio",
    container: "bg-[#faf9f5]",
    primary: "text-stone-900",
    secondary: "text-stone-600",
    card: "bg-white border-stone-200",
    cardText: "text-stone-600",
    cardStrong: "text-stone-900",
  },
] as const;

export function PandaStoryGenerator({ profile, onClose }: { profile?: UserProfile; onClose: () => void }) {
  const week = knownWeek(profile);
  const earlyWeek = !!profile && !profile.weekUnknown && typeof profile.week === "number" && profile.week >= 1 && profile.week < 4;
  const [activeStyleId, setActiveStyleId] = useState<(typeof STORY_STYLES)[number]["id"]>("botanico");
  const style = STORY_STYLES.find((s) => s.id === activeStyleId) ?? STORY_STYLES[0];

  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const shareRef = useRef<HTMLButtonElement>(null);
  // Crear y Editar reemplazan los botones: el foco pasa a la acción siguiente en vez de perderse.
  const focusAfterRef = useRef<"share" | "create" | null>(null);

  // Diálogo modal: Escape, foco inicial en "Cerrar", trampa de Tab, fondo inerte y scroll bloqueado.
  const { dialogProps } = useModalDialog({ open: true, onClose, initialFocusRef: closeRef, labelledBy: "panda-story-titulo" });

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const want = focusAfterRef.current;
    if (!want) return;
    focusAfterRef.current = null;
    (want === "share" ? shareRef : createRef).current?.focus();
  }, [imageUrl]);

  const weekData = typeof week === "number" ? getWeekData(week, profile?.comparisonTheme ?? "frutas") : null;
  const size = weekData ? splitSize(weekData.size) : null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setCustomImage(url);
    setImageUrl(null);
  };

  const generateStory = async () => {
    if (!storyRef.current) return;
    setIsGenerating(true);
    setError(null);
    try {
      const dataUrl = await toPng(storyRef.current, { pixelRatio: 3, cacheBust: true });
      focusAfterRef.current = "share";
      setImageUrl(dataUrl);
    } catch (err) {
      console.error("Error generating story:", err);
      setError("No se pudo crear la imagen. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const shareStory = async () => {
    if (!imageUrl || typeof week !== "number") return;
    const fileName = `pandajr-semana-${week}.png`;
    const triggerDownload = () => {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    if (!navigator.share || !navigator.canShare) {
      triggerDownload();
      return;
    }
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `¡Estamos en la semana ${week}!`,
          text: size ? `¡Estamos en la semana ${week}! Nuestro bebé ya tiene el tamaño de: ${size.label.toLocaleLowerCase("es")}.` : `¡Estamos en la semana ${week}!`,
          files: [file],
        });
      } else {
        triggerDownload();
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") triggerDownload();
    }
  };

  const iconButton = `grid h-11 w-11 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200 dark:bg-white/5 dark:text-[#eae6e1] dark:hover:bg-white/10 ${sosFocusRing}`;

  return (
    <ModalPortal>
    <div
      className={`fixed inset-0 ${Z_CLASS.dialog} flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200 dark:bg-black/80`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div {...dialogProps} className="flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-[#fdfbf7] shadow-2xl outline-none dark:bg-[#1a1625]">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#221d2d]">
          <h2 id="panda-story-titulo" className="flex items-center gap-2 font-bold text-stone-900 dark:text-[#eae6e1]">
            <Camera size={20} className="text-terracotta-ink" aria-hidden="true" /> Tarjeta de la semana
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar la tarjeta de la semana" className={iconButton}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {typeof week !== "number" || !weekData || !size ? (
          // Semana confirmada pero menor de 4: pedir que la confirme sería un callejón sin salida.
          earlyWeek ? (
            <div className="space-y-2 p-6 text-center">
              <p className="font-bold text-stone-900 dark:text-[#eae6e1]">La tarjeta estará disponible desde la semana 4</p>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
                Muestra la semana y el tamaño del bebé, que antes de la semana 4 todavía no se puede medir.
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-6 text-center">
              <p className="font-bold text-stone-900 dark:text-[#eae6e1]">Primero confirma la semana de embarazo</p>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-[#a6a1b2]">
                La tarjeta muestra la semana y el tamaño del bebé. Confirma la semana en Ajustes para crearla.
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto p-5">
            {/* Tamaños en unidades del contenedor: la tarjeta se ve igual a 260 o 320 px y al exportarla. */}
            <div className="@container relative aspect-[9/16] w-[260px] shrink-0 overflow-hidden rounded-[2rem] border-4 border-white shadow-xl sm:w-[300px] dark:border-[#2d273a]">
              <div ref={storyRef} className={`absolute inset-0 flex flex-col items-center p-[7cqw] text-center ${style.container}`}>
                {/* Sin opacidad: la marca queda ≥4.99:1 sobre el fondo de cada estilo (antes 2.39:1). */}
                <p className={`text-[4.5cqw] font-black tracking-tight ${style.primary}`}>PandaJR</p>

                <div className="mt-[4cqw] w-full">
                  <p className={`text-[5cqw] font-bold uppercase tracking-[0.12em] ${style.secondary}`}>¡Estamos en la</p>
                  <p className={`whitespace-nowrap text-[14cqw] font-black leading-[1.05] tracking-tight ${style.primary}`}>semana {week}!</p>
                </div>

                <div className="flex min-h-0 w-full flex-1 items-center justify-center py-[3cqw]">
                  {customImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagen local del usuario (blob:) para exportar
                    <img src={customImage} alt="Foto elegida para la tarjeta" className="aspect-square w-[52cqw] rounded-full border-[1.5cqw] border-white object-cover shadow-lg" />
                  ) : size.emoji ? (
                    <span className="text-[34cqw] leading-none" role="img" aria-label={size.label}>{size.emoji}</span>
                  ) : (
                    <Baby className={`h-[34cqw] w-[34cqw] ${style.primary}`} aria-hidden="true" />
                  )}
                </div>

                <div className={`w-full rounded-[5cqw] border px-[5cqw] py-[4cqw] ${style.card}`}>
                  <p className={`text-[4cqw] font-semibold ${style.cardText}`}>Nuestro bebé es del tamaño de</p>
                  <p className={`mt-[1cqw] line-clamp-2 text-[7cqw] font-black leading-tight ${style.cardStrong}`}>{size.label}</p>
                  <p className={`mt-[1.5cqw] text-[3.8cqw] font-bold tabular-nums ${style.cardText}`}>
                    {weekData.length} · {weekData.weight}
                  </p>
                  <p className={`mt-[3cqw] border-t border-current/15 pt-[3cqw] text-[4cqw] font-bold leading-snug ${style.primary}`}>
                    {storyMilestone(week)}
                  </p>
                </div>
              </div>

              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- vista previa de la imagen generada (data:)
                <img src={imageUrl} alt={`Tarjeta de la semana ${week}`} className="absolute inset-0 z-20 h-full w-full object-cover" />
              )}
            </div>

            {error && (
              <p role="alert" className="w-full text-center text-sm font-semibold text-terracotta-ink">{error}</p>
            )}

            <div className="flex w-full flex-col gap-3">
              {!imageUrl ? (
                <>
                  <div className="flex w-full flex-wrap justify-center gap-2" role="group" aria-label="Estilo de la tarjeta">
                    {STORY_STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={activeStyleId === s.id}
                        onClick={() => setActiveStyleId(s.id)}
                        className={`min-h-[44px] rounded-xl border px-3 text-sm font-bold transition-colors ${sosFocusRing} ${
                          activeStyleId === s.id
                            ? "border-terracotta-ink bg-terracotta/10 text-terracotta-ink"
                            : "border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-white/10 dark:text-[#a6a1b2] dark:hover:bg-white/5"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white font-bold text-stone-800 transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-white/10 dark:text-[#eae6e1] ${sosFocusRing}`}
                  >
                    <ImagePlus size={20} className="text-stone-600 dark:text-[#a6a1b2]" aria-hidden="true" />
                    {customImage ? "Cambiar la foto" : "Agregar foto o ecografía"}
                  </button>
                  <button
                    ref={createRef}
                    type="button"
                    onClick={() => void generateStory()}
                    disabled={isGenerating}
                    className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-terracotta-ink font-bold text-white transition-colors hover:bg-terracotta-ink-hover disabled:opacity-70 ${sosFocusRing}`}
                  >
                    {isGenerating ? (
                      <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Wand2 size={20} aria-hidden="true" />
                    )}
                    {isGenerating ? "Creando la tarjeta…" : "Crear tarjeta"}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    ref={shareRef}
                    type="button"
                    onClick={() => void shareStory()}
                    className={`flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-sage-ink font-bold text-white transition-colors hover:bg-sage-ink-hover ${sosFocusRing}`}
                  >
                    <Share2 size={20} aria-hidden="true" /> Compartir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      focusAfterRef.current = "create";
                      setImageUrl(null);
                    }}
                    className={`flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-stone-200 font-bold text-stone-800 transition-colors hover:bg-stone-300 dark:bg-white/10 dark:text-[#eae6e1] ${sosFocusRing}`}
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}

export function ReproductorView({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Diálogo modal: Escape, foco inicial en "Cerrar", trampa de Tab, fondo inerte y scroll bloqueado.
  const { dialogProps } = useModalDialog({ open: true, onClose, initialFocusRef: closeRef, labelledBy: "panda-audio-titulo" });
  const [activeTab, setActiveTab] = useState<"dormir" | "estimulacion" | "latidos">("dormir");
  const [isPlaying, setIsPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playlists = {
    dormir: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZq91oLsHZvy?utm_source=generator&theme=0",
    estimulacion: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8C9xQcOrE6T?utm_source=generator&theme=0"
  };

  const toggleNoise = () => {
    if (isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      }
      setIsPlaying(false);
    } else {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtor();
      }
      const ctx = audioCtxRef.current;

      if (ctx.state === 'suspended') ctx.resume();

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(filter);
      filter.connect(ctx.destination);
      source.start();

      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (sourceRef.current) sourceRef.current.stop();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const tabs = [
    { id: "dormir" as const, label: "Dormir", icon: <Moon size={14} aria-hidden="true" />, active: "text-sage-ink" },
    { id: "estimulacion" as const, label: "Clásica", icon: <Music size={14} aria-hidden="true" />, active: "text-terracotta-ink" },
    { id: "latidos" as const, label: "Ruido", icon: <Waves size={14} aria-hidden="true" />, active: "text-stone-800 dark:text-stone-200" },
  ];

  return (
    <ModalPortal>
    <div
      className={`fixed inset-0 bg-black/70 dark:bg-black/90 backdrop-blur-md ${Z_CLASS.dialog} flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div {...dialogProps} className="bg-white dark:bg-[#15131a] w-full max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] h-[85dvh] sm:h-auto max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl border border-white/20 dark:border-white/5 outline-none animate-in slide-in-from-bottom-8">

        <div className="bg-gradient-to-br from-[#2a2631] to-[#15131a] border-b border-white/5 p-6 shrink-0 relative overflow-hidden text-white">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-white/20">
                <Music size={20} className="text-white" aria-hidden="true" />
              </div>
              <h2 id="panda-audio-titulo" className="text-2xl font-black tracking-tight leading-none mb-1">
                Panda Audio
              </h2>
              <p className="text-stone-300 text-sm font-medium">Música y sonidos para relajarte</p>
            </div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar Panda Audio" className="grid h-11 w-11 place-items-center bg-black/10 hover:bg-black/20 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-stone-50 dark:bg-[#15131a] flex flex-col">

          <div className="px-4 pt-6 pb-2">
            <div className="flex bg-stone-200/50 dark:bg-[#221d2d] p-1.5 rounded-2xl" role="group" aria-label="Tipo de audio">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl transition-colors ${sosFocusRing} ${activeTab === t.id ? `bg-white dark:bg-[#383147] shadow-sm ${t.active}` : "text-stone-600 dark:text-[#a6a1b2]"}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-4 px-2">
              <h3 className="text-lg font-black text-stone-800 dark:text-stone-200">
                {activeTab === "dormir" && "Música para dormir"}
                {activeTab === "estimulacion" && "Música clásica"}
                {activeTab === "latidos" && "Sonido constante"}
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                {activeTab === "dormir" && "Una lista de Spotify para relajarte antes de dormir. Necesita conexión."}
                {activeTab === "estimulacion" && "Música clásica en Spotify para escuchar juntos. Necesita conexión."}
                {activeTab === "latidos" && "Un sonido grave y continuo que a muchas personas les ayuda a relajarse o a dormir."}
              </p>
            </div>

            {activeTab !== "latidos" ? (
              <div className="flex-1 min-h-[350px] bg-stone-200/50 dark:bg-[#221d2d] rounded-3xl overflow-hidden shadow-inner p-2 border border-stone-200/80 dark:border-white/[0.04]">
                <iframe
                  title={activeTab === "dormir" ? "Lista de Spotify para dormir" : "Lista de Spotify de música clásica"}
                  style={{ borderRadius: '20px' }}
                  src={activeTab === "dormir" ? playlists.dormir : playlists.estimulacion}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                ></iframe>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-sage/10 to-transparent dark:from-sage/5 rounded-3xl border border-sage/20">
                 <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                    {isPlaying && <div className="absolute inset-0 bg-sage/20 rounded-full animate-ping motion-reduce:animate-none" aria-hidden="true"></div>}
                    {isPlaying && <div className="absolute inset-4 bg-sage/30 rounded-full animate-pulse motion-reduce:animate-none" aria-hidden="true"></div>}
                    <button
                      type="button"
                      onClick={toggleNoise}
                      aria-label={isPlaying ? "Detener el ruido marrón" : "Reproducir el ruido marrón"}
                      className={`w-32 h-32 bg-sage-ink text-white rounded-full flex items-center justify-center shadow-xl relative z-10 transition-transform hover:scale-105 motion-reduce:hover:scale-100 ${sosFocusRing}`}
                    >
                      {isPlaying ? <Square size={40} className="fill-current" aria-hidden="true" /> : <Play size={40} className="fill-current ml-2" aria-hidden="true" />}
                    </button>
                 </div>

                 <h4 className="font-black text-xl text-stone-800 dark:text-stone-200 mb-2">Ruido marrón</h4>
                 <p className="text-sm text-stone-600 dark:text-[#a6a1b2] text-center mb-6">Se genera en el teléfono: sin anuncios y sin conexión. Se detiene al cerrar Panda Audio.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
