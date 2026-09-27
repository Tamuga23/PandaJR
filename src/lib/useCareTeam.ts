"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePandaStore } from "@/store/usePandaStore";
import { listenToCareTeam, saveCareTeam } from "@/lib/firebase/pairing";
import { getEmergencyNumber, sameCareTeam, sanitizeCareTeam, type CareTeam, type EmergencyInfo } from "@/lib/urgency";

// Tiempo máximo que esperamos la confirmación de Firestore. Sin señal, Firestore
// deja la escritura en cola y la envía al reconectar: la copia local ya quedó guardada.
const SYNC_TIMEOUT_MS = 8000;
const SYNC_ERROR = "No pudimos compartir los cambios con tu pareja. Quedaron guardados en este teléfono; inténtalo de nuevo.";

const SERVER_EMERGENCY: EmergencyInfo = { number: "911", region: null, confident: false };
let clientEmergency: EmergencyInfo | null = null;

const noopSubscribe = () => () => {};
const getServerEmergency = () => SERVER_EMERGENCY;
const getClientEmergency = () => {
  if (!clientEmergency) clientEmergency = getEmergencyNumber();
  return clientEmergency;
};

/**
 * Número de emergencias detectado para el dispositivo (ignora el que guardó el usuario).
 * En servidor y durante la hidratación devuelve 911 / confident:false; en cliente, el real.
 */
export function useDetectedEmergency(): EmergencyInfo {
  return useSyncExternalStore(noopSubscribe, getClientEmergency, getServerEmergency);
}

export function useCareTeam(): {
  careTeam: CareTeam;
  emergency: EmergencyInfo;
  save: (partial: Partial<CareTeam>) => Promise<void>;
  saving: boolean;
  error: string | null;
} {
  const careTeam = usePandaStore((s) => s.careTeam);
  const pregnancyId = usePandaStore((s) => s.profile.pregnancyId);
  const detected = useDetectedEmergency();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escucha autónoma: solo vuelca al store, nunca escribe (regla anti sync-loop).
  useEffect(() => {
    if (!pregnancyId) return;
    const unsubscribe = listenToCareTeam(pregnancyId, (remote) => {
      const next = sanitizeCareTeam(remote);
      if (!sameCareTeam(usePandaStore.getState().careTeam, next)) {
        usePandaStore.setState({ careTeam: next });
      }
    });
    return unsubscribe;
  }, [pregnancyId]);

  const emergency = useMemo<EmergencyInfo>(() => {
    const custom = careTeam.emergencyNumber?.trim();
    return custom ? { number: custom, region: detected.region, confident: true } : detected;
  }, [careTeam.emergencyNumber, detected]);

  // Mutación deliberada: solo se llama desde manejadores de evento.
  // Rechaza con un mensaje legible si Firestore falla (la copia local ya se guardó).
  const save = useCallback(async (partial: Partial<CareTeam>) => {
    setSaving(true);
    setError(null);
    const store = usePandaStore.getState();
    store.setCareTeam(partial);
    const next = usePandaStore.getState().careTeam;
    const pid = store.profile.pregnancyId;

    try {
      if (pid) {
        // La escritura queda siempre protegida: si falla después de que dejamos de esperar
        // (timeout o sin señal), no hay rechazo sin manejar y el error se muestra igual.
        let waiting = true;
        const outcome = saveCareTeam(pid, next).then(
          () => true,
          () => {
            if (!waiting) setError(SYNC_ERROR);
            return false;
          }
        );
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        const ok = offline
          ? true
          : await Promise.race([
              outcome,
              new Promise<true>((resolve) => setTimeout(() => resolve(true), SYNC_TIMEOUT_MS)),
            ]);
        waiting = false;
        if (!ok) throw new Error(SYNC_ERROR);
      }
    } catch {
      setError(SYNC_ERROR);
      throw new Error(SYNC_ERROR);
    } finally {
      setSaving(false);
    }
  }, []);

  return { careTeam, emergency, save, saving, error };
}
