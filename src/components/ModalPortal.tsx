"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MODAL_LAYER_ATTR, focusTopDialogEdge } from "@/lib/useModalDialog";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Renderiza `children` en document.body, fuera de cualquier contexto de apilamiento (sticky, blur,
 * transform) de la app. Envuelve en una capa `data-modal-layer` con `display: contents` (no altera el
 * layout): useModalDialog deja activo todo lo que esté dentro (fondo + panel) y marca inert el resto.
 * En el servidor y durante la hidratación no renderiza nada.
 *
 * Dos centinelas enfocables (invisibles) al principio y al final de la capa: si el foco sale del diálogo
 * sin pasar por su keydown (Tab dentro de un iframe de otro origen, como el reproductor de Spotify),
 * cae en un centinela y vuelve al ciclo del diálogo en vez de perderse en el navegador.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, onClient, onServer);
  if (!isClient) return null;
  return createPortal(
    <div {...{ [MODAL_LAYER_ATTR]: "" }} style={{ display: "contents" }}>
      <span tabIndex={0} data-focus-sentinel="start" style={SENTINEL} onFocus={() => focusTopDialogEdge("start")} />
      {children}
      <span tabIndex={0} data-focus-sentinel="end" style={SENTINEL} onFocus={() => focusTopDialogEdge("end")} />
    </div>,
    document.body
  );
}

const SENTINEL: CSSProperties = { position: "fixed", width: 1, height: 1, opacity: 0, pointerEvents: "none", outline: "none" };
