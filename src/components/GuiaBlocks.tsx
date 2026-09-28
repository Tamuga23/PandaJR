"use client";

// Bloques de la Guía: cabecera de semana, «¿Es la hora?» (36+), «Hoy», ficha fetal explorable y
// checklists por trimestre. Solo presentación y estado de interfaz (qué está desplegado): las
// lecturas y escrituras de Firebase viven en page.tsx, en listeners y manejadores de eventos.

import React, { useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  HeartPulse,
  Luggage,
  Sparkles,
  Timer,
} from "lucide-react";
import { AuthorChip } from "@/components/AuthorChip";
import { CallActions } from "@/components/CallActions";
import { formatDateLong } from "@/components/DatingPicker";
import { MAX_VALID_GESTATION_DAYS, PREGNANCY_DAYS, dueDateSummary, type GestationalAgeState } from "@/lib/pregnancy";
import { TASK_OWNERS, taskWindow, type TaskOwner, type TaskWithCategory } from "@/lib/tasks";
import { WEEK_MAX, WEEK_MIN, formatLength, formatWeight, getWeek, lengthMeasure } from "@/lib/weeks";

export type Role = "mama" | "papa";
export type OwnerLabels = Record<TaskOwner, string>;
export type GuiaTool = "contracciones" | "sos" | "maleta";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";
const SURFACE = "bg-white dark:bg-[#221d2d] rounded-2xl border border-stone-200/80 dark:border-white/[0.08]";
const MUTED = "text-stone-600 dark:text-[#a6a1b2]";

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
// Fila de tarea: marcar, ver el porqué clínico y reasignar
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
    <li className="py-1">
      <div className="flex items-start gap-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={task.text}
          disabled={disabled}
          onClick={onToggleDone}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors hover:bg-sage/10 disabled:cursor-wait disabled:opacity-60 ${FOCUS}`}
        >
          {completed ? (
            <CheckCircle2 size={22} className="text-sage-ink" aria-hidden="true" />
          ) : (
            <Circle size={22} className="text-stone-500 dark:text-[#a6a1b2]" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
          className={`min-h-[44px] min-w-0 flex-1 flex items-start gap-2 rounded-xl py-2 pr-1 text-left ${FOCUS}`}
        >
          <span className="min-w-0 flex-1">
            <span className="sr-only">Detalles: </span>
            <span
              className={`block text-sm leading-snug ${
                completed ? "text-stone-600 dark:text-[#a6a1b2] line-through decoration-stone-400" : "font-semibold text-stone-800 dark:text-[#eae6e1]"
              }`}
            >
              {task.text}
            </span>
            <span className={`mt-0.5 block text-xs leading-snug ${windowNote?.overdue ? "text-amber-800 dark:text-amber-300" : MUTED}`}>
              {ownerLabels[owner]}
              {windowNote ? ` · ${windowNote.text}` : ""}
            </span>
          </span>
          {author && <AuthorChip size="xs" name={author.name} role={author.role} title={author.title} />}
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`mt-0.5 shrink-0 text-stone-500 dark:text-[#a6a1b2] transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <div id={panelId} hidden={!expanded} className="pl-12 pr-2 pb-3">
        {expanded && (
          <>
            <p className="text-sm leading-relaxed text-stone-700 dark:text-[#d9d4de]">{task.detail}</p>
            <div role="group" aria-label={`Asignar «${task.text}»`} className="mt-3">
              <p className="text-xs font-bold text-stone-700 dark:text-[#d9d4de]">Asignar a</p>
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
                      className={`min-h-[44px] rounded-xl px-3.5 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${FOCUS} ${
                        on
                          ? "bg-sage-ink text-white"
                          : "border border-stone-300 dark:border-white/15 bg-white dark:bg-[#2d273a] text-stone-800 dark:text-[#eae6e1] hover:bg-stone-50 dark:hover:bg-[#352e44]"
                      }`}
                    >
                      {ownerLabels[o]}
                    </button>
                  );
                })}
              </div>
              {row.ownerNote && <p className={`mt-1.5 text-xs ${MUTED}`}>{row.ownerNote}</p>}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

// =====================================================================================
// Cabecera de semana (siempre la semana REAL; explorar vive en la ficha fetal)
// =====================================================================================

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
  if (ga.source === "unknown") {
    return (
      <header>
        <h2 className="text-2xl font-black tracking-tight text-stone-900 dark:text-[#eae6e1]">Semana sin confirmar</h2>
        <p className={`mt-1 text-sm leading-snug ${MUTED}`}>
          {needsReview
            ? "La fecha probable guardada no es válida: serían menos de 2 o más de 42 semanas de embarazo. Revisa la fecha en Ajustes."
            : isMama
              ? "Con tu fecha probable de parto calculamos la semana cada día y te mostramos qué toca."
              : "Con la fecha probable de parto calculamos la semana cada día y les mostramos qué toca."}
        </p>
        <button
          type="button"
          onClick={onConfirmDate}
          className={`mt-3 min-h-[44px] rounded-xl bg-terracotta-ink hover:bg-terracotta-ink-hover px-4 text-sm font-bold text-white transition-colors ${FOCUS}`}
        >
          {needsReview ? "Revisar la fecha" : isMama ? "Confirmar mi fecha" : "Confirmar la fecha"}
        </button>
      </header>
    );
  }

  if (ga.source === "manual") {
    return (
      <header>
        <h2 className="text-2xl font-black tracking-tight text-stone-900 dark:text-[#eae6e1]">{ga.label}</h2>
        <p className={`mt-1 text-sm leading-snug ${MUTED}`}>
          Semana elegida a mano: no avanza sola.{" "}
          <button
            type="button"
            onClick={onConfirmDate}
            className={`inline-flex min-h-[44px] items-center rounded-lg px-1 -mx-1 font-bold text-terracotta-ink underline underline-offset-4 ${FOCUS}`}
          >
            Agregar la fecha probable
          </button>
        </p>
      </header>
    );
  }

  const today = new Date();
  // "Según la ecografía · fecha probable: …", "Estimada por la semana que indicaron · fecha probable estimada: …"
  const src = dueDateSummary(ga.dueDateSource, reader, ga.dueDate ? formatDateLong(ga.dueDate, today) : undefined);
  const total = ga.totalDays ?? 0;
  const left = PREGNANCY_DAYS - total;
  const percent = Math.min(100, Math.max(0, Math.round((total / PREGNANCY_DAYS) * 100)));
  return (
    <header>
      <h2 className="text-2xl font-black tracking-tight text-stone-900 dark:text-[#eae6e1] text-balance">{ga.label}</h2>
      <p className={`mt-1 text-sm leading-snug ${MUTED}`}>{src}</p>
      {left > 0 && (
        <div className="mt-3">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={`Van ${percent}% del embarazo`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-[#2d273a]"
          >
            <div className="h-full rounded-full bg-sage-ink" style={{ width: `${percent}%` }} />
          </div>
          <p className={`mt-1.5 text-xs ${MUTED}`}>
            {left === 1 ? "Falta 1 día para la fecha probable" : `Faltan ${left} días para la fecha probable`}
          </p>
        </div>
      )}
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
      ? `Semana ${weeks}: el parto se acerca. Llama a tu obstetra si se rompe la fuente, tienes sangrado, el bebé se mueve menos o tienes 4 o más contracciones en una hora: antes de la semana 37 no esperes a la regla 5-1-1.`
      : `Semana ${weeks}: el parto se acerca. Llama a su obstetra si a ${her} se le rompe la fuente, tiene sangrado, el bebé se mueve menos o tiene 4 o más contracciones en una hora: antes de la semana 37 no esperen a la regla 5-1-1.`;
  }
  if (weeks <= 40) {
    return isMama
      ? `Semana ${weeks}: el parto puede empezar cualquier día. Llama a tu obstetra o ve al hospital si se rompe la fuente, tienes sangrado, el bebé se mueve menos o las contracciones llegan cada 5 minutos, duran 1 minuto y siguen así durante 1 hora.`
      : `Semana ${weeks}: el parto puede empezar cualquier día. Llama a su obstetra o vayan al hospital si a ${her} se le rompe la fuente, tiene sangrado, el bebé se mueve menos o las contracciones llegan cada 5 minutos, duran 1 minuto y siguen así durante 1 hora.`;
  }
  return isMama
    ? `Semana ${weeks}: ya pasó la fecha probable. Sigue el plan de controles de tu obstetra y llama si se rompe la fuente, tienes sangrado o el bebé se mueve menos.`
    : `Semana ${weeks}: ya pasó la fecha probable. Sigan el plan de controles de su obstetra y llama si a ${her} se le rompe la fuente, tiene sangrado o el bebé se mueve menos.`;
}

export function LaborReadyBlock({
  weeks,
  totalDays,
  reader = "mama",
  partnerName,
  onOpenTool,
  onReviewDate,
}: {
  weeks: number;
  /** Días reales de EG (sin acotar). Más de 42 + 6 → la fecha guardada es dudosa. */
  totalDays?: number;
  reader?: Role;
  partnerName?: string;
  onOpenTool: (tool: GuiaTool) => void;
  /** Abre Ajustes en la fecha (se ofrece solo si la fecha es dudosa). */
  onReviewDate?: () => void;
}) {
  const dateInDoubt = typeof totalDays === "number" && totalDays > MAX_VALID_GESTATION_DAYS;
  const row = `w-full min-h-[64px] flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-[#2d273a] ${FOCUS} focus-visible:-outline-offset-2`;
  const icon = "grid h-10 w-10 shrink-0 place-items-center rounded-xl";
  return (
    <section aria-labelledby="guia-labor-title">
      <h2 id="guia-labor-title" className="text-2xl font-black tracking-tight text-stone-900 dark:text-[#eae6e1]">
        ¿Es la hora?
      </h2>
      <p className="mt-1 text-sm leading-snug text-stone-700 dark:text-[#d9d4de]">{laborReadyText(weeks, reader, partnerName, dateInDoubt)}</p>
      {dateInDoubt && onReviewDate && (
        <button
          type="button"
          onClick={onReviewDate}
          className={`mt-1 inline-flex min-h-[44px] items-center rounded-lg px-1 -mx-1 text-sm font-bold text-terracotta-ink underline underline-offset-4 ${FOCUS}`}
        >
          Revisar la fecha
        </button>
      )}
      {/* Llamar, a un toque (Principio 1). Antes de la 37 manda la regla pretérmino. */}
      <CallActions context={weeks >= 37 ? "contracciones" : "pretermino"} className="mt-3" />
      <ul className={`mt-3 ${SURFACE} divide-y divide-stone-200 dark:divide-white/[0.06] overflow-hidden`}>
        <li>
          <button type="button" onClick={() => onOpenTool("contracciones")} className={row}>
            <span className={`${icon} bg-sage/15 text-sage-ink`}>
              <Timer size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-stone-900 dark:text-[#eae6e1]">Cronometrar contracciones</span>
              <span className={`block text-xs ${MUTED}`}>Frecuencia, duración y cuándo llamar</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-stone-500 dark:text-[#a6a1b2]" />
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpenTool("sos")} className={row}>
            <span className={`${icon} bg-terracotta/10 text-terracotta-ink`}>
              <HeartPulse size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-stone-900 dark:text-[#eae6e1]">Señales de alarma</span>
              <span className={`block text-xs ${MUTED}`}>Qué hacer y a quién llamar</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-stone-500 dark:text-[#a6a1b2]" />
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onOpenTool("maleta")} className={row}>
            <span className={`${icon} bg-amber-100 text-amber-800 dark:bg-amber-300/10 dark:text-amber-300`}>
              <Luggage size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-stone-900 dark:text-[#eae6e1]">Maleta del hospital</span>
              <span className={`block text-xs ${MUTED}`}>Revisa qué falta</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-stone-500 dark:text-[#a6a1b2]" />
          </button>
        </li>
      </ul>
    </section>
  );
}

// =====================================================================================
// «Hoy»: qué toca y quién, próxima cita y lo que hizo la pareja
// =====================================================================================

export type TodayGroup = { id: "mine" | "partner" | "both"; title: string; rows: TaskRowModel[] };
export type NextEventInfo = { title: string; when: string; relative: string; byName?: string; byRole?: Role };
export type SinceLastVisit = { name?: string; role?: Role; text: string; titles: string[] } | null;

const GROUP_LIMIT = 4;

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
}) {
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const todayText = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const visible = groups.filter((g) => g.rows.length > 0);

  return (
    <section aria-labelledby="guia-hoy-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="guia-hoy-title" className="text-2xl font-black tracking-tight text-stone-900 dark:text-[#eae6e1]">
          Hoy
        </h2>
        <span className={`text-sm ${MUTED}`}>{cap(todayText)}</span>
      </div>

      {sinceLastVisit && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl bg-sage/10 dark:bg-sage/[0.12] px-4 py-3">
          <AuthorChip name={sinceLastVisit.name} role={sinceLastVisit.role} decorative />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-snug text-stone-900 dark:text-[#eae6e1]">{sinceLastVisit.text}</p>
            {sinceLastVisit.titles.length > 0 && (
              <p className={`mt-0.5 text-xs leading-snug ${MUTED}`}>{sinceLastVisit.titles.join(" · ")}</p>
            )}
          </div>
        </div>
      )}

      {/* Próxima cita (solo futura) */}
      <div className={`mt-3 ${SURFACE} px-4 py-3`}>
        {eventsLoading ? (
          <p className={`text-sm ${MUTED}`} aria-live="polite">Cargando la agenda…</p>
        ) : nextEvent ? (
          <div className="flex items-center gap-3">
            <CalendarClock size={22} className="shrink-0 text-sage-ink" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${MUTED}`}>Próxima cita · {nextEvent.relative}</p>
              <p className="truncate text-sm font-bold text-stone-900 dark:text-[#eae6e1]">{nextEvent.title}</p>
              <p className={`text-xs ${MUTED}`}>
                {nextEvent.when}
                {nextEvent.byName ? ` · agendada por ${nextEvent.byName}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPrep}
              aria-label={`Preparar la cita: ${nextEvent.title}`}
              aria-haspopup="dialog"
              className={`shrink-0 min-h-[44px] rounded-xl border border-sage-ink/40 px-3 text-sm font-bold text-sage-ink hover:bg-sage/10 transition-colors ${FOCUS}`}
            >
              Preparar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <CalendarPlus size={22} className="shrink-0 text-stone-500 dark:text-[#a6a1b2]" aria-hidden="true" />
            <p className={`min-w-0 flex-1 text-sm ${MUTED}`}>No hay citas próximas en la agenda.</p>
            <button
              type="button"
              onClick={onGoToAgenda}
              className={`shrink-0 min-h-[44px] rounded-xl px-3 text-sm font-bold text-terracotta-ink hover:bg-terracotta/10 transition-colors ${FOCUS}`}
            >
              Agendar
            </button>
          </div>
        )}
      </div>

      {/* Tareas por dueño */}
      {!weekKnown ? (
        <p className={`mt-4 text-sm leading-snug ${MUTED}`}>
          {reader === "mama"
            ? "Cuando confirmes tu fecha, aquí verás qué toca esta semana y a quién le toca."
            : "Cuando confirmen la fecha, aquí verás qué toca esta semana y a quién le toca."}
        </p>
      ) : loading ? (
        <p className={`mt-4 text-sm ${MUTED}`} aria-live="polite">{loadingText}</p>
      ) : visible.length === 0 ? (
        <p className={`mt-4 text-sm leading-snug ${MUTED}`}>
          No hay tareas con fecha para esta semana. Abajo están todas las del trimestre.
        </p>
      ) : (
        visible.map((g) => {
          const all = !!showAll[g.id];
          const rows = all ? g.rows : g.rows.slice(0, GROUP_LIMIT);
          const pending = g.rows.filter((r) => !r.completed).length;
          return (
            <div key={g.id} className="mt-5">
              <h3 className="flex items-baseline justify-between gap-3 text-sm font-bold text-stone-800 dark:text-[#eae6e1]">
                <span>{g.title}</span>
                <span className={`text-xs font-semibold ${MUTED}`}>
                  {pending === 0 ? "Todo hecho" : pending === 1 ? "1 pendiente" : `${pending} pendientes`}
                </span>
              </h3>
              <ul className={`mt-2 ${SURFACE} divide-y divide-stone-100 dark:divide-white/[0.06] px-1`}>
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
              </ul>
              {g.rows.length > GROUP_LIMIT && (
                <button
                  type="button"
                  aria-expanded={all}
                  onClick={() => setShowAll((s) => ({ ...s, [g.id]: !all }))}
                  className={`mt-1 min-h-[44px] rounded-lg px-1 -ml-1 text-sm font-bold text-terracotta-ink underline-offset-4 hover:underline ${FOCUS}`}
                >
                  {all ? "Ver menos" : `Ver todas (${g.rows.length})`}
                </button>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}

// =====================================================================================
// Ficha fetal con explorador de semanas (1..42). La semana real no se pierde al navegar.
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
  const stepBtn = `grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-700 dark:text-[#d9d4de] hover:bg-stone-100 dark:hover:bg-[#2d273a] disabled:text-stone-300 dark:disabled:text-[#4a4458] transition-colors ${FOCUS}`;

  return (
    <section aria-labelledby="guia-fetal-title" className={`${SURFACE} overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 px-2 pt-2">
        <button type="button" onClick={() => go(display - 1)} disabled={display <= WEEK_MIN} aria-label="Ver la semana anterior" className={stepBtn}>
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center" aria-live="polite">
          <h2 id="guia-fetal-title" className="text-lg font-black tracking-tight text-stone-900 dark:text-[#eae6e1]">
            Semana {display}
          </h2>
          <p className={`text-xs ${MUTED}`}>
            {realWeek === undefined ? "Lo típico de esta semana" : exploring ? "Explorando otra semana" : isMama ? "Tu semana" : "Su semana"}
          </p>
        </div>
        <button type="button" onClick={() => go(display + 1)} disabled={display >= WEEK_MAX} aria-label="Ver la semana siguiente" className={stepBtn}>
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </div>

      {exploring && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-xl bg-amber-50 dark:bg-amber-300/[0.08] px-3 py-1">
          <p className="text-sm font-semibold text-stone-800 dark:text-[#eae6e1]">Viendo la semana {display}</p>
          <button
            type="button"
            onClick={() => setViewWeek(null)}
            className={`min-h-[44px] rounded-lg px-2 text-sm font-bold text-terracotta-ink underline underline-offset-4 ${FOCUS}`}
          >
            Volver a hoy
          </button>
        </div>
      )}

      <dl className="px-5 pt-4 pb-4">
        <div>
          <dt className={`text-xs font-semibold ${MUTED}`}>Tamaño aproximado</dt>
          <dd className="mt-0.5 text-2xl font-black leading-tight tracking-tight text-stone-900 dark:text-[#eae6e1] text-balance">
            {theme === "geek" ? info.size.geek : info.size.fruta}
          </dd>
        </div>
        <div className="mt-3 flex divide-x divide-stone-200 dark:divide-white/[0.08]">
          <div className="pr-5">
            <dt className={`text-xs font-semibold ${MUTED}`}>Longitud</dt>
            <dd className="text-base font-bold tabular-nums text-stone-900 dark:text-[#eae6e1]">{formatLength(info)}</dd>
          </div>
          <div className="pl-5">
            <dt className={`text-xs font-semibold ${MUTED}`}>Peso</dt>
            <dd className="text-base font-bold tabular-nums text-stone-900 dark:text-[#eae6e1]">{formatWeight(info)}</dd>
          </div>
        </div>
        {(info.note || measure) && (
          <p className={`mt-2 text-xs leading-snug ${MUTED}`}>
            {measure === "coronilla-rabadilla" ? "Medida de la coronilla a la rabadilla. " : measure === "cabeza-talon" ? "Medida de la cabeza al talón. " : ""}
            {info.note ?? ""}
          </p>
        )}
      </dl>

      <div className="border-t border-stone-100 dark:border-white/[0.06] px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-terracotta-ink">
          <Sparkles size={16} aria-hidden="true" />
          Hito de la semana
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-800 dark:text-[#eae6e1]">{info.milestone}</p>
      </div>

      <div className="border-t border-sage/20 dark:border-white/[0.06] bg-sage/10 dark:bg-[#1a1724] px-5 py-4">
        <h3 className="text-sm font-bold text-sage-ink">{isMama ? "Tu misión" : "Tu misión de copiloto"}</h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-[#eae6e1]">{isMama ? info.forMom : info.forDad}</p>
        {!isMama && realWeek === undefined && (
          <p className={`mt-2 text-xs ${MUTED}`}>Lo típico de la semana {display}, no necesariamente la de {partnerName || "tu pareja"}.</p>
        )}
        {isMama && realWeek === undefined && <p className={`mt-2 text-xs ${MUTED}`}>Lo típico de la semana {display}, no necesariamente la tuya.</p>}
      </div>
    </section>
  );
}

// =====================================================================================
// Checklists por trimestre (solo el actual desplegado de entrada)
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
    <div className={`${SURFACE} divide-y divide-stone-200 dark:divide-white/[0.06] overflow-hidden`}>
      {trimesters.map((t) => {
        const isOpen = open[t.trimester] ?? t.trimester === currentTrimester;
        const rows = t.categories.flatMap((c) => c.rows);
        const done = rows.filter((r) => r.completed).length;
        const overdue = rows.filter((r) => r.windowNote?.overdue).length;
        const panelId = `guia-trim-${t.trimester}`;
        return (
          <div key={t.trimester}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((s) => ({ ...s, [t.trimester]: !isOpen }))}
                className={`w-full min-h-[60px] flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-[#2d273a]/60 transition-colors ${FOCUS} focus-visible:-outline-offset-2`}
              >
                <span className="min-w-0">
                  <span className="block text-base font-bold text-stone-900 dark:text-[#eae6e1]">
                    Trimestre {t.trimester}
                    {t.trimester === currentTrimester ? <span className={`font-semibold ${MUTED}`}> · el actual</span> : null}
                  </span>
                  <span className={`block text-xs ${MUTED}`}>
                    {t.range} · {done} de {rows.length} hechas
                    {overdue > 0 ? ` · ${overdue === 1 ? "1 pendiente de revisar" : `${overdue} pendientes de revisar`}` : ""}
                  </span>
                </span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className={`shrink-0 text-stone-500 dark:text-[#a6a1b2] transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            </h3>
            <div id={panelId} hidden={!isOpen} className="px-1 pb-2">
              {isOpen &&
                t.categories.map((cat) => (
                  <div key={cat.id}>
                    <h4 className={`px-3 pt-3 text-xs font-bold ${MUTED}`}>{cat.title}</h4>
                    <ul className="divide-y divide-stone-100 dark:divide-white/[0.06]">
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
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
