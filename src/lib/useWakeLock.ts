"use client";

// Pantalla encendida mientras una vista la necesita (el modo parto: a las 3 a. m. nadie quiere desbloquear el
// teléfono entre contracciones). Screen Wake Lock API: mejora progresiva. Si el navegador no la tiene o la
// niega (batería baja, pestaña oculta), no pasa nada y la interfaz no lo afirma. El sistema suelta el bloqueo
// al ocultar la app; al volver a la vista se pide de nuevo.

import { useEffect, useState } from "react";

export type WakeLockState = "on" | "off" | "unsupported";

export function useWakeLock(enabled: boolean): WakeLockState {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!enabled || !supported) return;
    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;
    const acquire = () => {
      if (cancelled || (sentinel && !sentinel.released)) return;
      navigator.wakeLock.request("screen").then(
        (s) => {
          if (cancelled) {
            s.release().catch(() => {});
            return;
          }
          sentinel = s;
          setHeld(true);
          s.addEventListener("release", () => {
            if (!cancelled) setHeld(false);
          });
        },
        () => {
          if (!cancelled) setHeld(false);
        }
      );
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
      // Al volver, nada dice «encendida» hasta que el teléfono lo conceda de nuevo.
      setHeld(false);
    };
  }, [enabled, supported]);

  if (!supported) return "unsupported";
  return enabled && held ? "on" : "off";
}
