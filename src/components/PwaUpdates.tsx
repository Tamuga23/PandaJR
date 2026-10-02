"use client";

import { useEffect } from "react";

/**
 * PwaUpdates — que la app instalada tome la última versión sin quedarse con la anterior.
 *
 * iOS deja la app de la pantalla de inicio suspendida en memoria: al volver a abrirla reanuda la página
 * vieja aunque ya haya otra versión publicada. Al volver a la app se pide al service worker que busque
 * una versión nueva; si la instala (skipWaiting + clientsClaim), se recarga UNA vez, y nunca mientras la
 * persona está usando la app: espera a que la app pase a segundo plano. La primera instalación del
 * service worker (sin controlador previo) no recarga nada.
 */
export function PwaUpdates() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    const hadController = !!sw.controller;
    let pending = false;
    let reloading = false;

    const reload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const onControllerChange = () => {
      if (!hadController) return;
      if (document.visibilityState === "hidden") reload();
      else pending = true;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (pending) reload();
        return;
      }
      sw.getRegistration()
        .then((r) => r?.update())
        .catch(() => undefined);
    };

    sw.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      sw.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
