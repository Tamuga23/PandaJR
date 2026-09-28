import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { CALL_TODAY_SIGNS, URGENT_SIGNS, detectAlarm } from "@/lib/urgency";

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_TEXT_CHARS = 4000;

const UNAVAILABLE_REPLY = "PandaIA no está disponible en este momento.";
const ERROR_REPLY = "PandaIA no pudo responder esta vez. Inténtalo de nuevo.";

// Protocolo de alerta roja construido desde la fuente clínica única (src/lib/urgency.ts),
// para que el modelo y el detector local vigilen exactamente las mismas señales.
const RED_FLAG_PROTOCOL = URGENT_SIGNS.map((s, i) => `     ${i + 1}. ${s.title}. ${s.detail}`).join("\n");
const CALL_TODAY_PROTOCOL = CALL_TODAY_SIGNS.map((s) => `     - ${s.title}. ${s.detail}`).join("\n");

type Alarm = ReturnType<typeof detectAlarm>;
type Json = Record<string, unknown>;
type GeminiTurn = { role: "user" | "model"; parts: { text: string }[] };

const asObject = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});

/** El detector solo fuerza la urgencia cuando el mensaje parece relatar algo que pasa ahora. */
const forcesUrgency = (alarm: Alarm | null): alarm is Alarm => !!alarm && alarm.urgent && alarm.confidence === "high";

/**
 * Campos de urgencia de la respuesta. Si el detector local encontró una señal urgente con
 * confianza alta, urgency=true aunque el modelo no la marque (o aunque el modelo no responda).
 * Con confianza baja (pregunta general o negación) decide el modelo.
 */
function urgencyFields(alarm: Alarm | null, modelUrgency?: unknown, modelReason?: unknown): { urgency: boolean; urgencyReason?: string } {
  const local = forcesUrgency(alarm);
  if (!local && modelUrgency !== true) return { urgency: false };
  const localReason = local && alarm ? alarm.matches.map((m) => m.title).join("; ") : "";
  const modelText = typeof modelReason === "string" ? modelReason.trim().slice(0, 160) : "";
  const urgencyReason = localReason || modelText;
  return urgencyReason ? { urgency: true, urgencyReason } : { urgency: true };
}

export async function POST(req: NextRequest) {
  let alarm: Alarm | null = null;

  try {
    let body: Json;
    try {
      body = asObject(await req.json());
    } catch {
      return NextResponse.json({ reply: "No pude leer tu mensaje. Inténtalo de nuevo.", urgency: false }, { status: 400 });
    }

    const history = body.history;
    const context = asObject(body.context);
    const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : "";
    if (!message) {
      return NextResponse.json({ reply: "Escribe tu consulta para que PandaIA pueda ayudarte.", urgency: false }, { status: 400 });
    }

    // La app envía currentWeek=null cuando la semana no está confirmada (p. ej. se omitió el registro).
    const rawWeek = context.currentWeek === null || context.currentWeek === undefined ? NaN : Number(context.currentWeek);
    const knownWeek = Number.isFinite(rawWeek) && rawWeek >= 1 && rawWeek <= 45 ? Math.floor(rawWeek) : undefined;
    // Preguntas sugeridas por la propia app (chips, decodificador de ecografías): son educativas.
    const fromSuggestion = context.source === "suggestion";

    // Pre-chequeo en servidor: no depende del modelo ni de la clave. Si la semana no
    // llega, el detector aplica todas las señales (ante la duda, urgente).
    const detected = detectAlarm(message, knownWeek);
    alarm = fromSuggestion ? { ...detected, confidence: "low" } : detected;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "[PandaIA] GEMINI_API_KEY no está definida: /api/chat responde 503. " +
          "Agrégala en .env.local (desarrollo) o en las variables de entorno del despliegue."
      );
      return NextResponse.json(
        { reply: UNAVAILABLE_REPLY, unavailable: true, ...urgencyFields(alarm) },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const currentYear = new Date().getFullYear();
    const userRole =
      context.userRole === "mama" || context.userRole === "papa"
        ? context.userRole
        : String(context.userProfile || "").toLowerCase().includes("mamá") ? "mama" : "papa";
    const userName = typeof context.userName === "string" ? context.userName.trim().slice(0, 80) : "";
    const roleLine = `- Rol del usuario: ${userRole === "papa" ? `Papá${userName ? ` (${userName})` : ""}` : `Mamá${userName ? ` (${userName})` : ""}`}`;
    const dateLine = `- Fecha actual: ${new Date().toISOString().split("T")[0]}`;
    const obstetraDe = userRole === "papa" ? "el obstetra de su pareja" : "su obstetra";
    const consultaObstetra = userRole === "papa" ? "consúltalo con el obstetra de tu pareja" : "consulta con tu obstetra";

    const alarmTitles = alarm.matches.map((m) => m.title).join("; ");
    const localAlarmNotice = !alarm.urgent
      ? ""
      : forcesUrgency(alarm)
        ? `\n  AVISO DEL SISTEMA PARA ESTE MENSAJE: el detector de la app encontró posibles señales urgentes que parecen estar ocurriendo ahora (${alarmTitles}). Aplica el PROTOCOLO DE ALERTA ROJA en esta respuesta y marca "urgency": true.\n`
        : `\n  AVISO DEL SISTEMA PARA ESTE MENSAJE: el mensaje menciona temas del PROTOCOLO DE ALERTA ROJA (${alarmTitles}), pero parece una pregunta informativa o una negación. Evalúa si describe algo que le está pasando ahora: si es así, aplica el protocolo y marca "urgency": true. Si es una pregunta informativa, respóndela con calma, explica cuándo sí hay que ir a urgencias o llamar a emergencias y marca "urgency": false.\n`;

    // Anclaje por semana solo si la semana está confirmada; si no, no se inventa una.
    let weekBlock: string;
    if (knownWeek === undefined) {
      weekBlock = `CONTEXTO CLÍNICO CRÍTICO DEL USUARIO:
- Semana gestacional: NO CONFIRMADA (el usuario no la ha indicado). No asumas ni inventes una semana concreta. Si la respuesta depende de la semana, da la información general y, al final, pídele con amabilidad que la indique en Ajustes.
- Ante cualquier señal del PROTOCOLO DE ALERTA ROJA, aplícalo sin importar la semana. Con contracciones, explica las dos reglas: antes de la semana 37, 4 o más en 1 hora son motivo para llamar ya; desde la semana 37, la regla 5-1-1.
${roleLine}
${dateLine}`;
    } else {
      const currentWeek = knownWeek;
      const trimester = currentWeek <= 13 ? 1 : currentWeek <= 27 ? 2 : 3;
      weekBlock = `CONTEXTO CLÍNICO CRÍTICO DEL USUARIO:
- Semana Gestacional EXACTA: Semana ${currentWeek} (${trimester}º Trimestre)
${roleLine}
${dateLine}

REGLA DE ORO DE ANCLAJE POR SEMANA GESTACIONAL (SEMANA ${currentWeek}):
1. Tus respuestas DEBEN corresponder con absoluta precisión a la SEMANA ${currentWeek} de gestación:
   - Menciona de forma natural y cálida la Semana ${currentWeek} en tu respuesta cuando sea pertinente (ej: "En esta semana ${currentWeek}...", "Tu bebé en la semana ${currentWeek}...").
   - Desarrollo fetal en Semana ${currentWeek}: Describe el tamaño aproximado, órganos formándose o madurando, y capacidades sensoriales o motoras reales para la semana ${currentWeek}.
   - Síntomas maternos en Semana ${currentWeek}: Qué sensaciones físicas o emocionales son esperadas en esta semana específica y cómo abordarlas.
   - Controles y exámenes médicos en esta etapa:
     * Semanas 11-14 (1er Trimestre): Tamizaje genético, ecografía de translucencia nucal (TN), hueso nasal y análisis de sangre.
     * Semanas 18-22 (2º Trimestre): Ecografía morfológica.
     * Semanas 24-28 (2º Trimestre): Prueba de glucosa para diabetes gestacional (según el lugar, prueba corta de 1 hora o curva de 2 horas).
     * Semanas 28-36 (3er Trimestre): Monitoreo de movimientos fetales (método Cardiff), ecografía de crecimiento y madurez placentaria.
     * Semanas 36-37 (3er Trimestre): Cultivo de estreptococo del grupo B (SGB), monitoreo preparto y signos de trabajo de parto activo (5-1-1).
   - Acciones recomendadas para ${userRole === "papa" ? "el papá" : "la mamá"} acordes a la semana ${currentWeek}.
2. NUNCA des hitos o recomendaciones descontextualizadas de otros trimestres sin aclarar el porqué. Si el usuario hace una pregunta general ("¿qué comer?", "¿qué hacer?", "¿cómo va el bebé?"), responde SIEMPRE contextualizado a la SEMANA ${currentWeek}.`;
    }

    const systemInstruction = `Eres PandaIA, el asistente con inteligencia artificial de la aplicación PandaJR.
Tu misión es acompañar y orientar a la pareja durante el embarazo (${userRole === "papa" ? "enfocándote en el rol activo del papá, al que la app llama copiloto" : "enfocándote en el bienestar integral de la mamá"}) con información general y apoyo afectivo. Orientas: no diagnosticas ni reemplazas la valoración de ${obstetraDe}.

${weekBlock}

Pilares y tono:
1. Tono: cálido, empático, sereno y claro, alineado con guías públicas (ACOG, CDC). Nunca digas ni insinúes que tu contenido está validado o revisado por médicos.
   - Idioma: español neutro latinoamericano, tuteando (nunca voseo ni "vosotros"). Evita la jerga: la primera vez que uses una sigla o un término técnico (FPP, TN, LCC, DBP, ILA, SGB, VSR, Tdap, método Cardiff, regla 5-1-1), explícalo en pocas palabras entre paréntesis.
   - Escribe los títulos de citas y tarjetas con mayúscula solo al inicio (ej: "Ecografía morfológica", "Análisis de sangre").
2. Pilares de paternidad activa en PandaJR:
   - Alimentación en el embarazo: ácido fólico (previene defectos del tubo neural), omega-3 DHA de pescados bajos en mercurio, colina (huevo, pollo), hierro y calcio.
   - Entorno seguro: evitar el contacto de la mamá con químicos fuertes y solventes, evitar plásticos con BPA, y que la pareja asuma la limpieza del arenero del gato (prevención de toxoplasmosis).
   - Menos estrés para la mamá: asumir la carga mental de la rutina del hogar, proteger su descanso, masajes y comprensión afectiva.
3. Responsabilidad y Seguridad:
   - Eres un asistente complementario: no sustituyes el criterio de ${obstetraDe}.
   - Ecografías: si preguntan por siglas o términos del informe (ej: LCC = longitud cráneo-caudal, DBP = diámetro biparietal, ILA = índice de líquido amniótico), explica qué mide cada uno. No interpretes valores concretos como normales o anormales: eso lo valora ${obstetraDe}.
   - Ante cualquier señal del PROTOCOLO DE ALERTA ROJA (más abajo), indica con urgencia llamar a emergencias o acudir a urgencias obstétricas de inmediato.
4. Detección Inteligente de Citas y Recordatorios:
   - Si el usuario te pide agendar, registrar o recordar una cita médica, consulta, ecografía o laboratorio, extrae los datos en el objeto "appointment" para que la app la cree automáticamente en la Agenda.
   - Para el campo "rawDate", calcula la fecha correspondiente en formato ISO YYYY-MM-DD considerando el año actual (${currentYear}).
   - Si el usuario NO pide agendar nada, el campo "appointment" debe ser omitido o ser null.

  DIRECTRICES CLÍNICAS Y DE SEGURIDAD MÉDICA (alineadas con guías públicas de ACOG y CDC):
  - No eres médico ni reemplazas a ${obstetraDe}. Nunca emitas diagnósticos definitivos ni prescribas medicamentos específicos sin decir "${consultaObstetra}".
  - PROTOCOLO DE ALERTA ROJA (fuente: CDC "Hear Her" y ACOG). Señales urgentes:
${RED_FLAG_PROTOCOL}
    Si el mensaje describe cualquiera de estas señales en la mamá (lo cuente ella o su pareja), o si dudas de si se trata de una de ellas:
     a) Marca "urgency": true y resume la señal en "urgencyReason" (máximo 10 palabras).
     b) Pausa tu tono casual. Empieza "reply" con una instrucción directiva y serena: llamar a emergencias o ir a urgencias obstétricas ahora, sin esperar a ver si pasa.
     c) No expliques posibles causas ni tranquilices con diagnósticos. No pidas más datos antes de dar la instrucción.
     d) No escribas números de teléfono: la app ya muestra botones de llamada con el número de emergencias de su región y el de su obstetra. Di "llama a emergencias" o "usa los botones de llamada".
     e) Si escribe la pareja (copiloto), pídele que la acompañe en todo momento.
    Si el mensaje no describe ninguna de estas señales, "urgency" debe ser false. Una pregunta general o educativa ("¿qué son las contracciones?", "¿cómo saber si rompí fuente?", "¿cuándo hay que ir al hospital?") sin decir que le está pasando ahora NO es urgencia: respóndela con calma, explica cuándo sí hay que ir a urgencias y marca "urgency": false.
  - Señales para llamar HOY a su obstetra (no son de urgencias; "urgency": false, pero recomienda llamar hoy mismo):
${CALL_TODAY_PROTOCOL}
  - Regla de Parto 5-1-1 (solo desde la semana 37): si el usuario pregunta cuándo ir al hospital por contracciones, enséñale la regla 5-1-1 (contracciones cada 5 minutos o menos, de 1 minuto o más de duración, durante al menos 1 hora). Antes de la semana 37, contracciones regulares (4 o más en 1 hora), presión en la pelvis o dolor lumbar rítmico son señal de posible parto pretérmino: aplica el PROTOCOLO DE ALERTA ROJA.
  - Promueve prácticas basadas en evidencia: Lactancia materna (pero apoyando emocionalmente si no es posible), contacto piel con piel, suplementación correcta (Ácido Fólico en el 1er trimestre, Hierro/DHA después, previo aval médico), y el método Cardiff para conteo de patadas.
${localAlarmNotice}`;

    // Historial para el modelo: solo turnos de conversación (sin tarjetas de urgencia ni errores).
    const contents: GeminiTurn[] = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        const h = asObject(item);
        if (h.kind) continue;
        const text = String(h.text || h.content || "").slice(0, MAX_HISTORY_TEXT_CHARS);
        if (!text) continue;
        if (h.sender === "user" || h.role === "user") {
          contents.push({ role: "user", parts: [{ text }] });
        } else if (h.sender === "ai" || h.role === "model") {
          contents.push({ role: "model", parts: [{ text }] });
        }
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "Respuesta conversacional completa, empática y detallada para el usuario."
            },
            urgency: {
              type: Type.BOOLEAN,
              description: "true si el mensaje describe alguna señal del PROTOCOLO DE ALERTA ROJA (o hay duda razonable); false en cualquier otro caso."
            },
            urgencyReason: {
              type: Type.STRING,
              description: "Solo si urgency es true: la señal detectada en pocas palabras (ej. 'Sangrado vaginal'). Omitir si no aplica."
            },
            appointment: {
              type: Type.OBJECT,
              description: "Datos de la cita médica a agendar en la app si el usuario solicitó agendar o recordar. Null si no aplica.",
              properties: {
                title: { type: Type.STRING, description: "Título breve del evento (ej: Ecografía Morfológica, Examen de Sangre)" },
                date: { type: Type.STRING, description: "Fecha formateada para mostrar (ej: 15 Oct, 28 Nov)" },
                rawDate: { type: Type.STRING, description: "Fecha en formato ISO YYYY-MM-DD" },
                time: { type: Type.STRING, description: "Hora de la cita si se especificó, o 'Por definir'" },
                doctor: { type: Type.STRING, description: "Doctor o lugar si se especificó, o 'Por definir'" }
              },
              required: ["title", "date", "rawDate"]
            },
            card: {
              type: Type.OBJECT,
              description: "Opcional: Si amerita resaltar un hito o tarjeta informativa educativa sobre el bebé o la mamá. Omitir cuando urgency es true.",
              properties: {
                title: { type: Type.STRING, description: "Título breve de la tarjeta informativa, sin emoji" },
                desc: { type: Type.STRING, description: "Breve explicación clave o recomendación médica" }
              }
            }
          },
          required: ["reply", "urgency"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      return NextResponse.json({ reply: ERROR_REPLY, ...urgencyFields(alarm) }, { status: 502 });
    }

    let parsed: Json;
    try {
      parsed = asObject(JSON.parse(outputText));
    } catch {
      parsed = { reply: outputText };
    }

    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply : "";
    if (!reply) {
      return NextResponse.json({ reply: ERROR_REPLY, ...urgencyFields(alarm) }, { status: 502 });
    }

    const urgency = urgencyFields(alarm, parsed.urgency, parsed.urgencyReason);
    const out: Json = { reply, ...urgency };
    if (parsed.appointment && typeof parsed.appointment === "object") out.appointment = parsed.appointment;
    // Con urgencia, la tarjeta de llamada es lo único que debe destacar.
    if (!urgency.urgency && parsed.card && typeof parsed.card === "object") out.card = parsed.card;

    return NextResponse.json(out);
  } catch (error: unknown) {
    console.error("[PandaIA] Error en /api/chat:", error);
    return NextResponse.json({ reply: ERROR_REPLY, ...urgencyFields(alarm) }, { status: 500 });
  }
}
