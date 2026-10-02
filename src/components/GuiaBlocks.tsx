"use client";

// Bloques de la Guía: bloque de semana (la planta que crece, la semana, el hito y la misión, con las
// flechas de explorar), «¿Es la hora?» (36+), «Hoy», ficha del bebé y la hoja «Todas las tareas»
// (checklists por trimestre). Solo presentación y estado de interfaz (qué está desplegado, qué semana se
// mira): las lecturas y escrituras de Firebase viven en page.tsx, en listeners y manejadores.
//
// Fase 6 ("la Guía es un jardín compartido"): secciones y listas con divisores en lugar de tarjetas,
// títulos en Alegreya (font-display) y la planta como firma. Primitivas en @/components/ui/List.
//
// R2: ninguna tarea aparece dos veces en la misma vista. «Hoy» lista las de la semana; el resto vive en
// una hoja aparte («Todas las tareas»), a la que se llega desde una sola fila al final de las tareas.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ListChecks,
  Luggage,
  Stethoscope,
  Timer,
  X,
} from "lucide-react";
import { AuthorChip } from "@/components/AuthorChip";
import { CallActions } from "@/components/CallActions";
import { formatDateLong } from "@/components/DatingPicker";
import { GrowingPlant } from "@/components/GrowingPlant";
import { ModalPortal } from "@/components/ModalPortal";
import { ListGroup, ListRow, RowButton } from "@/components/ui/List";
import { LINK_LABEL, missionLink, type GuiaLinkTarget, type ToolId } from "@/lib/tools";
import { Z_CLASS } from "@/lib/layers";
import { useModalDialog } from "@/lib/useModalDialog";
import { useOpenDiscussRequest } from "@/lib/guiaDiscuss";
import { MAX_VALID_GESTATION_DAYS, PREGNANCY_DAYS, dueDateSummary, type GestationalAgeState } from "@/lib/pregnancy";
import { TASK_OWNERS, taskWindow, type TaskKind, type TaskOwner, type TaskWithCategory } from "@/lib/tasks";
import { WEEK_MAX, WEEK_MIN, formatLength, formatWeight, getWeek, lengthMeasure } from "@/lib/weeks";

export type Role = "mama" | "papa";
export type OwnerLabels = Record<TaskOwner, string>;
/** Herramientas que la Guía puede abrir (todas las de «Juntos»). */
export type GuiaTool = ToolId;

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta-ink";
/** Acción de texto (terracota) con objetivo ≥44px. */
const TEXT_ACTION = `inline-flex min-h-11 items-center rounded-full px-2 text-meta font-bold text-terracotta-ink underline-offset-4 hover:underline ${FOCUS}`;
const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;

const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("es") + s.slice(1) : s);

// =====================================================================================
// Ventana clínica de una tarea (texto sereno; sin "vencida" si la semana no se conoce)
// R2 · paso 3: pasada la ventana sin marcarla, una pregunta con la gramática de lo que es (vacuna,
// prueba, cultivo o trámite) en la voz de quien lee, y «llévalo a tu próximo control», sin reproche.
// La logística de casa no se lleva al control: sigue pendiente, «mejor cuanto antes».
// =====================================================================================

type WindowTask = Pick<TaskWithCategory, "trimester" | "weekFrom" | "weekTo" | "expiresAfterWindow" | "kind">;

/** «¿Ya te la pusieron?» (vacuna), «¿Ya te la hicieron?» (prueba), «¿Ya te lo hicieron?» (cultivo), «¿Ya lo hablaste con tu obstetra?» (consulta), «¿Ya está hecha?». */
export function overdueAsk(kind: TaskKind | undefined, reader: Role): string {
  const mama = reader === "mama";
  switch (kind) {
    case "vacuna":
      return mama ? "¿Ya te la pusieron?" : "¿Ya se la pusieron?";
    case "prueba":
      return mama ? "¿Ya te la hicieron?" : "¿Ya se la hicieron?";
    case "cultivo":
      return mama ? "¿Ya te lo hicieron?" : "¿Ya se lo hicieron?";
    case "consulta":
      return mama ? "¿Ya lo hablaste con tu obstetra?" : "¿Ya lo hablaron con su obstetra?";
    default:
      return "¿Ya está hecha?";
  }
}

/**
 * La tarea es de las que, con la ventana ya cerrada, se llevan al próximo control: tiene ventana propia,
 * no caduca y no es logística. (Si está marcada o no, lo decide quien llama.) Semana desconocida: nunca.
 */
export function discussAtControl(task: WindowTask, week: number | undefined): boolean {
  if (week === undefined || (task.weekFrom === undefined && task.weekTo === undefined)) return false;
  if (task.expiresAfterWindow || task.kind === "logistica") return false;
  return week > taskWindow(task).to;
}

export function taskWindowNote(
  task: WindowTask,
  week: number | undefined,
  completed: boolean,
  // Se conserva por compatibilidad: la pregunta depende de quién lee y de qué es la tarea, no de su dueño.
  _owner: TaskOwner,
  reader: Role
): { text: string; overdue: boolean } | null {
  const own = task.weekFrom !== undefined || task.weekTo !== undefined;
  const win = taskWindow(task);
  const range = win.from === win.to ? `semana ${win.from}` : `semanas ${win.from}–${win.to}`;
  if (week === undefined) return own ? { text: `Ventana: ${range}`, overdue: false } : null;
  if (week > win.to) {
    // Hábitos del trimestre (sin ventana clínica propia): no "vencen"; no se pregunta por ellos.
    if (completed || !own) return own ? { text: `Ventana: ${range}`, overdue: false } : null;
    if (task.expiresAfterWindow) return { text: `Era hasta la semana ${win.to}`, overdue: false };
    if (task.kind === "logistica") return { text: `Ventana: ${range} · mejor cuanto antes`, overdue: false };
    // Sin "ya pasó": lo que toca es preguntarlo en el control (p. ej., la Tdap se puede poner después).
    const next = reader === "mama" ? "Si no, llévalo a tu próximo control" : "Si no, llévenlo a su próximo control";
    return { text: `Ventana: ${range} · ${overdueAsk(task.kind, reader)} ${next}`, overdue: true };
  }
  if (week < win.from) return { text: `Desde la semana ${win.from}`, overdue: false };
  return own ? { text: `Ventana: ${range} · es ahora`, overdue: false } : null;
}

// =====================================================================================
// Fila de tarea: marcar, ver el porqué clínico y reasignar. Va dentro de un <ListGroup>: el
// divisor entre filas empieza en el texto (clase pj-row-body), tras la casilla.
// =====================================================================================

export type TaskRowModel = {
  task: TaskWithCategory;
  completed: boolean;
  owner: TaskOwner;
  /** overdue: ventana pasada y sin marcar, para comentar en el próximo control (nunca con semana desconocida). */
  windowNote: { text: string; overdue: boolean } | null;
  author: { name?: string; role?: Role; title: string } | null;
  /** "Luis la asignó a Ana hace 2 días" (solo si alguien la reasignó). */
  ownerNote?: string | null;
};

export function TaskRow({
  row,
  ownerLabels,
  disabled,
  onToggleDone,
  onAssign,
  idBase,
}: {
  row: TaskRowModel;
  ownerLabels: OwnerLabels;
  /** Aún no llegó el primer dato del servidor: no se puede marcar ni reasignar. */
  disabled: boolean;
  onToggleDone: () => void;
  onAssign: (owner: TaskOwner) => void;
  idBase: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { task, completed, owner, windowNote, author } = row;
  const panelId = `${idBase}-panel`;
  return (
    <li className="relative">
      <div className="flex items-start ps-[var(--gutter)]">
        {/* Casilla: 44px de objetivo; el círculo (22px) queda alineado con el margen de la columna. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={task.text}
          disabled={disabled}
          onClick={onToggleDone}
          className={`-ms-2.5 mt-0.5 grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60 ${FOCUS}`}
        >
          {completed ? (
            <CheckCircle2 size={22} strokeWidth={1.75} className="text-sage-ink" aria-hidden="true" />
          ) : (
            <Circle size={22} strokeWidth={1.75} className="text-line-control" aria-hidden="true" />
          )}
        </button>
        <div className="pj-row-body ms-0.5 flex min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((v) => !v)}
            className={`flex min-h-12 min-w-0 flex-1 items-start gap-3 py-2.5 pe-[var(--gutter)] text-left ${FOCUS_INSET}`}
          >
            <span className="min-w-0 flex-1">
              <span className="sr-only">Detalles: </span>
              <span
                className={`block text-body ${
                  completed ? "text-ink-subtle line-through decoration-line-control" : "font-medium text-ink"
                }`}
              >
                {task.text}
              </span>
              {/* Sin ámbar por fila (R2 · paso 3): lo pendiente de semanas pasadas se agrupa en «para comentar». */}
              <span className="mt-0.5 block text-meta text-ink-muted">
                {/* Quién la hace, primero y en negrita: en «Hoy» no hay un título por dueño. */}
                <span className="font-bold">{ownerLabels[owner]}</span>
                {windowNote ? ` · ${windowNote.text}` : ""}
              </span>
            </span>
            {author && (
              <span className="mt-0.5 shrink-0">
                <AuthorChip size="xs" name={author.name} role={author.role} title={author.title} />
              </span>
            )}
            <ChevronDown
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              className={`mt-0.5 shrink-0 text-ink-subtle transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>
      <div id={panelId} hidden={!expanded} className="ps-[calc(var(--gutter)+2.25rem)] pe-[var(--gutter)] pb-4">
        {expanded && (
          <>
            <p className="text-body text-ink-muted">{task.detail}</p>
            <div role="group" aria-label={`Asignar «${task.text}»`} className="mt-3">
              <p className="text-meta font-bold text-ink">Asignar a</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TASK_OWNERS.map((o) => {
                  const on = owner === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => {
                        if (!on) onAssign(o);
                      }}
                      className={`min-h-11 rounded-full px-4 text-meta font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${FOCUS} ${
                        on ? "bg-sage-ink text-on-accent" : "border border-line-control text-ink hover:bg-surface-hover"
                      }`}
                    >
                      {ownerLabels[o]}
                    </button>
                  );
                })}
              </div>
              {row.ownerNote && <p className="mt-1.5 text-micro font-medium text-ink-subtle">{row.ownerNote}</p>}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

// =====================================================================================
// Bloque de semana (R2 · paso 2: «la semana manda»): la planta (semana REAL), la semana en Alegreya con
// las flechas de explorar al lado, el hito como frase y la misión de quien lee. Es lo primero que se ve
// (390×844): el corazón de la semana ya no queda debajo de las tareas. La ficha (longitud, peso,
// tamaño) queda más abajo como detalle (FetalCard).
// =====================================================================================

/** "Semana 24 + 3 días · hoy es la fecha probable" → partes para componer el título. */
function splitWeekLabel(label: string): { week: string; extra?: string; note?: string } {
  const [main, ...rest] = label.split(" · ");
  const note = rest.length ? rest.join(" · ") : undefined;
  const plus = main.indexOf(" + ");
  return plus > 0 ? { week: main.slice(0, plus), extra: main.slice(plus + 1), note } : { week: main, note };
}

/**
 * Semana que se mira en la Guía. La real no se pierde: explorar solo cambia el hito, la misión y la
 * ficha (y la planta pequeña de la tira «Viendo la semana N»). Estado de interfaz, sin Firebase.
 */
export type WeekExplorer = {
  /** Semana que se muestra: la explorada, la real o, sin semana confirmada, la de ejemplo. */
  display: number;
  /** Hay semana real y se está mirando otra. */
  exploring: boolean;
  /** Ya se usaron las flechas (para anunciar la semana al lector). */
  touched: boolean;
  go: (week: number) => void;
  reset: () => void;
};

export function useWeekExplorer(realWeek: number | undefined, fallbackWeek: number): WeekExplorer {
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const display = viewWeek ?? realWeek ?? fallbackWeek;
  return {
    display,
    exploring: realWeek !== undefined && display !== realWeek,
    touched: viewWeek !== null,
    go: (w) => setViewWeek(Math.min(WEEK_MAX, Math.max(WEEK_MIN, w))),
    reset: () => setViewWeek(null),
  };
}

/** Flechas de explorar: fantasmas de 44px (el chevrón queda alineado con el margen de la columna). */
function WeekStepper({ explorer, className = "" }: { explorer: WeekExplorer; className?: string }) {
  const { display, go } = explorer;
  const btn = `grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface-hover disabled:text-ink-disabled disabled:hover:bg-transparent ${FOCUS}`;
  return (
    <div className={`flex shrink-0 ${className}`}>
      <button type="button" onClick={() => go(display - 1)} disabled={display <= WEEK_MIN} aria-label="Ver la semana anterior" className={btn}>
        <ChevronLeft size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => go(display + 1)} disabled={display >= WEEK_MAX} aria-label="Ver la semana siguiente" className={btn}>
        <ChevronRight size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Hito (frase, no título) y misión de quien lee para la semana que se mira. */
function WeekHeart({
  week,
  reader,
  typical,
  partnerName,
  onOpenLink,
}: {
  week: number;
  reader: Role;
  /** Sin semana confirmada: es lo típico de esa semana, no necesariamente la suya. */
  typical: boolean;
  partnerName?: string;
  /** La misión nombra una herramienta (o la Agenda): un botón lleva directo a ella. */
  onOpenLink?: (target: GuiaLinkTarget) => void;
}) {
  const info = getWeek(week);
  const isMama = reader === "mama";
  const mission = isMama ? info.forMom : info.forDad;
  const link = onOpenLink ? missionLink(mission) : null;
  return (
    <>
      <p className="mt-4 font-display text-subtitle font-normal text-pretty text-ink">{info.milestone}</p>
      <h3 className="mt-5 font-display text-body font-bold text-ink">{isMama ? "Tu misión" : "Tu misión de copiloto"}</h3>
      <p className="mt-1 text-body text-pretty text-ink">{mission}</p>
      {link && onOpenLink && (
        <RowButton onClick={() => onOpenLink(link)} className="mt-3">
          {LINK_LABEL[link]}
        </RowButton>
      )}
      {typical && (
        <p className="mt-2 text-micro font-medium text-ink-subtle">
          {isMama
            ? `Lo típico de la semana ${week}, no necesariamente la tuya.`
            : `Lo típico de la semana ${week}, no necesariamente la de ${partnerName || "tu pareja"}.`}
        </p>
      )}
    </>
  );
}

export function WeekHeader({
  ga,
  reader,
  onConfirmDate,
  needsReview = false,
  explorer,
  partnerName,
  onOpenLink,
}: {
  ga: GestationalAgeState;
  reader: Role;
  onConfirmDate: () => void;
  /** La FPP compartida está fuera de rango (dato remoto dudoso): por eso la semana está sin confirmar. */
  needsReview?: boolean;
  /** Con él, el bloque lleva las flechas de explorar, el hito y la misión (la Guía siempre lo pasa). */
  explorer?: WeekExplorer;
  partnerName?: string;
  /** Botón bajo la misión cuando nombra una herramienta o la Agenda. */
  onOpenLink?: (target: GuiaLinkTarget) => void;
}) {
  const isMama = reader === "mama";
  // La planta dice la semana real; sin confirmar, un brote neutro (no se inventa una semana).
  const plant = (
    <GrowingPlant week={ga.source === "unknown" ? undefined : ga.weeks} size={120} title="" className="-ms-2 shrink-0" />
  );
  // Anuncia la semana al explorar (el hito y la misión cambian con ella).
  const live = explorer && (
    <p className="sr-only" aria-live="polite">
      {explorer.touched ? `Semana ${explorer.display}` : ""}
    </p>
  );

  // Con el texto por debajo de 10rem (zoom del 200% en un teléfono) la planta queda arriba y el texto
  // debajo, en vez de partir "Semana" letra a letra.
  if (ga.source === "unknown") {
    return (
      <section aria-labelledby="guia-week-title">
        <div className="flex flex-wrap items-center gap-3">
          {plant}
          <h2 id="guia-week-title" className="min-w-[10rem] flex-1 font-display text-display text-ink">
            Semana sin confirmar
          </h2>
        </div>
        <p className="mt-2 text-body text-ink-muted">
          {needsReview
            ? "La fecha probable guardada no es válida: serían menos de 2 o más de 42 semanas de embarazo. Revisa la fecha en Ajustes."
            : isMama
              ? "Con tu fecha probable de parto calculamos la semana cada día y te mostramos qué toca."
              : "Con la fecha probable de parto calculamos la semana cada día y les mostramos qué toca."}
        </p>
        <RowButton tone="primary" onClick={onConfirmDate} className="mt-3">
          {needsReview ? "Revisar la fecha" : isMama ? "Confirmar mi fecha" : "Confirmar la fecha"}
        </RowButton>
        {explorer && (
          <>
            {/* Sin semana real: lo típico de una semana de ejemplo, que se puede recorrer. */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="min-w-0 text-meta font-bold text-ink tabular-nums">Semana {explorer.display} · Lo típico de esta semana</p>
              <WeekStepper explorer={explorer} className="-me-3" />
            </div>
            {live}
            <WeekHeart week={explorer.display} reader={reader} typical partnerName={partnerName} onOpenLink={onOpenLink} />
          </>
        )}
      </section>
    );
  }

  const parts = splitWeekLabel(ga.label);
  // Semana REAL (explorar no la cambia). «Semana 24» y «+ 4 días» no se parten por dentro; con las flechas
  // al lado, en un teléfono los días bajan a la segunda línea. Si ni «Semana 24» cabe (≤360px), las
  // flechas bajan a su propia línea.
  const titleRow = (
    <div className="flex flex-wrap items-start gap-x-1">
      <h2 id="guia-week-title" className="min-w-[8.5rem] flex-1 font-display text-display text-ink">
        {/* El espacio va FUERA de los nowrap: es el único punto donde el título puede partirse. */}
        <span className="whitespace-nowrap">{parts.week}</span>
        {parts.extra && (
          <>
            {" "}
            <span className="whitespace-nowrap text-ink-muted">{parts.extra}</span>
          </>
        )}
        {parts.note && <span className="sr-only"> · {parts.note}</span>}
      </h2>
      {explorer && <WeekStepper explorer={explorer} className="ms-auto -me-3 -mt-1.5" />}
    </div>
  );

  let detail: React.ReactNode;
  if (ga.source === "manual") {
    detail = (
      <p className="mt-1 text-meta text-ink-muted">
        Semana elegida a mano: no avanza sola.{" "}
        <button type="button" onClick={onConfirmDate} className={`-mx-2 ${TEXT_ACTION} underline`}>
          Agregar la fecha probable
        </button>
      </p>
    );
  } else {
    const today = new Date();
    // "Según la ecografía · fecha probable: …", "Estimada por la semana que indicaron · fecha probable estimada: …"
    const src = dueDateSummary(ga.dueDateSource, reader, ga.dueDate ? formatDateLong(ga.dueDate, today) : undefined);
    const total = ga.totalDays ?? 0;
    const left = PREGNANCY_DAYS - total;
    detail = (
      <>
        {parts.note && (
          <p aria-hidden="true" className="mt-1 text-meta font-bold text-ink">
            {cap(parts.note)}
          </p>
        )}
        <p className="mt-1.5 text-meta text-ink-muted">{src}</p>
        {left > 0 && (
          <p className="mt-1 text-micro font-medium text-ink-subtle tabular-nums">
            {left === 1 ? "Falta 1 día para la fecha probable" : `Faltan ${left} días para la fecha probable`}
          </p>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="guia-week-title">
      {/* ≥1280px el texto sube al borde superior: la semana queda a la altura de «Hoy» (columna derecha). */}
      <div className="flex flex-wrap items-center gap-3 xl:items-start">
        {plant}
        <div className="min-w-[10rem] flex-1">
          {titleRow}
          {detail}
        </div>
      </div>
      {explorer && (
        <>
          {live}
          {explorer.exploring && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-sunken py-1.5 ps-1.5 pe-3">
              {/* La planta pequeña sigue a la semana que se explora (al avanzar, crece). La grande no cambia. */}
              <GrowingPlant week={explorer.display} size={56} title="" className="shrink-0" />
              <p className="min-w-0 flex-1 text-meta font-bold text-ink tabular-nums">Viendo la semana {explorer.display}</p>
              <button type="button" onClick={explorer.reset} className={`${TEXT_ACTION} underline`}>
                Volver a hoy
              </button>
            </div>
          )}
          <WeekHeart week={explorer.display} reader={reader} typical={false} partnerName={partnerName} onOpenLink={onOpenLink} />
        </>
      )}
    </section>
  );
}

// =====================================================================================
// «¿Es la hora?» (desde la semana 36 con semana conocida)
// =====================================================================================

/**
 * Cuándo llamar, según la semana (y en la voz de quien lee):
 * - 36: regla pretérmino (4 o más contracciones en una hora), no la 5-1-1.
 * - 37–40: regla 5-1-1.
 * - 41–42: término tardío / postérmino: seguir el plan de controles.
 * - Más de 42 + 6 (fecha dudosa): revisar la fecha; las señales que valen en cualquier semana.
 */
export function laborReadyText(weeks: number, reader: Role, partnerName?: string, dateInDoubt = false): string {
  const isMama = reader === "mama";
  const her = partnerName?.trim() || "tu pareja";
  if (dateInDoubt) {
    return isMama
      ? "Revisa la fecha en Ajustes: con la fecha guardada serían más de 42 semanas. Mientras tanto, si se rompe la fuente, tienes sangrado o el bebé se mueve menos, llama ya a tu obstetra."
      : `Revisa la fecha en Ajustes: con la fecha guardada serían más de 42 semanas. Mientras tanto, si a ${her} se le rompe la fuente, tiene sangrado o el bebé se mueve menos, llama ya a su obstetra.`;
  }
  if (weeks < 37) {
    return isMama
      ? `Semana ${weeks}: el parto se acerca. Llama a tu obstetra si se rompe la fuente, tienes sangrado, el bebé se mueve menos o tienes 4 o más contracciones en una hora: antes de la semana 37 no esperes a la regla 5-1-1 (contracciones cada 5 minutos, de 1 minuto, durante 1 hora).`
      : `Semana ${weeks}: el parto se acerca. Llama a su obstetra si a ${her} se le rompe la fuente, tiene sangrado, el bebé se mueve menos o tiene 4 o más contracciones en una hora: antes de la semana 37 no esperen a la regla 5-1-1 (contracciones cada 5 minutos, de 1 minuto, durante 1 hora).`;
  }
  if (weeks <= 40) {
    return isMama
      ? `Semana ${weeks}: el parto puede empezar cualquier día. Llama a tu obstetra o ve al hospital si se rompe la fuente, tienes sangrado, el bebé se mueve menos o las contracciones llegan cada 5 minutos, duran 1 minuto y siguen así durante 1 hora.`
      : `Semana ${weeks}: el parto puede empezar cualquier día. Llama a su obstetra o vayan al hospital si a ${her} se le rompe la fuente, tiene sangrado, el bebé se mueve menos o las contracciones llegan cada 5 minutos, duran 1 minuto y siguen así durante 1 hora.`;
  }
  return isMama
    ? `Semana ${weeks}: ya pasó la fecha probable. Sigue el plan de controles de tu obstetra y llama si se rompe la fuente, tienes sangrado o el bebé se mueve menos.`
    : `Semana ${weeks}: ya pasó la fecha probable. Sigan el plan de controles de su obstetra. Llama si a ${her} se le rompe la fuente, tiene sangrado o el bebé se mueve menos.`;
}

export function LaborReadyBlock({
  weeks,
  totalDays,
  reader = "mama",
  partnerName,
  onReviewDate,
}: {
  weeks: number;
  /** Días reales de EG (sin acotar). Más de 42 + 6 → la fecha guardada es dudosa. */
  totalDays?: number;
  reader?: Role;
  partnerName?: string;
  /** Abre Ajustes en la fecha (se ofrece solo si la fecha es dudosa). */
  onReviewDate?: () => void;
}) {
  const dateInDoubt = typeof totalDays === "number" && totalDays > MAX_VALID_GESTATION_DAYS;
  return (
    // Solo el criterio y las llamadas: así la planta, la semana y el inicio de «Hoy» caben en la primera
    // pantalla (390×844). Cronometrar y la maleta viven en «Hoy» («Para el parto»); las señales de alarma,
    // en «Síntomas» de la cabecera. ≥1280px: texto a la izquierda y llamadas a la derecha.
    <section aria-labelledby="guia-labor-title" className="xl:grid xl:grid-cols-2 xl:items-start xl:gap-x-16">
      <div>
        <div>
          <h2 id="guia-labor-title" className="font-display text-title text-ink">
            ¿Es la hora?
          </h2>
          <p className="mt-1.5 text-body text-ink">{laborReadyText(weeks, reader, partnerName, dateInDoubt)}</p>
        </div>
        {dateInDoubt && onReviewDate && (
          <button type="button" onClick={onReviewDate} className={`mt-1 -mx-2 ${TEXT_ACTION} underline`}>
            Revisar la fecha
          </button>
        )}
      </div>
      {/* Llamar, a un toque (Principio 1): la acción más fuerte de la pantalla, fuera de cualquier lista.
          Antes de la 37 manda la regla pretérmino. */}
      <CallActions context={weeks >= 37 ? "contracciones" : "pretermino"} className="mt-3 xl:mt-1" />
    </section>
  );
}

// =====================================================================================
// «Para comentar en tu próximo control» (R2 · paso 3): lo que quedó sin marcar de ventanas ya cerradas
// (vacunas, pruebas, trámites con el equipo de salud) se agrupa en UNA fila serena que se despliega en su
// sitio. Sin ámbar por fila ni reproches: el aviso es un icono ámbar y una frase. Las que se marcan siguen
// a la vista (marcadas) mientras dure la sesión: nada se mueve bajo el dedo ni se pierde el foco.
// =====================================================================================

export function discussTitle(pending: number, reader: Role): string {
  const control = reader === "mama" ? "tu próximo control" : "el próximo control";
  if (pending === 0) return `Todo al día para ${control}`;
  return `${pending} ${pending === 1 ? "cosa" : "cosas"} para comentar en ${control}`;
}

export function DiscussGroup({
  rows,
  reader,
  ownerLabels,
  disabled,
  onToggleDone,
  onAssign,
  idBase,
  topRule = false,
  listenOpenRequest = false,
  bleed = true,
  className,
}: {
  rows: TaskRowModel[];
  reader: Role;
  ownerLabels: OwnerLabels;
  disabled: boolean;
  onToggleDone: (row: TaskRowModel) => void;
  onAssign: (row: TaskRowModel, owner: TaskOwner) => void;
  idBase: string;
  /** Filete arriba, alineado con el texto (cuando sigue a otra lista, p. ej. la próxima cita). */
  topRule?: boolean;
  /** Responde al enlace «Marcarlas en la Guía» de la preparación de cita (solo el de «Hoy»). */
  listenOpenRequest?: boolean;
  /** Las filas sangran hasta el borde de la columna (false dentro de la hoja, que no tiene margen lateral). */
  bleed?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const request = useOpenDiscussRequest();
  const [seenRequest, setSeenRequest] = useState(request);
  const [mountRequest] = useState(request);
  if (listenOpenRequest && request !== seenRequest) {
    setSeenRequest(request);
    setOpen(true);
  }
  // Tras «Marcarlas en la Guía»: el grupo abierto, a la vista y con el foco (no al montar).
  useEffect(() => {
    if (!listenOpenRequest || request === mountRequest) return;
    const el = toggleRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: "center" });
  }, [listenOpenRequest, request, mountRequest]);

  if (rows.length === 0) return null;
  const pending = rows.filter((r) => !r.completed).length;
  const panelId = `${idBase}-panel`;
  const rule = "[&>li:first-child_.pj-row-body]:border-t [&>li:first-child_.pj-row-body]:border-line";
  return (
    <div className={className}>
      <ListGroup bleed={bleed} className={topRule ? rule : undefined}>
        <ListRow
          buttonRef={toggleRef}
          leading={<Stethoscope {...ICON} className="text-amber-ink" />}
          title={discussTitle(pending, reader)}
          meta={pending > 0 ? "Sus ventanas ya pasaron y no están marcadas." : undefined}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          trailing={
            <ChevronDown
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              className={`shrink-0 text-ink-subtle transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
          }
        />
      </ListGroup>
      <div id={panelId} hidden={!open}>
        {open && (
          <ListGroup bleed={bleed} className={rule}>
            {rows.map((row) => (
              <TaskRow
                key={row.task.id}
                idBase={`${idBase}-${row.task.id}`}
                row={row}
                ownerLabels={ownerLabels}
                disabled={disabled}
                onToggleDone={() => onToggleDone(row)}
                onAssign={(o) => onAssign(row, o)}
              />
            ))}
          </ListGroup>
        )}
      </div>
    </div>
  );
}

// =====================================================================================
// «Hoy» (R2 · paso 2): lo mínimo para hoy. A la vista, dos tareas —la más relevante de quien lee y la
// de su pareja (o «De los dos»)— y la próxima cita; «Ver las N» despliega el resto de la semana en su
// sitio. Lo del parto (36+) va antes; «Todas las tareas» (la hoja con los trimestres) cierra el bloque.
// =====================================================================================

export type TodayGroup = { id: "mine" | "partner" | "both"; title: string; rows: TaskRowModel[] };
export type NextEventInfo = { title: string; when: string; relative: string; byName?: string; byRole?: Role };
export type SinceLastVisit = { name?: string; role?: Role; text: string; titles: string[] } | null;
/** Entrada a la hoja «Todas las tareas»: progreso total y dónde vive (SyncBadge). */
export type AllTasksEntry = {
  done: number;
  total: number;
  /** false = aún sin el primer dato del servidor: no se afirma un conteo. */
  loaded: boolean;
  onOpen: () => void;
  /** Estado de sincronía del progreso (SyncBadge), junto a las tareas de la semana. */
  syncBadge?: React.ReactNode;
};

/** "3 de 21 hechas" (sin conteo mientras carga). */
export function allTasksProgress(done: number, total: number, loaded: boolean): string | null {
  if (!loaded) return null;
  return `${done} de ${total} ${total === 1 ? "hecha" : "hechas"}`;
}

/**
 * Las dos tareas a la vista en «Hoy»: la más relevante de quien lee y la de su pareja (o «De los dos»
 * si la pareja no tiene). Cada grupo ya viene ordenado por relevancia (ventana abierta que cierra antes,
 * hábitos, ventanas recién cerradas y, al final, lo hecho). Si falta alguna, se completa con el resto.
 */
export function featuredTaskIds(groups: TodayGroup[]): string[] {
  const rowsOf = (id: TodayGroup["id"]) => groups.find((g) => g.id === id)?.rows ?? [];
  const mine = rowsOf("mine");
  const partner = rowsOf("partner");
  const both = rowsOf("both");
  const out: string[] = [];
  const take = (list: TaskRowModel[]) => {
    const r = list.find((x) => !out.includes(String(x.task.id)));
    if (r) out.push(String(r.task.id));
  };
  take(mine);
  take(partner.length ? partner : both);
  for (const list of [both, partner, mine]) if (out.length < 2) take(list);
  return out;
}

/** Subtítulo de un grupo de «Hoy» (h3). La lista va justo después (el h3 y su lista son hermanos). */
function GroupHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <h3 className="flex items-baseline justify-between gap-3">
      <span className="font-display text-body font-bold text-ink">{title}</span>
      {aside && <span className="shrink-0 text-micro font-medium text-ink-subtle tabular-nums">{aside}</span>}
    </h3>
  );
}

export function TodayBlock({
  weekKnown,
  reader,
  groups,
  ownerLabels,
  loading,
  loadingText,
  disabled,
  onToggleDone,
  onAssign,
  nextEvent,
  eventsLoading,
  onOpenPrep,
  onGoToAgenda,
  sinceLastVisit,
  onOpenTool,
  allTasks,
  discuss = [],
}: {
  weekKnown: boolean;
  reader: Role;
  groups: TodayGroup[];
  ownerLabels: OwnerLabels;
  loading: boolean;
  loadingText: string;
  disabled: boolean;
  onToggleDone: (row: TaskRowModel) => void;
  onAssign: (row: TaskRowModel, owner: TaskOwner) => void;
  nextEvent: NextEventInfo | null;
  eventsLoading: boolean;
  onOpenPrep: () => void;
  onGoToAgenda: () => void;
  sinceLastVisit: SinceLastVisit;
  /** Desde la semana 36 (semana conocida): «Para el parto», con el cronómetro y la maleta a mano. */
  onOpenTool?: (tool: GuiaTool) => void;
  /** Fila «Todas las tareas» al final de «Hoy» (abre la hoja con los trimestres). */
  allTasks?: AllTasksEntry;
  /** Ventanas cerradas hace poco y sin marcar (más las marcadas en esta sesión): van con la próxima cita. */
  discuss?: TaskRowModel[];
}) {
  const [expanded, setExpanded] = useState(false);
  const todayText = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  // Todas las de la semana, por dueño (tuyas, de tu pareja, de los dos) y, dentro, por relevancia.
  const weekRows = (["mine", "partner", "both"] as const).flatMap((id) => groups.find((g) => g.id === id)?.rows ?? []);
  // Las dos destacadas se fijan mientras no cambie el conjunto de tareas: marcar o reasignar una no la
  // saca de su sitio (ni se pierde el foco). Cambian con la semana o si una sale de la lista.
  const setKey = weekRows.map((r) => String(r.task.id)).sort().join(",");
  const [pin, setPin] = useState<{ key: string; ids: string[] }>({ key: "", ids: [] });
  let featuredIds = pin.ids;
  if (pin.key !== setKey) {
    featuredIds = featuredTaskIds(groups);
    setPin({ key: setKey, ids: featuredIds });
  }
  const byId = new Map(weekRows.map((r) => [String(r.task.id), r] as const));
  const featured = featuredIds.map((id) => byId.get(id)).filter((r): r is TaskRowModel => !!r);
  const rest = weekRows.filter((r) => !featuredIds.includes(String(r.task.id)));
  const shown = expanded ? [...featured, ...rest] : featured;
  const pending = weekRows.filter((r) => !r.completed).length;
  const hasRows = weekKnown && !loading && weekRows.length > 0;

  return (
    <section aria-labelledby="guia-hoy-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="guia-hoy-title" className="font-display text-title text-ink">
          Hoy
        </h2>
        <span className="text-meta text-ink-subtle">{cap(todayText)}</span>
      </div>

      {sinceLastVisit && (
        <div className="mt-3 flex items-start gap-3">
          <span className="mt-0.5">
            <AuthorChip name={sinceLastVisit.name} role={sinceLastVisit.role} decorative />
          </span>
          <div className="min-w-0">
            <p className="text-meta font-bold text-ink">{sinceLastVisit.text}</p>
            {sinceLastVisit.titles.length > 0 && (
              <p className="mt-0.5 text-micro font-medium text-ink-subtle">{sinceLastVisit.titles.join(" · ")}</p>
            )}
          </div>
        </div>
      )}

      {/* 36+: lo del parto a mano, antes que las tareas (la semana manda). Emergencias sigue arriba, en CallActions. */}
      {onOpenTool && (
        <div className="mt-6">
          <GroupHeading title="Para el parto" />
          <ListGroup className="mt-1">
            <ListRow
              leading={<Timer {...ICON} />}
              title="Cronometrar contracciones"
              meta="Frecuencia, duración y cuándo llamar"
              onClick={() => onOpenTool("contracciones")}
              trailing="chevron"
            />
            <ListRow
              leading={<Luggage {...ICON} />}
              title="Maleta del hospital"
              meta="Revisa qué falta"
              onClick={() => onOpenTool("maleta")}
              trailing="chevron"
            />
          </ListGroup>
        </div>
      )}

      {/* Tareas de la semana: dos a la vista (quién hace qué se lee en cada fila) y el resto a un toque. */}
      <div className="mt-6">
        <GroupHeading
          title="Tareas de la semana"
          aside={hasRows ? (pending === 0 ? "Todo hecho" : pending === 1 ? "1 pendiente" : `${pending} pendientes`) : undefined}
        />
        {!weekKnown ? (
          <p className="mt-1 text-body text-ink-muted">
            {reader === "mama"
              ? "Cuando confirmes tu fecha, aquí verás qué toca esta semana y a quién le toca."
              : "Cuando confirmen la fecha, aquí verás qué toca esta semana y a quién le toca."}
          </p>
        ) : loading ? (
          <p className="mt-1 text-body text-ink-muted" aria-live="polite">
            {loadingText}
          </p>
        ) : weekRows.length === 0 ? (
          <p className="mt-1 text-body text-ink-muted">
            No hay tareas con fecha para esta semana.{allTasks ? " En «Todas las tareas» están las de cada trimestre." : ""}
          </p>
        ) : (
          <ListGroup className="mt-1">
            {shown.map((row) => (
              <TaskRow
                key={row.task.id}
                idBase={`hoy-${row.task.id}`}
                row={row}
                ownerLabels={ownerLabels}
                disabled={disabled}
                onToggleDone={() => onToggleDone(row)}
                onAssign={(o) => onAssign(row, o)}
              />
            ))}
          </ListGroup>
        )}
        {hasRows && (rest.length > 0 || allTasks?.syncBadge) && (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4">
            {rest.length > 0 && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className={`-mx-2 ${TEXT_ACTION}`}
              >
                {/* «Ver las 8», no «Ver todas»: «Todas las tareas» (todo el embarazo) es la fila del final. */}
                {expanded ? "Ver menos" : `Ver las ${weekRows.length}`}
              </button>
            )}
            {/* Dónde vive este progreso: solo aquí o compartido con la pareja. */}
            {allTasks?.syncBadge && <div className="ms-auto flex min-h-11 min-w-0 items-center">{allTasks.syncBadge}</div>}
          </div>
        )}
      </div>

      {/* Próxima cita (solo futura) */}
      <div className="mt-6">
        <GroupHeading title="Próxima cita" />
        <ListGroup className="mt-1">
          {eventsLoading ? (
            <li>
              <p className="pj-row-body py-3 ps-[var(--gutter)] pe-[var(--gutter)] text-body text-ink-muted" aria-live="polite">
                Cargando la agenda…
              </p>
            </li>
          ) : nextEvent ? (
            <ListRow
              leading={<CalendarClock {...ICON} />}
              title={nextEvent.title}
              meta={`${cap(nextEvent.relative)} · ${nextEvent.when}${nextEvent.byName ? ` · agendada por ${nextEvent.byName}` : ""}`}
              trailing={
                <RowButton onClick={onOpenPrep} aria-label={`Preparar cita: ${nextEvent.title}`} aria-haspopup="dialog">
                  Preparar cita
                </RowButton>
              }
            />
          ) : (
            <ListRow
              leading={<CalendarPlus {...ICON} className="text-ink-subtle" />}
              title="No hay citas próximas en la agenda."
              weight="medium"
              trailing={
                <RowButton tone="default" onClick={onGoToAgenda}>
                  Agendar
                </RowButton>
              }
            />
          )}
        </ListGroup>
        {/* Lo que quedó de semanas pasadas se lleva a esta cita (también está en su preparación). */}
        {weekKnown && !loading && (
          <DiscussGroup
            rows={discuss}
            reader={reader}
            ownerLabels={ownerLabels}
            disabled={disabled}
            onToggleDone={onToggleDone}
            onAssign={onAssign}
            idBase="hoy-comentar"
            topRule
            listenOpenRequest
          />
        )}
      </div>

      {/* El resto del embarazo, en su propia hoja: aquí no se repite ninguna tarea de arriba. */}
      {allTasks && (
        <ListGroup edges className="mt-6">
          <ListRow
            leading={<ListChecks {...ICON} />}
            title="Todas las tareas"
            meta={
              <span className="tabular-nums">
                {cap([allTasksProgress(allTasks.done, allTasks.total, allTasks.loaded), "por trimestre"].filter(Boolean).join(" · "))}
              </span>
            }
            onClick={allTasks.onOpen}
            aria-haspopup="dialog"
            trailing="chevron"
          />
        </ListGroup>
      )}
    </section>
  );
}

// =====================================================================================
// Ficha del bebé (R2 · paso 2): solo el detalle de la semana que se mira —longitud (con cómo se mide),
// peso y tamaño aproximado, en ese orden: la comparación va al final—. El hito y la misión viven en el
// bloque de semana y aquí no se repiten. Al explorar, sigue a la semana explorada.
// =====================================================================================

export function FetalCard({
  week,
  realWeek,
  theme,
}: {
  /** Semana que se mira (la explorada, la real o, sin semana confirmada, la de ejemplo). */
  week: number;
  /** Semana real (undefined = sin confirmar: es "lo típico de la semana X"). */
  realWeek: number | undefined;
  theme: "frutas" | "geek";
}) {
  const info = getWeek(week);
  const measure = lengthMeasure(week);
  const title =
    realWeek === undefined ? `Lo típico en la semana ${week}` : week === realWeek ? "El bebé esta semana" : `El bebé en la semana ${week}`;
  const fact = "flex items-baseline justify-between gap-4 py-2";

  return (
    <section aria-labelledby="guia-fetal-title">
      <h2 id="guia-fetal-title" className="font-display text-subtitle text-ink">
        {title}
      </h2>
      <dl className="mt-2 divide-y divide-line">
        <div className={fact}>
          <dt className="text-meta text-ink-muted">
            Longitud
            {/* Cómo se mide va con la longitud, no al pie de la ficha (ahí se leía como nota del tamaño con fruta). */}
            {measure && (
              <span className="block text-micro font-medium text-ink-subtle">
                {measure === "coronilla-rabadilla" ? "De la coronilla a la rabadilla" : "De la cabeza al talón"}
              </span>
            )}
          </dt>
          <dd className="text-body font-bold text-ink tabular-nums">{formatLength(info)}</dd>
        </div>
        <div className={fact}>
          <dt className="text-meta text-ink-muted">Peso</dt>
          <dd className="text-body font-bold text-ink tabular-nums">{formatWeight(info)}</dd>
        </div>
        <div className={fact}>
          <dt className="shrink-0 text-meta text-ink-muted">Tamaño aproximado</dt>
          <dd className="min-w-0 text-right text-body font-medium text-ink">{theme === "geek" ? info.size.geek : info.size.fruta}</dd>
        </div>
      </dl>
      {info.note && <p className="mt-2 text-micro font-medium text-ink-subtle">{info.note}</p>}
    </section>
  );
}

// =====================================================================================
// Checklists por trimestre (solo el actual desplegado de entrada): filas desplegables con
// divisores y, dentro, una lista por categoría. Viven en la hoja «Todas las tareas», no en la
// Guía: así ninguna tarea de «Hoy» se repite en la misma vista. Las filas llegan al borde del
// contenedor (--gutter lo pone quien las monta). Las que están en el grupo «para comentar» (arriba de la
// hoja) no se repiten aquí, pero cuentan en el progreso del trimestre.
// =====================================================================================

export type TrimesterModel = {
  trimester: 1 | 2 | 3;
  range: string;
  categories: { id: string; title: string; rows: TaskRowModel[] }[];
};

export function TrimesterChecklists({
  trimesters,
  currentTrimester,
  ownerLabels,
  disabled,
  onToggleDone,
  onAssign,
  groupedIds,
}: {
  trimesters: TrimesterModel[];
  currentTrimester: 1 | 2 | 3 | undefined;
  ownerLabels: OwnerLabels;
  disabled: boolean;
  onToggleDone: (row: TaskRowModel) => void;
  onAssign: (row: TaskRowModel, owner: TaskOwner) => void;
  /** Tareas que se muestran en el grupo «para comentar» de arriba (aquí no se repiten). */
  groupedIds?: ReadonlySet<string>;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const grouped = (r: TaskRowModel) => !!groupedIds?.has(String(r.task.id));
  return (
    <div>
      {trimesters.map((t, i) => {
        const isOpen = open[t.trimester] ?? t.trimester === currentTrimester;
        const rows = t.categories.flatMap((c) => c.rows);
        const done = rows.filter((r) => r.completed).length;
        const toDiscuss = rows.filter((r) => grouped(r) && !r.completed).length;
        const panelId = `guia-trim-${t.trimester}`;
        return (
          <div key={t.trimester}>
            {/* Divisor entre trimestres: empieza en el texto, como el de las filas. */}
            {i > 0 && <div aria-hidden="true" className="ms-[var(--gutter)] h-px bg-line" />}
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((s) => ({ ...s, [t.trimester]: !isOpen }))}
                className={`flex min-h-16 w-full items-center justify-between gap-3 px-[var(--gutter)] py-3 text-left transition-colors hover:bg-surface-hover ${FOCUS_INSET}`}
              >
                <span className="min-w-0">
                  <span className="block font-display text-body font-bold text-ink">
                    Trimestre {t.trimester}
                    {t.trimester === currentTrimester ? <span className="font-sans font-medium text-ink-muted"> · el actual</span> : null}
                  </span>
                  <span className="mt-0.5 block text-meta text-ink-muted tabular-nums">
                    {t.range} · {done} de {rows.length} hechas
                    {toDiscuss > 0 ? ` · ${toDiscuss} para comentar en el control` : ""}
                  </span>
                </span>
                <ChevronDown
                  size={20}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={`shrink-0 text-ink-subtle transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            </h3>
            <div id={panelId} hidden={!isOpen} className="pb-3">
              {isOpen &&
                t.categories.map((cat) => {
                  const shown = cat.rows.filter((r) => !grouped(r));
                  return shown.length === 0 ? null : (
                  <div key={cat.id}>
                    <h4 className="px-[var(--gutter)] pt-4 pb-0.5 text-meta font-bold text-ink-muted">{cat.title}</h4>
                    <ListGroup bleed={false}>
                      {shown.map((row) => (
                        <TaskRow
                          key={row.task.id}
                          idBase={`trim-${row.task.id}`}
                          row={row}
                          ownerLabels={ownerLabels}
                          disabled={disabled}
                          onToggleDone={() => onToggleDone(row)}
                          onAssign={(o) => onAssign(row, o)}
                        />
                      ))}
                    </ListGroup>
                  </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================================
// Hoja «Todas las tareas»: los tres trimestres en su propia vista (ModalPortal + useModalDialog).
// En el teléfono sube desde abajo; desde sm se centra. El foco entra al panel (el lector anuncia
// el título y el progreso) y al cerrar vuelve a la fila que la abrió.
// =====================================================================================

export function AllTasksSheet({
  onClose,
  done,
  total,
  loaded,
  loadingText,
  syncBadge,
  trimesters,
  currentTrimester,
  ownerLabels,
  disabled,
  onToggleDone,
  onAssign,
  reader,
  discuss = [],
}: {
  onClose: () => void;
  done: number;
  total: number;
  /** false = aún sin el primer dato del servidor (no se puede marcar ni se afirma un conteo). */
  loaded: boolean;
  loadingText: string;
  /** Dónde vive este progreso: solo aquí o compartido con la pareja. */
  syncBadge?: React.ReactNode;
  trimesters: TrimesterModel[];
  currentTrimester: 1 | 2 | 3 | undefined;
  ownerLabels: OwnerLabels;
  disabled: boolean;
  onToggleDone: (row: TaskRowModel) => void;
  onAssign: (row: TaskRowModel, owner: TaskOwner) => void;
  reader: Role;
  /** Ventanas pasadas sin marcar (de todo el embarazo): un grupo arriba, fuera de los trimestres. */
  discuss?: TaskRowModel[];
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const groupedIds = new Set(discuss.map((r) => String(r.task.id)));
  const { dialogProps } = useModalDialog({
    open: true,
    onClose,
    labelledBy: "guia-all-title",
    describedBy: "guia-all-desc",
    initialFocusRef: panelRef,
  });
  const { ref: dialogRef, ...dialogRest } = dialogProps;
  const setPanel = useCallback(
    (el: HTMLDivElement | null) => {
      panelRef.current = el;
      dialogRef(el);
    },
    [dialogRef]
  );
  const progress = allTasksProgress(done, total, loaded);

  return (
    <ModalPortal>
      <div className={`fixed inset-0 ${Z_CLASS.sheet} flex items-end justify-center sm:items-center sm:p-4`}>
        {/* Tocar fuera cierra (Escape también, desde useModalDialog). */}
        <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" />
        <div
          ref={setPanel}
          {...dialogRest}
          className="relative flex max-h-[min(92dvh,var(--sheet-max))] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-surface-raised text-ink shadow-sheet outline-none sm:rounded-3xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 pt-5 pb-4">
            <div className="min-w-0">
              <h2 id="guia-all-title" className="font-display text-title text-balance text-ink">
                Todas las tareas
              </h2>
              <p id="guia-all-desc" className="mt-1 text-meta text-ink-muted">
                {progress && <span className="font-bold text-ink tabular-nums">{cap(progress)}. </span>}
                Toca una tarea para ver por qué importa y a quién le toca.
              </p>
              {syncBadge && <div className="mt-2">{syncBadge}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className={`-me-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink ${FOCUS}`}
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          {/* --gutter = el margen de la cabecera (px-5): las filas llegan al borde de la hoja. */}
          <div className="overflow-y-auto overscroll-contain pb-[calc(0.5rem+var(--safe-bottom))] [--gutter:1.25rem]">
            {!loaded && (
              <p className="px-[var(--gutter)] pt-3 text-meta text-ink-muted" aria-live="polite">
                {loadingText}
              </p>
            )}
            {/* Lo de semanas pasadas sin marcar, en un solo grupo arriba (solo con el dato del servidor). */}
            {loaded && (
              <DiscussGroup
                rows={discuss}
                reader={reader}
                ownerLabels={ownerLabels}
                disabled={disabled}
                onToggleDone={onToggleDone}
                onAssign={onAssign}
                idBase="hoja-comentar"
                bleed={false}
                className="border-b border-line"
              />
            )}
            <TrimesterChecklists
              trimesters={trimesters}
              currentTrimester={currentTrimester}
              ownerLabels={ownerLabels}
              disabled={disabled}
              onToggleDone={onToggleDone}
              onAssign={onAssign}
              groupedIds={loaded ? groupedIds : undefined}
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
