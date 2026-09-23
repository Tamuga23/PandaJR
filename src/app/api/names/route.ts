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
  { text: "Sofía", origin: "Griego", meaning: "Sabiduría, serenidad y gracia.", gender: "niña" },
  { text: "Emma", origin: "Germánico", meaning: "Universal, entera y grandiosa.", gender: "niña" },
  { text: "Maya", origin: "Griego / Sánscrito", meaning: "Madre protectora o ilusión de vida.", gender: "niña" },
  { text: "Mía", origin: "Hebreo / Escandinavo", meaning: "La elegida y profundamente amada.", gender: "niña" },
  { text: "Isabella", origin: "Hebreo", meaning: "Promesa sagrada y devoción.", gender: "niña" },
  { text: "Elena", origin: "Griego", meaning: "Brillante y radiante como el sol matutino.", gender: "niña" },
  { text: "Olivia", origin: "Latín", meaning: "Portadora de paz, fruto del olivo.", gender: "niña" },
  { text: "Clara", origin: "Latín", meaning: "Luminosa, pura y de mente clara.", gender: "niña" },
  { text: "Sara", origin: "Hebreo", meaning: "Princesa o mujer noble de gran corazón.", gender: "niña" },
  { text: "Zoe", origin: "Griego", meaning: "Llena de vida, vitalidad y alegría.", gender: "niña" },
  { text: "Camila", origin: "Latín", meaning: "Aquella que sirve con nobleza y pureza.", gender: "niña" },
  { text: "Julieta", origin: "Latín", meaning: "Llena de juventud, calidez y ternura.", gender: "niña" },
  { text: "Aurora", origin: "Latín", meaning: "El amanecer, luz dorada de un nuevo comienzo.", gender: "niña" },
  { text: "Alma", origin: "Latín", meaning: "Bondadosa, reconfortante y dadora de vida.", gender: "niña" },
  { text: "Valeria", origin: "Latín", meaning: "Sana, fuerte, valiente y decidida.", gender: "niña" },
  { text: "Chloe", origin: "Griego", meaning: "Brote verde, frescura de primavera.", gender: "niña" },
  { text: "Emilia", origin: "Latín", meaning: "Trabajadora incansable y de espíritu noble.", gender: "niña" },
  { text: "Luna", origin: "Latín", meaning: "La que brilla e ilumina la noche.", gender: "niña" },
  { text: "Victoria", origin: "Latín", meaning: "La que triunfa con paciencia y perseverancia.", gender: "niña" },
  { text: "Eva", origin: "Hebreo", meaning: "Madre de todos los seres, la que da aliento.", gender: "niña" },
  { text: "Alba", origin: "Latín", meaning: "La primera luz blanca de la mañana.", gender: "niña" },
  { text: "Inés", origin: "Griego", meaning: "Pura, delicada y llena de bondad.", gender: "niña" },
  { text: "Martina", origin: "Latín", meaning: "Guerrera honorable de espíritu firme.", gender: "niña" },
  { text: "Gia", origin: "Italiano", meaning: "Regalo milagroso de la vida.", gender: "niña" },
  { text: "Amara", origin: "Igbo / Latín", meaning: "Gracia duradera, inmortal y dulce.", gender: "niña" },

  // Niños
  { text: "Lucas", origin: "Latín", meaning: "Luminoso, despierto y resplandeciente.", gender: "niño" },
  { text: "Liam", origin: "Irlandés", meaning: "Protector decidido, audaz y valiente.", gender: "niño" },
  { text: "Gael", origin: "Celta", meaning: "Hombre generoso, cálido y hospitalario.", gender: "niño" },
  { text: "Oliver", origin: "Latín", meaning: "El que trae armonía y fruto abundante.", gender: "niño" },
  { text: "Thiago", origin: "Hebreo", meaning: "Dios nos recompensará con dicha.", gender: "niño" },
  { text: "Bruno", origin: "Germánico", meaning: "Firme como un escudo, protector de los suyos.", gender: "niño" },
  { text: "Leonardo", origin: "Germánico", meaning: "Fuerte y magnánimo como un león.", gender: "niño" },
  { text: "Samuel", origin: "Hebreo", meaning: "Aquel que Dios ha escuchado con amor.", gender: "niño" },
  { text: "Noah", origin: "Hebreo", meaning: "Paz, descanso, sosiego y consuelo.", gender: "niño" },
  { text: "Dante", origin: "Latín", meaning: "De carácter firme, perseverante y constante.", gender: "niño" },
  { text: "Adrián", origin: "Latín", meaning: "Aquel que viene del mar y respira grandeza.", gender: "niño" },
  { text: "Milo", origin: "Germánico", meaning: "Amable, misericordioso y pacífico.", gender: "niño" },
  { text: "Julián", origin: "Latín", meaning: "De raíces fuertes y espíritu siempre joven.", gender: "niño" },
  { text: "Enzo", origin: "Italiano", meaning: "Líder natural, señor de su propio hogar.", gender: "niño" },
  { text: "Ian", origin: "Escocés", meaning: "Misericordia divina y bendición alegre.", gender: "niño" },
  { text: "Elías", origin: "Hebreo", meaning: "De convicciones firmes y espirituales.", gender: "niño" },
  { text: "Martín", origin: "Latín", meaning: "Valeroso, dedicado y de corazón noble.", gender: "niño" },
  { text: "Diego", origin: "Griego", meaning: "Instruido, ingenioso y de gran sabiduría.", gender: "niño" },
  { text: "Sebastián", origin: "Griego", meaning: "Honrado, respetado y venerable.", gender: "niño" },
  { text: "Tomás", origin: "Arameo", meaning: "Compañero leal y de palabra confiable.", gender: "niño" },
  { text: "Gabriel", origin: "Hebreo", meaning: "Fuerza divina y mensajero de esperanza.", gender: "niño" },
  { text: "Mateo", origin: "Hebreo", meaning: "El gran regalo de la vida.", gender: "niño" },
  { text: "Felipe", origin: "Griego", meaning: "Amigo generoso, noble y apasionado.", gender: "niño" },
  { text: "Nicolás", origin: "Griego", meaning: "Victoria compartida con su gente.", gender: "niño" },
  { text: "Maximiliano", origin: "Latín", meaning: "Aquel de grandeza y nobles aspiraciones.", gender: "niño" },

  // Neutro
  { text: "René", origin: "Latín / Francés", meaning: "Nacido de nuevo con renovada esperanza.", gender: "neutro" },
  { text: "Ariel", origin: "Hebreo", meaning: "Fuerza, coraje y libertad espiritual.", gender: "neutro" },
  { text: "Morgan", origin: "Galés", meaning: "Nacido o habitante de las orillas del mar.", gender: "neutro" },
  { text: "Índigo", origin: "Griego", meaning: "Color profundo de la noche y la intuición.", gender: "neutro" },
  { text: "Sasha", origin: "Ruso / Griego", meaning: "Defensor y protector de la humanidad.", gender: "neutro" },
  { text: "Azul", origin: "Persa / Español", meaning: "Serenidad infinita como el cielo y el mar.", gender: "neutro" },
  { text: "Robin", origin: "Germánico", meaning: "Brillante, alegre y lleno de vitalidad.", gender: "neutro" },
  { text: "Edén", origin: "Hebreo", meaning: "Lugar de deleite, paz y armonía pura.", gender: "neutro" },
  { text: "Sol", origin: "Latín", meaning: "Energía vital, luz y calor constante.", gender: "neutro" },
  { text: "Kai", origin: "Hawaiano", meaning: "El mar y la inmensidad del océano.", gender: "neutro" },
  { text: "Río", origin: "Español", meaning: "Fluidez, renovación y camino constante.", gender: "neutro" },
  { text: "Dani", origin: "Hebreo", meaning: "Equilibrio, bondad y templanza.", gender: "neutro" },
  { text: "Milan", origin: "Eslavo", meaning: "Aquel que es querido, dulce y gracioso.", gender: "neutro" },
  { text: "Paris", origin: "Griego", meaning: "De espíritu curioso y corazón valiente.", gender: "neutro" },
  { text: "Sam", origin: "Hebreo", meaning: "Escuchado con cariño y atención.", gender: "neutro" }
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

        const prompt = `Actúa como un experto antroponímico y copiloto prenatal de PandaJR.
Genera exactamente ${count} nombres de bebé únicos, sonoros, hermosos y con significados profundos.
Género solicitado: ${gender === "todos" ? "variado (niño, niña y neutro)" : gender}.

REGLAS CRÍTICAS:
1. NO repitas NINGUNO de los siguientes nombres que los padres ya votaron o revisaron:
[${Array.from(lowerExisting).slice(0, 50).join(", ")}]
2. Devuelve nombres culturalmente atractivos (español, latín, griego, celta, hebreo, nórdico, etc.).
3. En el campo "gender" sólo se permite: "niña", "niño" o "neutro".
4. El significado ("meaning") debe ser poético, inspirador y positivo.`;

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
    return NextResponse.json({ error: "Failed to generate names", names: [] }, { status: 500 });
  }
}
