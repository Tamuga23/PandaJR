"use client";

import { useLayoutEffect } from "react";
import { resolveTheme, usePandaStore, type ResolvedTheme, type ThemePreference } from "@/store/usePandaStore";

/** Mismos colores que `viewport.themeColor` en layout.tsx (fondo claro y oscuro). */
export const THEME_COLOR: Record<ResolvedTheme, string> = { light: "#fdfbf7", dark: "#181520" };

/**
 * Aplica el tema al documento: clase `.dark` en <html> (color-scheme lo pone globals.css) y
 * <meta name="theme-color">: con elección explícita todas las etiquetas toman el color elegido (la
 * barra del sistema acompaña al tema de la app); con "system" vuelven a su valor por media query.
 */
export function applyThemeToDocument(resolved: ResolvedTheme, preference: ThemePreference, doc: Document = document) {
  doc.documentElement.classList.toggle("dark", resolved === "dark");
  for (const meta of Array.from(doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))) {
    if (!meta.hasAttribute("data-default-content")) meta.setAttribute("data-default-content", meta.content);
    meta.content = preference === "system" ? meta.getAttribute("data-default-content") || meta.content : THEME_COLOR[resolved];
  }
}

/**
 * Montado una vez (layout.tsx). El script de arranque de layout.tsx ya puso la clase antes del primer
 * pintado; aquí se mantiene al día: cambios de preferencia, cambios del sistema con "system" y el
 * remontaje de desarrollo de React, que reinicia los atributos de <html> (por eso useLayoutEffect).
 *
 * Lee la tienda directamente (getState + subscribe) y no con el hook: durante la hidratación el hook
 * devuelve el estado inicial del servidor ("system") y aplicarlo haría parpadear a quien eligió un tema.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    const mql = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    let listening = false;
    const apply = () => {
      const preference = usePandaStore.getState().themePreference;
      const resolved = resolveTheme(preference, !!mql?.matches);
      applyThemeToDocument(resolved, preference);
      usePandaStore.getState().setResolvedTheme(resolved);
    };
    const sync = () => {
      apply();
      if (!mql) return;
      const followSystem = usePandaStore.getState().themePreference === "system";
      if (followSystem && !listening) { mql.addEventListener("change", apply); listening = true; }
      else if (!followSystem && listening) { mql.removeEventListener("change", apply); listening = false; }
    };
    sync();
    const unsubscribe = usePandaStore.subscribe((state, prev) => {
      if (state.themePreference !== prev.themePreference) sync();
    });
    return () => {
      unsubscribe();
      if (listening && mql) mql.removeEventListener("change", apply);
    };
  }, []);

  return null;
}
