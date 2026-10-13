"use client";

import React, { useCallback, useId, useRef } from "react";
import { Bell, CalendarClock, Heart, X } from "lucide-react";
import { AuthorChip } from "@/components/AuthorChip";
import { ModalPortal } from "@/components/ModalPortal";
import { ListGroup, ListRow, RowButton } from "@/components/ui/List";
import { useModalDialog } from "@/lib/useModalDialog";
import { Z_CLASS } from "@/lib/layers";
import { formatRelative } from "@/lib/format";
import type { Activity, ActivityKind } from "@/lib/firebase/pairing";

/*
 * «Avisos»: la campana de la cabecera, su hoja (lo que hizo la pareja y la próxima cita) y el momento del
 * abrazo. Solo presentación: los datos llegan de page.tsx (un listener de pregnancies/{pid}/activity).
 */

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";

/** Próxima cita, ya calculada en page.tsx (la misma regla que tenía el atajo de la cabecera). */
export type NextAppointment = { title: string; when: string; label: string; soon: boolean };

/** Quién hizo algo, para anteponerlo al texto del aviso («Luis agendó…»). */
export function actorLabel(a: Pick<Activity, "actorName" | "actorRole">): string {
  return a.actorName?.trim() || (a.actorRole === "mama" ? "Mamá" : a.actorRole === "papa" ? "Papá" : "Tu pareja");
}

/** Los abrazos no llevan a ningún sitio: el resto abre lo que cambió. */
export const AVISO_OPENS: Record<ActivityKind, boolean> = {
  hug: false, mood: true, event: true, task: true, journal: true, name: true, match: true, kicks: true,
};

export function AvisosBell({
  unread,
  soon,
  onOpen,
  buttonRef,
}: {
  unread: number;
  /** Hay una cita en las próximas 48 h. */
  soon: boolean;
  onOpen: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const label = unread > 0 ? `Avisos: ${unread} ${unread === 1 ? "nuevo" : "nuevos"}` : soon ? "Avisos: tienes una cita pronto" : "Avisos";
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={label}
      title="Avisos"
      className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink ${FOCUS_RING}`}
    >
      <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
      {(unread > 0 || soon) && (
        <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-terracotta-ink ring-2 ring-ground" />
      )}
    </button>
  );
}

export function AvisosSheet({
  items,
  seenBefore,
  linked,
  partnerName,
  next,
  onClose,
  onOpenAppointment,
  onOpenItem,
  onRequestLink,
  returnFocusRef,
}: {
  /** Avisos de la pareja (no los propios), del más nuevo al más viejo. */
  items: Activity[];
  /** Lo posterior a esta marca se muestra como nuevo (la marca se mueve al abrir la hoja). */
  seenBefore: number;
  linked: boolean;
  partnerName?: string;
  next: NextAppointment | null;
  onClose: () => void;
  onOpenAppointment: () => void;
  onOpenItem: (item: Activity) => void;
  onRequestLink: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { dialogProps } = useModalDialog({ open: true, onClose, labelledBy: titleId, initialFocusRef: panelRef, returnFocusRef });
  const { ref: dialogRef, ...dialogRest } = dialogProps;
  const setPanel = useCallback(
    (el: HTMLDivElement | null) => {
      panelRef.current = el;
      dialogRef(el);
    },
    [dialogRef]
  );
  const now = new Date();
  const who = partnerName?.trim() || "tu pareja";

  return (
    <ModalPortal>
      <div className={`fixed inset-0 ${Z_CLASS.sheet} flex items-end justify-center sm:items-center sm:p-4`}>
        <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" />
        <div
          ref={setPanel}
          {...dialogRest}
          className="relative flex max-h-[min(92dvh,var(--sheet-max))] w-full max-w-md flex-col rounded-t-3xl border border-line bg-surface-raised text-ink shadow-sheet outline-none sm:rounded-3xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 pt-5 pb-4">
            <h2 id={titleId} className="font-display text-title text-ink">Avisos</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className={`-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink ${FOCUS_RING}`}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pt-2 pb-[calc(1.25rem+var(--safe-bottom))] [--gutter:1.25rem]">
            {next && (
              <ListGroup className="mb-2">
                <ListRow
                  onClick={onOpenAppointment}
                  leading={<CalendarClock size={20} strokeWidth={1.75} className={next.soon ? "text-terracotta-ink" : undefined} />}
                  title={`Preparar cita: ${next.title}`}
                  meta={next.when}
                  aria-label={next.label}
                  trailing="chevron"
                />
              </ListGroup>
            )}

            {!linked ? (
              <div className="py-4">
                <p className="text-body text-ink-muted">
                  Cuando vincules este teléfono con tu pareja, aquí verás lo que hace: abrazos, citas, tareas y recuerdos.
                </p>
                <RowButton onClick={onRequestLink} aria-haspopup="dialog" className="mt-3">
                  Vincular con mi pareja
                </RowButton>
              </div>
            ) : items.length === 0 ? (
              <p className="py-4 text-body text-ink-muted">
                Todavía no hay avisos. Aquí verás lo que hace {who}: abrazos, citas, tareas y recuerdos.
              </p>
            ) : (
              <ListGroup>
                {items.map((item) => {
                  const fresh = item.createdAt.getTime() > seenBefore;
                  const when = formatRelative(item.createdAt, now);
                  const row = {
                    leading: <AuthorChip name={item.actorName} role={item.actorRole} title={actorLabel(item)} decorative />,
                    title: `${actorLabel(item)} ${item.text}`,
                    meta: fresh ? (
                      <span><strong className="font-bold text-ink">Nuevo</strong> · {when}</span>
                    ) : (
                      when
                    ),
                    weight: fresh ? ("bold" as const) : ("medium" as const),
                  };
                  return AVISO_OPENS[item.kind] ? (
                    <ListRow key={item.id} {...row} onClick={() => onOpenItem(item)} trailing="chevron" />
                  ) : (
                    <ListRow key={item.id} {...row} />
                  );
                })}
              </ListGroup>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/**
 * El abrazo que llega: una tarjeta flotante bajo la cabecera que se queda hasta que la cierras (antes era
 * un aviso de 6 s al pie). Sin animación de entrada: aparece, como el resto de cambios de estado.
 */
export function HugMoment({
  from,
  role,
  message,
  when,
  onReturn,
  onClose,
}: {
  from: string;
  role?: "mama" | "papa";
  message: string;
  when?: string;
  onReturn: () => void;
  onClose: () => void;
}) {
  return (
    <div className={`fixed inset-x-0 top-[calc(var(--header-h)+0.5rem)] mx-auto w-full max-w-md px-4 ${Z_CLASS.nav} lg:left-24 lg:max-w-[45rem] lg:px-8`}>
      <div className="flex items-start gap-3 rounded-2xl border border-line-strong bg-surface-raised p-4 text-ink shadow-toast">
        <AuthorChip name={from} role={role} size="lg" title={from} decorative />
        <div className="min-w-0 flex-1" role="status" aria-live="polite">
          <p className="font-display text-subtitle text-ink text-pretty">{message}</p>
          {when && <p className="text-micro font-medium text-ink-subtle">{when}</p>}
          <RowButton tone="primary" onClick={onReturn} className="mt-3">
            <Heart size={16} strokeWidth={1.75} aria-hidden="true" />
            Devolver el abrazo
          </RowButton>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar el aviso del abrazo"
          className={`-mt-1 -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink ${FOCUS_RING}`}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
