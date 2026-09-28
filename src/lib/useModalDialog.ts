"use client";

/**
 * Diálogo modal accesible (WAI-ARIA dialog modal) con pila para anidar (Ajustes → Equipo de salud).
 *
 * - Escape cierra SOLO el diálogo superior (y no llega a los listeners de window).
 * - Tab / Shift+Tab quedan atrapados dentro del diálogo superior; el ciclo incluye, detrás de sus
 *   controles, los del toast exento ("Deshacer"/"Reintentar"), para que también se usen con teclado.
 *   Los centinelas de ModalPortal recuperan el foco si sale sin pasar por aquí (iframe de otro origen).
 * - Foco inicial: initialFocusRef → primer enfocable → el propio contenedor (tabIndex -1).
 * - Al cerrar, el foco vuelve a quien lo abrió (o a returnFocusRef) si sigue en la página. Si el toque
 *   no le dio el foco (iOS), "quien abrió" es el último control tocado (useModalOpenerTracking).
 * - Bloqueo de scroll del body con contador (varios diálogos apilados = un solo bloqueo).
 * - Todo lo que no es la capa del diálogo superior queda `inert` (fuera del orden de Tab, de los
 *   clics y del lector de pantalla). La capa = el `<ModalPortal>` que lo contiene (atributo
 *   data-modal-layer), así el fondo clicable de "tocar fuera para cerrar" sigue activo; sin
 *   ModalPortal la capa es el propio contenedor del diálogo.
 * - Excepciones a inert: elementos con `data-inert-exempt` (y sus ancestros), p. ej. la región viva
 *   del toast, para que "Deshacer"/"Reintentar" se anuncien y se toquen con un diálogo abierto.
 *
 * Sin acceso a window/document en el ámbito del módulo: todo ocurre en efectos y manejadores.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type React from "react";

/** Atributo que marca la capa (portal) de un diálogo. Lo pone ModalPortal. */
export const MODAL_LAYER_ATTR = "data-modal-layer";
/** Atributo para elementos que NO deben quedar inert con un diálogo abierto (toast). */
export const INERT_EXEMPT_ATTR = "data-inert-exempt";

export interface UseModalDialogOptions {
  /** true mientras el diálogo está abierto (y su contenedor montado). */
  open: boolean;
  /** Cerrar (Escape, o lo que decida el componente). Para un diálogo obligatorio, pasa una función vacía. */
  onClose: () => void;
  /** Elemento que recibe el foco al abrir. Por defecto, el primer enfocable. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Elemento al que vuelve el foco al cerrar si quien abrió ya no existe (o para forzar otro destino). */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** id del título visible (aria-labelledby). */
  labelledBy?: string;
  /** id del texto descriptivo (aria-describedby). */
  describedBy?: string;
  /** "alertdialog" para confirmaciones que interrumpen (p. ej. borrar). Por defecto "dialog". */
  role?: "dialog" | "alertdialog";
}

export interface ModalDialogProps {
  role: "dialog" | "alertdialog";
  "aria-modal": true;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  ref: React.RefCallback<HTMLElement>;
  tabIndex: -1;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}

// ---------------------------------------------------------------------------------------------
// Pila compartida (estado del módulo, sin tocar el DOM hasta que un diálogo se abre)

interface Entry {
  id: number;
  el: HTMLElement;
  close: () => void;
  opener: HTMLElement | null;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

const stack: Entry[] = [];
let nextId = 1;
let inerted: Element[] = [];
let lockCount = 0;
let savedScroll: { bodyOverflow: string; htmlOverflow: string; bodyPaddingRight: string } | null = null;
let observer: MutationObserver | null = null;
let listening = false;

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT", "NEXT-ROUTE-ANNOUNCER", "NEXTJS-PORTAL"]);

const FOCUSABLE = [
  "a[href]", "area[href]", "button:not([disabled])", "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])", "textarea:not([disabled])", "iframe", "audio[controls]", "video[controls]",
  "summary", "[contenteditable]:not([contenteditable=\"false\"])", "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

function isVisible(el: HTMLElement): boolean {
  if (el.closest("[hidden],[inert]")) return false;
  const withCheck = el as HTMLElement & { checkVisibility?: (o?: { visibilityProperty?: boolean }) => boolean };
  if (typeof withCheck.checkVisibility === "function") return withCheck.checkVisibility({ visibilityProperty: true });
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const cs = window.getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
  }
  return true;
}

/**
 * Paradas de Tab visibles dentro de `root`, en orden del documento (la app no usa tabindex positivos).
 * De cada grupo de radios nativos solo cuenta una parada (la marcada, o la primera), como hace Tab.
 */
export function getFocusable(root: HTMLElement): HTMLElement[] {
  const radioSeen = new Set<string>();
  const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute("tabindex") !== "-1" && isVisible(el)
  );
  const isRadio = (o: HTMLElement): o is HTMLInputElement => o.tagName === "INPUT" && (o as HTMLInputElement).type === "radio";
  return all.filter((el) => {
    if (!isRadio(el) || !el.name) return true;
    const key = `${el.form ? "f" : "d"}:${el.name}`;
    const group = all.filter((o): o is HTMLInputElement => isRadio(o) && o.name === el.name && o.form === el.form);
    const stop = group.find((o) => o.checked) ?? group[0];
    if (el !== stop || radioSeen.has(key)) return false;
    radioSeen.add(key);
    return true;
  });
}

/** `visible: false` pide al navegador no pintar el anillo (foco puesto tras un toque, no con teclado). */
function focusEl(el: HTMLElement | null | undefined, visible = true): boolean {
  if (!el || !el.isConnected) return false;
  const opts = (visible ? { preventScroll: true } : { preventScroll: true, focusVisible: false }) as FocusOptions;
  try { el.focus(opts); } catch { el.focus(); }
  return el.ownerDocument.activeElement === el;
}

// ---------------------------------------------------------------------------------------------
// Quién abrió, cuando el botón no recibió el foco (toque en Safari/VoiceOver de iOS, click()
// programático): el último control tocado. Lo instala useModalOpenerTracking() una vez en la página.

const OPENER_SELECTOR = [
  "button", "a[href]", "summary", "[role=\"button\"]", "[role=\"tab\"]", "[role=\"menuitem\"]",
  "[role=\"radio\"]", "[role=\"checkbox\"]", "[role=\"switch\"]", "[tabindex]:not([tabindex=\"-1\"])",
].join(",");
/** Un toque más antiguo que esto ya no se considera el que abrió el diálogo. */
const POINTER_OPENER_MS = 4000;
let lastPointer: { el: HTMLElement; t: number } | null = null;
let trackers = 0;

function onPointerIntent(e: Event) {
  const target = e.target as Element | null;
  if (!target || typeof target.closest !== "function") return;
  const el = target.closest<HTMLElement>(OPENER_SELECTOR);
  if (el) lastPointer = { el, t: Date.now() };
}

function matchesFocusVisible(el: Element): boolean {
  try { return el.matches(":focus-visible"); } catch { return true; }
}

/** El control tocado hace poco, si sigue en la página y está fuera del diálogo que se abre. */
function recentPointerOpener(node: HTMLElement): HTMLElement | null {
  const p = lastPointer;
  if (!p || Date.now() - p.t > POINTER_OPENER_MS) return null;
  if (!p.el.isConnected || node.contains(p.el) || p.el.closest("[inert]")) return null;
  return p.el;
}

/**
 * Montar una vez en la raíz de la app (page.tsx). Recuerda el último control tocado para que el foco
 * vuelva a él al cerrar un diálogo aunque el toque no le diera el foco (iOS).
 */
export function useModalOpenerTracking(): void {
  useEffect(() => {
    const doc = document;
    if (trackers++ === 0) {
      doc.addEventListener("pointerdown", onPointerIntent, true);
      doc.addEventListener("click", onPointerIntent, true);
    }
    return () => {
      if (--trackers > 0) return;
      doc.removeEventListener("pointerdown", onPointerIntent, true);
      doc.removeEventListener("click", onPointerIntent, true);
      lastPointer = null;
    };
  }, []);
}

function top(): Entry | undefined { return stack[stack.length - 1]; }

function layerOf(el: HTMLElement): Element {
  return el.closest(`[${MODAL_LAYER_ATTR}]`) ?? el;
}

function restoreInert() {
  for (const el of inerted) el.removeAttribute("inert");
  inerted = [];
}

/** Marca inert todo lo que no sea la capa del diálogo superior, las excepciones o sus ancestros. */
function applyInert() {
  restoreInert();
  const t = top();
  if (!t) return;
  const doc = t.el.ownerDocument;
  const layer = layerOf(t.el);
  const keepPath = new Set<Element>();
  for (let n: Element | null = layer; n; n = n.parentElement) keepPath.add(n);
  const exempt = new Set<Element>(Array.from(doc.querySelectorAll(`[${INERT_EXEMPT_ATTR}]`)));
  for (const ex of exempt) for (let n: Element | null = ex; n; n = n.parentElement) keepPath.add(n);
  const walk = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (child === layer || exempt.has(child) || SKIP_TAGS.has(child.tagName)) continue;
      if (keepPath.has(child)) { walk(child); continue; }
      if (child.hasAttribute("inert")) continue; // ya inert por otro motivo: no es nuestro
      child.setAttribute("inert", "");
      inerted.push(child);
    }
  };
  walk(doc.body);
}

/** Bloquea el scroll del body (contador: varios bloqueos se suman). Devuelve la función que lo libera. */
export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  if (lockCount === 0) {
    const body = document.body;
    const html = document.documentElement;
    const scrollbar = window.innerWidth - html.clientWidth;
    savedScroll = { bodyOverflow: body.style.overflow, htmlOverflow: html.style.overflow, bodyPaddingRight: body.style.paddingRight };
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    // Sin barra de desplazamiento el contenido centrado no salta a la derecha.
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  }
  lockCount++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0 && savedScroll) {
      document.body.style.overflow = savedScroll.bodyOverflow;
      document.documentElement.style.overflow = savedScroll.htmlOverflow;
      document.body.style.paddingRight = savedScroll.bodyPaddingRight;
      savedScroll = null;
    }
  };
}

/**
 * Paradas del ciclo de Tab del diálogo superior: sus controles y, detrás, los controles visibles de las
 * excepciones a inert (el toast con "Deshacer"/"Reintentar"), para que también se alcancen con teclado
 * (2.1.1). Sin controles propios, el propio contenedor ocupa su lugar.
 */
function tabCycle(root: HTMLElement): { own: HTMLElement[]; extra: HTMLElement[]; cycle: HTMLElement[] } {
  const own = getFocusable(root);
  const extra: HTMLElement[] = [];
  for (const ex of Array.from(root.ownerDocument.querySelectorAll<HTMLElement>(`[${INERT_EXEMPT_ATTR}]`))) {
    if (root.contains(ex) || ex.contains(root) || ex.closest("[inert]")) continue;
    for (const el of getFocusable(ex)) if (!extra.includes(el)) extra.push(el);
  }
  return { own, extra, cycle: [...(own.length ? own : [root]), ...extra] };
}

/** Tab dentro del ciclo del diálogo (controles propios → toast → vuelta). Devuelve true si movió el foco. */
function trapTab(root: HTMLElement, shift: boolean, active: Element | null): boolean {
  const { own, cycle } = tabCycle(root);
  const n = cycle.length;
  const step = (from: number) => cycle[(from + (shift ? -1 : 1) + n) % n];
  const at = active ? cycle.indexOf(active as HTMLElement) : -1;
  const inside = !!active && root.contains(active);
  if (at !== -1 && !inside) return focusEl(step(at)) || true; // en el toast: al siguiente del ciclo
  if (!inside) return focusEl(shift ? cycle[n - 1] : cycle[0]) || true;
  if (shift) {
    if (active === root || active === own[0]) return focusEl(cycle[n - 1]) || true;
  } else if (own.length === 0 || active === own[own.length - 1]) {
    return focusEl(step(own.length ? own.length - 1 : 0)) || true;
  }
  return false; // en medio: lo mueve el navegador (mismo orden)
}

/**
 * Centinelas de ModalPortal: el foco llegó a un borde de la capa sin pasar por el keydown del diálogo
 * (p. ej. saliendo con Tab de un iframe de otro origen, cuyo teclado no llega a la página).
 * "end" = se salió por el final (sigue el ciclo); "start" = por el principio (va al último).
 */
export function focusTopDialogEdge(edge: "start" | "end"): void {
  const t = top();
  if (!t) return;
  const { own, extra, cycle } = tabCycle(t.el);
  if (edge === "start") focusEl(cycle[cycle.length - 1]);
  else focusEl(extra[0] ?? own[0] ?? t.el);
}

/** Teclado fuera del diálogo superior (foco en body, en el toast…): Escape cierra, Tab entra. */
function onDocumentKeyDown(e: KeyboardEvent) {
  const t = top();
  if (!t || e.defaultPrevented || e.isComposing) return;
  const target = e.target as Node | null;
  if (target && t.el.contains(target)) return; // lo gestiona onKeyDown del propio diálogo
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    t.close();
  } else if (e.key === "Tab") {
    e.preventDefault();
    trapTab(t.el, e.shiftKey, t.el.ownerDocument.activeElement);
  }
}

function startListening(doc: Document) {
  if (listening) return;
  listening = true;
  doc.addEventListener("keydown", onDocumentKeyDown);
  if (typeof MutationObserver !== "undefined") {
    // Portales que se montan con el diálogo abierto (otro diálogo, avisos): se recalcula inert.
    observer = new MutationObserver(() => { if (stack.length) applyInert(); });
    observer.observe(doc.body, { childList: true });
  }
}

function stopListening(doc: Document) {
  if (!listening) return;
  listening = false;
  doc.removeEventListener("keydown", onDocumentKeyDown);
  observer?.disconnect();
  observer = null;
}

let releaseScroll: (() => void) | null = null;

function push(entry: Entry) {
  const doc = entry.el.ownerDocument;
  stack.push(entry);
  if (stack.length === 1) { startListening(doc); releaseScroll = lockBodyScroll(); }
  applyInert();
}

function pop(id: number) {
  const idx = stack.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const [entry] = stack.splice(idx, 1);
  const wasTop = idx === stack.length; // tras quitarlo, era el último
  const doc = entry.el.ownerDocument;
  applyInert(); // restaura el resto antes de devolver el foco
  if (stack.length === 0) {
    releaseScroll?.();
    releaseScroll = null;
    stopListening(doc);
  }
  if (!wasTop) return;
  // Solo se devuelve el foco si seguía en el diálogo (o se perdió): no se le quita a quien ya lo movió.
  const active = doc.activeElement;
  const lost = !active || active === doc.body || !active.isConnected || entry.el.contains(active);
  if (!lost) return;
  const target = entry.returnFocusRef?.current ?? entry.opener;
  if (target && !target.closest("[inert]") && focusEl(target)) return;
  const next = top();
  if (next) { const items = getFocusable(next.el); if (!focusEl(items[0])) focusEl(next.el); }
}

/**
 * Si el foco se perdió (body) con un diálogo abierto, lo devuelve al diálogo superior (a su contenedor:
 * el lector anuncia el título y Tab sigue por sus controles). P. ej. al desaparecer el toast enfocado.
 */
export function focusIntoTopDialog(): boolean {
  const t = top();
  if (!t) return false;
  const doc = t.el.ownerDocument;
  const active = doc.activeElement;
  if (active && active !== doc.body && active.isConnected) return false;
  return focusEl(t.el);
}

/** Solo para pruebas: estado de la pila. */
export function __modalStackForTests() {
  return { depth: stack.length, lockCount, inerted: inerted.length, listening };
}

// ---------------------------------------------------------------------------------------------

export function useModalDialog(opts: UseModalDialogOptions): { dialogProps: ModalDialogProps } {
  const { open, onClose, initialFocusRef, returnFocusRef, labelledBy, describedBy, role = "dialog" } = opts;
  const [node, setNode] = useState<HTMLElement | null>(null);
  const ref = useCallback((el: HTMLElement | null) => setNode(el), []);
  const onCloseRef = useRef(onClose);
  const idRef = useRef(0);
  const initialRef = useRef(initialFocusRef);
  const returnRef = useRef(returnFocusRef);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    initialRef.current = initialFocusRef;
    returnRef.current = returnFocusRef;
  });

  useLayoutEffect(() => {
    if (!open || !node) return;
    const doc = node.ownerDocument;
    const active = doc.activeElement as HTMLElement | null;
    // Quien abrió: el foco actual si está fuera del diálogo (un autoFocus interno no cuenta); si el
    // foco está en body (toque sin foco, iOS), el último control tocado.
    const focused = active && active !== doc.body && !node.contains(active) ? active : null;
    const tapped = recentPointerOpener(node);
    const byKeyboard = !!focused && matchesFocusVisible(focused);
    const opener = byKeyboard ? focused : (tapped ?? focused);
    // Abierto con un toque (no con teclado): el foco inicial no necesita anillo.
    const visible = byKeyboard || !tapped;
    const id = nextId++;
    idRef.current = id;
    push({ id, el: node, close: () => onCloseRef.current(), opener, returnFocusRef: returnRef.current });
    if (!node.contains(doc.activeElement)) {
      const wanted = initialRef.current?.current;
      if (!(wanted && node.contains(wanted) && focusEl(wanted, visible))) {
        const items = getFocusable(node);
        if (!focusEl(items[0], visible)) focusEl(node, visible);
      }
    }
    return () => {
      pop(id);
      if (idRef.current === id) idRef.current = 0;
    };
  }, [open, node]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const t = top();
    if (!t || t.id !== idRef.current) return; // solo el diálogo superior responde
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Escape") {
      if (e.defaultPrevented) return; // un control interno ya lo usó (p. ej. cerrar un desplegable)
      e.preventDefault();
      e.stopPropagation();
      t.close();
      return;
    }
    if (e.key === "Tab") {
      const doc = t.el.ownerDocument;
      if (trapTab(t.el, e.shiftKey, doc.activeElement)) e.preventDefault();
    }
  }, []);

  const dialogProps: ModalDialogProps = {
    role,
    "aria-modal": true,
    ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ref,
    tabIndex: -1,
    onKeyDown,
  };
  return { dialogProps };
}
