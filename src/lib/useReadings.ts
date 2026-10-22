"use client";

/**
 * «Leído» de las lecturas (src/lib/lecturas.ts): cada persona marca lo suyo y, con vínculo, la pareja lo ve.
 * - Con vínculo: shared_data/readings (listenToReadings / setReadingRead). Hasta el primer dato del servidor
 *   no se afirma «sin leer»: `readByMe` devuelve undefined y la fila muestra el hueco de la casilla.
 * - Sin vínculo: este teléfono (localStorage), en un store común: «Hoy» y Lecturas están montadas a la vez.
 * - Escrituras solo desde el toque (toggle); el listener solo actualiza el estado. Al vincular, lo marcado
 *   «solo en este teléfono» se traspasa una vez (marcado), como las tareas.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  currentUid,
  listenToReadings,
  setReadingRead,
  type MemberRole,
  type ReadingMark,
  type ReadingReads,
} from "@/lib/firebase/pairing";
import { linkedFromLocalKey, localToSharedFlag } from "@/lib/seeds";

export const LOCAL_READINGS_KEY = "pandajr_readings_local";

type LocalReads = Record<string, number>;
const EMPTY: LocalReads = {};

// --- Store local (sin vínculo) ---------------------------------------------------------------------
let localCache: LocalReads | null = null;
/** El texto guardado del que salió la caché: si lo guardado cambia por fuera (otra pestaña, un borrado), se relee. */
let localRaw: string | null = null;
const listeners = new Set<() => void>();

function sanitizeLocal(v: unknown): LocalReads {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: LocalReads = {};
  for (const [k, at] of Object.entries(v as Record<string, unknown>)) {
    if (k && k.length <= 80 && typeof at === "number" && Number.isFinite(at)) out[k] = at;
  }
  return out;
}

/** Lo leído en este teléfono (sin vínculo). Mismo objeto mientras no cambie (para useSyncExternalStore). */
export function readLocalReadings(): LocalReads {
  let raw: string | null;
  try {
    raw = typeof window === "undefined" ? null : window.localStorage.getItem(LOCAL_READINGS_KEY);
  } catch {
    raw = localRaw; // sin acceso al almacenamiento: lo que hay en memoria
  }
  if (localCache && raw === localRaw) return localCache;
  localRaw = raw;
  try {
    localCache = raw ? sanitizeLocal(JSON.parse(raw)) : {};
  } catch {
    localCache = {};
  }
  return localCache;
}

function writeLocalReadings(next: LocalReads) {
  const json = JSON.stringify(next);
  let stored: string | null = json;
  try {
    window.localStorage.setItem(LOCAL_READINGS_KEY, json);
  } catch {
    // Modo privado: queda en memoria hasta recargar (la caché se compara con lo que sigue guardado).
    try {
      stored = window.localStorage.getItem(LOCAL_READINGS_KEY);
    } catch {
      stored = localRaw;
    }
  }
  localCache = next;
  localRaw = stored;
  listeners.forEach((l) => l());
}

/** Marca o desmarca en este teléfono (desde el toque). */
function setLocalRead(id: string, read: boolean) {
  const copy = { ...readLocalReadings() };
  if (read) copy[id] = Date.now();
  else delete copy[id];
  writeLocalReadings(copy);
}

function subscribeLocal(listener: () => void) {
  listeners.add(listener);
  // Otra pestaña con la app abierta también marca.
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_READINGS_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
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
    /* sin almacenamiento: el traspaso es idempotente y se repetirá sin efecto */
  }
}

// --- Hook ----------------------------------------------------------------------------------------------

export type ReadingsState = {
  /** Con vínculo: ya llegó el dato del servidor. Sin vínculo: siempre. */
  loaded: boolean;
  /** La lectura falló (sin acceso, sin red al abrir): se dice y se puede reintentar. */
  failed: boolean;
  retryLoad: () => void;
  /** ¿Lo leyó quien usa este teléfono? undefined mientras no se sabe (no se afirma «sin leer»). */
  readByMe: (id: string) => boolean | undefined;
  /** La marca de la pareja, si lo leyó (solo con vínculo). */
  partnerRead: (id: string) => ReadingMark | null;
  /** Marca o desmarca lo propio. Solo desde un toque. */
  toggle: (id: string) => void;
};

export function useReadings({
  pid,
  myUid,
  name,
  role,
  active = true,
  onWriteError,
}: {
  pid?: string;
  /** uid de este teléfono (usePartner); sin él, con vínculo, no se sabe qué es «mío». */
  myUid: string | null;
  name?: string;
  role: MemberRole;
  /** Solo escucha mientras está a la vista (como el índice de Juntos). */
  active?: boolean;
  /** La marca no se guardó (ya se deshizo en pantalla): `retry` la vuelve a intentar. */
  onWriteError?: (id: string, retry: () => void) => void;
}): ReadingsState {
  const local = useSyncExternalStore(subscribeLocal, readLocalReadings, () => EMPTY);
  const [remote, setRemote] = useState<{ pid: string; reads: ReadingReads } | null>(null);
  // Lo que acabo de tocar, hasta que Firestore lo confirma (la casilla responde al instante).
  const [overlay, setOverlay] = useState<Record<string, boolean>>({});
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState<{ pid: string; attempt: number } | null>(null);

  useEffect(() => {
    if (!pid || !active) return;
    let migrated = false;
    return listenToReadings(
      pid,
      (reads, meta) => {
        // Sin red y sin nada en caché no es «nada leído»: es «no se sabe» (se espera al servidor).
        if (meta.fromCache && !meta.exists) return;
        setRemote({ pid, reads });
        if (migrated || meta.fromCache) return;
        migrated = true;
        // Traspaso único al vincular: lo leído «solo en este teléfono» pasa a lo compartido, a nombre de
        // quien lo marcó, sin tocar lo que ya estaba.
        const flag = localToSharedFlag("readings", pid);
        if (readFlag(flag)) return;
        const uid = currentUid();
        const pending = Object.keys(readLocalReadings()).filter((id) => !(uid && reads[id]?.[uid]));
        if (!readFlag(linkedFromLocalKey(pid)) || !uid || pending.length === 0) {
          if (uid) setFlag(flag);
          return;
        }
        Promise.all(pending.map((id) => setReadingRead(pid, id, { uid, name, role }, true))).then(
          () => setFlag(flag),
          () => {
            /* próxima apertura */
          }
        );
      },
      () => setLoadError({ pid, attempt })
    );
    // name/role solo firman el traspaso: no hace falta volver a escuchar si cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, active, attempt]);

  const reads = pid && remote?.pid === pid ? remote.reads : null;
  const loaded = !pid || reads !== null;
  const failed = !loaded && !!pid && loadError?.pid === pid && loadError.attempt === attempt;

  const readByMe = useCallback(
    (id: string): boolean | undefined => {
      if (!pid) return !!local[id];
      if (id in overlay) return overlay[id];
      if (!reads || !myUid) return undefined;
      return !!reads[id]?.[myUid];
    },
    [pid, local, overlay, reads, myUid]
  );

  const partnerRead = useCallback(
    (id: string): ReadingMark | null => {
      if (!pid || !reads || !myUid) return null;
      const other = Object.entries(reads[id] ?? {}).find(([uid]) => uid !== myUid);
      return other ? other[1] : null;
    },
    [pid, reads, myUid]
  );

  /** Escribe un valor concreto (el reintento repite ESE valor, no vuelve a alternar con un estado viejo). */
  const write = (id: string, next: boolean) => {
    if (!pid) {
      setLocalRead(id, next);
      return;
    }
    const uid = myUid ?? currentUid();
    if (!uid) return;
    setOverlay((o) => ({ ...o, [id]: next }));
    const clear = () =>
      setOverlay((o) => {
        const copy = { ...o };
        delete copy[id];
        return copy;
      });
    setReadingRead(pid, id, { uid, name, role }, next).then(clear, () => {
      clear();
      onWriteError?.(id, () => write(id, next));
    });
  };

  const toggle = (id: string) => {
    const current = readByMe(id);
    if (current === undefined) return;
    write(id, !current);
  };

  return { loaded, failed, retryLoad: () => setAttempt((a) => a + 1), readByMe, partnerRead, toggle };
}
