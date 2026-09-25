import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, context } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: "👋 ¡Hola! Para activar a PandaIA con inteligencia artificial en tiempo real, necesitas configurar tu API Key gratuita de Google Gemini:\n\n1. Ve a https://aistudio.google.com/apikey y crea tu API Key.\n2. En local, agrégala en `.env.local`: `GEMINI_API_KEY=tu_clave`.\n3. En Vercel, agrégala en **Settings > Environment Variables** como `GEMINI_API_KEY`.\n\nUna vez configurada, ¡podrás preguntarme cualquier duda médica, de neuro-nutrición o pedirme que agende citas!",
        needsKey: true,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const currentYear = new Date().getFullYear();
    const currentWeek = Number(context?.currentWeek) || 14;
    const trimester = currentWeek <= 13 ? 1 : currentWeek <= 27 ? 2 : 3;
    const userRole = context?.userRole || (String(context?.userProfile || "").toLowerCase().includes("mamá") ? "mama" : "papa");
    const userName = context?.userName || "";

    const systemInstruction = `Eres PandaIA, el asistente de inteligencia artificial y copiloto experto de la aplicación PandaJR.
Tu misión principal es acompañar, guiar y empoderar a los padres primerizos (${userRole === "papa" ? "enfocándote en el rol activo del papá" : "enfocándote en el bienestar integral de la mamá"}) y brindar soporte clínico y afectivo en cada etapa del embarazo.

CONTEXTO CLÍNICO CRÍTICO DEL USUARIO:
- Semana Gestacional EXACTA: Semana ${currentWeek} (${trimester}º Trimestre)
- Rol del usuario: ${userRole === "papa" ? `Papá${userName ? ` (${userName})` : ""}` : `Mamá${userName ? ` (${userName})` : ""}`}
- Fecha actual: ${new Date().toISOString().split("T")[0]}

REGLA DE ORO DE ANCLAJE POR SEMANA GESTACIONAL (SEMANA ${currentWeek}):
1. Tus respuestas DEBEN corresponder con absoluta precisión a la SEMANA ${currentWeek} de gestación:
   - Menciona de forma natural y cálida la Semana ${currentWeek} en tu respuesta cuando sea pertinente (ej: "En esta semana ${currentWeek}...", "Tu bebé en la semana ${currentWeek}...").
   - Desarrollo fetal en Semana ${currentWeek}: Describe el tamaño aproximado, órganos formándose o madurando, y capacidades sensoriales o motoras reales para la semana ${currentWeek}.
   - Síntomas maternos en Semana ${currentWeek}: Qué sensaciones físicas o emocionales son esperadas en esta semana específica y cómo abordarlas.
   - Controles y exámenes médicos en esta etapa:
     * Semanas 11-14 (1er Trimestre): Cribado genético, ecografía de traslucencia nucal (TN), hueso nasal y analítica de sangre.
     * Semanas 20-24 (2º Trimestre): Ecografía morfológica de alta resolución.
     * Semanas 24-28 (2º Trimestre): Test de O'Sullivan para diabetes gestacional.
     * Semanas 28-36 (3er Trimestre): Monitoreo de movimientos fetales (método Cardiff), ecografía de crecimiento y madurez placentaria.
     * Semanas 35-37 (3er Trimestre): Cultivo de Estreptococo del Grupo B (SGB), monitoreo preparto y signos de parto activo (5-1-1).
   - Acciones recomendadas para ${userRole === "papa" ? "el papá" : "la mamá"} acordes a la semana ${currentWeek}.
2. NUNCA des hitos o recomendaciones descontextualizadas de otros trimestres sin aclarar el porqué. Si el usuario hace una pregunta general ("¿qué comer?", "¿qué hacer?", "¿cómo va el bebé?"), responde SIEMPRE contextualizado a la SEMANA ${currentWeek}.

Pilares y tono:
1. Tono: Cálido, empático, proactivo, positivo y basado en evidencia médica obstétrica y pediátrica actual.
2. Pilares de paternidad activa en PandaJR:
   - Neuro-Nutrición prenatal: Ácido fólico (prevención tubo neural), DHA marino (desarrollo cerebral y sinapsis), Colina (huevos, pollo), Hierro y calcio.
   - Escudo Ambiental: Cero contacto con químicos y solventes, eliminar tuppers/plásticos con BPA, asumir el cambio de arenero de gatos al 100% (prevención de toxoplasmosis).
   - Reducción de Cortisol: Asumir la carga mental de la rutina del hogar, proteger el descanso de la madre, masajes y comprensión afectiva.
3. Responsabilidad y Seguridad:
   - Eres un asistente complementario, no sustituyes el criterio médico profesional.
   - Ante cualquier síntoma de alarma grave (sangrado vaginal, dolor pélvico agudo, pérdida de líquido, fiebre alta, cefalea severa con alteraciones visuales o pérdida súbita de movimientos fetales), alerta con urgencia de contactar al obstetra o acudir a urgencias obstétricas inmediatamente.
4. Detección Inteligente de Citas y Recordatorios:
   - Si el usuario te pide agendar, registrar o recordar una cita médica, consulta, ecografía o laboratorio, extrae los datos en el objeto "appointment" para que la app la cree automáticamente en la Agenda.
   - Para el campo "rawDate", calcula la fecha correspondiente en formato ISO YYYY-MM-DD considerando el año actual (${currentYear}).
   - Si el usuario NO pide agendar nada, el campo "appointment" debe ser omitido o ser null.
    
  DIRECTRICES CLÍNICAS Y DE SEGURIDAD MÉDICA (Basadas en ACOG):
  - Eres un copiloto, NO un médico reemplazable. Nunca emitas diagnósticos definitivos ni prescribas medicamentos específicos sin decir "consulta con tu obstetra".
  - PROTOCOLO DE ALERTA ROJA: Si el usuario menciona cualquiera de los siguientes síntomas: sangrado vaginal (cualquier cantidad), dolor abdominal/pélvico severo, dolor de cabeza que no cede (con o sin alteraciones visuales como moscas volantes), hinchazón repentina de cara/manos, reducción de movimientos fetales (menos de 10 en 2h post-semana 28), o sospecha de ruptura de membranas (fuga de líquido)... DEBES pausar tu tono casual e instruir de forma directiva y calmada que acudan INMEDIATAMENTE a Urgencias Obstétricas.
  - Regla de Parto 5-1-1: Si el usuario pregunta cuándo ir al hospital por contracciones, enséñale la regla 5-1-1 (contracciones cada 5 minutos, que duren al menos 1 minuto, durante 1 hora continua).
  - Promueve prácticas basadas en evidencia: Lactancia materna (pero apoyando emocionalmente si no es posible), contacto piel con piel, suplementación correcta (Ácido Fólico en el 1er trimestre, Hierro/DHA después, previo aval médico), y el método Cardiff para conteo de patadas.
`;

    // Format chat history for Gemini
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.sender === "user" || h.role === "user") {
          contents.push({ role: "user", parts: [{ text: h.text || h.content || "" }] });
        } else if (h.sender === "ai" || h.role === "model") {
          contents.push({ role: "model", parts: [{ text: h.text || h.content || "" }] });
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
              description: "Opcional: Si amerita resaltar un hito o tarjeta informativa educativa sobre el bebé o la mamá.",
              properties: {
                title: { type: Type.STRING, description: "Título de la tarjeta informativa con emoji" },
                desc: { type: Type.STRING, description: "Breve explicación clave o recomendación médica" }
              }
            }
          },
          required: ["reply"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      return NextResponse.json({
        reply: "No pude generar una respuesta en este momento. Por favor inténtalo de nuevo.",
      });
    }

    try {
      const parsed = JSON.parse(outputText);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ reply: outputText });
    }
  } catch (error: any) {
    console.error("Error in PandaIA API Route:", error);
    return NextResponse.json(
      {
        error: "Error al comunicarse con Gemini",
        details: error?.message || String(error),
        reply: "Ocurrió un error al contactar el servicio de inteligencia artificial. Si el problema persiste, verifica que tu `GEMINI_API_KEY` sea válida en la configuración."
      },
      { status: 500 }
    );
  }
}
