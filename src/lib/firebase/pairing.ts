import { db, auth } from "./config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  orderBy,
  limit,
  deleteDoc,
  runTransaction,
  deleteField,
  Timestamp,
  FieldPath,
  type DocumentData,
  type DocumentReference,
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { sanitizeCareTeam, type CareTeam } from "../urgency";
import { repairMojibake } from "../format";
import { datingFromPregnancyDoc, isDueDateSource, parseISODate, toISODate, weekFromDueDateISO, type DueDateSource, type PregnancyDating } from "../pregnancy";
import { isTaskOwner, sanitizeTaskOwners, type TaskOwner, type TaskOwnerMap } from "../tasks";

// =====================================================================================
// Tipos compartidos
// =====================================================================================

export type MemberRole = "mama" | "papa";

export type Member = { uid: string; role: MemberRole; name?: string; joinedAt?: Date };

/** Metadatos del snapshot de un documento compartido (2º argumento de los listeners de arrays). */
export type SharedDocMeta = {
  /** false si el documento aún no existe en Firestore (primer uso). */
  exists: boolean;
  /** true si el snapshot sale de la caché local (sin confirmar con el servidor). */
  fromCache: boolean;
  hasPendingWrites: boolean;
  /** Última escritura registrada en el documento (campo updatedAt). */
  updatedAt: Date | null;
};

type ErrorCallback = (error: Error) => void;

/**
 * Datos sin esquema de las firmas heredadas (page/herramientas/agenda los tipan por su cuenta).
 * Un único `any` explícito para no romper a los consumidores existentes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LegacyData = any;

export type ChecklistStatus = "completed" | "dismissed";
export type ChecklistProgress = Record<string, boolean | ChecklistStatus>;
export type ChecklistMeta = Record<string, { by?: string; byName?: string; at?: Date }>;
/** 4º argumento de listenToChecklistProgress: dueños reasignados (owners.{taskId}) y quién los cambió. */
export type ChecklistOwners = { owners: TaskOwnerMap; ownersMeta: ChecklistMeta };

export type BabyName = {
  id: string;
  name: string;
  gender?: "nino" | "nina" | "unisex";
  origin?: string;
  meaning?: string;
  addedBy?: string;
  addedByName?: string;
  source?: "user" | "ai" | "suggestion";
  createdAt?: Date;
  votes: Record<string, "like" | "nope">;
};

export type MomStatus = {
  statusText: string;
  emoji: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Nudge = { id: string; fromName?: string; fromRole: string; kind: string; createdAt: Date };

export type InvitePreview = {
  pregnancyId: string;
  babyName: string;
  momName?: string;
  /** Semana vigente (calculada desde la FPP si el código la trae). */
  week?: number;
  /** FPP "aaaa-mm-dd" si el embarazo la tenía al generar el código. */
  dueDate?: string;
  status: "ok" | "expired" | "used" | "not_found";
  /** Caducidad del código (solo códigos nuevos). */
  expiresAt?: Date;
  /** true si el código lo generó este mismo usuario (la mamá probando su propio código). */
  isOwnCode?: boolean;
  /** true si es un código antiguo de 4 caracteres (PANDA-XXXX). */
  legacy?: boolean;
};

// =====================================================================================
// Utilidades internas
// =====================================================================================

/** Mensajes humanos (sin jerga) que la UI puede mostrar tal cual. */
export const PAIRING_MESSAGES = {
  notFound: "Ese código no existe. Revisa que esté bien escrito.",
  expired: "Ese código caducó. Pídele a tu pareja uno nuevo.",
  used: "Ese código ya se usó. Pídele a tu pareja uno nuevo.",
  own: "Ese es tu propio código. Compártelo con tu pareja para que se una.",
  offline: "No hay conexión. Revisa tu internet e inténtalo de nuevo.",
  joinFailed: "No pudimos unirte en este momento. Inténtalo de nuevo en unos minutos.",
  createFailed: "No pudimos crear el espacio compartido. Revisa tu conexión e inténtalo de nuevo.",
  regenerateFailed: "No pudimos generar un código nuevo. Inténtalo de nuevo en un momento.",
  onlyMama: "Solo la mamá puede generar un código nuevo o quitar a alguien.",
  pregnancyMissing: "No encontramos este embarazo compartido. Vuelve a vincular este teléfono.",
  removeFailed: "No pudimos desvincular a esa persona. Inténtalo de nuevo en un momento.",
} as const;

/** Error con mensaje listo para mostrar. */
class PairingError extends Error {
  readonly human = true;
  constructor(message: string) {
    super(message);
    this.name = "PairingError";
  }
}

function errorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const c = (e as { code?: unknown }).code;
    return typeof c === "string" ? c : undefined;
  }
  return undefined;
}

/** Deja pasar los PairingError y traduce el resto a un mensaje humano. */
function humanize(e: unknown, fallback: string): Error {
  if (e instanceof PairingError) return e;
  const code = errorCode(e);
  if (code === "unavailable" || code === "deadline-exceeded" || isOffline()) return new PairingError(PAIRING_MESSAGES.offline);
  return new PairingError(fallback);
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Búsqueda antigua por pregnancies.inviteCode (códigos PANDA-XXXX). Con las reglas desplegadas
 * esa consulta está prohibida (permission-denied): el código antiguo cuenta como caducado.
 */
async function findLegacyPregnancies(code: string) {
  try {
    return await getDocs(query(collection(db, "pregnancies"), where("inviteCode", "==", code), limit(2)));
  } catch (e) {
    if (errorCode(e) === "permission-denied") return "retired" as const;
    throw e;
  }
}

function assertOnline() {
  if (isOffline()) throw new PairingError(PAIRING_MESSAGES.offline);
}

function waitForOnline(): Promise<void> {
  if (typeof window === "undefined" || !isOffline()) return Promise.resolve();
  return new Promise((resolve) => window.addEventListener("online", () => resolve(), { once: true }));
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const RETRYABLE_CODES = new Set(["unavailable", "deadline-exceeded", "aborted"]);

/**
 * Ejecuta una operación que necesita al servidor (transacción). Sin conexión espera al
 * evento `online` (la promesa queda pendiente mientras tanto) y reintenta errores
 * transitorios; cualquier otro error se propaga para que la UI revierta y ofrezca "Reintentar".
 */
async function withReconnect<R>(op: () => Promise<R>, maxErrors = 3): Promise<R> {
  let errors = 0;
  for (;;) {
    if (isOffline()) await waitForOnline();
    try {
      return await op();
    } catch (e) {
      const code = errorCode(e);
      if (code && RETRYABLE_CODES.has(code) && errors < maxErrors) {
        errors++;
        if (!isOffline()) await delay(400 * 2 ** errors);
        continue;
      }
      throw e;
    }
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Firestore rechaza `undefined`: lo quitamos en profundidad (conserva sentinels, Date y Timestamp). */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((v) => v !== undefined).map((v) => stripUndefined(v)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "object" && typeof (v as { toDate?: unknown }).toDate === "function") {
    try {
      return (v as { toDate(): Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

function cleanText(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = repairMojibake(v).trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : undefined;
}

function validWeek(w: unknown): number | undefined {
  const n = typeof w === "number" ? w : Number(w);
  return Number.isInteger(n) && n >= 1 && n <= 42 ? n : undefined;
}

/** FPP válida normalizada a "aaaa-mm-dd" (o undefined). */
function validDueDate(v: unknown): string | undefined {
  const d = parseISODate(v);
  return d ? toISODate(d) : undefined;
}

/** Semana vigente de un documento (embarazo o código): desde la FPP si la hay; si no, `week`. */
function weekFromDoc(d: DocumentData | undefined): number | undefined {
  const due = validDueDate(d?.dueDate);
  return due ? weekFromDueDateISO(due) : validWeek(d?.week);
}

function warnListener(label: string): ErrorCallback {
  return (error) => {
    if (process.env.NODE_ENV !== "production") console.warn(`[pairing] listener ${label}:`, error?.message);
  };
}

function sharedRef(pregnancyId: string, docName: string) {
  return doc(db, "pregnancies", pregnancyId, "shared_data", docName);
}

/** Escucha un documento de shared_data. Llama SIEMPRE (también si no existe) para poder marcar hasLoadedRemote. */
function listenSharedDoc(
  pregnancyId: string,
  docName: string,
  onData: (data: DocumentData | undefined, meta: SharedDocMeta) => void,
  onError?: ErrorCallback
) {
  return onSnapshot(
    sharedRef(pregnancyId, docName),
    (snap) => {
      const data = snap.exists() ? snap.data({ serverTimestamps: "estimate" }) : undefined;
      onData(data, {
        exists: snap.exists(),
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
        updatedAt: toDate(data?.updatedAt),
      });
    },
    onError ?? warnListener(docName)
  );
}

function arrayField(data: DocumentData | undefined, field = "items"): unknown[] {
  const v = data?.[field];
  return Array.isArray(v) ? v : [];
}

// =====================================================================================
// Autenticación
// =====================================================================================

export async function ensureAuth() {
  // Espera a que Auth restaure la sesión guardada: así no se crea un usuario anónimo nuevo.
  if (typeof auth.authStateReady === "function") await auth.authStateReady();
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser?.uid;
}

/** uid actual (null si Auth aún no se restauró o no hay sesión). */
export function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

/** Avisa cada vez que cambia el uid (incluye el valor inicial al restaurar la sesión). No inicia sesión. */
export function onUidChange(cb: (uid: string | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => cb(user?.uid ?? null));
}

// =====================================================================================
// Códigos de invitación y miembros
// =====================================================================================

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Código nuevo "PANDA-XXXX-XXXX" con crypto.getRandomValues (32^8 ≈ 1,1 billones de combinaciones). */
export function generateInviteCode(): string {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) throw new Error("crypto.getRandomValues no está disponible");
  const bytes = new Uint8Array(8);
  cryptoObj.getRandomValues(bytes);
  let body = "";
  for (const b of bytes) body += INVITE_ALPHABET[b % INVITE_ALPHABET.length]; // 256 % 32 === 0: sin sesgo
  return `PANDA-${body.slice(0, 4)}-${body.slice(4)}`;
}

/**
 * Normaliza lo que escribe la persona: mayúsculas, sin espacios, con o sin guiones y con o sin
 * el prefijo PANDA. Devuelve el código canónico ("PANDA-XXXX-XXXX" o el antiguo "PANDA-XXXX").
 */
export function normalizeInviteCode(input: string): { code: string; legacy: boolean } | null {
  if (typeof input !== "string") return null;
  const upper = input.toUpperCase().trim();
  const raw = upper.replace(/[^A-Z0-9]/g, "");
  let body: string | null = null;
  // "PANDA-…" / "PANDA …": el prefijo está escrito con separador, así que no es parte del código.
  if (/^PANDA[\s-]/.test(upper)) body = raw.length === 9 || raw.length === 13 ? raw.slice(5) : null;
  else if (raw.startsWith("PANDA") && (raw.length === 9 || raw.length === 13)) body = raw.slice(5);
  else if (raw.length === 4 || raw.length === 8) body = raw;
  if (!body) return null;
  for (const ch of body) if (!INVITE_ALPHABET.includes(ch)) return null;
  return body.length === 8
    ? { code: `PANDA-${body.slice(0, 4)}-${body.slice(4)}`, legacy: false }
    : { code: `PANDA-${body}`, legacy: true };
}

function isLegacyCode(code: unknown): boolean {
  return typeof code === "string" && /^PANDA-[A-Z0-9]{4}$/.test(code);
}

type InviteStatus = "ok" | "expired" | "used";

function inviteStatus(d: DocumentData, uid: string | null, nowMs: number): InviteStatus {
  if (d.revokedAt) return "expired";
  // Usado va antes que caducado: un código que la pareja ya usó sigue siendo "usado" pasados los
  // 14 días (si no, Ajustes diría "caducó, genera otro" como si la pareja no estuviera vinculada).
  if (d.usedBy && d.usedBy !== uid) return "used";
  const exp = toDate(d.expiresAt);
  if (!exp || exp.getTime() <= nowMs) return "expired";
  return "ok";
}

function membersFrom(raw: unknown): Member[] {
  if (!isPlainObject(raw)) return [];
  const list: Member[] = [];
  for (const [uid, v] of Object.entries(raw)) {
    if (!isPlainObject(v)) continue;
    const role = v.role;
    if (role !== "mama" && role !== "papa") continue;
    list.push({
      uid,
      role,
      name: typeof v.name === "string" && v.name.trim() ? v.name.trim() : undefined,
      joinedAt: toDate(v.joinedAt) ?? undefined,
    });
  }
  return list.sort((a, b) => {
    if (a.role !== b.role) return a.role === "mama" ? -1 : 1;
    return (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0);
  });
}

class CodeCollision extends Error {}

/**
 * Crea invite_codes/{code} en una transacción (reintenta si el código ya existe), actualiza
 * pregnancies/{id}.inviteCode y revoca el código anterior si lo había.
 */
async function createInviteTx(p: {
  pregnancyId: string;
  createdBy: string;
  babyName?: string;
  momName?: string;
  week?: number;
  /** FPP del embarazo: la vista previa calcula con ella la semana del día en que se usa el código. */
  dueDate?: string;
  oldCode?: unknown;
  /** Solo si el embarazo sigue con este código (evita emitir dos códigos desde dos teléfonos). */
  onlyIfCurrent?: string;
}): Promise<string> {
  const pregRef = doc(db, "pregnancies", p.pregnancyId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const inviteRef = doc(db, "invite_codes", code);
    const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_MS);
    try {
      const issued = await runTransaction(db, async (tx) => {
        if (p.onlyIfCurrent !== undefined) {
          const preg = await tx.get(pregRef);
          const cur = preg.exists() ? preg.data().inviteCode : undefined;
          if (cur !== p.onlyIfCurrent) return typeof cur === "string" ? cur : "";
        }
        const existing = await tx.get(inviteRef);
        if (existing.exists()) throw new CodeCollision();
        const oldRef =
          typeof p.oldCode === "string" && p.oldCode !== code && normalizeInviteCode(p.oldCode)?.code === p.oldCode
            ? doc(db, "invite_codes", p.oldCode)
            : null;
        const oldSnap = oldRef ? await tx.get(oldRef) : null;

        tx.set(
          inviteRef,
          stripUndefined({
            pregnancyId: p.pregnancyId,
            createdBy: p.createdBy,
            createdAt: serverTimestamp(),
            expiresAt,
            usedBy: null,
            usedAt: null,
            // Copia para la vista previa: quien aún no es miembro no puede leer el embarazo.
            babyName: p.babyName || undefined,
            momName: p.momName || undefined,
            week: p.week,
            dueDate: p.dueDate,
          })
        );
        tx.update(pregRef, { inviteCode: code, inviteExpiresAt: expiresAt, inviteCodeUpdatedAt: serverTimestamp() });
        if (oldRef && oldSnap?.exists() && !oldSnap.data()?.revokedAt) {
          tx.update(oldRef, { revokedAt: serverTimestamp() });
        }
        return code;
      });
      return issued;
    } catch (e) {
      if (e instanceof CodeCollision) continue;
      throw e;
    }
  }
  throw new PairingError(PAIRING_MESSAGES.regenerateFailed);
}

/**
 * Crea el embarazo compartido con la mamá como primer miembro y su código de invitación.
 * `momName` se guarda como nombre de la mamá (en datos antiguos `babyName` guardaba el nombre de la mamá).
 * `opts.week` guarda la semana confirmada; si no llega no se inventa ninguna.
 * `opts.dueDate` ("aaaa-mm-dd") guarda la fecha probable de parto: si llega, manda sobre
 * `opts.week` (la semana guardada se calcula de ella para las versiones que solo leen `week`).
 */
export async function createPregnancyForMom(
  userId: string,
  babyName: string,
  momName?: string,
  opts?: { week?: number; dueDate?: string; dueDateSource?: DueDateSource }
) {
  assertOnline();
  const cleanBaby = cleanText(babyName, 60) ?? "";
  const cleanMom = cleanText(momName, 60);
  const dueDate = validDueDate(opts?.dueDate);
  const week = dueDate ? weekFromDueDateISO(dueDate) : validWeek(opts?.week);
  const pregRef = doc(collection(db, "pregnancies"));
  try {
    await setDoc(
      pregRef,
      stripUndefined({
        babyName: cleanBaby,
        momName: cleanMom,
        week,
        ...(dueDate
          ? {
              dueDate,
              dueDateSource: isDueDateSource(opts?.dueDateSource) ? opts.dueDateSource : "manual",
              dueDateUpdatedAt: serverTimestamp(),
              dueDateUpdatedBy: userId,
              dueDateUpdatedByName: cleanMom,
            }
          : {}),
        createdAt: serverTimestamp(),
        createdBy: userId,
        status: "active",
        members: { [userId]: { role: "mama", name: cleanMom, joinedAt: serverTimestamp() } },
      })
    );
    const inviteCode = await createInviteTx({
      pregnancyId: pregRef.id,
      createdBy: userId,
      babyName: cleanBaby,
      momName: cleanMom,
      week,
      dueDate,
    });
    await setDoc(doc(db, "users", userId), { role: "mama", pregnancyId: pregRef.id, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true as const, inviteCode, pregnancyId: pregRef.id };
  } catch (e) {
    throw humanize(e, PAIRING_MESSAGES.createFailed);
  }
}

const NOT_FOUND_PREVIEW: InvitePreview = { pregnancyId: "", babyName: "", status: "not_found" };

/** Vista previa antes de unirse: a qué embarazo lleva el código y si sigue vigente. No escribe nada. */
export async function previewInvite(code: string): Promise<InvitePreview> {
  const norm = normalizeInviteCode(code);
  if (!norm) return NOT_FOUND_PREVIEW;
  assertOnline();
  const uid = currentUid();
  try {
    const inv = await getDoc(doc(db, "invite_codes", norm.code));
    if (inv.exists()) {
      const d = inv.data();
      if (typeof d.pregnancyId !== "string" || !d.pregnancyId) return NOT_FOUND_PREVIEW;
      return stripUndefined({
        pregnancyId: d.pregnancyId,
        babyName: typeof d.babyName === "string" ? d.babyName : "",
        momName: typeof d.momName === "string" ? d.momName : undefined,
        week: weekFromDoc(d),
        dueDate: validDueDate(d.dueDate),
        status: inviteStatus(d, uid, Date.now()),
        expiresAt: toDate(d.expiresAt) ?? undefined,
        isOwnCode: !!uid && d.createdBy === uid,
        legacy: norm.legacy,
      });
    }
    if (!norm.legacy) return NOT_FOUND_PREVIEW;

    // FALLBACK LEGACY: códigos PANDA-XXXX guardados solo en el embarazo.
    const snap = await findLegacyPregnancies(norm.code);
    if (snap === "retired") return { ...NOT_FOUND_PREVIEW, status: "expired", legacy: true };
    if (snap.empty) return NOT_FOUND_PREVIEW;
    const pdoc = snap.docs[0];
    const data = pdoc.data();
    const members = membersFrom(data.members);
    let status: InvitePreview["status"] = "ok";
    if (snap.size > 1) status = "expired"; // código repetido entre dos embarazos: hay que pedir uno nuevo
    else if (members.some((m) => m.role === "papa" && m.uid !== uid)) status = "used";
    return stripUndefined({
      pregnancyId: pdoc.id,
      babyName: typeof data.babyName === "string" ? data.babyName : "",
      momName: typeof data.momName === "string" ? data.momName : undefined,
      week: weekFromDoc(data),
      dueDate: validDueDate(data.dueDate),
      status,
      isOwnCode: !!uid && members.some((m) => m.uid === uid && m.role === "mama"),
      legacy: true,
    });
  } catch (e) {
    throw humanize(e, PAIRING_MESSAGES.joinFailed);
  }
}

/**
 * Une al copiloto con un código. Valida en transacción (existe, no caducó, no lo usó otra persona),
 * marca el código como usado, se añade a members y guarda users/{uid}.
 * `week` es 0 si el embarazo no tiene semana confirmada (úsalo como weekUnknown). Si el embarazo
 * tiene fecha probable de parto, llegan `dueDate`/`dueDateSource` y `week` se calcula de ella.
 */
export async function joinPregnancyAsDad(
  userId: string,
  code: string,
  name?: string
): Promise<{
  success: true;
  pregnancyId: string;
  babyName: string;
  week: number;
  momName?: string;
  dueDate?: string;
  dueDateSource?: DueDateSource;
}> {
  const norm = normalizeInviteCode(code);
  if (!norm) throw new PairingError(PAIRING_MESSAGES.notFound);
  assertOnline();
  const cleanName = cleanText(name, 60);
  const userRef = doc(db, "users", userId);

  try {
    // 1) Código en invite_codes (formato nuevo).
    const inviteRef = doc(db, "invite_codes", norm.code);
    const viaInvite = await runTransaction(db, async (tx) => {
      const inv = await tx.get(inviteRef);
      if (!inv.exists()) return null;
      const d = inv.data();
      if (typeof d.pregnancyId !== "string" || !d.pregnancyId) throw new PairingError(PAIRING_MESSAGES.notFound);
      if (d.createdBy === userId) throw new PairingError(PAIRING_MESSAGES.own);
      const status = inviteStatus(d, userId, Date.now());
      if (status === "expired") throw new PairingError(PAIRING_MESSAGES.expired);
      if (status === "used") throw new PairingError(PAIRING_MESSAGES.used);

      const pregRef = doc(db, "pregnancies", d.pregnancyId);
      if (d.usedBy !== userId) tx.update(inviteRef, { usedBy: userId, usedAt: serverTimestamp() });
      tx.set(
        pregRef,
        { members: { [userId]: stripUndefined({ role: "papa", name: cleanName, joinedAt: serverTimestamp(), viaCode: norm.code }) } },
        { merge: true }
      );
      tx.set(userRef, { role: "papa", pregnancyId: d.pregnancyId, updatedAt: serverTimestamp() }, { merge: true });
      return {
        pregnancyId: d.pregnancyId as string,
        babyName: typeof d.babyName === "string" ? d.babyName : "",
        momName: typeof d.momName === "string" ? d.momName : undefined,
        week: weekFromDoc(d),
        dueDate: validDueDate(d.dueDate),
        dueDateSource: undefined as DueDateSource | undefined,
      };
    });

    let joined = viaInvite;

    // 2) FALLBACK LEGACY: PANDA-XXXX guardado solo en pregnancies.inviteCode.
    if (!joined) {
      if (!norm.legacy) throw new PairingError(PAIRING_MESSAGES.notFound);
      const snap = await findLegacyPregnancies(norm.code);
      if (snap === "retired") throw new PairingError(PAIRING_MESSAGES.expired);
      if (snap.empty) throw new PairingError(PAIRING_MESSAGES.notFound);
      if (snap.size > 1) throw new PairingError(PAIRING_MESSAGES.expired);
      const pdoc = snap.docs[0];
      const data = pdoc.data();
      const members = membersFrom(data.members);
      if (members.some((m) => m.uid === userId && m.role === "mama")) throw new PairingError(PAIRING_MESSAGES.own);
      if (members.some((m) => m.role === "papa" && m.uid !== userId)) throw new PairingError(PAIRING_MESSAGES.used);
      await setDoc(
        pdoc.ref,
        { members: { [userId]: stripUndefined({ role: "papa", name: cleanName, joinedAt: serverTimestamp(), viaCode: norm.code }) } },
        { merge: true }
      );
      await setDoc(userRef, { role: "papa", pregnancyId: pdoc.id, updatedAt: serverTimestamp() }, { merge: true });
      joined = {
        pregnancyId: pdoc.id,
        babyName: typeof data.babyName === "string" ? data.babyName : "",
        momName: typeof data.momName === "string" ? data.momName : undefined,
        week: weekFromDoc(data),
        dueDate: validDueDate(data.dueDate),
        dueDateSource: isDueDateSource(data.dueDateSource) ? data.dueDateSource : undefined,
      };
    }

    // Ya es miembro: lee los datos vigentes (semana y FPP actuales). Si falla, se queda con la copia del código.
    try {
      const fresh = await getDoc(doc(db, "pregnancies", joined.pregnancyId));
      if (fresh.exists()) {
        const f = fresh.data();
        const dating = datingFromPregnancyDoc(f);
        joined = {
          ...joined,
          babyName: typeof f.babyName === "string" ? f.babyName : joined.babyName,
          momName: typeof f.momName === "string" ? f.momName : joined.momName,
          // FPP fuera de rango: semana sin confirmar (la copia del código salió de esa misma fecha).
          week: dating.dueDateOutOfRange ? undefined : dating.week ?? joined.week,
          // El documento del embarazo es la verdad: si allí no hay FPP, no se usa la copia del código.
          dueDate: dating.dueDate,
          dueDateSource: dating.dueDateSource,
        };
      }
    } catch {
      /* sin permisos o sin red: seguimos con lo que ya sabemos */
    }

    return stripUndefined({
      success: true as const,
      pregnancyId: joined.pregnancyId,
      babyName: joined.babyName,
      momName: joined.momName,
      week: joined.week ?? 0,
      dueDate: joined.dueDate,
      dueDateSource: joined.dueDate ? joined.dueDateSource : undefined,
    });
  } catch (e) {
    throw humanize(e, PAIRING_MESSAGES.joinFailed);
  }
}

/** Nuevo código para la pareja (solo la mamá). Revoca el anterior. Devuelve el código nuevo. */
export async function regenerateInviteCode(pregnancyId: string, userId: string): Promise<string> {
  assertOnline();
  try {
    const snap = await getDoc(doc(db, "pregnancies", pregnancyId));
    if (!snap.exists()) throw new PairingError(PAIRING_MESSAGES.pregnancyMissing);
    const d = snap.data();
    const members = membersFrom(d.members);
    const me = members.find((m) => m.uid === userId);
    // Embarazos antiguos sin `members`: se permite (llama antes a ensureMembership).
    if (members.length > 0 && me?.role !== "mama") throw new PairingError(PAIRING_MESSAGES.onlyMama);
    return await createInviteTx({
      pregnancyId,
      createdBy: userId,
      babyName: typeof d.babyName === "string" ? d.babyName : undefined,
      momName: typeof d.momName === "string" ? d.momName : me?.name,
      week: weekFromDoc(d),
      dueDate: validDueDate(d.dueDate),
      oldCode: d.inviteCode,
    });
  } catch (e) {
    throw humanize(e, PAIRING_MESSAGES.regenerateFailed);
  }
}

/** Miembros del embarazo (mamá primero). Lista vacía si el documento no existe o es antiguo sin `members`. */
export function listenToMembers(pregnancyId: string, cb: (members: Member[]) => void, onError?: ErrorCallback): () => void {
  return onSnapshot(
    doc(db, "pregnancies", pregnancyId),
    (snap) => cb(snap.exists() ? membersFrom(snap.data().members) : []),
    onError ?? warnListener("members")
  );
}

/**
 * Quita a un miembro (la mamá quita al copiloto, o alguien se sale a sí mismo) y revoca el
 * código con el que entró para que no pueda volver a usarlo.
 */
export async function removeMember(pregnancyId: string, uid: string): Promise<void> {
  assertOnline();
  const pregRef = doc(db, "pregnancies", pregnancyId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pregRef);
      if (!snap.exists()) return;
      const members = snap.data().members;
      const member = isPlainObject(members) ? members[uid] : undefined;
      if (!isPlainObject(member)) return;
      const via =
        typeof member.viaCode === "string" && normalizeInviteCode(member.viaCode)?.code === member.viaCode ? member.viaCode : null;
      const invRef = via ? doc(db, "invite_codes", via) : null;
      const invSnap = invRef ? await tx.get(invRef) : null;

      tx.update(pregRef, new FieldPath("members", uid), deleteField());
      if (invRef && invSnap?.exists() && invSnap.data()?.usedBy === uid && !invSnap.data()?.revokedAt) {
        tx.update(invRef, { revokedAt: serverTimestamp() });
      }
    });
  } catch (e) {
    throw humanize(e, PAIRING_MESSAGES.removeFailed);
  }
}

/**
 * Migración de una vez para embarazos creados antes de `members` (idempotente):
 * - añade a este usuario a `members` si falta (o actualiza su nombre); nunca cambia un rol existente;
 * - si es la mamá, su código es antiguo (PANDA-XXXX) y aún no hay copiloto, le emite un código
 *   nuevo PANDA-XXXX-XXXX (pregnancies/{id}.inviteCode cambia y el listener del embarazo lo lleva
 *   a Ajustes). Los códigos de 4 caracteres NUNCA se copian a invite_codes: con ~1 millón de
 *   combinaciones se adivinan por fuerza bruta y darían acceso a datos de salud.
 *   Si ya hay copiloto, el código antiguo no hace falta y no se toca.
 * Devuelve true si escribió algo. Llamar una vez tras cargar el perfil con pregnancyId
 * (no como reacción a snapshots). Nunca lanza: si falla (sin red o sin permisos) devuelve false.
 */
export async function ensureMembership(
  pregnancyId: string,
  me: { uid: string; role: MemberRole; name?: string }
): Promise<boolean> {
  const pregRef = doc(db, "pregnancies", pregnancyId);
  const name = cleanText(me.name, 60);
  let wrote = false;

  // 1) Entrada propia en `members`.
  let myRole: MemberRole = me.role;
  try {
    wrote = await runTransaction(db, async (tx) => {
      const snap = await tx.get(pregRef);
      if (!snap.exists()) return false;
      const members = snap.data().members;
      const rawCur = isPlainObject(members) ? members[me.uid] : null;
      const cur = isPlainObject(rawCur) ? rawCur : null;
      if (cur?.role === "mama" || cur?.role === "papa") myRole = cur.role;
      if (cur && (name === undefined || cur.name === name)) return false;
      const entry = cur ? { ...cur, name } : { role: me.role, name, joinedAt: serverTimestamp() };
      tx.update(pregRef, new FieldPath("members", me.uid), stripUndefined(entry));
      return true;
    });
  } catch {
    return false; // sin red o sin permisos: se reintenta la próxima vez que abra la app
  }

  // 2) Código antiguo de la mamá sin copiloto: se reemplaza por uno nuevo (independiente del paso 1).
  if (myRole !== "mama") return wrote;
  try {
    const snap = await getDoc(pregRef);
    if (!snap.exists()) return wrote;
    const data = snap.data();
    if (!isLegacyCode(data.inviteCode)) return wrote;
    const hasPartner = membersFrom(data.members).some((m) => m.role === "papa" && m.uid !== me.uid);
    if (hasPartner) return wrote;
    await createInviteTx({
      pregnancyId,
      createdBy: me.uid,
      babyName: typeof data.babyName === "string" && data.babyName ? data.babyName : undefined,
      momName: typeof data.momName === "string" && data.momName ? data.momName : name,
      week: weekFromDoc(data),
      dueDate: validDueDate(data.dueDate),
      oldCode: data.inviteCode,
      onlyIfCurrent: data.inviteCode as string,
    });
    return true;
  } catch {
    return wrote;
  }
}

// =====================================================================================
// Datos compartidos del embarazo
// =====================================================================================

/**
 * Semana elegida A MANO para los dos teléfonos. Quita la fecha probable de parto si la había
 * (si no, la FPP volvería a mandar en el otro teléfono) y deja la marca dueDateUpdatedAt para
 * que el listener sepa que se quitó a propósito. En local usa profilePatchForManualWeek.
 */
export async function updatePregnancyWeek(pregnancyId: string, week: number, by?: { uid: string; name?: string }) {
  const ref = doc(db, "pregnancies", pregnancyId);
  await updateDoc(ref, {
    week,
    dueDate: deleteField(),
    dueDateSource: deleteField(),
    dueDateUpdatedAt: serverTimestamp(),
    dueDateUpdatedBy: by?.uid ?? deleteField(),
    dueDateUpdatedByName: cleanText(by?.name, 60) ?? deleteField(),
  });
}

/**
 * Fecha probable de parto compartida (pregnancies/{id}: dueDate, dueDateSource,
 * dueDateUpdatedAt/By/ByName). Actualiza también `week` (calculada hoy) para las versiones que
 * solo leen la semana. Valida el formato "aaaa-mm-dd"; el rango (2 a 42+6 semanas) lo valida la
 * UI con validateDueDate. Llamar solo desde manejadores de eventos. Firestore la encola sin red.
 */
export async function saveDueDate(
  pregnancyId: string,
  dueDate: string,
  source: DueDateSource,
  by?: { uid: string; name?: string }
): Promise<void> {
  const iso = validDueDate(dueDate);
  if (!iso) throw new TypeError("dueDate debe ser una fecha válida con formato aaaa-mm-dd");
  if (!isDueDateSource(source)) throw new TypeError("source debe ser 'eco', 'fum' o 'manual'");
  const week = weekFromDueDateISO(iso);
  await updateDoc(
    doc(db, "pregnancies", pregnancyId),
    stripUndefined({
      dueDate: iso,
      dueDateSource: source,
      dueDateUpdatedAt: serverTimestamp(),
      dueDateUpdatedBy: by?.uid ?? deleteField(),
      dueDateUpdatedByName: cleanText(by?.name, 60) ?? deleteField(),
      week,
    })
  );
}

export async function saveMomStatus(pregnancyId: string, statusText: string, emoji: string) {
  const statusRef = doc(collection(db, "pregnancies", pregnancyId, "status_logs"));
  await setDoc(statusRef, {
    statusText,
    emoji,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// REALTIME LISTENERS
/**
 * Documento del embarazo (solo si existe). `data` llega tal cual (incluye dueDate/dueDateSource);
 * `dating` es su datación ya validada: FPP, si se quitó a propósito y la semana vigente.
 * Para volcarlo al perfil local usa remoteDatingPatch (src/lib/pregnancy.ts).
 */
export function listenToPregnancy(
  pregnancyId: string,
  callback: (data: LegacyData, dating: PregnancyDating) => void,
  onError?: ErrorCallback
) {
  const ref = doc(db, "pregnancies", pregnancyId);
  return onSnapshot(
    ref,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback(data, datingFromPregnancyDoc(data));
      }
    },
    onError ?? warnListener("pregnancy")
  );
}

/** Último estado de la mamá. Solo llama cuando hay alguno. updatedAt es null si no se pudo leer. */
/**
 * Último estado de mamá. `callback` solo se llama cuando hay estado; `onMeta` en cada snapshot
 * (`empty` y `fromCache`) para distinguir "aún no hay estado" de "el servidor aún no respondió".
 */
export function listenToMomStatus(
  pregnancyId: string,
  callback: (status: MomStatus) => void,
  onError?: ErrorCallback,
  onMeta?: (meta: { empty: boolean; fromCache: boolean }) => void
) {
  const logsRef = collection(db, "pregnancies", pregnancyId, "status_logs");
  const q = query(logsRef, orderBy("createdAt", "desc"), limit(1));
  return onSnapshot(
    q,
    (snapshot) => {
      onMeta?.({ empty: snapshot.empty, fromCache: snapshot.metadata.fromCache });
      if (!snapshot.empty) {
        const d = snapshot.docs[0].data({ serverTimestamps: "estimate" });
        const createdAt = toDate(d.createdAt);
        callback({
          statusText: typeof d.statusText === "string" ? d.statusText : "",
          emoji: typeof d.emoji === "string" ? d.emoji : "",
          createdAt,
          updatedAt: toDate(d.updatedAt) ?? createdAt,
        });
      }
    },
    onError ?? warnListener("mom_status")
  );
}

// --- JOURNAL (Diario de a Dos) ---
export async function addJournalEntry(pregnancyId: string, authorRole: string, authorName: string, text: string, tag?: string, mood?: string) {
  const ref = doc(collection(db, "pregnancies", pregnancyId, "journal"));
  await setDoc(ref, {
    authorRole,
    authorName,
    authorUid: currentUid(),
    text,
    tag: tag || null,
    mood: mood || null,
    createdAt: serverTimestamp()
  });
}

/**
 * Traspaso de recuerdos escritos "Solo en este teléfono" al diario compartido (al vincular).
 * Id determinista (`local-{id}`) para que repetir el traspaso no duplique; conserva la fecha original.
 */
export async function importJournalEntries(
  pregnancyId: string,
  entries: Array<{ id: string; authorRole?: string; authorName?: string; text: string; tag?: string | null; mood?: string | null; createdAt?: number }>
): Promise<void> {
  const uid = currentUid();
  await Promise.all(
    entries.map((e) => {
      const safeId = `local-${String(e.id).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60) || "x"}`;
      const at = typeof e.createdAt === "number" && Number.isFinite(e.createdAt) && e.createdAt > 1e11 ? Timestamp.fromMillis(e.createdAt) : null;
      return setDoc(doc(db, "pregnancies", pregnancyId, "journal", safeId), {
        authorRole: e.authorRole ?? null,
        authorName: e.authorName ?? null,
        authorUid: uid,
        text: e.text,
        tag: e.tag || null,
        mood: e.mood || null,
        createdAt: at ?? serverTimestamp(),
      });
    })
  );
}

export async function deleteJournalEntry(pregnancyId: string, entryId: string) {
  const ref = doc(db, "pregnancies", pregnancyId, "journal", entryId);
  await deleteDoc(ref);
}

export function listenToJournal(pregnancyId: string, callback: (entries: LegacyData[]) => void, onError?: ErrorCallback) {
  const ref = collection(db, "pregnancies", pregnancyId, "journal");
  const q = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
      callback(entries);
    },
    onError ?? warnListener("journal")
  );
}

// --- CUSTOM TASKS ---
export async function addCustomTask(pregnancyId: string, text: string, trimester: number) {
  const ref = doc(collection(db, "pregnancies", pregnancyId, "tasks"));
  await setDoc(ref, {
    text,
    trimester,
    completed: false,
    createdAt: serverTimestamp()
  });
}

export async function toggleCustomTask(pregnancyId: string, taskId: string, completed: boolean) {
  const ref = doc(db, "pregnancies", pregnancyId, "tasks", taskId);
  await updateDoc(ref, { completed });
}

export function listenToCustomTasks(pregnancyId: string, callback: (tasks: LegacyData[]) => void, onError?: ErrorCallback) {
  const ref = collection(db, "pregnancies", pregnancyId, "tasks");
  return onSnapshot(
    ref,
    (snapshot) => {
      const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(tasks);
    },
    onError ?? warnListener("tasks")
  );
}

// --- GO BAG (Maleta) ---
export async function toggleGoBagItem(pregnancyId: string, itemId: string, checked: boolean) {
  const ref = doc(collection(db, "pregnancies", pregnancyId, "gobag"), itemId);
  await setDoc(ref, { checked, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToGoBag(pregnancyId: string, callback: (items: LegacyData) => void, onError?: ErrorCallback) {
  const ref = collection(db, "pregnancies", pregnancyId, "gobag");
  return onSnapshot(
    ref,
    (snapshot) => {
      const bag: Record<string, boolean> = {};
      snapshot.docs.forEach((d) => {
        bag[d.id] = d.data().checked;
      });
      callback(bag);
    },
    onError ?? warnListener("gobag")
  );
}

// =====================================================================================
// Arrays compartidos (citas, patadas, contracciones, presupuesto)
// Ruta: pregnancies/{id}/shared_data/{docName} → { items: [...], updatedAt }
// =====================================================================================

export type SharedArrayDoc = "events" | "kick_sessions" | "contractions" | "budget";

/**
 * Read-modify-write en transacción sobre pregnancies/{id}/shared_data/{docName}.{field}
 * (la misma ruta que leen los listeners). Dos teléfonos editando a la vez no se pisan:
 * `fn` se aplica sobre la versión del servidor. `fn` debe ser PURA (puede ejecutarse
 * varias veces si hay contención) y recibe una copia. Si el resultado es idéntico no escribe.
 * Sin conexión la promesa espera a reconectar; un error real se propaga (revertir + "Reintentar").
 */
export async function mutateSharedArray<T extends { id: string | number }>(
  pregnancyId: string,
  docName: SharedArrayDoc,
  field: string,
  fn: (items: T[]) => T[]
): Promise<T[]> {
  const ref = sharedRef(pregnancyId, docName);
  return withReconnect(() =>
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const raw = snap.exists() ? snap.data()?.[field] : undefined;
      const current = (Array.isArray(raw) ? raw : []) as T[];
      const next = fn(current.slice());
      if (!Array.isArray(next)) throw new TypeError("mutateSharedArray: fn debe devolver un array");
      const clean = stripUndefined(next);
      if (snap.exists() && JSON.stringify(clean) === JSON.stringify(current)) return current;
      tx.set(ref, { [field]: clean, updatedAt: serverTimestamp() }, { merge: true });
      return clean;
    })
  );
}

export const mutateEvents = <T extends { id: string | number }>(pregnancyId: string, fn: (items: T[]) => T[]) =>
  mutateSharedArray<T>(pregnancyId, "events", "items", fn);
export const mutateKickSessions = <T extends { id: string | number }>(pregnancyId: string, fn: (items: T[]) => T[]) =>
  mutateSharedArray<T>(pregnancyId, "kick_sessions", "items", fn);
export const mutateContractions = <T extends { id: string | number }>(pregnancyId: string, fn: (items: T[]) => T[]) =>
  mutateSharedArray<T>(pregnancyId, "contractions", "items", fn);
export const mutateBudgetItems = <T extends { id: string | number }>(pregnancyId: string, fn: (items: T[]) => T[]) =>
  mutateSharedArray<T>(pregnancyId, "budget", "items", fn);

// --- EVENTS / AGENDA (citas médicas) ---
/** @deprecated Reemplaza el array completo y puede pisar cambios de la pareja: usa mutateEvents. */
export async function saveEvents(pregnancyId: string, events: LegacyData[]) {
  const ref = sharedRef(pregnancyId, "events");
  await setDoc(ref, { items: stripUndefined(events), updatedAt: serverTimestamp() }, { merge: true });
}

/** Llama siempre (también sin documento → []), con metadatos como 2º argumento. */
export function listenToEvents(pregnancyId: string, callback: (events: LegacyData[], meta: SharedDocMeta) => void, onError?: ErrorCallback) {
  return listenSharedDoc(pregnancyId, "events", (data, meta) => callback(arrayField(data), meta), onError);
}

// --- KICK SESSIONS (Monitor de Patadas) ---
/** @deprecated Usa mutateKickSessions. */
export async function saveKickSessions(pregnancyId: string, sessions: LegacyData[]) {
  const ref = sharedRef(pregnancyId, "kick_sessions");
  await setDoc(ref, { items: stripUndefined(sessions), updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToKickSessions(pregnancyId: string, callback: (sessions: LegacyData[], meta: SharedDocMeta) => void, onError?: ErrorCallback) {
  return listenSharedDoc(pregnancyId, "kick_sessions", (data, meta) => callback(arrayField(data), meta), onError);
}

// --- CONTRACTIONS HISTORY ---
/** @deprecated Usa mutateContractions. */
export async function saveContractions(pregnancyId: string, history: LegacyData[]) {
  const ref = sharedRef(pregnancyId, "contractions");
  await setDoc(ref, { items: stripUndefined(history), updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToContractions(pregnancyId: string, callback: (history: LegacyData[], meta: SharedDocMeta) => void, onError?: ErrorCallback) {
  return listenSharedDoc(pregnancyId, "contractions", (data, meta) => callback(arrayField(data), meta), onError);
}

// --- BUDGET (Presupuesto) ---
/** @deprecated Usa mutateBudgetItems. */
export async function saveBudget(pregnancyId: string, budgetItems: LegacyData[]) {
  const ref = sharedRef(pregnancyId, "budget");
  await setDoc(ref, { items: stripUndefined(budgetItems), updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToBudget(pregnancyId: string, callback: (items: LegacyData[], meta: SharedDocMeta) => void, onError?: ErrorCallback) {
  return listenSharedDoc(pregnancyId, "budget", (data, meta) => callback(arrayField(data), meta), onError);
}

/** Tope del presupuesto compartido (campo `cap` del mismo documento shared_data/budget). */
export async function saveBudgetCap(pregnancyId: string, cap: number): Promise<void> {
  if (!Number.isFinite(cap) || cap < 0) throw new RangeError("El tope debe ser un número positivo");
  await setDoc(sharedRef(pregnancyId, "budget"), { cap: Math.round(cap), capUpdatedAt: serverTimestamp() }, { merge: true });
}

/** null si no hay tope guardado (la UI decide cómo pedirlo; no inventes uno). */
/** `meta.fromCache && !meta.exists` = aún sin respuesta del servidor: no es "sin tope". */
export function listenToBudgetCap(
  pregnancyId: string,
  cb: (cap: number | null, meta: SharedDocMeta) => void,
  onError?: ErrorCallback
): () => void {
  return listenSharedDoc(
    pregnancyId,
    "budget",
    (data, meta) => {
      const cap = data?.cap;
      cb(typeof cap === "number" && Number.isFinite(cap) && cap >= 0 ? cap : null, meta);
    },
    onError
  );
}

// --- BIRTH PLAN (Plan de Parto) ---
export async function saveBirthPlan(pregnancyId: string, patient: LegacyData, sections: LegacyData[]) {
  const ref = sharedRef(pregnancyId, "birth_plan");
  await setDoc(ref, { patient: stripUndefined(patient ?? {}), sections: stripUndefined(sections ?? []), updatedAt: serverTimestamp() }, { merge: true });
}

/** Llama siempre (sin documento → patient {} y sections []). */
export function listenToBirthPlan(
  pregnancyId: string,
  callback: (data: { patient: LegacyData; sections: LegacyData[] }, meta: SharedDocMeta) => void,
  onError?: ErrorCallback
) {
  return listenSharedDoc(
    pregnancyId,
    "birth_plan",
    (data, meta) => callback({ patient: data?.patient || {}, sections: arrayField(data, "sections") }, meta),
    onError
  );
}

// =====================================================================================
// Checklist por ítem
// Ruta: shared_data/checklist_progress → { items: { [taskId]: 'completed'|'dismissed' (o true antiguo) },
//                                          meta: { [taskId]: { by, byName, at } },
//                                          owners: { [taskId]: 'mama'|'papa'|'ambos' },
//                                          ownersMeta: { [taskId]: { by, byName, at } }, updatedAt }
// =====================================================================================

/** @deprecated Reemplaza todo el progreso: usa setChecklistItem. */
export async function saveChecklistProgress(pregnancyId: string, progress: Record<string, boolean>) {
  const ref = sharedRef(pregnancyId, "checklist_progress");
  await setDoc(ref, { items: progress, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Marca (o desmarca con null) una tarea sin tocar las demás. Firestore la encola si no hay red.
 */
export async function setChecklistItem(
  pregnancyId: string,
  taskId: string | number,
  status: ChecklistStatus | null,
  by?: { uid: string; name?: string }
): Promise<void> {
  const k = String(taskId);
  if (!k) throw new TypeError("taskId vacío");
  await setDoc(
    sharedRef(pregnancyId, "checklist_progress"),
    {
      items: { [k]: status ?? deleteField() },
      meta: { [k]: status ? stripUndefined({ by: by?.uid, byName: cleanText(by?.name, 60), at: serverTimestamp() }) : deleteField() },
      updatedAt: serverTimestamp(),
    },
    { mergeFields: [new FieldPath("items", k), new FieldPath("meta", k), "updatedAt"] }
  );
}

/**
 * Dueño reasignado de una tarea (owners.{taskId}) sin tocar las demás ni el progreso. `null`
 * vuelve al dueño de catálogo. Guarda quién lo cambió (ownersMeta.{taskId}). Firestore la encola
 * si no hay red. Solo desde manejadores de eventos. Sin vínculo: writeLocalTaskOwner (tasks.ts).
 */
export async function setTaskOwner(
  pregnancyId: string,
  taskId: string | number,
  owner: TaskOwner | null,
  by?: { uid: string; name?: string }
): Promise<void> {
  const k = String(taskId);
  if (!k) throw new TypeError("taskId vacío");
  if (owner !== null && !isTaskOwner(owner)) throw new TypeError("owner debe ser 'mama', 'papa' o 'ambos'");
  await setDoc(
    sharedRef(pregnancyId, "checklist_progress"),
    {
      owners: { [k]: owner ?? deleteField() },
      ownersMeta: { [k]: owner ? stripUndefined({ by: by?.uid, byName: cleanText(by?.name, 60), at: serverTimestamp() }) : deleteField() },
      updatedAt: serverTimestamp(),
    },
    { mergeFields: [new FieldPath("owners", k), new FieldPath("ownersMeta", k), "updatedAt"] }
  );
}

function metaMap(raw: unknown, keep?: (k: string) => boolean): ChecklistMeta {
  const out: ChecklistMeta = {};
  if (!isPlainObject(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!isPlainObject(v) || (keep && !keep(k))) continue;
    out[k] = stripUndefined({
      by: typeof v.by === "string" ? v.by : undefined,
      byName: typeof v.byName === "string" ? v.byName : undefined,
      at: toDate(v.at) ?? undefined,
    });
  }
  return out;
}

/**
 * Llama siempre (sin documento → {}). `true` (formato antiguo) equivale a 'completed'.
 * 4º argumento: dueños reasignados (owners) y quién los cambió (ownersMeta).
 */
export function listenToChecklistProgress(
  pregnancyId: string,
  callback: (progress: ChecklistProgress, meta: ChecklistMeta, docMeta: SharedDocMeta, owners: ChecklistOwners) => void,
  onError?: ErrorCallback
) {
  return listenSharedDoc(
    pregnancyId,
    "checklist_progress",
    (data, docMeta) => {
      const progress: ChecklistProgress = {};
      const rawItems = data?.items;
      if (isPlainObject(rawItems)) {
        for (const [k, v] of Object.entries(rawItems)) {
          if (v === true || v === "completed" || v === "dismissed") progress[k] = v;
        }
      }
      const meta = metaMap(data?.meta, (k) => k in progress);
      const owners = sanitizeTaskOwners(data?.owners);
      const ownersMeta = metaMap(data?.ownersMeta, (k) => k in owners);
      callback(progress, meta, docMeta, { owners, ownersMeta });
    },
    onError
  );
}

// =====================================================================================
// Preparación de cita por ítem
// Ruta: shared_data/prep_{eventId} → { items: { [texto]: bool }, questions: { [texto]: bool }, updatedAt }
// =====================================================================================

function prepDocName(eventId: string | number) {
  return "prep_" + String(eventId).replace(/\//g, "_");
}

/** @deprecated Reemplaza ambos mapas: usa setAppointmentPrepItem. */
export async function saveAppointmentPrep(pregnancyId: string, eventId: string, data: { items: Record<string, boolean>, questions: Record<string, boolean> }) {
  const ref = sharedRef(pregnancyId, prepDocName(eventId));
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/** Marca un ítem ("qué llevar") o una pregunta sin tocar los demás. La clave es el texto del ítem. */
export async function setAppointmentPrepItem(
  pregnancyId: string,
  eventId: string | number,
  kind: "items" | "questions",
  key: string,
  checked: boolean
): Promise<void> {
  if (!key) throw new TypeError("key vacía");
  await setDoc(
    sharedRef(pregnancyId, prepDocName(eventId)),
    { [kind]: { [key]: !!checked }, updatedAt: serverTimestamp() },
    { mergeFields: [new FieldPath(kind, key), "updatedAt"] }
  );
}

/** Llama siempre (sin documento → mapas vacíos). */
export function listenToAppointmentPrep(
  pregnancyId: string,
  eventId: string | number,
  callback: (data: { items: Record<string, boolean>; questions: Record<string, boolean> }, meta: SharedDocMeta) => void,
  onError?: ErrorCallback
) {
  const bools = (v: unknown): Record<string, boolean> => {
    const out: Record<string, boolean> = {};
    if (isPlainObject(v)) for (const [k, b] of Object.entries(v)) if (typeof b === "boolean") out[k] = b;
    return out;
  };
  return listenSharedDoc(
    pregnancyId,
    prepDocName(eventId),
    (data, meta) => callback({ items: bools(data?.items), questions: bools(data?.questions) }, meta),
    onError
  );
}

// =====================================================================================
// Nombres v2: pregnancies/{id}/baby_names/{nameId} con votos por persona
// =====================================================================================

// --- Formato antiguo (un array con un único `status` compartido) ---
/** @deprecated Formato antiguo: usa addBabyName / voteBabyName. */
export async function saveBabyNames(pregnancyId: string, names: LegacyData[]) {
  const ref = sharedRef(pregnancyId, "baby_names");
  await setDoc(ref, { items: stripUndefined(names), updatedAt: serverTimestamp() }, { merge: true });
}

/** @deprecated Formato antiguo: usa listenToBabyNamesV2. */
export function listenToBabyNames(pregnancyId: string, callback: (names: LegacyData[]) => void, onError?: ErrorCallback) {
  return listenSharedDoc(pregnancyId, "baby_names", (data) => callback(arrayField(data)), onError);
}

function namesCol(pregnancyId: string) {
  return collection(db, "pregnancies", pregnancyId, "baby_names");
}

/** Clave para comparar nombres: sin acentos, minúsculas, espacios simples ("Lucía" ≡ "lucia"). */
export function babyNameKey(name: string): string {
  if (typeof name !== "string") return "";
  return repairMojibake(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Id de documento estable por nombre: dos teléfonos que agregan "Lucía" crean el mismo documento. */
function nameDocId(name: string): string {
  const slug = babyNameKey(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return slug ? `n-${slug}` : "";
}

function normalizeGender(g: unknown): BabyName["gender"] {
  if (typeof g !== "string") return undefined;
  const k = babyNameKey(g);
  if (k === "nino" || k === "m" || k === "masculino") return "nino";
  if (k === "nina" || k === "f" || k === "femenino") return "nina";
  if (k === "unisex" || k === "neutro") return "unisex";
  return undefined;
}

function toBabyName(id: string, d: DocumentData): BabyName | null {
  const name = cleanText(d.name, 60);
  if (!name) return null;
  const votes: Record<string, "like" | "nope"> = {};
  if (isPlainObject(d.votes)) {
    for (const [uid, v] of Object.entries(d.votes)) if (v === "like" || v === "nope") votes[uid] = v;
  }
  const source = d.source === "user" || d.source === "ai" || d.source === "suggestion" ? d.source : undefined;
  return stripUndefined({
    id,
    name,
    gender: normalizeGender(d.gender),
    origin: cleanText(d.origin),
    meaning: cleanText(d.meaning, 400),
    addedBy: typeof d.addedBy === "string" ? d.addedBy : undefined,
    addedByName: cleanText(d.addedByName, 60),
    source,
    createdAt: toDate(d.createdAt) ?? undefined,
    votes,
  });
}

/** Lista de nombres ordenada por fecha de alta. Llama siempre (sin nombres → []). */
export function listenToBabyNamesV2(pregnancyId: string, cb: (names: BabyName[]) => void, onError?: ErrorCallback): () => void {
  return onSnapshot(
    namesCol(pregnancyId),
    (snap) => {
      const list = snap.docs
        .map((d) => toBabyName(d.id, d.data({ serverTimestamps: "estimate" })))
        .filter((n): n is BabyName => n !== null)
        .sort((a, b) => {
          const ta = a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const tb = b.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return ta - tb || a.name.localeCompare(b.name, "es");
        });
      cb(list);
    },
    onError ?? warnListener("baby_names")
  );
}

/**
 * Agrega un nombre (sin votos). Si ya existe el mismo nombre (ignorando acentos/mayúsculas)
 * no lo duplica ni borra sus votos: devuelve el id existente.
 */
export async function addBabyName(pregnancyId: string, data: Omit<BabyName, "id" | "votes" | "createdAt">): Promise<string> {
  const name = cleanText(data.name, 60);
  if (!name) throw new PairingError("Escribe un nombre para agregarlo.");
  const payload = stripUndefined({
    name,
    gender: normalizeGender(data.gender),
    origin: cleanText(data.origin),
    meaning: cleanText(data.meaning, 400),
    addedBy: data.addedBy,
    addedByName: cleanText(data.addedByName, 60),
    source: data.source ?? "user",
    createdAt: serverTimestamp(),
    votes: {},
  });
  const id = nameDocId(name);
  if (!id) {
    const ref = doc(namesCol(pregnancyId));
    await setDoc(ref, payload);
    return ref.id;
  }
  const ref = doc(namesCol(pregnancyId), id);
  await withReconnect(() =>
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) tx.set(ref, payload);
    })
  );
  return id;
}

/** Voto de UNA persona (votes.{uid}); null lo retira. No toca el voto de la pareja. */
export async function voteBabyName(pregnancyId: string, nameId: string, uid: string, vote: "like" | "nope" | null): Promise<void> {
  if (!uid) throw new TypeError("uid requerido para votar");
  if (vote !== null && vote !== "like" && vote !== "nope") throw new TypeError("voto inválido");
  await updateDoc(doc(namesCol(pregnancyId), nameId), new FieldPath("votes", uid), vote ?? deleteField(), "updatedAt", serverTimestamp());
}

export async function deleteBabyName(pregnancyId: string, nameId: string): Promise<void> {
  await deleteDoc(doc(namesCol(pregnancyId), nameId));
}

/**
 * Migración de una vez: pasa los nombres del documento antiguo (shared_data/baby_names.items)
 * a la subcolección, SIN votos (el `status` antiguo no dice quién votó) y omitiendo `seedNames`.
 * Marca el documento antiguo con migratedToV2: true. Idempotente y segura con dos teléfonos a la vez.
 */
export async function migrateLegacyBabyNames(pregnancyId: string, seedNames: readonly string[]): Promise<void> {
  const legacyRef = sharedRef(pregnancyId, "baby_names");
  const seedKeys = new Set(seedNames.map(babyNameKey));
  await withReconnect(() =>
    runTransaction(db, async (tx) => {
      const snap = await tx.get(legacyRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.migratedToV2) return;

      const seen = new Set<string>();
      const pending: { ref: DocumentReference; payload: Record<string, unknown> }[] = [];
      for (const item of arrayField(data)) {
        if (!isPlainObject(item)) continue;
        const name = cleanText(item.text ?? item.name, 60);
        if (!name) continue;
        const k = babyNameKey(name);
        if (seedKeys.has(k) || seen.has(k)) continue;
        seen.add(k);
        const id = nameDocId(name);
        if (!id) continue;
        pending.push({
          ref: doc(namesCol(pregnancyId), id),
          payload: stripUndefined({
            name,
            gender: normalizeGender(item.gender),
            origin: cleanText(item.origin),
            meaning: cleanText(item.meaning, 400),
            source: "ai", // en el formato antiguo solo había semillas y nombres sugeridos por PandaIA
            createdAt: serverTimestamp(),
            votes: {},
            migratedFrom: "legacy",
          }),
        });
        if (pending.length >= 400) break; // margen bajo el límite de 500 escrituras por transacción
      }

      // Todas las lecturas antes de escribir (regla de las transacciones).
      const existing: boolean[] = [];
      for (const p of pending) existing.push((await tx.get(p.ref)).exists());
      pending.forEach((p, i) => {
        if (!existing[i]) tx.set(p.ref, p.payload);
      });
      tx.update(legacyRef, { migratedToV2: true, migratedAt: serverTimestamp() });
    })
  );
}

/**
 * Match real. Con roles (pasa los `Member`): hace falta un 'like' de la mamá y uno del copiloto,
 * así dos uids de la misma persona (p. ej. un teléfono reinstalado) nunca forman match solos.
 * Solo con uids: al menos 2 miembros distintos votaron 'like' (con 2 miembros, ambos).
 */
export function isMatch(
  name: Pick<BabyName, "votes">,
  members: ReadonlyArray<string | { uid: string; role?: MemberRole }>
): boolean {
  if (!name?.votes) return false;
  const byUid = new Map<string, MemberRole | undefined>();
  for (const m of members) {
    const uid = typeof m === "string" ? m : m?.uid;
    if (!uid || byUid.has(uid)) continue;
    byUid.set(uid, typeof m === "string" ? undefined : m.role);
  }
  if (byUid.size < 2) return false;
  const likers = Array.from(byUid.entries()).filter(([uid]) => name.votes[uid] === "like");
  const withRoles = Array.from(byUid.values()).every((r) => r === "mama" || r === "papa");
  if (withRoles) return likers.some(([, r]) => r === "mama") && likers.some(([, r]) => r === "papa");
  return likers.length >= 2;
}

// =====================================================================================
// Abrazos virtuales: pregnancies/{id}/nudges
// =====================================================================================

export async function sendNudge(
  pregnancyId: string,
  from: { uid: string; name?: string; role: MemberRole },
  kind: "hug"
): Promise<void> {
  const ref = doc(collection(db, "pregnancies", pregnancyId, "nudges"));
  await setDoc(
    ref,
    stripUndefined({ fromUid: from.uid, fromName: cleanText(from.name, 60), fromRole: from.role, kind, createdAt: serverTimestamp() })
  );
}

/**
 * Abrazos de la OTRA persona posteriores a `since` (cada uno se entrega una sola vez).
 * Memoiza `since` (useRef) para no perder ni repetir abrazos al volver a suscribirte.
 */
export function listenToNudges(
  pregnancyId: string,
  myUid: string,
  since: Date,
  cb: (n: Nudge) => void,
  onError?: ErrorCallback
): () => void {
  const seen = new Set<string>();
  const q = query(
    collection(db, "pregnancies", pregnancyId, "nudges"),
    where("createdAt", ">", Timestamp.fromDate(since)),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(
    q,
    (snap) => {
      const fresh: Nudge[] = [];
      for (const change of snap.docChanges()) {
        if (change.type === "removed") continue;
        const id = change.doc.id;
        if (seen.has(id)) continue;
        const d = change.doc.data({ serverTimestamps: "estimate" });
        if (!d.fromUid || d.fromUid === myUid) continue;
        const createdAt = toDate(d.createdAt);
        if (!createdAt || createdAt.getTime() <= since.getTime()) continue;
        seen.add(id);
        fresh.push({
          id,
          fromName: typeof d.fromName === "string" ? d.fromName : undefined,
          fromRole: typeof d.fromRole === "string" ? d.fromRole : "",
          kind: typeof d.kind === "string" ? d.kind : "hug",
          createdAt,
        });
      }
      fresh.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).forEach(cb);
    },
    onError ?? warnListener("nudges")
  );
}

// =====================================================================================
// CARE TEAM (obstetra, hospital y número de emergencias; compartido mamá/copiloto)
// =====================================================================================
// Se sobrescribe el documento completo (sin merge) para que un campo borrado
// por uno de los dos también desaparezca en el otro dispositivo.
export async function saveCareTeam(pregnancyId: string, ct: CareTeam) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "care_team");
  await setDoc(ref, { ...sanitizeCareTeam(ct), updatedAt: serverTimestamp() });
}

export function listenToCareTeam(pregnancyId: string, callback: (ct: CareTeam) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "care_team");
  return onSnapshot(
    ref,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(sanitizeCareTeam(docSnap.data()));
      }
    },
    () => { /* sin conexión o sin permisos: se conserva la copia local */ }
  );
}
