"use client";

// Bloques de la Guía: bloque de semana (con la planta que crece), «¿Es la hora?» (36+), «Hoy», ficha de la
// semana explorable y checklists por trimestre. Solo presentación y estado de interfaz (qué está
// desplegado): las lecturas y escrituras de Firebase viven en page.tsx, en listeners y manejadores.
//
// Fase 6 ("la Guía es un jardín compartido"): secciones y listas con divisores en lugar de tarjetas,
// títulos en Alegreya (font-display) y la planta como firma. Primitivas en @/components/ui/List.

import React, { useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Luggage,
  Timer,
} from "lucide-react";
import { AuthorChip } from "@/components/AuthorChip";
import { CallActions } from "@/components/CallActions";
import { formatDateLong } from "@/components/DatingPicker";
import { GrowingPlant } from "@/components/GrowingPlant";
import { ListGroup, ListRow, RowButton } from "@/components/ui/List";
import { MAX_VALID_GESTATION_DAYS, PREGNANCY_DAYS, dueDateSummary, type GestationalAgeState } from "@/lib/pregnancy";
import { TASK_OWNERS, taskWindow, type TaskOwner, type TaskWithCategory } from "@/lib/tasks";
import { WEEK_MAX, WEEK_MIN, formatLength, formatWeight, getWeek, lengthMeasure } from "@/lib/weeks";

export type Role = "mama" | "papa";
export type OwnerLabels = Record<TaskOwner, string>;
export type GuiaTool = "contracciones" | "sos" | "maleta";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta-ink";
/** Acción de texto (terracota) con objetivo ≥44px. */
const TEXT_ACTION = `inline-flex min-h-11 items-center rounded-full px-2 text-meta font-bold text-terracotta-ink underline-offset-4 hover:underline ${FOCUS}`;
const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;

const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("es") + s.slice(1) : s);

// =====================================================================================
// Ventana clínica de una tarea (texto sereno; sin "vencida" si la semana no se conoce)
// =====================================================================================

export function taskWindowNote(
  task: Pick<TaskWithCategory, "trimester" | "weekFrom" | "weekTo" | "expiresAfterWindow">,
  week: number | undefined,
  completed: boolean,
  owner: TaskOwner,
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
    // Sin "ya pasó": lo que toca es preguntarlo en el control (p. ej., la Tdap se puede poner después).
    const ask =
      owner === reader
        ? "¿Ya la hiciste? Si no, coméntalo en el próximo control"
        : owner === "ambos"
          ? "¿Ya la hicieron? Si no, coméntenlo en el próximo control"
          : "¿Ya está hecha? Si no, coméntenlo en el próximo control";
    return { text: `Ventana: ${range} · ${ask}`, overdue: true };
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
              <span className={`mt-0.5 block text-meta ${windowNote?.overdue ? "text-amber-ink" : "text-ink-muted"}`}>
                {ownerLabels[owner]}
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
// Bloque de semana: la planta (semana REAL) y la semana en Alegreya; explorar vive en la ficha
// =====================================================================================

/** "Semana 24 + 3 días · hoy es la fecha probable" → partes para componer el título. */
function splitWeekLabel(label: string): { week: string; extra?: string; note?: string } {
  const [main, ...rest] = label.split(" · ");
  const note = rest.length ? rest.join(" · ") : undefined;
  const plus = main.indexOf(" + ");
  return plus > 0 ? { week: main.slice(0, plus), extra: main.slice(plus + 1), note } : { week: main, note };
}

export function WeekHeader({
  ga,
  reader,
  onConfirmDate,
  needsReview = false,
}: {
  ga: GestationalAgeState;
  reader: Role;
  onConfirmDate: () => void;
  /** La FPP compartida está fuera de rango (dato remoto dudoso): por eso la semana está sin confirmar. */
  needsReview?: boolean;
}) {
  const isMama = reader === "mama";
  // La planta dice la semana real; sin confirmar, un brote neutro (no se inventa una semana).
  const plant = (
    <GrowingPlant week={ga.source === "unknown" ? undefined : ga.weeks} size={120} title="" className="-ms-2 shrink-0" />
  );

  // Con el texto por debajo de 10rem (zoom del 200% en un teléfono) la planta queda arriba y el texto
  // debajo, en vez de partir "Semana" letra a letra.
  if (ga.source === "unknown") {
    return (
      <header>
        <div className="flex flex-wrap items-center gap-3">
          {plant}
          <h2 className="min-w-[10rem] flex-1 font-display text-display text-ink">Semana sin confirmar</h2>
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
      </header>
    );
  }

  const parts = splitWeekLabel(ga.label);
  const title = (
    <h2 className="font-display text-display text-ink">
      {parts.week}
      {parts.extra && <span className="whitespace-nowrap text-ink-muted"> {parts.extra}</span>}
      {parts.note && <span className="sr-only"> · {parts.note}</span>}
    </h2>
  );

  if (ga.source === "manual") {
    return (
      <header className="flex flex-wrap items-center gap-3">
        {plant}
        <div className="min-w-[10rem] flex-1">
          {title}
          <p className="mt-1 text-meta text-ink-muted">
            Semana elegida a mano: no avanza sola.{" "}
            <button type="button" onClick={onConfirmDate} className={`-mx-2 ${TEXT_ACTION} underline`}>
              Agregar la fecha probable
            </button>
          </p>
        </div>
      </header>
    );
  }

  const today = new Date();
  // "Según la ecografía · fecha probable: …", "Estimada por la semana que indicaron · fecha probable estimada: …"
  const src = dueDateSummary(ga.dueDateSource, reader, ga.dueDate ? formatDateLong(ga.dueDate, today) : undefined);
  const total = ga.totalDays ?? 0;
  const left = PREGNANCY_DAYS - total;
  return (
    <header className="flex flex-wrap items-center gap-3">
      {plant}
      <div className="min-w-[10rem] flex-1">
        {title}
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
      </div>
    </header>
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
// «Hoy»: qué toca y quién (una lista por dueño), la próxima cita y lo que hizo la pareja
// =====================================================================================

export type TodayGroup = { id: "mine" | "partner" | "both"; title: string; rows: TaskRowModel[] };
export type NextEventInfo = { title: string; when: string; relative: string; byName?: string; byRole?: Role };
export type SinceLastVisit = { name?: string; role?: Role; text: string; titles: string[] } | null;

const GROUP_LIMIT = 4;

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
}) {
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const todayText = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const visible = groups.filter((g) => g.rows.length > 0);

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

      {/* Tareas por dueño */}
      {!weekKnown ? (
        <p className="mt-3 text-body text-ink-muted">
          {reader === "mama"
            ? "Cuando confirmes tu fecha, aquí verás qué toca esta semana y a quién le toca."
            : "Cuando confirmen la fecha, aquí verás qué toca esta semana y a quién le toca."}
        </p>
      ) : loading ? (
        <p className="mt-3 text-body text-ink-muted" aria-live="polite">
          {loadingText}
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-3 text-body text-ink-muted">No hay tareas con fecha para esta semana. Abajo están todas las del trimestre.</p>
      ) : (
        visible.map((g) => {
          const all = !!showAll[g.id];
          const rows = all ? g.rows : g.rows.slice(0, GROUP_LIMIT);
          const pending = g.rows.filter((r) => !r.completed).length;
          return (
            <div key={g.id} className="mt-6">
              <GroupHeading
                title={g.title}
                aside={pending === 0 ? "Todo hecho" : pending === 1 ? "1 pendiente" : `${pending} pendientes`}
              />
              <ListGroup className="mt-1">
                {rows.map((row) => (
                  <TaskRow
                    key={row.task.id}
                    idBase={`hoy-${g.id}-${row.task.id}`}
                    row={row}
                    ownerLabels={ownerLabels}
                    disabled={disabled}
                    onToggleDone={() => onToggleDone(row)}
                    onAssign={(o) => onAssign(row, o)}
                  />
                ))}
              </ListGroup>
              {g.rows.length > GROUP_LIMIT && (
                <button
                  type="button"
                  aria-expanded={all}
                  onClick={() => setShowAll((s) => ({ ...s, [g.id]: !all }))}
                  className={`mt-1 -mx-2 ${TEXT_ACTION}`}
                >
                  {all ? "Ver menos" : `Ver todas (${g.rows.length})`}
                </button>
              )}
            </div>
          );
        })
      )}

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
                <RowButton onClick={onOpenPrep} aria-label={`Preparar la cita: ${nextEvent.title}`} aria-haspopup="dialog">
                  Preparar
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
      </div>
    </section>
  );
}

// =====================================================================================
// Ficha de la semana (1..42) con explorador: sin tarjetas ni etiquetas sobre los títulos.
// El título ES el hito (en Alegreya): la semana ya la dice el bloque de semana, no se repite. Longitud,
// peso y tamaño aproximado (en ese orden: la comparación va al final) en una lista de definiciones; la
// misión cierra. Al explorar, una planta pequeña muestra (y hace crecer) la semana que se mira; la semana
// real no se pierde.
// =====================================================================================

export function FetalCard({
  realWeek,
  fallbackWeek,
  theme,
  reader,
  partnerName,
}: {
  /** Semana real (undefined = sin confirmar: todo es "lo típico de la semana X"). */
  realWeek: number | undefined;
  fallbackWeek: number;
  theme: "frutas" | "geek";
  reader: Role;
  partnerName?: string;
}) {
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const display = viewWeek ?? realWeek ?? fallbackWeek;
  const exploring = realWeek !== undefined && display !== realWeek;
  const info = getWeek(display);
  const measure = lengthMeasure(display);
  const isMama = reader === "mama";
  const go = (w: number) => setViewWeek(Math.min(WEEK_MAX, Math.max(WEEK_MIN, w)));
  const stepBtn = `grid size-11 shrink-0 place-items-center rounded-full border border-line-control text-ink transition-colors hover:bg-surface-hover disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent ${FOCUS}`;
  const fact = "flex items-baseline justify-between gap-4 py-2.5";
  const srWeek = realWeek === undefined || exploring ? `Semana ${display}` : isMama ? `Tu semana, la ${display}` : `Su semana, la ${display}`;

  return (
    <section aria-labelledby="guia-fetal-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="guia-fetal-title" className="min-w-0 flex-1 pt-1.5 font-display text-subtitle text-ink">
          {/* La semana que se mira, para el lector (a la vista la dicen el bloque de semana o la barra de abajo). */}
          <span className="sr-only">{srWeek}: </span>
          {info.milestone}
        </h2>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => go(display - 1)} disabled={display <= WEEK_MIN} aria-label="Ver la semana anterior" className={stepBtn}>
            <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => go(display + 1)} disabled={display >= WEEK_MAX} aria-label="Ver la semana siguiente" className={stepBtn}>
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
      {/* Anuncia la semana al explorar (el título cambia con ella). */}
      <p className="sr-only" aria-live="polite">
        {viewWeek !== null ? `Semana ${display}` : ""}
      </p>

      {realWeek === undefined && (
        <p className="mt-1 text-meta text-ink-muted">Semana {display} · Lo típico de esta semana</p>
      )}

      {exploring && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-sunken py-1.5 ps-1.5 pe-3">
          {/* La planta sigue a la semana que se explora (al avanzar, crece). La de arriba no cambia. */}
          <GrowingPlant week={display} size={56} title="" className="shrink-0" />
          <p className="min-w-0 flex-1 text-meta font-bold text-ink">Viendo la semana {display}</p>
          <button type="button" onClick={() => setViewWeek(null)} className={`${TEXT_ACTION} underline`}>
            Volver a hoy
          </button>
        </div>
      )}

      <dl className="mt-4 divide-y divide-line">
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

      <h3 className="mt-6 font-display text-body font-bold text-ink">{isMama ? "Tu misión" : "Tu misión de copiloto"}</h3>
      <p className="mt-1 text-body text-ink-muted">{isMama ? info.forMom : info.forDad}</p>
      {!isMama && realWeek === undefined && (
        <p className="mt-2 text-micro font-medium text-ink-subtle">Lo típico de la semana {display}, no necesariamente la de {partnerName || "tu pareja"}.</p>
      )}
      {isMama && realWeek === undefined && (
        <p className="mt-2 text-micro font-medium text-ink-subtle">Lo típico de la semana {display}, no necesariamente la tuya.</p>
      )}
    </section>
  );
}

// =====================================================================================
// Checklists por trimestre (solo el actual desplegado de entrada): filas desplegables con
// divisores y, dentro, una lista por categoría.
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
}: {
  trimesters: TrimesterModel[];
  currentTrimester: 1 | 2 | 3 | undefined;
  ownerLabels: OwnerLabels;
  disabled: boolean;
  onToggleDone: (row: TaskRowModel) => void;
  onAssign: (row: TaskRowModel, owner: TaskOwner) => void;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div className="-mx-[var(--gutter)]">
      {trimesters.map((t, i) => {
        const isOpen = open[t.trimester] ?? t.trimester === currentTrimester;
        const rows = t.categories.flatMap((c) => c.rows);
        const done = rows.filter((r) => r.completed).length;
        const overdue = rows.filter((r) => r.windowNote?.overdue).length;
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
                    {overdue > 0 ? ` · ${overdue === 1 ? "1 pendiente de revisar" : `${overdue} pendientes de revisar`}` : ""}
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
                t.categories.map((cat) => (
                  <div key={cat.id}>
                    <h4 className="px-[var(--gutter)] pt-4 pb-0.5 text-meta font-bold text-ink-muted">{cat.title}</h4>
                    <ListGroup bleed={false}>
                      {cat.rows.map((row) => (
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
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
