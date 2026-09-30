// Voz del acompañante (el papá) para las señales de alarma de src/lib/urgency.ts.
//
// urgency.ts escribe cada señal para la mamá ("aunque te sientas bien"). En las pantallas que
// también lee el papá (SOS y la tarjeta de urgencia del chat) se usa este texto, que dice lo
// mismo en tercera persona. Solo es copy: no cambia qué se detecta ni el nivel de cada señal.
// Si cambia el sentido clínico de una señal en urgency.ts, hay que revisar aquí su versión.

import type { AlarmSign } from "@/lib/urgency";

type SignCopy = { title?: string; detail?: string };

/** Solo las señales escritas en segunda persona; las demás ya son neutras. */
const PARTNER_SIGN_COPY: Record<string, SignCopy> = {
  movimientos: {
    detail: "Desde la semana 28, menos de 10 movimientos en 2 horas es motivo para ir. Si ella nota un cambio, no esperen a terminar el conteo.",
  },
  fiebre: { detail: "Temperatura de 38 °C (100.4 °F) o más, aunque se sienta bien por lo demás." },
  "respiracion-pecho": { detail: "También si siente el corazón muy acelerado." },
  "desmayo-convulsion": { detail: "Si se desmayó o siente que va a desmayarse, que no maneje y no la dejes sola." },
  // El papá también puede ser quien tiene estos pensamientos: el texto cubre los dos casos.
  "salud-mental": {
    title: "Pensamientos de hacerse daño o de hacerle daño al bebé",
    detail: "No es culpa de nadie y tiene tratamiento. Llama a emergencias ahora. Si es ella, no la dejes sola; si eres tú, pide a alguien de confianza que te acompañe.",
  },
  vomitos: {
    title: "Vómitos que no la dejan retener líquidos",
    detail: "Náuseas y vómitos tan intensos que no puede retener ni el agua: hay riesgo de deshidratación.",
  },
  picazon: { detail: "Sobre todo si empeora de noche. Su obstetra puede pedir un análisis para revisarlo." },
  cansancio: { detail: "Aunque descanse bien. Vale la pena revisarlo." },
  animo: {
    detail: "Si lleva 2 semanas o más sintiéndose así, que se lo cuente hoy a su obstetra; puedes acompañarla. Pedir ayuda también es cuidarse.",
  },
};

/**
 * Antes de la semana 20 no se habla de parto pretérmino (ACOG: de la 20+0 a la 36+6), pero las
 * contracciones o cólicos regulares siguen siendo motivo para llamar ya a su obstetra.
 */
const BEFORE_20_SIGN_COPY: Record<string, { mama: SignCopy; papa: SignCopy }> = {
  pretermino: {
    mama: {
      title: "Contracciones, cólicos regulares o presión en la pelvis",
      detail: "Contracciones o cólicos como de menstruación que van y vienen, presión en la pelvis o dolor lumbar rítmico. Con 4 o más en 1 hora, llama ya a tu obstetra.",
    },
    papa: {
      title: "Contracciones, cólicos regulares o presión en la pelvis",
      detail: "Contracciones o cólicos como de menstruación que le van y vienen, presión en la pelvis o dolor lumbar rítmico. Si tiene 4 o más en 1 hora, llama ya a su obstetra.",
    },
  },
};

/**
 * Título y detalle de una señal en la voz de quien lee: la mamá (tal cual) o el papá. Con la
 * semana confirmada (`week`), antes de la 20 algunas señales se dicen sin hablar de pretérmino.
 */
export function signCopy(sign: AlarmSign, role?: "mama" | "papa", week?: number): { title: string; detail: string } {
  const early = typeof week === "number" && week < 20 ? BEFORE_20_SIGN_COPY[sign.id]?.[role === "papa" ? "papa" : "mama"] : undefined;
  const partner = role === "papa" ? PARTNER_SIGN_COPY[sign.id] : undefined;
  return { title: early?.title ?? partner?.title ?? sign.title, detail: early?.detail ?? partner?.detail ?? sign.detail };
}
