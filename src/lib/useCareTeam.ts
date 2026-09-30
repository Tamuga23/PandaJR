"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePandaStore } from "@/store/usePandaStore";
import { listenToCareTeam, saveCareTeam } from "@/lib/firebase/pairing";
import { getEmergencyNumber, sameCareTeam, sanitizeCareTeam, type CareTeam, type EmergencyInfo } from "@/lib/urgency";
import {
  OTHER_COUNTRY,
  countryName,
  crisisLineFor,
  customCrisisLine,
  emergencyNumberFor,
  isCountryChoice,
  isMarketCountry,
  type CrisisLine,
} from "@/lib/crisisLines";

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

/**
 * Lo que el país fija por defecto (R2 · paso 4), sin mirar los números escritos a mano:
 * - país elegido en Ajustes (compartido en el equipo de salud) → su número de emergencias y su línea
 *   de crisis verificada (src/lib/crisisLines.ts);
 * - «Otro» → el número detectado, pero sin confianza (se pide confirmarlo) y sin línea de crisis;
 * - sin elegir → el país detectado por idioma y zona horaria, si la detección es confiable.
 */
export type CountryDefaults = {
  /** País que manda (elegido o detectado con confianza); OTHER_COUNTRY para «Otro»; null si no se sabe. */
  country: string | null;
  /** true si la pareja lo eligió en Ajustes (no es solo lo detectado). */
  chosen: boolean;
  countryName: string | null;
  emergency: EmergencyInfo;
  crisis: CrisisLine | null;
};

export function countryDefaults(careTeam: CareTeam, detected: EmergencyInfo): CountryDefaults {
  const chosenCountry = isCountryChoice(careTeam.country) ? careTeam.country : null;
  if (chosenCountry === OTHER_COUNTRY) {
    return { country: OTHER_COUNTRY, chosen: true, countryName: countryName(OTHER_COUNTRY), emergency: { ...detected, confident: false }, crisis: null };
  }
  if (chosenCountry) {
    const number = emergencyNumberFor(chosenCountry) ?? detected.number;
    return {
      country: chosenCountry,
      chosen: true,
      countryName: countryName(chosenCountry),
      emergency: { number, region: chosenCountry, confident: true },
      crisis: crisisLineFor(chosenCountry),
    };
  }
  const detectedCountry = detected.confident && isMarketCountry(detected.region) ? detected.region : null;
  return {
    country: detectedCountry,
    chosen: false,
    countryName: countryName(detectedCountry),
    emergency: detected,
    crisis: crisisLineFor(detectedCountry),
  };
}

/** A quién llamar: emergencias y línea de crisis (lo escrito a mano manda sobre lo del país). */
export type CallTargets = { emergency: EmergencyInfo; crisisLine: CrisisLine | null; defaults: CountryDefaults };

export function callTargets(careTeam: CareTeam, detected: EmergencyInfo): CallTargets {
  const defaults = countryDefaults(careTeam, detected);
  const customEmergency = careTeam.emergencyNumber?.trim();
  const customCrisis = careTeam.crisisLine?.trim();
  return {
    emergency: customEmergency ? { number: customEmergency, region: defaults.emergency.region, confident: true } : defaults.emergency,
    crisisLine: customCrisis ? customCrisisLine(customCrisis) : defaults.crisis,
    defaults,
  };
}

/** Emergencias y línea de crisis desde el store (sin abrir un listener: para pantallas que solo leen). */
export function useCallTargets(): CallTargets {
  const careTeam = usePandaStore((s) => s.careTeam);
  const detected = useDetectedEmergency();
  return useMemo(() => callTargets(careTeam, detected), [careTeam, detected]);
}

export function useCareTeam(): {
  careTeam: CareTeam;
  emergency: EmergencyInfo;
  crisisLine: CrisisLine | null;
  defaults: CountryDefaults;
  /** Con vínculo: ya llegó el dato del servidor (o la caché lo tenía). Antes, no se escribe nada. */
  ready: boolean;
  save: (partial: Partial<CareTeam>) => Promise<void>;
  saving: boolean;
  error: string | null;
} {
  const careTeam = usePandaStore((s) => s.careTeam);
  const pregnancyId = usePandaStore((s) => s.profile.pregnancyId);
  const { emergency, crisisLine, defaults } = useCallTargets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedPid, setLoadedPid] = useState<string | null>(null);

  // Escucha autónoma: solo vuelca al store, nunca escribe (regla anti sync-loop). Con el meta sabemos
  // cuándo hay dato del servidor (una caché vacía no cuenta, como en el resto de la app).
  useEffect(() => {
    if (!pregnancyId) return;
    const unsubscribe = listenToCareTeam(
      pregnancyId,
      (remote) => {
        const next = sanitizeCareTeam(remote);
        if (!sameCareTeam(usePandaStore.getState().careTeam, next)) {
          usePandaStore.setState({ careTeam: next });
        }
      },
      (meta) => {
        if (!meta.fromCache || meta.exists) setLoadedPid(pregnancyId);
      }
    );
    return unsubscribe;
  }, [pregnancyId]);
  const ready = !pregnancyId || loadedPid === pregnancyId;

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

  return { careTeam, emergency, crisisLine, defaults, ready, save, saving, error };
}
