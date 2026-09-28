"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { CloudOff, LoaderCircle, Smartphone, UserRoundPlus, Users } from "lucide-react";
import { usePandaStore } from "@/store/usePandaStore";
import { listenToMembers, onUidChange, type Member, type MemberRole } from "@/lib/firebase/pairing";
import { formatRelative } from "@/lib/format";

// --- Conexión (navigator.onLine), segura para SSR/hidratación ---

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const getOnline = () => navigator.onLine;
const getServerOnline = () => true;

/** true si el navegador dice que hay conexión (en servidor e hidratación: true). */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, getOnline, getServerOnline);
}

// --- Pareja vinculada ---

export type PartnerInfo = {
  partnerName?: string;
  partnerRole?: MemberRole;
  members: Member[];
  myUid: string | null;
  /** true cuando llegó el primer snapshot de miembros para el embarazo actual. */
  loaded: boolean;
  /**
   * true si la lista de miembros existe pero ya no incluye a este teléfono o si Firestore niega
   * el acceso. En embarazos antiguos sin `members` es false. OJO: no distingue "la mamá lo quitó"
   * de "este teléfono perdió su sesión anónima" (uid nuevo): quien desvincule debe comprobar que
   * el uid actual es el mismo que ya figuró como miembro (ver page.tsx).
   */
  removed: boolean;
  /** Firestore negó el acceso al embarazo (permission-denied). */
  denied: boolean;
};

/**
 * Miembros del embarazo y quién es la pareja. Solo escucha (no escribe nada).
 * Sin pregnancyId devuelve lista vacía. `enabled = false` evita abrir el listener.
 */
export function usePartner(enabled: boolean = true): PartnerInfo {
  const pregnancyId = usePandaStore((s) => s.profile.pregnancyId);
  const myRole = usePandaStore((s) => s.profile.role);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ pid: string; members: Member[]; denied?: boolean } | null>(null);

  useEffect(() => {
    if (!enabled || !pregnancyId) return;
    return onUidChange(setMyUid);
  }, [enabled, pregnancyId]);

  useEffect(() => {
    if (!enabled || !pregnancyId) return;
    return listenToMembers(
      pregnancyId,
      (members) => setSnapshot({ pid: pregnancyId, members }),
      // Sin permisos (lo quitaron del embarazo) o sin red: no inventamos pareja.
      (error) => {
        const denied = (error as { code?: string }).code === "permission-denied";
        setSnapshot((prev) => ({
          pid: pregnancyId,
          members: prev && prev.pid === pregnancyId && !denied ? prev.members : [],
          denied,
        }));
      }
    );
  }, [enabled, pregnancyId]);

  const current = enabled && pregnancyId && snapshot?.pid === pregnancyId ? snapshot : null;
  const members = current?.members ?? [];
  const others = members.filter((m) => (myUid ? m.uid !== myUid : m.role !== myRole));
  // Si hubiera más de uno (p. ej. un teléfono antiguo), la pareja es quien se unió más recientemente.
  const partner = others.length > 0 ? others[others.length - 1] : undefined;
  const removed =
    !!current && (!!current.denied || (!!myUid && members.length > 0 && !members.some((m) => m.uid === myUid)));

  return {
    partnerName: partner?.name,
    partnerRole: partner?.role,
    members,
    myUid,
    loaded: !!current,
    removed,
    denied: !!current?.denied,
  };
}

/** Re-render periódico para que "hace 5 minutos" no se quede congelado. */
function useMinuteTick(active: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/**
 * Estado honesto de dónde vive un dato: "Solo en este teléfono" (sin vínculo),
 * "Compartido con {pareja} · hace 5 minutos", "Conectando…" mientras no hay datos del
 * servidor, o "Sin conexión: no cierres la app hasta enviar" (Firestore guarda los envíos
 * pendientes en memoria: si la app se cierra antes de reconectar, se pierden).
 */
export function SyncBadge({
  partnerName,
  lastSyncedAt,
  className,
  waiting = false,
}: {
  partnerName?: string;
  lastSyncedAt?: Date | null;
  className?: string;
  /** Aún no llegó el primer dato del servidor (solo caché o nada): no afirmar que está compartido. */
  waiting?: boolean;
}) {
  const hasHydrated = usePandaStore((s) => s.hasHydrated);
  const pregnancyId = usePandaStore((s) => s.profile.pregnancyId);
  const online = useOnline();
  // Solo abre el listener de miembros si no nos pasaron el nombre.
  const partner = usePartner(partnerName === undefined);
  const now = useMinuteTick(!!lastSyncedAt);

  const base = "inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13px] leading-5";

  // Antes de hidratar el perfil no sabemos si hay vínculo: reservamos la línea sin texto.
  if (!hasHydrated) {
    return <span aria-hidden="true" className={`${base} h-5${className ? ` ${className}` : ""}`} />;
  }

  let Icon = Smartphone;
  let text = "Solo en este teléfono";
  let tone = "text-stone-600 dark:text-[#a6a1b2]";
  let relative = "";

  if (pregnancyId) {
    const name = partnerName?.trim() || partner.partnerName;
    const ownListener = partnerName === undefined;
    if (partner.removed) {
      Icon = CloudOff;
      text = "Sin acceso a lo compartido";
      tone = "text-amber-800 dark:text-amber-300";
    } else if (!online) {
      Icon = CloudOff;
      text = "Sin conexión: no cierres la app hasta enviar";
      tone = "text-amber-800 dark:text-amber-300";
    } else if (waiting || (ownListener && !partner.loaded)) {
      Icon = LoaderCircle;
      text = "Conectando con lo compartido…";
    } else if (name) {
      Icon = Users;
      text = `Compartido con ${name}`;
    } else if (ownListener && partner.members.length > 0 && !partner.partnerRole) {
      Icon = UserRoundPlus;
      text = "Tu pareja aún no se une";
    } else {
      Icon = Users;
      text = "Compartido";
    }
    const rel = online && lastSyncedAt ? formatRelative(lastSyncedAt, now) : "";
    if (rel && Icon === Users) relative = rel;
  }

  // Solo el estado va en la región viva: el "hace N minutos" cambia cada minuto y, dentro de ella,
  // el lector de pantalla lo anunciaría una y otra vez. Se lee al recorrer la página.
  return (
    <span className={`${base} ${tone}${className ? ` ${className}` : ""}`}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      <span className="truncate">
        <span role="status" aria-live="polite">{text}</span>
        {relative && <span> · {relative}</span>}
      </span>
    </span>
  );
}
