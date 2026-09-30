# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA instalable a pantalla completa (móvil primero, con safe areas de iOS). En escritorio se muestra como columna móvil.

## Users

- **La mamá primeriza embarazada.** Sigue su embarazo semana a semana: síntomas, citas con su obstetra, movimientos del bebé y contracciones. Muchas veces la usa con ansiedad, de noche, con poca luz y con una sola mano.
- **El papá, como copiloto activo.** El enfoque explícito en el padre es una decisión de producto confirmada, no una suposición del copy. Recibe misiones, logística y guías concretas (por ejemplo, qué hacer entre contracciones) para quitarle carga mental a la mamá y participar desde el principio.
- **Mercado:** familias hispanohablantes de Latinoamérica y de Estados Unidos. Español neutro, con tuteo.

## Product Purpose

Acompañar a la pareja durante el embarazo con una sola verdad compartida: qué toca esta semana, quién hace qué y qué hacer si algo es urgente. El éxito se mide así:
- La mamá tiene menos carga mental.
- El papá participa de verdad.
- En un momento de alarma, la app lleva en un toque a quien hay que llamar.

## Positioning

A diferencia de las apps centradas solo en la madre, PandaJR está hecha para la pareja, con el papá como copiloto:
- Misiones semanales por rol.
- Estado compartido en tiempo real entre dos teléfonos vinculados.
- Guía para el acompañante durante el trabajo de parto.
- Herramientas que se usan en pareja: nombres, maleta, plan de parto y presupuesto.

Todo esto se apoya en contenido clínico alineado con guías públicas (ACOG, señales de alarma del CDC) y en un asistente con IA que tiene límites de seguridad.

## Operating Context

- **Vinculación:** dos teléfonos se vinculan con un código de invitación que la mamá comparte (normalmente por WhatsApp). Sin vínculo, todo funciona solo en ese teléfono y la app lo dice.
- **Uso típico:**
  - Consulta semanal de la Guía.
  - Preparación de citas con el obstetra: qué llevar y qué preguntar, exportable a calendario.
  - Conteo de movimientos en casa (método Cardiff, desde la semana 28).
  - Cronometraje de contracciones.
  - Maleta del hospital.
  - Plan de parto que se imprime o se comparte con el hospital.
- **Momentos críticos:** síntomas de alarma, a menudo de madrugada. Se llama al número de emergencias del país, al obstetra de la pareja o se va al hospital elegido.
- **PandaIA:** asistente conversacional que conoce el rol, el nombre y la semana. Puede fallar o quedarse sin conexión.

## Capabilities and Constraints

- **Módulos:**
  - Guía semanal: tamaño, hito y misiones por rol.
  - Checklists por trimestre.
  - Estado de ánimo de la mamá y abrazos para la pareja.
  - Agenda médica con sugerencias según la semana y preparación de cita compartida.
  - SOS de síntomas.
  - Contador de patadas y contador de contracciones.
  - Diario, votador de nombres, maleta, plan de parto, presupuesto, lecturas, audios y PandaStory compartible.
  - PandaIA.
- **Alcance gestacional: semanas 1–42.** Decisión confirmada el 2026-09-26: se amplía de 1–40 para incluir el postérmino (41–42). Implementación pendiente.
- **Capa de urgencia determinista:**
  - La lista única de señales de alarma vive en `src/lib/urgency.ts` y alimenta SOS, contadores, chat y servidor.
  - El chat usa un detector local que actúa antes y aunque falle la IA.
  - `CallActions` agrupa las llamadas: emergencias del país, obstetra y hospital.
  - El número de emergencias se detecta por país, siempre se muestra y el usuario puede editarlo.
  - El equipo de salud es compartido entre la pareja.
  - La seguridad nunca depende de Gemini ni de la red.
- **Reglas clínicas:**
  - Aviso de parto pretérmino antes de la semana 37: 4 o más contracciones en 1 hora.
  - Regla 5-1-1 sobre una ventana móvil de 60 minutos.
  - Conteo Cardiff desde la semana 28.
  - Una semana no confirmada se trata como desconocida (`weekUnknown`): no se le aplican reglas clínicas.
- **Contadores:** pueden indicar "posible trabajo de parto activo", tal como exige el producto, pero sin lenguaje diagnóstico.
- **PandaIA:**
  - Tiene prohibido diagnosticar o recetar.
  - Ante señales de alarma da una instrucción directiva de ir a urgencias.
  - Puede agendar citas directamente, solo con una fecha que haya dicho el usuario y con un deshacer real. Si falta la fecha, pregunta.
- **Verdad compartida:**
  - Las escrituras a Firebase ocurren solo en manejadores de eventos, nunca en efectos que reaccionen al estado escuchado.
  - Los arrays compartidos se actualizan con transacciones y nada se escribe antes del primer snapshot del servidor.
  - La UI es optimista, con reversión y "Reintentar".
  - Las migraciones son de una sola vez y marcadas.
  - Nada se muestra como del usuario si no lo creó él, ningún control promete lo que no hace, y ninguna afirmación de sincronización o de match es falsa.
- **Código de pareja:**
  - Formato `PANDA-XXXX-XXXX`, único, caduca a los 14 días y es de un solo uso.
  - Antes de unirse, el papá ve una confirmación "¿Te unes al embarazo de…?".
  - La mamá ve las personas con acceso y puede revocarlas.
  - Los códigos antiguos de 4 caracteres se migran.
- **Pendiente de producto:**
  - Moneda local del presupuesto: hoy es un "$" genérico.
  - Completar el mapa de números de emergencia: faltan Bolivia (el 168 se anunció con implementación gradual; verificar) y Cuba. Mientras un país no esté en el mapa, se elige «Otro» y la app pide confirmar el número.
  - `firestore.rules` está desplegado desde el 2026-09-30; cualquier cambio se prueba antes en el emulador (pide un Java más reciente que el 8 instalado en esta máquina).
- **Stack:** Next.js 16 (App Router) con React 19, Tailwind v4, Zustand, Firebase (Auth anónimo y Firestore) y Gemini vía `src/app/api/chat/route.ts`.

## Brand Commitments

- Nombre **PandaJR**, con la mascota panda (mamá con su bebé). Desde la fase visual de 2026-09 la marca es vectorial y está dentro de la paleta:
  - Mascota: `PandaMark` (`src/components/PandaMark.tsx`, trazos en `src/components/panda-paths.json`).
  - Wordmark: `src/components/Wordmark.tsx`, «PandaJR» en Alegreya.
  - Iconos: `src/app/icon.svg`, `src/app/apple-icon.png`, `public/icons/icon-{192,512}.png` e `icon-maskable-{192,512}.png`.
  - Imágenes para compartir: `src/app/opengraph-image.png` y `twitter-image.png` (1200×630).
  - Procedencia: todo se genera con `scripts/brand/render-brand.mjs` a partir de la mascota original, el JPEG en git `2bf0815:src/app/icon.jpg`. El detalle está en DESIGN.md.
- Voz en español neutro latinoamericano, con tuteo. Serena y cercana en el día a día, tajante y directiva en una emergencia.
- El foco explícito en el papá como copiloto forma parte de la marca.

## Evidence on Hand

- **Etapa:** beta con parejas reales.
- **Sin revisión clínica formal:** ningún obstetra ni profesional de salud ha validado el contenido. La UI y el marketing nunca deben decir ni insinuar "validado por médicos", "revisado por obstetras" o similar. Lo verdadero es "alineado con guías públicas (ACOG, CDC)" y "no reemplaza la valoración de tu obstetra".
- **No hay** testimonios, métricas de uso publicables, prensa ni casos de estudio. No se inventan.

## Product Principles

1. **La seguridad no depende de la IA ni de la red.** En cualquier pantalla con riesgo, la acción de llamar está a un toque y funciona sin conexión.
2. **La app solo dice lo que es verdad.** Sin datos inventados, sin actividad de pareja simulada, sin deshacer falsos y sin sincronización fingida. Si algo solo vive en este teléfono, se dice.
3. **La pareja es real y se ve.** Cada acción compartida lleva autor, y el papá tiene tareas y voz propias.
4. **La semana manda.** El producto cambia con la semana gestacional, y lo cercano al parto (36+) pesa más.
5. **Sereno y directivo.** Tranquiliza sin alarmar en lo cotidiano y no duda en una emergencia.

## Accessibility & Inclusion

- WCAG 2.1 AA como mínimo:
  - Texto ≥4.5:1.
  - Zoom permitido.
  - Foco visible.
  - Anuncios para lectores de pantalla, sobre todo en urgencias.
- Uso nocturno con poco brillo, con una mano y bajo estrés. Objetivos táctiles ≥44 px, y ≥56 px en los botones de llamada.
- Modo oscuro que respeta el tema del sistema.

---

## Referencia técnica

### Sincronización (Firebase)

- Cada "embarazo compartido" vive en `pregnancies/{pid}`, con `members: { [uid]: { role, name, joinedAt } }`.
- Los datos compartidos están en `pregnancies/{pid}/shared_data/*`:
  - `events`, `kick_sessions`, `contractions` y `budget` (`items`, más el `cap` del presupuesto).
  - `checklist_progress` (`items` y `meta` con autor).
  - `prep_{eventId}` y `care_team`.
- Subcolecciones: `baby_names/{n-slug}` (votos por uid), `nudges`, `journal` y `status_logs`.
- Invitaciones en `invite_codes/{code}`.
- Toda la API está en `src/lib/firebase/pairing.ts`:
  - Escritura por transacción con `mutateSharedArray` y sus atajos.
  - Escritura por ítem con `setChecklistItem`, `setAppointmentPrepItem` y `voteBabyName`.
  - Listeners que entregan `meta` (`exists`, `fromCache`, `hasPendingWrites`, `updatedAt`).

**Patrón anti sync-loop (obligatorio):**
1. Los listeners solo actualizan el estado local.
2. Las escrituras ocurren solo en manejadores de eventos explícitos.
3. La UI es optimista, con reversión si la escritura falla.

### Contenido clínico

- **Guía por semana:** los hitos de `getWeekData` respetan la biología: las semanas 1–2 describen preparación y ovulación, no un feto.
- **Checklists por trimestre:**
  - T1: ácido fólico 400 mcg, prevención de listeria y toxoplasmosis.
  - T2: prueba de glucosa para diabetes gestacional (24–28), morfológica (18–22), vacuna de la influenza en temporada, omega-3 con pescado bajo en mercurio y hierro.
  - T3: Tdap (27–36), protección contra el VSR (vacuna materna 32–36 o anticuerpo al bebé, según el país), cultivo de SGB (36–37, ACOG 2020), regla 5-1-1.
- **Señales de alarma** (`URGENT_SIGNS`, CDC "Hear Her" y ACOG pretérmino):
  - Sangrado o salida de líquido.
  - Signos de preeclampsia.
  - Dolor abdominal fuerte.
  - Menos movimientos.
  - Fiebre ≥38 °C.
  - Contracciones antes de la semana 37.
  - Dificultad para respirar o dolor de pecho.
  - Desmayo o convulsiones.
  - Pensamientos de hacerse daño.
  - Signos de trombo.
  - Vómitos que impiden retener líquidos.
- **"Llama hoy a tu obstetra"** (`CALL_TODAY_SIGNS`): señales que no son de emergencia pero requieren atención el mismo día.
