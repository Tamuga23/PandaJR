// Catálogo de tareas por trimestre, con dueño por defecto y ventana clínica.
// Solo datos y funciones puras (más dos helpers de localStorage que no tocan window en ámbito
// de módulo). Sin React ni Firebase.
//
// IMPORTANTE: los `id` son los mismos que usaba la Guía; el progreso guardado
// (shared_data/checklist_progress.items y la clave local) depende de ellos. No los cambies.
// Las tareas nuevas llevan ids nuevos (217 y 316 se añadieron en la revisión clínica de la fase 3).

import { WEEK_MAX, trimesterOfWeek } from "./weeks";

export type TaskOwner = "mama" | "papa" | "ambos";
export type Trimester = 1 | 2 | 3;

/**
 * Qué es la tarea, para hablar de ella cuando su ventana ya pasó sin marcarla (R2 · paso 3). No cambia
 * el contenido clínico: solo elige la pregunta con la gramática correcta.
 * - vacuna: «¿Ya te la pusieron?» · prueba (prueba o ecografía, femenino): «¿Ya te la hicieron?»
 * - cultivo (masculino): «¿Ya te lo hicieron?» · tramite (cita o gestión con el equipo de salud): «¿Ya está hecha?»
 * Las cuatro se llevan al próximo control. logistica (casa, maleta, silla, visitas): no es para el
 * control; pasada la ventana sigue pendiente, «mejor cuanto antes».
 */
export type TaskKind = "vacuna" | "prueba" | "cultivo" | "tramite" | "logistica";

export type TaskDef = {
  id: number;
  text: string;
  detail: string;
  trimester: Trimester;
  /** Primera semana de la ventana (si no hay, la del inicio del trimestre). */
  weekFrom?: number;
  /** Última semana recomendada (si no hay, la del final del trimestre). */
  weekTo?: number;
  /** Quién suele encargarse; la pareja puede reasignarlo (ver setTaskOwner). */
  defaultOwner: TaskOwner;
  /** true: pasada la ventana deja de tener sentido y no se muestra como vencida. */
  expiresAfterWindow?: boolean;
  /** Tipo (solo en tareas con ventana propia). Sin él, una ventana pasada se trata como «tramite». */
  kind?: TaskKind;
};

export type TaskCategory = {
  id: string;
  trimester: Trimester;
  title: string;
  defaultExpanded: boolean;
  tasks: readonly TaskDef[];
};

export const TASK_OWNERS: readonly TaskOwner[] = ["mama", "papa", "ambos"];

/** Etiquetas cortas (mismo criterio que AuthorChip: la persona es "Papá"; "copiloto" es su rol). */
export const TASK_OWNER_LABEL: Record<TaskOwner, string> = { mama: "Mamá", papa: "Papá", ambos: "Los dos" };

/** Semanas de cada trimestre (el tercero llega hasta la 42). */
export const TRIMESTER_WEEKS: Record<Trimester, { from: number; to: number }> = {
  1: { from: 1, to: 13 },
  2: { from: 14, to: 27 },
  3: { from: 28, to: WEEK_MAX },
};

export const TASK_CATEGORIES: readonly TaskCategory[] = [
  // --- Trimestre 1 (semanas 1–13) ---
  {
    id: "t1_nutricion",
    trimester: 1,
    title: "Alimentación y primeros controles",
    defaultExpanded: true,
    tasks: [
      {
        id: 110,
        text: "Tomar ácido fólico todos los días (mínimo 400 mcg)",
        detail: "Ayuda a prevenir defectos del tubo neural, como la espina bífida, que se forman en las primeras semanas. Lo ideal es empezar antes del embarazo y seguir con la vitamina prenatal todo el embarazo; el obstetra indica la dosis (algunas mamás necesitan más).",
        trimester: 1,
        defaultOwner: "mama",
      },
      {
        id: 111,
        text: "Evitar fiambres y embutidos fríos, pescado o marisco crudo y quesos sin pasteurizar",
        detail: "Reduce el riesgo de listeriosis y toxoplasmosis durante todo el embarazo. Fiambres y salchichas, solo recalentados hasta que humeen; carnes, pescados y huevos bien cocidos; frutas y verduras bien lavadas.",
        trimester: 1,
        defaultOwner: "ambos",
      },
      {
        id: 112,
        text: "Agendar el primer control prenatal y la primera ecografía (semanas 6 a 10)",
        detail: "Confirma que el embarazo está dentro del útero, el latido y la edad gestacional, con la que se calcula la fecha probable de parto.",
        trimester: 1,
        weekFrom: 6,
        weekTo: 10,
        defaultOwner: "papa",
        kind: "tramite",
      },
    ],
  },
  {
    id: "t1_entorno",
    trimester: 1,
    title: "Casa segura y apoyo diario",
    defaultExpanded: true,
    tasks: [
      {
        id: 113,
        text: "Encargarse de limpiar la caja de arena del gato",
        detail: "Las heces de gato pueden transmitir toxoplasmosis. Durante el embarazo, que lo haga el papá; si no hay otra opción, con guantes y lavándose bien las manos.",
        trimester: 1,
        defaultOwner: "papa",
      },
      {
        id: 114,
        text: "Aliviar las náuseas del primer trimestre",
        detail: "Galletas saladas en la mesita de noche para comer antes de levantarse y comidas pequeñas y frecuentes. Si vomita tanto que no retiene ni el agua, es una señal de alarma: vayan a urgencias o llamen a emergencias.",
        trimester: 1,
        weekFrom: 5,
        defaultOwner: "papa",
        expiresAfterWindow: true,
      },
      {
        id: 115,
        text: "Revisar los productos de limpieza de la casa",
        detail: "Ventilen al limpiar, nunca mezclen cloro con amoniaco y prefieran productos sin fragancias fuertes. Los productos fuertes o en aerosol, que los use el papá.",
        trimester: 1,
        defaultOwner: "papa",
      },
    ],
  },

  // --- Trimestre 2 (semanas 14–27) ---
  {
    id: "t2_nutricion",
    trimester: 2,
    title: "Controles y nutrición",
    defaultExpanded: true,
    tasks: [
      {
        id: 210,
        text: "Aumentar el hierro y la vitamina C en la dieta",
        detail: "El volumen de sangre de la mamá aumenta cerca de un 50 %: el hierro ayuda a prevenir la anemia y la vitamina C mejora su absorción. El obstetra dirá si hace falta un suplemento.",
        trimester: 2,
        defaultOwner: "mama",
      },
      {
        id: 211,
        text: "Incluir omega-3 (DHA): pescado bajo en mercurio 2 o 3 veces por semana",
        detail: "El DHA participa en el desarrollo del cerebro y la vista del bebé. Salmón, sardina o trucha bien cocidos, 2 o 3 porciones por semana, lo aportan. Si no comen pescado, pregúntenle al obstetra si conviene un suplemento.",
        trimester: 2,
        defaultOwner: "mama",
      },
      {
        id: 212,
        text: "Agendar la ecografía morfológica (semanas 18 a 22)",
        detail: "Es la ecografía más detallada: revisa la anatomía del bebé, la placenta y el líquido amniótico.",
        trimester: 2,
        weekFrom: 18,
        weekTo: 22,
        defaultOwner: "papa",
        kind: "prueba",
      },
      {
        id: 213,
        text: "Prueba de glucosa para diabetes gestacional (semanas 24 a 28)",
        detail: "Detecta la diabetes gestacional. Según el lugar puede ser la prueba corta (una bebida con glucosa y medición 1 hora después; si sale alta, se confirma con una curva) o directamente una curva de 2 horas en ayunas. Pregunten cuál les toca y si hay que ir en ayunas.",
        trimester: 2,
        weekFrom: 24,
        weekTo: 28,
        defaultOwner: "mama",
        kind: "prueba",
      },
      {
        // Nueva (fase 3, revisión clínica). El catálogo no modela la temporada: aparece como
        // hábito del segundo trimestre.
        id: 217,
        text: "Vacuna de la influenza (en temporada, en cualquier semana)",
        detail: "Se recomienda en cualquier trimestre durante la temporada de influenza: protege a la mamá de complicaciones y le pasa defensas al bebé. Si ya se la pusieron esta temporada, márquenla como hecha.",
        trimester: 2,
        defaultOwner: "mama",
      },
    ],
  },
  {
    id: "t2_preparacion",
    trimester: 2,
    title: "Preparación para el parto",
    defaultExpanded: true,
    tasks: [
      {
        id: 214,
        text: "Preparar un buen descanso",
        detail: "Consigan una almohada de embarazo (en forma de U o C) para dormir de lado y aliviar la espalda, la cadera y el nervio ciático.",
        trimester: 2,
        defaultOwner: "papa",
      },
      {
        id: 215,
        text: "Inscribirse juntos en clases de preparación para el parto",
        detail: "En las clases de psicoprofilaxis aprenden respiración, masaje y posiciones para el trabajo de parto.",
        trimester: 2,
        defaultOwner: "ambos",
      },
      {
        id: 216,
        text: "Pintar y ventilar la habitación del bebé",
        detail: "Háganlo con tiempo para que los vapores de la pintura (compuestos orgánicos volátiles, COV) se disipen. Que pinte el papá y que la mamá no entre al cuarto hasta que esté ventilado.",
        trimester: 2,
        defaultOwner: "papa",
      },
    ],
  },

  // --- Trimestre 3 (semanas 28–42) ---
  {
    id: "t3_clinico",
    trimester: 3,
    title: "Controles de la recta final",
    defaultExpanded: true,
    tasks: [
      {
        id: 310,
        text: "Vacuna Tdap (semanas 27 a 36)",
        detail: "Le pasa anticuerpos al bebé contra la tos ferina (y también contra el tétanos y la difteria). Se recomienda en cada embarazo, idealmente al principio de esta ventana.",
        trimester: 3,
        weekFrom: 27,
        weekTo: 36,
        defaultOwner: "mama",
        kind: "vacuna",
      },
      {
        id: 311,
        text: "Agendar el cultivo de estreptococo del grupo B (semanas 36 a 37)",
        detail: "Es un hisopado rápido. Si sale positivo, se dan antibióticos durante el parto para prevenir una infección grave en el bebé.",
        trimester: 3,
        weekFrom: 36,
        weekTo: 37,
        defaultOwner: "papa",
        kind: "cultivo",
      },
      {
        id: 312,
        text: "Saber cuándo llamar: contracciones y señales de alarma",
        detail: "Antes de la semana 37, 4 o más contracciones en una hora, presión en la pelvis o dolor lumbar que va y viene son motivo para llamar ya al obstetra. Desde la semana 37, la regla 5-1-1: contracciones cada 5 minutos, que duran 1 minuto, durante 1 hora (si no es el primer parto, el obstetra puede indicar salir antes). Ante sangrado, salida de líquido o menos movimientos, no esperen: llamen.",
        trimester: 3,
        defaultOwner: "ambos",
      },
      {
        // Nueva (fase 3, revisión clínica): vacuna materna contra el VSR o anticuerpo para el bebé.
        id: 316,
        text: "Preguntar por la protección contra el VSR (semanas 32 a 36)",
        detail: "El virus respiratorio sincitial (VSR) causa muchas bronquiolitis en bebés. Según el país y la época del año, se ofrece una vacuna a la mamá entre las semanas 32 y 36 o un anticuerpo al bebé al nacer. Pregúntenle a su obstetra qué opción les corresponde.",
        trimester: 3,
        weekFrom: 32,
        weekTo: 36,
        defaultOwner: "ambos",
        kind: "tramite",
      },
    ],
  },
  {
    id: "t3_logistica",
    trimester: 3,
    title: "Todo listo para el parto",
    defaultExpanded: true,
    tasks: [
      {
        id: 313,
        text: "Vacunar al círculo cercano (estrategia capullo)",
        detail: "El papá y los abuelos o cuidadores deberían tener al día la Tdap y la vacuna de la influenza, idealmente al menos 2 semanas antes del parto.",
        trimester: 3,
        weekTo: 36,
        defaultOwner: "papa",
        kind: "logistica",
      },
      {
        id: 314,
        text: "Instalar y revisar la silla de auto",
        detail: "En muchos hospitales piden que el bebé salga en una silla bien instalada. Si pueden, que la revise un técnico certificado.",
        trimester: 3,
        weekTo: 36,
        defaultOwner: "papa",
        kind: "logistica",
      },
      {
        id: 315,
        text: "Armar la maleta del hospital y ensayar la ruta",
        detail: "Tengan la maleta lista hacia la semana 36 y hagan un simulacro nocturno para medir tiempos y saber por qué puerta entrar de madrugada.",
        trimester: 3,
        weekTo: 36,
        defaultOwner: "ambos",
        kind: "logistica",
      },
    ],
  },
];

export type TaskWithCategory = TaskDef & { categoryId: string; categoryTitle: string };

/** Todas las tareas en orden de catálogo, con su categoría. */
export const ALL_TASKS: readonly TaskWithCategory[] = TASK_CATEGORIES.flatMap((cat) =>
  cat.tasks.map((t) => ({ ...t, categoryId: cat.id, categoryTitle: cat.title }))
);

const TASKS_BY_ID = new Map<string, TaskWithCategory>(ALL_TASKS.map((t) => [String(t.id), t]));

export function getTask(id: string | number): TaskWithCategory | undefined {
  return TASKS_BY_ID.get(String(id));
}

/** Ventana efectiva de la tarea (la del trimestre si no tiene una propia). */
export function taskWindow(task: Pick<TaskDef, "trimester" | "weekFrom" | "weekTo">): { from: number; to: number } {
  const t = TRIMESTER_WEEKS[task.trimester];
  return { from: task.weekFrom ?? t.from, to: task.weekTo ?? t.to };
}

/** Estado guardado de una tarea: formato actual ('completed'|'dismissed') o antiguo (true). */
export type TaskStatusValue = boolean | "completed" | "dismissed" | null | undefined;
export type TaskStatusMap = Readonly<Record<string, TaskStatusValue>>;

export function isTaskDone(v: TaskStatusValue): boolean {
  return v === true || v === "completed";
}

export type TaskForWeek = TaskWithCategory & { completed: boolean; window: { from: number; to: number } };

export type TasksForWeek = {
  /** Semana usada (undefined = semana sin confirmar: no se aplican ventanas clínicas). */
  week?: number;
  trimester?: Trimester;
  /**
   * Ventana activa esta semana (incluye las ya hechas, con completed: true). Orden: primero las de
   * ventana clínica propia (weekFrom/weekTo), y dentro de cada grupo la que vence antes.
   */
  now: TaskForWeek[];
  /** La ventana ya pasó y no están hechas (ni descartadas). Orden: la que venció más recientemente, primero. */
  overdue: TaskForWeek[];
  /** Empiezan en las próximas `lookaheadWeeks` semanas y no están hechas. Orden: la más cercana, primero. */
  upcoming: TaskForWeek[];
};

/**
 * Qué tareas importan "ahora" según la semana gestacional. Las descartadas ('dismissed') no
 * aparecen. Con semana desconocida devuelve listas vacías: la UI debe mostrar el catálogo por
 * trimestre sin decir "vencida" ni "toca ahora".
 */
export function tasksForWeek(
  week: number | undefined,
  status: TaskStatusMap = {},
  opts: { lookaheadWeeks?: number } = {}
): TasksForWeek {
  if (typeof week !== "number" || !Number.isFinite(week) || week < 1) {
    return { now: [], overdue: [], upcoming: [] };
  }
  const w = Math.min(WEEK_MAX, Math.floor(week));
  const lookahead = Math.max(0, Math.floor(opts.lookaheadWeeks ?? 2));
  const now: TaskForWeek[] = [];
  const overdue: TaskForWeek[] = [];
  const upcoming: TaskForWeek[] = [];

  for (const task of ALL_TASKS) {
    const st = status[String(task.id)];
    if (st === "dismissed") continue;
    const completed = isTaskDone(st);
    const win = taskWindow(task);
    const item: TaskForWeek = { ...task, completed, window: win };
    if (w >= win.from && w <= win.to) now.push(item);
    else if (w > win.to) {
      if (!completed && !task.expiresAfterWindow) overdue.push(item);
    } else if (win.from - w <= lookahead && !completed) upcoming.push(item);
  }

  const generic = (t: TaskForWeek) => (t.weekFrom === undefined && t.weekTo === undefined ? 1 : 0);
  now.sort((a, b) => generic(a) - generic(b) || a.window.to - b.window.to || a.window.from - b.window.from);
  overdue.sort((a, b) => b.window.to - a.window.to);
  upcoming.sort((a, b) => a.window.from - b.window.from);
  return { week: w, trimester: trimesterOfWeek(w), now, overdue, upcoming };
}

// =====================================================================================
// Dueño de cada tarea (reasignable y compartido)
// Con vínculo: shared_data/checklist_progress.owners.{taskId} (ver setTaskOwner en pairing.ts).
// Sin vínculo: localStorage[LS_TASK_OWNERS] = { [taskId]: TaskOwner }.
// =====================================================================================

export type TaskOwnerMap = Record<string, TaskOwner>;

export function isTaskOwner(v: unknown): v is TaskOwner {
  return v === "mama" || v === "papa" || v === "ambos";
}

/** Limpia un mapa de dueños que llega de Firestore o localStorage (descarta claves/valores raros). */
export function sanitizeTaskOwners(raw: unknown): TaskOwnerMap {
  const out: TaskOwnerMap = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k && isTaskOwner(v)) out[k] = v;
  }
  return out;
}

/** Dueño vigente: el reasignado por la pareja o, si no hay, el de catálogo ("ambos" si la tarea no existe). */
export function effectiveOwner(task: Pick<TaskDef, "id" | "defaultOwner"> | string | number, overrides?: TaskOwnerMap): TaskOwner {
  const def = typeof task === "object" ? task : getTask(task);
  const key = String(typeof task === "object" ? task.id : task);
  const o = overrides?.[key];
  if (isTaskOwner(o)) return o;
  return def?.defaultOwner ?? "ambos";
}

/** ¿La tarea le toca a este rol? ("ambos" le toca a los dos). */
export function ownerIncludesRole(owner: TaskOwner, role: "mama" | "papa"): boolean {
  return owner === "ambos" || owner === role;
}

/** Clave local (sin vínculo) de los dueños reasignados. */
export const LS_TASK_OWNERS = "pandajr_task_owners_local";

/** Dueños reasignados en este teléfono (sin vínculo). {} en servidor o sin almacenamiento. */
export function readLocalTaskOwners(): TaskOwnerMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_TASK_OWNERS);
    return raw ? sanitizeTaskOwners(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/**
 * Guarda (o quita con null → vuelve al dueño de catálogo) el dueño de una tarea en este teléfono.
 * Devuelve el mapa resultante. Llamar solo desde manejadores de eventos.
 */
export function writeLocalTaskOwner(taskId: string | number, owner: TaskOwner | null): TaskOwnerMap {
  const key = String(taskId);
  const next = { ...readLocalTaskOwners() };
  if (owner && isTaskOwner(owner)) next[key] = owner;
  else delete next[key];
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LS_TASK_OWNERS, JSON.stringify(next));
    } catch {
      /* modo privado o almacenamiento lleno: el cambio vive solo en memoria */
    }
  }
  return next;
}

/**
 * Para el traspaso único al vincular: dueños locales que aún no existen en el embarazo
 * compartido (no pisa lo que la pareja ya decidió).
 */
export function ownersMissingRemotely(local: TaskOwnerMap, remote: TaskOwnerMap): Array<[string, TaskOwner]> {
  return Object.entries(local).filter(([k, v]) => isTaskOwner(v) && !(k in remote));
}
