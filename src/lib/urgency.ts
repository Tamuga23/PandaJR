// Ruta de urgencia: fuente única de señales de alarma, detector local,
// números de emergencia por región y enlaces de llamada / mapa.
//
// Isomórfico: se importa desde componentes cliente y desde route handlers.
// No toca window / navigator / Intl en el ámbito de módulo; solo dentro de funciones.
//
// Fuente clínica: CDC "Hear Her" (Urgent Maternal Warning Signs) + ACOG
// (signos de parto pretérmino). No editar el contenido clínico sin revisión.

export type CareTeam = {
  obName?: string;
  obPhone?: string;
  hospitalName?: string;
  hospitalAddress?: string;
  /** Número de emergencias escrito a mano (manda sobre el del país y el detectado). */
  emergencyNumber?: string;
  /** País elegido (código ISO de src/lib/crisisLines.ts o "OTHER"): fija el número y la línea de crisis por defecto. */
  country?: string;
  /** Línea de crisis de salud mental escrita a mano (manda sobre la del país). */
  crisisLine?: string;
};

export type AlarmSign = {
  id: string;
  title: string;
  detail: string;
  /**
   * Frases o raíces ya normalizadas (minúsculas, sin acentos).
   * - "+" exige que todas sus partes aparezcan en la misma oración, en cualquier orden
   *   (ej. "cabeza+fuerte").
   * - "|" dentro de una parte da alternativas (ej. "dolor|duele+panza|vientre").
   */
  keywords: string[];
  /** Semana mínima (inclusive, semanas cumplidas) en la que aplica. */
  minWeek?: number;
  /** Semana máxima (inclusive, semanas cumplidas) en la que aplica. */
  maxWeek?: number;
};

export type EmergencyInfo = { number: string; region: string | null; confident: boolean };

/**
 * Resultado del detector.
 * - confidence "high": describe algo que parece estar pasando ahora → tarjeta de urgencia.
 * - confidence "low": la señal aparece en una pregunta general ("¿qué son las contracciones?")
 *   o negada ("no tengo fiebre"). Sigue siendo urgent=true (ante la duda), pero la interfaz
 *   muestra un aviso discreto y el servidor no fuerza la urgencia.
 */
export type AlarmResult = { urgent: boolean; matches: AlarmSign[]; confidence: "high" | "low" };

// Partes reutilizables de palabras clave.
const BABY = "bebe|bebita|bebito|beba|nino|nina|hij";
const INTENSE = "fuert|intens|horrible|terrible|insoportable|mucho|muchisimo|demasiado|no se quita|no se me quita|no se va|no se me va|no se pasa|no se me pasa|sever|agud|fatal";
const BELLY = "vientre|panza|pancita|barriga|estomago|abdom";

// ---------------------------------------------------------------------------
// Señales: "Ve a urgencias o llama a emergencias ya"
// ---------------------------------------------------------------------------
export const URGENT_SIGNS: AlarmSign[] = [
  {
    id: "sangrado-liquido",
    title: "Sangrado o salida de líquido por la vagina",
    detail: "Cualquier cantidad de sangrado, o líquido que sale por la vagina (puede ser que se rompió la fuente).",
    keywords: [
      "sangr", "hemorrag", "coagulo", "manchando", "manchado", "me manche",
      "manche+ropa|calzon|pantaleta|toalla|papel|cama",
      "sale liquido", "salio liquido", "saliendo liquido", "salida de liquido", "perdida de liquido",
      "perdiendo liquido", "fuga de liquido", "liquido+sale|sali|escap|chorr", "liquido+vagina",
      "liquido+entre las piernas", "liquido amniotico+sal|perd|escap|romp|moj", "es liquido amniotico",
      "me sale agua", "salio agua", "se me salio agua", "perdiendo agua", "chorro de agua", "estoy mojada",
      "me moje+toda|ropa|pantal|calzon|cama|pierna|sin querer", "pipi sin querer", "orine sin querer",
      "romp+fuente", "romp+bolsa", "romp+aguas", "revent+fuente|bolsa", "fuente+rota", "bolsa+rota",
    ],
  },
  {
    id: "preeclampsia",
    title: "Dolor de cabeza fuerte, cambios en la visión o hinchazón repentina",
    detail: "Dolor de cabeza que no se quita o empeora, visión borrosa, destellos o “moscas”, o hinchazón repentina de cara y manos. Pueden ser señales de preeclampsia.",
    keywords: [
      "dolor de cabeza fuerte", "fuerte dolor de cabeza", `cabeza+${INTENSE}|empeora`, "migrana", "jaqueca",
      "vision borrosa", "vista borrosa", "veo borroso", "borros", "no veo bien", "veo raro", "veo luces",
      "luces+ojos", "lucecitas", "destellos", "moscas volantes", "veo moscas", "moscas+vista|ojos",
      "veo manchas", "puntos negros", "puntitos", "veo puntos", "estrellitas+veo|ojos|vista",
      "hinchazon de cara", "hinchazon de manos", "hinch+cara|mano|rostro", "hinchazon repentina",
      "presion alta", "presion arterial alta",
    ],
  },
  {
    id: "dolor-abdominal",
    title: "Dolor fuerte en el vientre que no se quita",
    detail: "También si el dolor está bajo las costillas del lado derecho.",
    keywords: [
      `dolor|duele|dolio|colico|retortijon+${BELLY}+${INTENSE}`,
      "colico+fuert|intens|horrible|terrible|insoportable|mucho|muchisimo|demasiado|no se quita|no se me quita|no se va|no se pasa",
      "dolor|duele|dolio|molest+costilla", "dolor|duele+boca del estomago",
    ],
  },
  {
    id: "movimientos",
    title: "El bebé se mueve menos o dejó de moverse",
    detail: "Desde la semana 28, menos de 10 movimientos en 2 horas es motivo para ir. Si notas un cambio, no esperes a terminar el conteo.",
    // Antes de la semana 20 aún no suele sentirse el movimiento: no es señal de alarma.
    minWeek: 20,
    keywords: [
      "no se mueve", "no se mueva", "no se movio", "no se esta moviendo", "se mueve menos", "se mueve poco",
      "casi no se mueve", "no se ha movido", "dejo de moverse", "dejo de mover", "dejo de patear", "muev|mueva|moviendo+menos|poquito|muy poco|casi nada",
      "no lo siento", "no la siento", `no siento+${BABY}|patad|movimiento|mover|mueva|patee|patear`,
      `no siente+${BABY}|patad|movimiento|mover|mueva`, `no he sentido+${BABY}|mover|mueva|movimiento|patad|patear`,
      `no ha sentido+${BABY}|mover|movimiento|patad`, "no he tenido+movimiento|patad", "no lo he sentido",
      "no la he sentido", "no lo noto", "no la noto", `no noto+${BABY}|movimiento|patad`, "no patea",
      "no ha pateado", "menos patadas", "menos movimientos", "no se mueve igual", `quiet+${BABY}`, "muy quiet",
      "sin moverse", "sin mover", "sin patear", "sin sentirlo", "sin sentirla",
    ],
  },
  {
    id: "fiebre",
    title: "Fiebre de 38 °C o más",
    detail: "Temperatura de 38 °C (100.4 °F) o más, aunque te sientas bien por lo demás.",
    keywords: ["fiebre", "calentura", "temperatura alta", "38 grados", "39 grados", "40 grados", "escalofrios+temperatura"],
  },
  {
    id: "pretermino",
    title: "Contracciones o presión en la pelvis antes de la semana 37",
    detail: "Contracciones regulares, presión en la pelvis, dolor lumbar que va y viene o cólicos como de menstruación. Con 4 o más contracciones en 1 hora antes de la semana 37, llama ya: puede ser parto pretérmino.",
    maxWeek: 36,
    keywords: [
      "contraccion", "contracion", "presion en la pelvis", "presion pelvica", "presion+pelvis", "lumbar+ritm",
      "lumbar+va y viene", "espalda+va y viene", "espalda|lumbar+cada|viene y va", "colicos tipo menstruacion", "colicos como de regla",
      "colicos menstruales", "colicos de regla", "colicos+cada", "como de regla", "como de menstruacion",
      "como menstrual", `calambre+${BELLY}|pelvis|cada`, "panza dura", "barriga dura", "vientre duro",
      "se me pone dura", "se endurece",
    ],
  },
  {
    id: "respiracion-pecho",
    title: "Dificultad para respirar o dolor en el pecho",
    detail: "También si sientes el corazón muy acelerado.",
    keywords: [
      "no puedo respirar", "dificultad para respirar", "cuesta respirar", "respirar+no puedo|cuesta|dificil",
      "respiro+dificultad|mal|cuesta", "falta de aire", "me falta el aire", "me ahogo", "dolor de pecho",
      "dolor en el pecho", "dolor+pecho", "opresion en el pecho", "corazon muy acelerado", "corazon acelerado",
      "corazon+muy rapido|a mil", "taquicardia", "palpitaciones",
    ],
  },
  {
    id: "desmayo-convulsion",
    title: "Mareo intenso, desmayo o convulsiones",
    detail: "Si te desmayaste o sientes que vas a desmayarte, no manejes: pide que alguien te acompañe.",
    keywords: [
      "desmay", "desvaneci", "perdi el conocimiento", "mareo intenso", "mareo fuerte", "muy mareada",
      "mareada+no se quita", "convuls",
    ],
  },
  {
    id: "salud-mental",
    title: "Pensamientos de hacerte daño o de hacerle daño al bebé",
    detail: "No es tu culpa y tiene tratamiento. Pide ayuda ahora: llama a emergencias o a alguien de confianza que te acompañe.",
    keywords: [
      "hacerme dano", "hacerme algo", "me quiero hacer dano", "me voy a hacer dano", "hacer dano a mi mism",
      "lastimarme", "quitarme la vida", "suicid", "matarme", "quiero matar", "voy a matar", "quier+morir",
      "quisiera+morir", "ganas de morir", "prefiero morir", "no quiero vivir", "sin ganas de vivir",
      "seguir viviendo+no quiero|no puedo|ganas|sentido|para que", "sentido+vivir", "mejor sin mi",
      "quiero desaparecer", "quisiera desaparecer",
      // Tercera persona: el papá (o alguien más) cuenta lo que le pasa a la mamá.
      "quitarse la vida", "se quiere matar", "se va a matar", "no quiere vivir", "no quiere seguir viviendo",
      "quiere desaparecer", "se quiere lastimar", "se quiere hacer dano", "se va a hacer dano",
      // Formas ambiguas ("¿el bebé puede hacerse daño?") solo con un verbo de intención en la misma frase.
      "hacerse dano|hacerse algo|lastimarse|matarse+quiere|quiera|piensa|pensando|pensado|habla|hablado|dice|dijo|ganas|va a|intent|amenaz",
      `dano|danar|lastimar|pegarle|pegar|golpear|sacudir|hacerle algo+${BABY}+pens|pienso|ganas|quier|quisiera|miedo|impulso|idea|tentacion|voy a|siento que`,
    ],
  },
  {
    id: "trombo-pierna",
    title: "Hinchazón, enrojecimiento o dolor en una pierna",
    detail: "Sobre todo si es en una sola pierna o está caliente al tacto. Puede ser un coágulo (trombo).",
    keywords: [
      "pierna hinchada", "pierna roja", "pierna+caliente|roj", "una pierna+hinch", "una pierna+dolor", "una pierna+roj",
      "pierna izquierda|pierna derecha|una sola pierna+hinch|roj|caliente|dolor|duele",
      "dolor en una pierna", "pantorrilla+hinch", "pantorrilla+roj", "pantorrilla+dolor", "pantorrilla+duele",
      "coagulo+pierna", "tengo un trombo",
    ],
  },
  {
    id: "vomitos",
    title: "Vómitos que no te dejan retener líquidos",
    detail: "Náuseas y vómitos tan intensos que no puedes retener ni el agua: hay riesgo de deshidratación.",
    keywords: [
      "vomito todo", "vomitando todo", "vomit+todo", "vomit+no paran", "vomit+no para", "no retengo liquidos",
      "no retengo nada", "no puedo retener", "no tolero liquidos", "no tolero el agua", "no tolero ni el agua",
      "vomit+sangre",
    ],
  },
];

/**
 * Dolor fuerte sin zona reconocible ("tengo un dolor muy fuerte"). No forma parte de la
 * lista clínica visible: el detector lo usa solo si no encontró otra señal urgente, para no
 * rotular como "vientre" un dolor que puede estar en otra parte.
 */
export const GENERIC_PAIN_SIGN: AlarmSign = {
  id: "dolor-fuerte",
  title: "Dolor fuerte que no se quita",
  detail: "Un dolor fuerte que no se quita durante el embarazo merece revisión urgente, sobre todo si es en el vientre o bajo las costillas del lado derecho.",
  keywords: [
    "dolor fuerte", "dolor muy fuerte", "dolor intenso", "dolor muy intenso", "mucho dolor", "muchisimo dolor",
    "dolor insoportable", "dolor severo", "dolor horrible", "dolor terrible", "duele mucho", "duele muchisimo",
    "duele demasiado", "dolor+no se quita|no se me quita|no se va|no se me va|no se pasa",
  ],
};
// Zonas en las que el dolor fuerte genérico no es señal obstétrica (muelas, garganta, oído).
const GENERIC_PAIN_EXCLUDE = ["muela", "diente", "encia", "garganta", "oido"];

// ---------------------------------------------------------------------------
// Señales: "Llama hoy a tu obstetra"
// ---------------------------------------------------------------------------
export const CALL_TODAY_SIGNS: AlarmSign[] = [
  {
    id: "flujo",
    title: "Cambios en el flujo vaginal",
    detail: "Flujo acuoso, con sangre o con mal olor.",
    keywords: ["flujo+olor", "flujo+acuoso", "flujo+aguado", "flujo+verde", "flujo+amarillo", "flujo+raro", "flujo+cambio", "mal olor+vagina"],
  },
  {
    id: "ardor-orinar",
    title: "Ardor al orinar",
    detail: "Puede ser una infección urinaria; se trata con facilidad si se revisa a tiempo.",
    keywords: ["ardor al orinar", "arde al orinar", "orinar+arde", "orinar+ardor", "orinar+duele", "orino+arde", "hacer pipi+arde", "infeccion urinaria", "infeccion de orina"],
  },
  {
    id: "picazon",
    title: "Picazón intensa en manos y pies",
    detail: "Sobre todo si empeora de noche. Tu obstetra puede pedir un análisis para revisarlo.",
    keywords: ["picazon+mano", "picazon+pie", "comezon+mano", "comezon+pie", "pica+mano", "pican+mano", "pica+pie", "pican+pie", "palmas+pica", "plantas+pica", "picazon intensa", "comezon intensa", "colestasis"],
  },
  {
    id: "cansancio",
    title: "Cansancio abrumador que no mejora",
    detail: "Aunque descanses bien. Vale la pena revisarlo.",
    keywords: ["cansancio abrumador", "cansancio+no mejora", "cansancio+no se quita", "agotamiento", "agotada", "exhausta", "muy cansada"],
  },
  {
    id: "animo",
    title: "Tristeza o ansiedad casi todos los días",
    detail: "Si llevas 2 semanas o más sintiéndote así, cuéntaselo hoy a tu obstetra. Pedir ayuda también es cuidarte.",
    keywords: ["triste", "tristeza", "ansiedad", "ansiosa", "deprimida", "depresion", "lloro todos los dias", "lloro todo el dia", "no disfruto nada", "angustia"],
  },
];

// Frases frecuentes y benignas que contienen raíces de alarma ("análisis de sangre").
// Se retiran del texto antes de buscar; si el mensaje trae otra señal, se detecta igual.
const BENIGN_PHRASES = [
  "analisis de sangre", "analisis de la sangre", "examen de sangre", "examenes de sangre", "prueba de sangre",
  "pruebas de sangre", "estudio de sangre", "estudios de sangre", "muestra de sangre", "toma de sangre",
  "sacar sangre", "tipo de sangre", "grupo de sangre", "azucar en la sangre", "azucar en sangre",
  "glucosa en la sangre", "glucosa en sangre", "sangre del cordon", "sangre de cordon", "donar sangre",
  "sangria", "sangran las encias", "sangrado de encias", "sangrado en las encias", "me sangra la nariz",
  "sangrado nasal", "sangrado de nariz", "grados de calor", "grados afuera", "grados a la sombra",
  "grados en la calle",
];
// Temperatura del clima, no corporal: "hace 40 grados", "estamos a 38°".
const WEATHER_TEMP = /(^|\s)(hace|hay|habia|hara|estamos a|esta a|estaba a)\s+\d{2}([.,]\d+)?\s*(°|º|grados)/g;

// Signos a los que no se aplica la negación ni la rebaja por pregunta: "no tengo ganas de vivir"
// es una alarma, no una negación.
const ALWAYS_HIGH = new Set(["salud-mental"]);

// ---------------------------------------------------------------------------
// Detector local
// ---------------------------------------------------------------------------
export function normalizeText(t: string): string {
  return (t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[¿¡"“”'‘’«»()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Pattern = string[][]; // partes (AND) → alternativas (OR)
type CompiledSign = { sign: AlarmSign; patterns: Pattern[] };

let compiledUrgent: CompiledSign[] | null = null;
let compiledCallToday: CompiledSign[] | null = null;
let compiledGenericPain: CompiledSign | null = null;
let normalizedBenign: string[] | null = null;

function compileSign(sign: AlarmSign): CompiledSign {
  return {
    sign,
    patterns: sign.keywords
      .map((k) =>
        normalizeText(k)
          .split("+")
          .map((part) => part.split("|").map((alt) => alt.trim()).filter(Boolean))
          .filter((alts) => alts.length > 0)
      )
      .filter((parts) => parts.length > 0),
  };
}

function appliesToWeek(sign: AlarmSign, week?: number): boolean {
  if (typeof week !== "number" || !Number.isFinite(week)) return true; // ante la duda, aplica
  const w = Math.floor(week);
  if (typeof sign.minWeek === "number" && w < sign.minWeek) return false;
  if (typeof sign.maxWeek === "number" && w > sign.maxWeek) return false;
  return true;
}

// Negación simple justo antes de la palabra clave, dentro de la misma cláusula:
// "no tengo fiebre", "sin sangrado", "ni fiebre", "no he sangrado".
const NEGATION_BEFORE = /(?:^|\s)(?:no tengo|no tuve|no he tenido|no he|no estoy|no hay|no hubo|no presento|sin|ni|nada de)(?:\s+\S+){0,2}\s*$/;
const CLAUSE_BREAK = /(?:[,:]|\s(?:pero|y|e|aunque|sino|ademas)\s)/g;

function isNegatedAt(sentence: string, index: number): boolean {
  let before = sentence.slice(0, index);
  let cut = 0;
  for (const m of before.matchAll(CLAUSE_BREAK)) cut = (m.index ?? 0) + m[0].length;
  before = before.slice(cut).slice(-48);
  return NEGATION_BEFORE.test(before);
}

/** Posiciones donde aparece alguna alternativa de la parte. */
function findPart(sentence: string, alts: string[]): { index: number; alt: string }[] {
  const out: { index: number; alt: string }[] = [];
  for (const alt of alts) {
    let from = 0;
    for (;;) {
      const i = sentence.indexOf(alt, from);
      if (i < 0) break;
      out.push({ index: i, alt });
      from = i + 1;
    }
  }
  return out;
}

/**
 * "strong": al menos una coincidencia afirmada. "weak": solo coincidencias negadas.
 * En patrones con "+" se evalúa la negación en la parte que aparece primero.
 */
function patternHit(pattern: Pattern, sentences: string[], negatable: boolean): "strong" | "weak" | null {
  let weak = false;
  for (const s of sentences) {
    const hits = pattern.map((alts) => findPart(s, alts));
    if (hits.some((h) => h.length === 0)) continue;
    if (!negatable) return "strong";
    if (pattern.length === 1) {
      for (const h of hits[0]) {
        if (h.alt.startsWith("no ") || !isNegatedAt(s, h.index)) return "strong";
      }
      weak = true;
      continue;
    }
    const earliest = hits
      .map((h) => h.reduce((a, b) => (b.index < a.index ? b : a)))
      .reduce((a, b) => (b.index < a.index ? b : a));
    if (earliest.alt.startsWith("no ") || !isNegatedAt(s, earliest.index)) return "strong";
    weak = true;
  }
  return weak ? "weak" : null;
}

function matchSign(c: CompiledSign, sentences: string[], week?: number): "strong" | "weak" | null {
  if (!appliesToWeek(c.sign, week)) return null;
  const negatable = !ALWAYS_HIGH.has(c.sign.id);
  let best: "strong" | "weak" | null = null;
  for (const p of c.patterns) {
    const r = patternHit(p, sentences, negatable);
    if (r === "strong") return "strong";
    if (r === "weak") best = "weak";
  }
  return best;
}

// 38 °C o más (o 100.4 °F o más) escrito con número: "38.5 grados", "39°", "101 F".
const FEVER_C = /(^|[^\d])(3[89]|4[0-2])([.,]\d+)?\s*(°|º|grados|gr\b|c\b)/;
const FEVER_F = /(^|[^\d])(10[0-6])([.,]\d+)?\s*(°\s*f|º\s*f|f\b|grados f)/;
// "38.5 de temperatura", "temperatura de 39", "tengo 38 de fiebre".
const FEVER_WORD_AFTER = /(^|[^\d])(3[89]|4[0-2])([.,]\d+)?\s*(de\s+)?(temperatura|fiebre|calentura)/;
const FEVER_WORD_BEFORE = /(temperatura|fiebre|calentura)[^\d]{0,20}(3[89]|4[0-2])([.,]\d+)?(?!\d)/;

// Preguntas generales / educativas: "¿qué son...?", "¿cómo saber si...?", "¿es normal...?".
const QUESTION_FRAME = /(?:^|\s)(?:que es|que son|que significa|que significan|que causa|que causan|por que se|por que da|por que dan|como saber|como se si|como se que|como reconocer|como identificar|como distinguir|como diferenciar|diferencia entre|cual es la diferencia|cuales son|cuando debo ir|cuando deberia ir|cuando hay que ir|cuando ir|cuando llamar|cuando debo llamar|cuando preocupar|es normal|son normales|que pasa si|signos de|senales de|sintomas de|puede causar|es malo|es peligroso)(?:\s|$)/;
// Marcas de que algo está pasando ahora (primera persona, presente, tiempo reciente, pareja).
const REPORT_MARKER = /(?:^|\s)(?:estoy|tengo|tuve|siento|senti|sentia|note|noto|llevo|lleva|acabo de|ahorita|ahora mismo|desde hace|desde ayer|desde anoche|desde la manana|desde esta|hace (?:un|una|unos|unas|dos|tres|\d+) (?:rato|minutos?|horas?|dias?)|me (?:duele|dolio|sale|salio|esta|paso|baja|bajo|vino|moje|dio|da|pica|arde)|le (?:duele|dolio|sale|salio|esta|paso|dio|baja|bajo)|mi (?:esposa|pareja|mujer|novia|bebe|bebita)|se me|(?:estoy|este|esta|estan|estaba) \w*(?:ando|iendo|endo))(?=\s|$)/g;

// "¿Es normal que me duela...?", "¿es normal que el bebé no se mueva?": casi siempre relata
// algo que está pasando (el infinitivo, "¿es normal tener...?", sí suele ser general).
const NORMAL_QUE = /(?:^|\s)(?:es|son|sera|seria) normal(?:es)? que\s/;

function isInformationalQuestion(normalized: string): boolean {
  const whole = normalized.replace(/[?!.,;:]/g, " ").replace(/\s+/g, " ");
  if (!QUESTION_FRAME.test(whole)) return false;
  if (NORMAL_QUE.test(whole)) return false;
  for (const m of whole.matchAll(REPORT_MARKER)) {
    const start = (m.index ?? 0) + (m[0].startsWith(" ") ? 1 : 0);
    // "¿qué pasa si tengo...?" es hipotético: no cuenta como relato.
    if (whole.slice(Math.max(0, start - 3), start) === "si ") continue;
    return false;
  }
  return true;
}

const byClinicalOrder = (a: AlarmSign, b: AlarmSign) => URGENT_SIGNS.indexOf(a) - URGENT_SIGNS.indexOf(b);

/**
 * Detecta señales de alarma en texto libre (es-LatAm). Prioriza no fallar:
 * el falso positivo es aceptable, el falso negativo no.
 *
 * - urgent=true  → `matches` son señales de URGENT_SIGNS (o GENERIC_PAIN_SIGN si no hubo otra).
 * - urgent=false y matches.length>0 → `matches` son de CALL_TODAY_SIGNS (llama hoy).
 * - urgent=false y matches vacío → sin señales.
 * - confidence: ver AlarmResult. "low" nunca apaga urgent; solo cambia la presentación.
 */
export function detectAlarm(text: string, week?: number): AlarmResult {
  if (!text || !text.trim()) return { urgent: false, matches: [], confidence: "high" };

  if (!compiledUrgent) compiledUrgent = URGENT_SIGNS.map(compileSign);
  if (!compiledCallToday) compiledCallToday = CALL_TODAY_SIGNS.map(compileSign);
  if (!compiledGenericPain) compiledGenericPain = compileSign(GENERIC_PAIN_SIGN);
  if (!normalizedBenign) normalizedBenign = BENIGN_PHRASES.map(normalizeText);

  let whole = normalizeText(text).replace(WEATHER_TEMP, " ");
  for (const phrase of normalizedBenign) whole = whole.split(phrase).join(" ");
  // Oraciones: el punto decimal ("38.5") no corta.
  const sentences = whole.split(/[!?;\n]+|\.(?!\d)/).map((s) => s.trim()).filter(Boolean);
  const informational = isInformationalQuestion(whole);

  const strong: AlarmSign[] = [];
  const weak: AlarmSign[] = [];
  for (const c of compiledUrgent) {
    const r = matchSign(c, sentences, week);
    if (r === "strong") strong.push(c.sign);
    else if (r === "weak") weak.push(c.sign);
  }

  // Presión arterial escrita con números: 140/90 o más.
  const preeclampsiaSign = URGENT_SIGNS.find((s) => s.id === "preeclampsia");
  if (preeclampsiaSign && !strong.includes(preeclampsiaSign) && /presion|tension/.test(whole)) {
    const bp = whole.match(/(^|[^\d])(\d{2,3})\s*\/\s*(\d{2,3})(?!\d)/);
    if (bp && (Number(bp[2]) >= 140 || Number(bp[3]) >= 90)) {
      strong.push(preeclampsiaSign);
      const w = weak.indexOf(preeclampsiaSign);
      if (w >= 0) weak.splice(w, 1);
    }
  }

  const feverSign = URGENT_SIGNS.find((s) => s.id === "fiebre");
  const feverByNumber = [FEVER_C, FEVER_F, FEVER_WORD_AFTER, FEVER_WORD_BEFORE].some((re) => re.test(whole));
  if (feverSign && feverByNumber && !strong.includes(feverSign)) {
    strong.push(feverSign);
    const w = weak.indexOf(feverSign);
    if (w >= 0) weak.splice(w, 1);
  }

  if (strong.length === 0 && weak.length === 0) {
    const generic = matchSign(
      compiledGenericPain,
      sentences.filter((s) => !GENERIC_PAIN_EXCLUDE.some((x) => s.includes(x))),
      week
    );
    if (generic === "strong") strong.push(GENERIC_PAIN_SIGN);
    else if (generic === "weak") weak.push(GENERIC_PAIN_SIGN);
  }

  if (strong.length > 0) {
    strong.sort(byClinicalOrder);
    const alwaysHigh = strong.some((s) => ALWAYS_HIGH.has(s.id));
    return { urgent: true, matches: strong, confidence: informational && !alwaysHigh ? "low" : "high" };
  }
  if (weak.length > 0) {
    weak.sort(byClinicalOrder);
    return { urgent: true, matches: weak, confidence: "low" };
  }

  const callToday: AlarmSign[] = [];
  for (const c of compiledCallToday) {
    if (matchSign(c, sentences, week) === "strong") callToday.push(c.sign);
  }
  return { urgent: false, matches: callToday, confidence: informational ? "low" : "high" };
}


export function isPreterm(week?: number): boolean {
  return typeof week === "number" && week < 37;
}

/**
 * Semana sobre la que se aplican las reglas clínicas, o undefined si no es fiable:
 * - `weekUnknown` (registro omitido o pareja unida sin semana), o
 * - menor de 4: es un valor de relleno (el registro omitido guardaba 1); antes de la
 *   semana 4 no se suele saber del embarazo.
 * Con undefined, el detector aplica todas las señales y los contadores muestran las dos reglas.
 * Si hay fecha probable de parto (`dueDate`, "aaaa-mm-dd") la semana sale de ella (del día de
 * hoy), no de `week`, que podría haberse quedado atrás.
 */
export function clinicalWeek(
  profile?: { week?: number | null; weekUnknown?: boolean; dueDate?: string | null } | null,
  today: Date = new Date()
): number | undefined {
  if (!profile || profile.weekUnknown) return undefined;
  const fromDueDate = weekFromDueDate(profile.dueDate, today);
  const w = fromDueDate ?? profile.week;
  return typeof w === "number" && Number.isFinite(w) && w >= 4 && w <= 45 ? Math.floor(w) : undefined;
}

/**
 * Semanas completas según la FPP (EG = 280 − días de calendario hasta la FPP), sin acotar; null si
 * no hay FPP válida. Es la misma cuenta que gestationalAgeFromDueDate (src/lib/pregnancy.ts),
 * repetida aquí para que este módulo siga sin dependencias (lo usan el servidor y sus pruebas).
 */
function weekFromDueDate(dueDate: unknown, today: Date): number | null {
  if (typeof dueDate !== "string" || Number.isNaN(today.getTime())) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const due = new Date(Date.UTC(y, mo, d));
  if (due.getUTCFullYear() !== y || due.getUTCMonth() !== mo || due.getUTCDate() !== d) return null;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const totalDays = 280 - Math.round((due.getTime() - todayUtc) / 86_400_000);
  return Math.floor(totalDays / 7);
}

// ---------------------------------------------------------------------------
// Números de emergencia por región
// ---------------------------------------------------------------------------
export const EMERGENCY_NUMBERS: Record<string, string> = {
  MX: "911", US: "911", CA: "911", HN: "911", SV: "911", CR: "911", PA: "911", DO: "911", PR: "911",
  EC: "911", UY: "911", PY: "911", VE: "911",
  CO: "123",
  CL: "131",
  PE: "106",
  AR: "107",
  // Sin 911 único; se usa el servicio que atiende y traslada emergencias médicas en todo el país.
  // Nicaragua: Cruz Blanca (antes Cruz Roja), línea 128 gratuita, 24 h, todo el territorio (Canal 4, 2026-04-09:
  // https://www.canal4.com.ni/exito-total-temporada-veraniega-2026-nicaragua-cruz-blanca-servicio-pueblo/;
  // también en la lista de SINAPRED, https://www.sinapred.gob.ni/).
  NI: "128",
  // Guatemala: Bomberos Voluntarios 122 (CONRED, 2023-12-11, también Cruz Roja 125 y Bomberos Municipales 123:
  // https://conred.gob.gt/durante-la-temporada-de-descenso-de-tempertatura-conozca-los-numeros-de-emergencia/).
  GT: "122",
  ES: "112", FR: "112", DE: "112", IT: "112", PT: "112",
};

const TIMEZONE_REGION: Record<string, string> = {
  // México
  "America/Mexico_City": "MX", "America/Cancun": "MX", "America/Merida": "MX", "America/Monterrey": "MX",
  "America/Matamoros": "MX", "America/Chihuahua": "MX", "America/Ciudad_Juarez": "MX", "America/Ojinaga": "MX",
  "America/Hermosillo": "MX", "America/Mazatlan": "MX", "America/Bahia_Banderas": "MX", "America/Tijuana": "MX",
  // Centroamérica y Caribe
  "America/Tegucigalpa": "HN", "America/El_Salvador": "SV", "America/Costa_Rica": "CR", "America/Panama": "PA",
  "America/Santo_Domingo": "DO", "America/Puerto_Rico": "PR", "America/Managua": "NI", "America/Guatemala": "GT",
  // Sudamérica
  "America/Bogota": "CO", "America/Santiago": "CL", "America/Punta_Arenas": "CL", "America/Lima": "PE",
  "America/Buenos_Aires": "AR", "America/Guayaquil": "EC", "Pacific/Galapagos": "EC", "America/Montevideo": "UY",
  "America/Asuncion": "PY", "America/Caracas": "VE",
  // Estados Unidos y Canadá
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
  "America/Phoenix": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US", "America/Detroit": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA",
  "America/Halifax": "CA", "America/St_Johns": "CA", "America/Regina": "CA",
  // Europa
  "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Africa/Ceuta": "ES", "Europe/Paris": "FR",
  "Europe/Berlin": "DE", "Europe/Rome": "IT", "Europe/Lisbon": "PT", "Atlantic/Madeira": "PT", "Atlantic/Azores": "PT",
};

function regionFromLocale(locale?: string | null): string | null {
  if (!locale) return null;
  const parts = locale.replace(/_/g, "-").split("-");
  for (const part of parts.slice(1)) {
    if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase(); // "es-MX" → MX (ignora "419", scripts)
  }
  return null;
}

function regionFromTimeZone(): string | null {
  try {
    if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") return null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;
    if (tz.startsWith("America/Argentina/")) return "AR";
    if (tz.startsWith("America/Indiana/") || tz.startsWith("America/Kentucky/") || tz.startsWith("America/North_Dakota/")) return "US";
    return TIMEZONE_REGION[tz] ?? null;
  } catch {
    return null;
  }
}

/**
 * Número de emergencias para la región del dispositivo.
 * Región desde navigator.language (ej. es-MX); si no trae región, desde la zona horaria.
 * Seguro en SSR: sin navegador devuelve 911 con confident=false (Node 21+ expone un
 * `navigator` global con el idioma del servidor, por eso también se exige `window`).
 * Si el idioma y la zona horaria sugieren números distintos, confident=false
 * para que la interfaz pida confirmar.
 * Solo cuenta el idioma principal: los secundarios (ej. "en-US" detrás de "es-419")
 * no dicen dónde está la persona y darían 911 en Colombia, Chile, Perú o Argentina.
 */
export function getEmergencyNumber(): EmergencyInfo {
  const fallback: EmergencyInfo = { number: "911", region: null, confident: false };
  if (typeof window === "undefined" || typeof navigator === "undefined") return fallback;

  try {
    const langRegion = regionFromLocale(navigator.language);
    const tzRegion = regionFromTimeZone();

    if (langRegion && EMERGENCY_NUMBERS[langRegion]) {
      const tzNumber = tzRegion ? EMERGENCY_NUMBERS[tzRegion] : undefined;
      const confident = !tzNumber || tzNumber === EMERGENCY_NUMBERS[langRegion];
      return { number: EMERGENCY_NUMBERS[langRegion], region: langRegion, confident };
    }

    if (tzRegion && EMERGENCY_NUMBERS[tzRegion]) {
      // Sin región en el idioma: la zona horaria decide. Si el idioma traía una
      // región no reconocida, se usa la zona pero se pide confirmar.
      return { number: EMERGENCY_NUMBERS[tzRegion], region: tzRegion, confident: !langRegion };
    }
  } catch {
    return fallback;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Enlaces
// ---------------------------------------------------------------------------
export function telHref(phone: string): string {
  const trimmed = (phone || "").trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return "tel:" + plus + trimmed.replace(/\D/g, "");
}

export function hospitalMapsUrl(ct?: CareTeam): { url: string; label: string; personalized: boolean } {
  const name = ct?.hospitalName?.trim();
  const address = ct?.hospitalAddress?.trim();
  if (name || address) {
    const destination = [name, address].filter(Boolean).join(", ");
    return {
      url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      label: name ? `Cómo llegar a ${name}` : "Cómo llegar a tu hospital",
      personalized: true,
    };
  }
  return {
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("hospital con maternidad cerca de mí")}`,
    label: "Buscar maternidad cercana",
    personalized: false,
  };
}

// ---------------------------------------------------------------------------
// Utilidades de CareTeam (compartidas por store, Firestore y formulario)
// ---------------------------------------------------------------------------
export const CARE_TEAM_KEYS = ["obName", "obPhone", "hospitalName", "hospitalAddress", "emergencyNumber", "country", "crisisLine"] as const;

/** Deja solo campos conocidos de tipo texto, recortados y no vacíos (máx. 200 caracteres). */
export function sanitizeCareTeam(input: unknown): CareTeam {
  const out: CareTeam = {};
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  for (const key of CARE_TEAM_KEYS) {
    const v = src[key];
    if (typeof v === "string") {
      const t = v.trim().slice(0, 200);
      // País: solo un código de dos letras o "OTHER" (la lista vive en src/lib/crisisLines.ts).
      if (key === "country" && !/^(?:[A-Z]{2}|OTHER)$/.test(t)) continue;
      if (t) out[key] = t;
    }
  }
  return out;
}

export function sameCareTeam(a: CareTeam, b: CareTeam): boolean {
  return CARE_TEAM_KEYS.every((k) => (a[k] ?? "") === (b[k] ?? ""));
}
