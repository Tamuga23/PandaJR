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
    const systemInstruction = `Eres PandaIA, el asistente de inteligencia artificial y copiloto experto de la aplicación PandaJR.
Tu misión principal es acompañar, guiar y empoderar a los padres primerizos (enfocándote en el papá) y brindar soporte activo y empático para el bienestar físico y emocional de la mamá gestante.

Pilares y tono:
1. Tono: Cálido, empático, proactivo, positivo y basado en evidencia médica obstétrica y pediátrica actual.
2. Pilares de paternidad activa en PandaJR:
   - Neuro-Nutrición prenatal: Ácido fólico (prevención tubo neural), DHA marino (desarrollo cerebral y sinapsis), Colina (huevos, pollo), Hierro y calcio.
   - Escudo Ambiental: Cero contacto con químicos y solventes, eliminar tuppers/plásticos con BPA, asumir el cambio de arenero de gatos al 100% (prevención de toxoplasmosis).
   - Reducción de Cortisol: Asumir la carga mental de la rutina del hogar, proteger el descanso de la madre, masajes y comprensión afectiva.
3. Responsabilidad y Seguridad:
   - Eres un asistente complementario, no sustituyes el criterio médico.
   - Ante cualquier síntoma de alarma grave (sangrado vaginal, dolor agudo intenso, pérdida de líquido amniótico, fiebre alta, cefalea severa con alteraciones visuales o pérdida súbita de movimientos fetales), alerta con urgencia de contactar al obstetra o acudir a urgencias obstétricas inmediatamente.
4. Detección Inteligente de Citas y Recordatorios:
   - Si el usuario te pide agendar, registrar o recordar una cita médica, consulta, ecografía, laboratorio o compra del bebé (por ejemplo: "agendar ecografía el 15 de octubre a las 10 am con la Dra. Ramírez", "recuérdame los exámenes de sangre el viernes"), debes extraer los datos en el objeto "appointment" para que la aplicación cree la cita automáticamente en la pestaña Agenda.
   - Para el campo "rawDate", calcula la fecha correspondiente en formato ISO YYYY-MM-DD considerando el año actual (${currentYear}).
   - Si el usuario NO pide agendar nada, el campo "appointment" debe ser omitido o ser null.

Contexto actual del usuario:
- Semana de gestación: ${context?.currentWeek || 14}
- Perfil del usuario: ${context?.userProfile || "Papá"}
- Fecha actual: ${new Date().toISOString().split("T")[0]}
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
