import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

interface FallbackName {
  text: string;
  origin: string;
  meaning: string;
  gender: "niña" | "niño" | "neutro";
}

const FALLBACK_NAMES_POOL: FallbackName[] = [
  // Niñas
  { text: "Sofía", origin: "Griego", meaning: "Sabiduría.", gender: "niña" },
  { text: "Emma", origin: "Germánico", meaning: "«Entera» o «universal».", gender: "niña" },
  { text: "Maya", origin: "Griego / Sánscrito", meaning: "En griego, «madre» o «nodriza»; en sánscrito, «ilusión».", gender: "niña" },
  { text: "Mía", origin: "Hebreo / Italiano", meaning: "Diminutivo de María, de significado incierto; en italiano y en español, «mía».", gender: "niña" },
  { text: "Isabella", origin: "Hebreo", meaning: "Forma de Isabel, del hebreo Elisheba: «Dios es mi juramento».", gender: "niña" },
  { text: "Elena", origin: "Griego", meaning: "Se suele asociar con «antorcha» o «resplandor», aunque su origen es incierto.", gender: "niña" },
  { text: "Olivia", origin: "Latín", meaning: "De «oliva»: el olivo, árbol que simboliza la paz.", gender: "niña" },
  { text: "Clara", origin: "Latín", meaning: "Clara, luminosa, ilustre.", gender: "niña" },
  { text: "Sara", origin: "Hebreo", meaning: "Princesa.", gender: "niña" },
  { text: "Zoe", origin: "Griego", meaning: "Vida.", gender: "niña" },
  { text: "Camila", origin: "Latín", meaning: "Nombre de las jóvenes que ayudaban en los ritos religiosos romanos.", gender: "niña" },
  { text: "Julieta", origin: "Latín", meaning: "Diminutivo de Julia, de la familia romana Julia; su significado original es incierto.", gender: "niña" },
  { text: "Aurora", origin: "Latín", meaning: "El amanecer.", gender: "niña" },
  { text: "Alma", origin: "Latín", meaning: "Del latín almus: «que nutre» o «bondadosa».", gender: "niña" },
  { text: "Valeria", origin: "Latín", meaning: "«Fuerte» o «sana», del latín valere.", gender: "niña" },
  { text: "Chloe", origin: "Griego", meaning: "Brote verde.", gender: "niña" },
  { text: "Emilia", origin: "Latín", meaning: "De la familia romana Emilia; se suele relacionar con aemulus, «el que emula».", gender: "niña" },
  { text: "Luna", origin: "Latín", meaning: "La luna.", gender: "niña" },
  { text: "Victoria", origin: "Latín", meaning: "Victoria, triunfo.", gender: "niña" },
  { text: "Eva", origin: "Hebreo", meaning: "«La que da vida».", gender: "niña" },
  { text: "Alba", origin: "Latín", meaning: "La primera luz del día; del latín albus, «blanca».", gender: "niña" },
  { text: "Inés", origin: "Griego", meaning: "Pura, casta.", gender: "niña" },
  { text: "Martina", origin: "Latín", meaning: "De Marte, el dios romano de la guerra.", gender: "niña" },
  { text: "Gia", origin: "Italiano", meaning: "Diminutivo de Gianna: «Dios es misericordioso».", gender: "niña" },
  { text: "Amara", origin: "Igbo / Sánscrito", meaning: "En igbo, «gracia»; en sánscrito, «inmortal».", gender: "niña" },

  // Niños
  { text: "Lucas", origin: "Griego", meaning: "«De Lucania», una región del sur de Italia; se suele asociar con «luz».", gender: "niño" },
  { text: "Liam", origin: "Irlandés", meaning: "Forma irlandesa de Guillermo: «voluntad» y «protección».", gender: "niño" },
  { text: "Gael", origin: "Celta", meaning: "Alude a los gaélicos, los pueblos celtas de Irlanda y Escocia.", gender: "niño" },
  { text: "Oliver", origin: "Latín / Nórdico", meaning: "Se asocia con el olivo, aunque también podría venir del nórdico Óleifr, «heredero de los antepasados».", gender: "niño" },
  { text: "Thiago", origin: "Hebreo", meaning: "Variante de Santiago, que viene de Jacob: «el que sujeta el talón».", gender: "niño" },
  { text: "Bruno", origin: "Germánico", meaning: "«Moreno»; también se relaciona con «coraza».", gender: "niño" },
  { text: "Leonardo", origin: "Germánico", meaning: "Fuerte como un león.", gender: "niño" },
  { text: "Samuel", origin: "Hebreo", meaning: "«Dios ha escuchado».", gender: "niño" },
  { text: "Noah", origin: "Hebreo", meaning: "Descanso, reposo.", gender: "niño" },
  { text: "Dante", origin: "Latín", meaning: "Forma breve de Durante: «el que perdura».", gender: "niño" },
  { text: "Adrián", origin: "Latín", meaning: "«De Hadria», ciudad cercana al mar Adriático.", gender: "niño" },
  { text: "Milo", origin: "Germánico / Eslavo", meaning: "De origen incierto; en eslavo se asocia con «querido».", gender: "niño" },
  { text: "Julián", origin: "Latín", meaning: "«De la familia de Julio»; el significado original de Julio es incierto.", gender: "niño" },
  { text: "Enzo", origin: "Italiano", meaning: "Se cree que viene de Enrique, «señor de la casa».", gender: "niño" },
  { text: "Ian", origin: "Escocés", meaning: "Forma escocesa de Juan: «Dios es misericordioso».", gender: "niño" },
  { text: "Elías", origin: "Hebreo", meaning: "«Yahvé es mi Dios».", gender: "niño" },
  { text: "Martín", origin: "Latín", meaning: "De Marte, el dios romano de la guerra.", gender: "niño" },
  { text: "Diego", origin: "Español", meaning: "De origen incierto: se relaciona con Santiago y con el griego didachē, «enseñanza».", gender: "niño" },
  { text: "Sebastián", origin: "Griego", meaning: "Venerable, digno de respeto.", gender: "niño" },
  { text: "Tomás", origin: "Arameo", meaning: "«Gemelo».", gender: "niño" },
  { text: "Gabriel", origin: "Hebreo", meaning: "«Fuerza de Dios».", gender: "niño" },
  { text: "Mateo", origin: "Hebreo", meaning: "«Regalo de Dios».", gender: "niño" },
  { text: "Felipe", origin: "Griego", meaning: "«Amigo de los caballos».", gender: "niño" },
  { text: "Nicolás", origin: "Griego", meaning: "«Victoria del pueblo».", gender: "niño" },
  { text: "Maximiliano", origin: "Latín", meaning: "Une Máximo («el más grande») y Emiliano.", gender: "niño" },

  // Neutro
  { text: "René", origin: "Latín / Francés", meaning: "Renacido.", gender: "neutro" },
  { text: "Ariel", origin: "Hebreo", meaning: "«León de Dios».", gender: "neutro" },
  { text: "Morgan", origin: "Galés", meaning: "Del galés antiguo Morcant; se suele relacionar con «mar».", gender: "neutro" },
  { text: "Índigo", origin: "Griego", meaning: "Del griego indikón, «de la India»: el nombre del color añil.", gender: "neutro" },
  { text: "Sasha", origin: "Ruso / Griego", meaning: "Diminutivo ruso de Alejandro o Alejandra: «protector de los hombres».", gender: "neutro" },
  { text: "Azul", origin: "Persa / Español", meaning: "El color azul; la palabra viene del persa lāzhward, el lapislázuli.", gender: "neutro" },
  { text: "Robin", origin: "Germánico / Inglés", meaning: "Diminutivo de Roberto: «brillante por su fama»; en inglés, también un pájaro.", gender: "neutro" },
  { text: "Edén", origin: "Hebreo", meaning: "«Delicia»; el jardín del Génesis.", gender: "neutro" },
  { text: "Sol", origin: "Latín", meaning: "El sol.", gender: "neutro" },
  { text: "Kai", origin: "Hawaiano", meaning: "En hawaiano, «mar».", gender: "neutro" },
  { text: "Río", origin: "Español", meaning: "La palabra «río».", gender: "neutro" },
  { text: "Dani", origin: "Hebreo", meaning: "De Daniel o Daniela: «Dios es mi juez».", gender: "neutro" },
  { text: "Milan", origin: "Eslavo", meaning: "«Querido» o «amable».", gender: "neutro" },
  { text: "Paris", origin: "Griego", meaning: "Nombre de un héroe de la mitología griega; su significado original es incierto.", gender: "neutro" },
  { text: "Sam", origin: "Hebreo", meaning: "Forma breve de Samuel o Samanta; Samuel significa «Dios ha escuchado».", gender: "neutro" }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gender = (body?.gender || "todos") as "todos" | "niño" | "niña" | "neutro";
    const existingNames: string[] = Array.isArray(body?.existingNames) ? body.existingNames : [];
    const count = typeof body?.count === "number" ? Math.min(10, Math.max(1, body.count)) : 6;

    const lowerExisting = new Set(existingNames.map(n => n.trim().toLowerCase()));

    const apiKey = process.env.GEMINI_API_KEY;

    // Intentar con Google Gemini si la API key está presente
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Actúa como experto en el origen de los nombres (antroponimia) para PandaJr, una app de embarazo en pareja.
Genera exactamente ${count} nombres de bebé únicos y sonoros, con su origen y su significado.
Género solicitado: ${gender === "todos" ? "variado (niño, niña y neutro)" : gender}.

REGLAS CRÍTICAS:
1. NO repitas NINGUNO de los siguientes nombres que la pareja ya votó o revisó:
[${Array.from(lowerExisting).slice(0, 50).join(", ")}]
2. Devuelve nombres culturalmente atractivos (español, latín, griego, celta, hebreo, nórdico, etc.).
3. En el campo "gender" solo se permite: "niña", "niño" o "neutro".
4. El significado ("meaning") debe ser el etimológico real, dicho de forma breve y cálida, en español neutro. No lo inventes: si es incierto, dilo.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                names: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Nombre del bebé (capitalizado)" },
                      origin: { type: Type.STRING, description: "Origen cultural o etimológico (ej: Latín, Griego, Celta)" },
                      meaning: { type: Type.STRING, description: "Significado inspirador breve" },
                      gender: { type: Type.STRING, enum: ["niña", "niño", "neutro"], description: "Género del nombre" }
                    },
                    required: ["text", "origin", "meaning", "gender"]
                  }
                }
              },
              required: ["names"]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (Array.isArray(parsed?.names) && parsed.names.length > 0) {
            // Filtrar duplicados accidentales
            const cleanAiNames = parsed.names.filter(
              (n: any) => n.text && !lowerExisting.has(n.text.trim().toLowerCase())
            );

            if (cleanAiNames.length >= 3) {
              return NextResponse.json({
                source: "gemini",
                names: cleanAiNames.slice(0, count)
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini generation failed, using intelligent offline pool:", geminiErr);
      }
    }

    // Fallback inteligente: buscar en el pool sin repetir nunca
    let available = FALLBACK_NAMES_POOL.filter(
      item => !lowerExisting.has(item.text.trim().toLowerCase())
    );

    if (gender !== "todos") {
      const filteredByGender = available.filter(item => item.gender === gender);
      if (filteredByGender.length > 0) {
        available = filteredByGender;
      }
    }

    // Barajar aleatoriamente
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    // Si el pool se agotó por completo de nombres nuevos, devolver alternativas creativas con sufijos
    if (selected.length === 0) {
      const allShuffled = [...FALLBACK_NAMES_POOL].sort(() => Math.random() - 0.5);
      return NextResponse.json({
        source: "pool-exhausted",
        names: allShuffled.slice(0, count)
      });
    }

    return NextResponse.json({
      source: "pool",
      names: selected
    });

  } catch (error: any) {
    console.error("Error in /api/names:", error);
    return NextResponse.json({ error: "No pudimos sugerir nombres ahora.", names: [] }, { status: 500 });
  }
}
