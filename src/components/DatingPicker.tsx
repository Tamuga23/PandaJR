"use client";

// Elegir de dónde sale la semana: fecha probable de parto (ecografía), fecha de la última regla,
// semana a mano o "aún no sé". Componente controlado: el borrador vive en quien lo usa
// (onboarding o Ajustes) y la escritura a Firebase ocurre allí, en el manejador de "Continuar" o
// "Guardar". Aquí no se escribe nada.

import React, { useRef } from "react";
import { CheckCircle2, Circle, Minus, Plus } from "lucide-react";
import {
  MAX_VALID_GESTATION_DAYS,
  MIN_VALID_GESTATION_DAYS,
  PREGNANCY_DAYS,
  addDays,
  dueDateFromLMP,
  estimatedDueDateForWeek,
  gestationalAgeFromDueDate,
  lmpFromDueDate,
  parseISODate,
  profilePatchForDueDate,
  profilePatchForManualWeek,
  toISODate,
  validateDueDate,
  validateLMP,
  isDueDateSource,
  weekLabel,
  type DatingProfile,
  type DueDateSource,
} from "@/lib/pregnancy";
import { WEEK_MAX, WEEK_MIN } from "@/lib/weeks";

export type DatingMode = "eco" | "fum" | "week";

/** Lo que la persona va escribiendo (puede estar incompleto o ser inválido). */
export type DatingDraft = {
  mode: DatingMode | null;
  /** FPP escrita ("aaaa-mm-dd" del input date). */
  due: string;
  /** Primer día de la última regla ("aaaa-mm-dd"). */
  lmp: string;
  week: number;
  unknown: boolean;
};

/** Decisión válida y lista para guardar. */
export type DatingChoice =
  | { kind: "dueDate"; dueDate: string; source: DueDateSource }
  | { kind: "manual"; week: number }
  | { kind: "unknown" };

const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "14 de enero" (mismo año que hoy) o "14 de enero de 2027". */
export function formatDateLong(d: Date, today: Date = new Date()): string {
  const base = `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base} de ${d.getFullYear()}`;
}

/** Borrador inicial a partir del perfil actual (no inventa nada si la semana no está confirmada). */
export function draftFromProfile(p?: DatingProfile | null): DatingDraft {
  const due = parseISODate(p?.dueDate);
  if (due) {
    // Si pasa a semana a mano, parte de la semana que ya tiene (no de un número de relleno).
    const current = gestationalAgeFromDueDate(due).weeks;
    // FPP estimada por la semana elegida a mano: se abre como semana a mano. Abrirla como
    // "ecografía" haría que "Guardar" la cambiara de origen sin que nadie lo pidiera.
    if (p?.dueDateSource === "manual") return { mode: "week", due: "", lmp: "", week: current, unknown: false };
    const fum = p?.dueDateSource === "fum";
    return { mode: fum ? "fum" : "eco", due: toISODate(due), lmp: fum ? toISODate(lmpFromDueDate(due)) : "", week: current, unknown: false };
  }
  const w = typeof p?.week === "number" && Number.isInteger(p.week) && p.week >= WEEK_MIN && p.week <= WEEK_MAX ? p.week : null;
  if (w !== null && !p?.weekUnknown) return { mode: "week", due: "", lmp: "", week: w, unknown: false };
  return { mode: null, due: "", lmp: "", week: 12, unknown: false };
}

/** Decisión válida (o null si falta algo) y el error listo para mostrar. */
export function choiceFromDraft(d: DatingDraft, today: Date = new Date()): { choice: DatingChoice | null; error?: string } {
  if (d.mode === "eco") {
    if (!d.due) return { choice: null };
    const date = parseISODate(d.due);
    if (!date) return { choice: null, error: "Escribe una fecha válida: día, mes y año." };
    const v = validateDueDate(date, today);
    if (!v.ok) return { choice: null, error: v.error };
    return { choice: { kind: "dueDate", dueDate: toISODate(date), source: "eco" } };
  }
  if (d.mode === "fum") {
    if (!d.lmp) return { choice: null };
    const date = parseISODate(d.lmp);
    if (!date) return { choice: null, error: "Escribe una fecha válida: día, mes y año." };
    const v = validateLMP(date, today);
    if (!v.ok) return { choice: null, error: v.error };
    return { choice: { kind: "dueDate", dueDate: toISODate(dueDateFromLMP(date)), source: "fum" } };
  }
  if (d.mode === "week") {
    if (d.unknown) return { choice: { kind: "unknown" } };
    if (!Number.isInteger(d.week) || d.week < WEEK_MIN || d.week > WEEK_MAX) {
      return { choice: null, error: `Elige una semana entre ${WEEK_MIN} y ${WEEK_MAX}.` };
    }
    return { choice: { kind: "manual", week: d.week } };
  }
  return { choice: null };
}

/** ¿La decisión es la misma que ya tiene el perfil? (entonces no hay nada que guardar). */
export function sameDating(c: DatingChoice, p: DatingProfile, today: Date = new Date()): boolean {
  if (c.kind === "dueDate") return p.dueDate === c.dueDate && p.dueDateSource === c.source;
  // Semana a mano = FPP estimada (origen "manual"), que avanza sola: se compara la semana que sale
  // de ella hoy. En la semana 1, semana fija sin FPP.
  if (c.kind === "manual") {
    if (p.weekUnknown) return false;
    const due = parseISODate(p.dueDate);
    if (due) return p.dueDateSource === "manual" && gestationalAgeFromDueDate(due, today).weeks === c.week;
    return p.week === c.week;
  }
  return !!p.weekUnknown && !p.dueDate;
}

/** Decisión que corresponde al perfil actual (para "Deshacer"), con el mismo origen de la fecha. */
export function choiceFromProfile(p: DatingProfile): DatingChoice {
  const due = parseISODate(p.dueDate);
  if (due) return { kind: "dueDate", dueDate: toISODate(due), source: isDueDateSource(p.dueDateSource) ? p.dueDateSource : "manual" };
  if (!p.weekUnknown && typeof p.week === "number" && Number.isInteger(p.week) && p.week >= WEEK_MIN && p.week <= WEEK_MAX) {
    return { kind: "manual", week: p.week };
  }
  return { kind: "unknown" };
}

/** Parche del perfil LOCAL para una decisión (la semana desconocida conserva el número guardado). */
export function datingPatch(c: DatingChoice, today: Date = new Date()): {
  week?: number;
  weekUnknown: boolean;
  dueDate: string | undefined;
  dueDateSource: DueDateSource | undefined;
} {
  if (c.kind === "dueDate") return profilePatchForDueDate(c.dueDate, c.source, today);
  if (c.kind === "manual") return profilePatchForManualWeek(c.week);
  return { weekUnknown: true, dueDate: undefined, dueDateSource: undefined };
}

/** Frase corta del resultado: "Semana 24 + 3 días · fecha probable: 14 de enero". */
export function describeChoice(c: DatingChoice, today: Date = new Date(), reader: "mama" | "papa" = "mama"): { title: string; detail: string } {
  if (c.kind === "dueDate") {
    const due = parseISODate(c.dueDate)!;
    const ga = gestationalAgeFromDueDate(due, today);
    return { title: weekLabel(ga), detail: `Fecha probable de parto: ${formatDateLong(due, today)}` };
  }
  if (c.kind === "manual") {
    const estimated = parseISODate(estimatedDueDateForWeek(c.week, today));
    if (!estimated) {
      return {
        title: `Semana ${c.week}`,
        detail: reader === "mama"
          ? "Cuando sepas la fecha probable de parto, agrégala en Ajustes para que la semana avance sola."
          : "Cuando sepan la fecha probable de parto, agréguenla en Ajustes para que la semana avance sola.",
      };
    }
    return {
      title: `Semana ${c.week}`,
      detail: `Fecha probable estimada: ${formatDateLong(estimated, today)}. La semana avanza sola cada día; ${
        reader === "mama" ? "si tu ecografía da otra fecha, cámbiala en Ajustes." : "si la ecografía da otra fecha, cámbienla en Ajustes."
      }`,
    };
  }
  return {
    title: "Semana sin confirmar",
    detail: reader === "mama"
      ? "No usaremos una semana supuesta para las recomendaciones. Podrás confirmarla en Ajustes cuando la sepas."
      : "No usaremos una semana supuesta para las recomendaciones. Podrán confirmarla en Ajustes cuando la sepan.",
  };
}

const PICKER_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";

/**
 * Tres caminos: FPP de la ecografía, fecha de la última regla o "aún no sé ninguna" (semana a mano
 * o sin confirmar). Muestra el resultado antes de continuar. `reader` ajusta los textos al rol.
 */
export function DatingPicker({
  draft,
  onDraftChange,
  allowUnknown = true,
  reader = "mama",
  partnerName,
  idPrefix,
  today = new Date(),
}: {
  draft: DatingDraft;
  onDraftChange: (next: DatingDraft) => void;
  allowUnknown?: boolean;
  reader?: "mama" | "papa";
  partnerName?: string;
  idPrefix: string;
  today?: Date;
}) {
  const isMama = reader === "mama";
  const her = partnerName?.trim() || "tu pareja";
  const { choice, error } = choiceFromDraft(draft, today);
  const set = (patch: Partial<DatingDraft>) => onDraftChange({ ...draft, ...patch });
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Rango que acepta el modelo (2 a 42 + 6 semanas), para que el calendario del teléfono ayude.
  const dueMin = toISODate(addDays(today, -(MAX_VALID_GESTATION_DAYS - PREGNANCY_DAYS)));
  const dueMax = toISODate(addDays(today, PREGNANCY_DAYS - MIN_VALID_GESTATION_DAYS));
  const lmpMin = toISODate(addDays(today, -MAX_VALID_GESTATION_DAYS));
  const lmpMax = toISODate(addDays(today, -MIN_VALID_GESTATION_DAYS));

  const options: { mode: DatingMode; label: string; hint: string }[] = [
    {
      mode: "eco",
      label: isMama ? "Sé mi fecha probable de parto" : "Sé la fecha probable de parto",
      hint: isMama ? "La que te dio tu obstetra o tu ecografía" : "La que les dio su obstetra o la ecografía",
    },
    {
      mode: "fum",
      label: isMama ? "Sé la fecha de mi última regla" : "Sé la fecha de su última regla",
      hint: isMama
        ? "Calculamos la fecha probable. Si ya tienes una ecografía, usa su fecha: es más precisa."
        : "Calculamos la fecha probable. Si ya tienen una ecografía, usen su fecha: es más precisa.",
    },
    { mode: "week", label: "Aún no sé ninguna", hint: "Elige la semana a mano" },
  ];

  // Grupo de radio ARIA: una sola parada de Tab (la opción elegida) y flechas para moverse y
  // elegir, como en los radios nativos.
  const selectedIndex = options.findIndex((o) => o.mode === draft.mode);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;
  const onRadioKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = options.length - 1;
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next < 0) return;
    e.preventDefault();
    set({ mode: options[next].mode });
    radioRefs.current[next]?.focus();
  };

  const errorId = `${idPrefix}-error`;
  const resultId = `${idPrefix}-result`;
  const result = choice ? describeChoice(choice, today, reader) : null;
  // Opciones como lista con divisores que llega al borde de la columna (--gutter), sin caja: vale igual en
  // la bienvenida (pantalla completa) y dentro del diálogo de Ajustes (sin tarjeta dentro de tarjeta).
  // Borde ≥3:1 (1.4.11), también sobre la opción elegida (lavado terracota): line-control.
  // Campos de fecha: :focus (no :focus-visible), que Chrome no aplica con el foco en los segmentos internos.
  const inputClass =
    "mt-1 w-full min-h-12 px-4 py-3 rounded-2xl border border-line-control bg-surface-raised text-ink text-body focus:outline-2 focus:outline-offset-1 focus:outline-terracotta-ink";
  const stepClass = `grid size-12 shrink-0 place-items-center rounded-xl border border-line-control bg-surface-raised text-ink transition-colors hover:bg-surface-hover disabled:border-line disabled:text-ink-disabled disabled:hover:bg-surface-raised ${PICKER_FOCUS}`;
  const fieldLabel = "text-meta font-bold text-ink";

  return (
    <div className="text-left">
      <div role="radiogroup" aria-label={isMama ? "¿Qué fecha conoces?" : "¿Qué fecha conocen?"} className="-mx-[var(--gutter)] divide-y divide-line border-y border-line">
        {options.map((opt, i) => {
          const selected = draft.mode === opt.mode;
          return (
            <div key={opt.mode} className={selected ? "bg-terracotta-wash" : undefined}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                ref={(el) => {
                  radioRefs.current[i] = el;
                }}
                tabIndex={i === tabStop ? 0 : -1}
                onKeyDown={(e) => onRadioKeyDown(e, i)}
                onClick={() => set({ mode: opt.mode })}
                className={`flex min-h-14 w-full items-center gap-3 px-[var(--gutter)] py-3 text-left transition-colors ${selected ? "" : "hover:bg-surface-hover"} ${PICKER_FOCUS} focus-visible:-outline-offset-2`}
              >
                {selected ? (
                  <CheckCircle2 size={22} strokeWidth={1.75} className="shrink-0 text-terracotta-ink" aria-hidden="true" />
                ) : (
                  <Circle size={22} strokeWidth={1.75} className="shrink-0 text-line-control" aria-hidden="true" />
                )}
                <span className="min-w-0">
                  <span className="block text-body font-bold text-ink">{opt.label}</span>
                  <span className="mt-0.5 block text-meta text-ink-muted">{opt.hint}</span>
                </span>
              </button>

              {selected && opt.mode === "eco" && (
                <div className="ps-[calc(var(--gutter)+2.125rem)] pe-[var(--gutter)] pb-4">
                  <label htmlFor={`${idPrefix}-due`} className={fieldLabel}>
                    Fecha probable de parto
                  </label>
                  <input
                    id={`${idPrefix}-due`}
                    type="date"
                    value={draft.due}
                    min={dueMin}
                    max={dueMax}
                    onChange={(e) => set({ due: e.target.value })}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className={inputClass}
                  />
                </div>
              )}

              {selected && opt.mode === "fum" && (
                <div className="ps-[calc(var(--gutter)+2.125rem)] pe-[var(--gutter)] pb-4">
                  <label htmlFor={`${idPrefix}-lmp`} className={fieldLabel}>
                    {isMama ? "Primer día de tu última regla" : "Primer día de su última regla"}
                  </label>
                  <input
                    id={`${idPrefix}-lmp`}
                    type="date"
                    value={draft.lmp}
                    min={lmpMin}
                    max={lmpMax}
                    onChange={(e) => set({ lmp: e.target.value })}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className={inputClass}
                  />
                </div>
              )}

              {selected && opt.mode === "week" && (
                <div className="ps-[calc(var(--gutter)+2.125rem)] pe-[var(--gutter)] pb-4">
                  <p id={`${idPrefix}-week-label`} className={fieldLabel}>
                    {isMama ? "¿En qué semana estás?" : `¿En qué semana está ${her}?`}
                  </p>
                  <div className={`mt-1 flex items-center gap-2 ${draft.unknown ? "opacity-50" : ""}`}>
                    <button
                      type="button"
                      onClick={() => set({ week: Math.max(WEEK_MIN, (Number.isInteger(draft.week) ? draft.week : 12) - 1), unknown: false })}
                      disabled={draft.unknown || draft.week <= WEEK_MIN}
                      aria-label="Una semana menos"
                      className={stepClass}
                    >
                      <Minus size={18} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={WEEK_MIN}
                      max={WEEK_MAX}
                      value={Number.isInteger(draft.week) ? draft.week : ""}
                      disabled={draft.unknown}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        set({ week: Number.isNaN(n) ? NaN : n, unknown: false });
                      }}
                      aria-labelledby={`${idPrefix}-week-label`}
                      aria-invalid={!draft.unknown && !!error}
                      className="h-12 min-w-0 flex-1 rounded-xl border border-line-control bg-surface-raised text-center text-subtitle font-extrabold tabular-nums text-ink disabled:border-line disabled:text-ink-disabled focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-terracotta-ink"
                    />
                    <button
                      type="button"
                      onClick={() => set({ week: Math.min(WEEK_MAX, (Number.isInteger(draft.week) ? draft.week : 12) + 1), unknown: false })}
                      disabled={draft.unknown || draft.week >= WEEK_MAX}
                      aria-label="Una semana más"
                      className={stepClass}
                    >
                      <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                  {allowUnknown && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={draft.unknown}
                      onClick={() => set({ unknown: !draft.unknown })}
                      className={`mt-2 -ms-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-meta font-bold text-ink ${PICKER_FOCUS}`}
                    >
                      {draft.unknown ? (
                        <CheckCircle2 size={20} strokeWidth={1.75} className="text-sage-ink" aria-hidden="true" />
                      ) : (
                        <Circle size={20} strokeWidth={1.75} className="text-line-control" aria-hidden="true" />
                      )}
                      {isMama ? "Aún no sé mi semana" : "Aún no sabemos la semana"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-3 text-meta font-bold text-terracotta-ink">
          {error}
        </p>
      )}

      <div id={resultId} aria-live="polite" className="mt-3 min-h-[1px]">
        {result && (
          <div className="rounded-2xl bg-sage-wash px-4 py-3">
            <p className="font-display text-subtitle text-ink">
              {choice?.kind === "dueDate"
                ? isMama
                  ? `Estás en la ${result.title.charAt(0).toLocaleLowerCase("es")}${result.title.slice(1)}`
                  : `${her.charAt(0).toLocaleUpperCase("es")}${her.slice(1)} está en la ${result.title.charAt(0).toLocaleLowerCase("es")}${result.title.slice(1)}`
                : result.title}
            </p>
            <p className="mt-0.5 text-meta text-ink">{result.detail}</p>
          </div>
        )}
      </div>
    </div>
  );
}
