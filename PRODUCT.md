# PandaJR - Product & Architecture Documentation

## 1. Visión General del Producto
PandaJR es una PWA (Progressive Web App) diseñada como un "Copiloto Prenatal" para padres primerizos. A diferencia de las apps tradicionales enfocadas exclusivamente en la madre, PandaJR integra activamente al padre (o copiloto), asignándole misiones, recordatorios y protocolos de logística para reducir la carga mental de la madre y fomentar una crianza compartida desde la concepción.

## 2. Arquitectura de Sincronización (Firebase Realtime)

Todo el estado crítico de la aplicación vive en Firestore y se sincroniza en tiempo real a través de *Listeners* (`onSnapshot`). La estructura de la base de datos se basa en "Embarazos Compartidos" (`pregnancies/{pregnancyId}`), permitiendo que la mamá y el papá vean la misma información instantáneamente en sus respectivos dispositivos.

### Prevención de Bucles Infinitos (Sync Loops)
Al utilizar Zustand para el estado local y Firestore para el estado remoto, se debe seguir este patrón estricto para evitar *infinite render loops*:
1. **Escucha Autónoma:** Los \`useEffect\` de escucha llaman a \`listenTo...()\` y actualizan el estado local de React sin disparar un guardado.
2. **Mutación Deliberada:** Cualquier guardado hacia Firebase (`addJournalEntry`, `toggleCustomTask`) se hace a través de manejadores de eventos explícitos (`onClick`, `onBlur`) y **nunca** como un efecto secundario de que cambie el estado escuchado.
3. **Optimistic UI:** La UI se actualiza inmediatamente para dar feedback al usuario, y la suscripción de Firebase confirma el estado milisegundos después.

### Módulos Sincronizados
- **Diario (Timeline):** \`listenToJournal\` / \`addJournalEntry\` / \`deleteJournalEntry\`
- **Checklists (Misiones):** \`listenToChecklistProgress\` / \`saveChecklistProgress\`
- **Citas (Agenda):** \`listenToEvents\` / \`saveEvents\`
- **Contador de Patadas:** \`listenToKickSessions\` / \`saveKickSessions\`
- **Contracciones:** \`listenToContractions\` / \`saveContractions\`
- **Votador de Nombres:** \`listenToBabyNames\` / \`saveBabyNames\`
- **Presupuesto (Baby Budget):** \`listenToExpenses\` / \`saveExpenses\`

## 3. Protocolos Clínicos y Estándares ACOG
PandaJR no es solo una app de estilo de vida; está programada con rigor clínico basado en los lineamientos del Colegio Americano de Obstetras y Ginecólogos (ACOG).

### 3.1. Precisión Gestacional (Semanas 1-40)
La base de datos de hitos (\`getWeekData\`) respeta la biología real del desarrollo. Las Semanas 1 y 2 no describen un feto, sino la preparación del cuerpo y la ovulación. Los hitos críticos (organogénesis, maduración pulmonar) aparecen exactamente en la ventana clínica correcta.

### 3.2. Módulo SOS Síntomas (Red Flags)
Las alertas están categorizadas clínicamente para no causar pánico innecesario, pero son tajantes ante verdaderas emergencias:
- **Preeclampsia:** Dolor de cabeza severo, moscas volantes, dolor en hipocondrio derecho.
- **Movimientos Fetales:** Regla estricta de "menos de 10 patadas en 2 horas" a partir de la semana 28.
- **Hiperémesis Gravídica:** Se instruye sobre deshidratación y cuándo solicitar medicación (Ej: Diclegis / B6).

### 3.3. Tareas Clínicas por Trimestre (Checklists)
Las misiones de los padres no son triviales, están estructuradas médicamente:
- **T1 (Primer Trimestre):** Ácido Fólico (400 mcg), evitación de listeria/toxoplasmosis (quesos no pasteurizados, cajas de arena).
- **T2 (Segundo Trimestre):** Test de O'Sullivan (Glucosa), Ecografía Morfológica (Semanas 20-24), Suplementación DHA/Hierro.
- **T3 (Tercer Trimestre):** Vacuna Tdap (Estrategia Capullo), Cultivo de Estreptococo del Grupo B (SGB), Regla de parto 5-1-1.

## 4. PandaIA: El Agente Inteligente (Gemini 2.5 Flash)
PandaIA actúa como un copiloto contextual. Conoce el nombre del usuario, su rol (Mamá/Papá) y la semana exacta de gestación.

### Límites de Seguridad (Safety Boundaries)
El prompt del sistema (`systemInstruction` en `api/chat/route.ts`) tiene candados (guardrails) de nivel médico:
1. **Regla Anti-Diagnóstico:** Tiene estrictamente prohibido diagnosticar o recetar. Todo suplemento requiere el sufijo "valídalo con tu obstetra".
2. **Trigger de Alerta Roja:** Si el usuario menciona sangrado, dolor intenso, fiebre o disminución de movimientos, la IA *abandona su tono conversacional* y emite una instrucción directiva de ir a Urgencias.
3. **Llamadas a la Acción Integradas:** PandaIA puede agendar eventos directamente en la Agenda local retornando un JSON estructurado junto con su respuesta.

## 5. Herramientas Integradas (Tooling)
- **Contador de Patadas:** Implementa el *Método Cardiff* (Medir el tiempo hasta lograr 10 patadas). Incluye notas contextuales (ej. "Tras comer dulce").
- **Contador de Contracciones:** Usa la regla 5-1-1. Mide frecuencia y duración. Indica claramente cuándo el falso trabajo de parto (Braxton Hicks) pasa a ser trabajo de parto activo.
- **Diario (Timeline):** Sistema de registro cronológico con avatares, tags clínicos/emocionales y selector de estados de ánimo (Moods).
- **Votador de Nombres:** Interfaz colaborativa estilo Tinder. El papá y la mamá votan (❤️ / ❌); si ambos dan like, ocurre un "Match".
- **Baby Budget:** Hoja de cálculo colaborativa para llevar el progreso financiero de las compras prenatales.
