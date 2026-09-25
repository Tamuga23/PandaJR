# Product: PandaJR

<!-- impeccable:product-schema 1 -->

## Platform
Web (Mobile-First PWA)

## Stack
Next.js (App Router), React 19, Tailwind CSS v4, Zustand, Firebase (Firestore & Auth Anónimo), Google Gemini AI, Web Audio API, HTML2Canvas.

## Users
Padres primerizos que buscan transitar el embarazo juntos, como un equipo ("El Copiloto"). El producto sirve tanto al papá (orientándolo y dándole misiones claras) como a la mamá (proporcionando un espacio seguro, seguimiento médico y vínculo emocional).

## Product Purpose
Un "Copiloto Prenatal" colaborativo. Reemplaza las libretas físicas, los chats de WhatsApp dispersos y las apps genéricas que solo le hablan a la mamá. Conecta a ambos padres en tiempo real y les ayuda a planificar consultas médicas, armar el presupuesto y prepararse para el parto.

## Core Capabilities (Arquitectura Actual)

El sistema funciona con **Sincronización en Tiempo Real de Firebase**. Al iniciar (Onboarding), la mamá genera un código único que el papá ingresa para vincular ambos dispositivos al mismo `pregnancyId`.

### 1. Guía (Planificación Viva)
- **Seguimiento Semanal:** Comparativa del tamaño del bebé (frutas o temática geek), longitud, peso estimado y el hito de desarrollo de la semana.
- **Checklists Sincronizadas:** Tareas divididas por trimestre. Cuando uno marca una tarea, el otro lo ve completado al instante gracias a Firebase (`saveChecklistProgress`).
- **Estado de la Mamá (MomStatusCard):** Tarjeta interactiva donde la mamá puede actualizar su estado de ánimo (texto y emoji) y el copiloto lo ve en tiempo real, permitiéndole saber exactamente cómo se siente antes de llegar a casa.

### 2. Agenda Médica Sincronizada
- Gestor de citas médicas vinculadas a la semana de gestación. Todas las citas agregadas por uno de los padres se sincronizan al instante en el dispositivo del otro (`listenToEvents` / `saveEvents`).
- **Guías de Preparación (AppointmentPrepModal):** Cada tipo de cita médica (ej. Ecografía Morfológica) abre un panel con un listado dinámico de qué llevar y qué preguntarle al médico. Los "checks" de estos elementos también se guardan en vivo, por lo que ambos pueden preparar la visita juntos.
- Notificaciones de navegador nativas disponibles.

### 3. Herramientas Especializadas
- **PandaStory:** Generador de postales/historias compartibles para WhatsApp/Instagram. Usa `html2canvas` para crear una tarjeta hermosa. Permite subir una foto real de la ecografía o barriga para personalizar el hito.
- **Reproductor Panda:** Simulador de "Ruido Blanco Materno" generado usando la Web Audio API nativa. Recrea el entorno intrauterino (latidos fetales simulados y ruido marrón continuo) que funciona offline y con la pantalla apagada.
- **Calculadora de Presupuesto:** Presupuesto de inicio sincronizado con Firebase. Se divide en categorías, permite marcar compras realizadas (`isPurchased`) y calcula automáticamente el progreso y restante financiero en pareja.
- **Contadores Clínicos:** Monitor de Patadas (método Cardiff), Contador de Contracciones con Regla 5-1-1 y medidor de intensidad SOS.
- **Votador de Nombres & Plan de Parto:** Herramientas conjuntas para definir el nombre y el plan hospitalario (PDF generado).

### 4. PandaIA (Asistente Contextual)
- Integrado con Gemini AI.
- Altamente contextualizado: Al abrir el chat, PandaIA ya sabe en qué semana exacta está el embarazo, el nombre de los padres y su historial local.
- **Agendamiento Autónomo:** Si el usuario le pide "Agenda mi ecografía morfológica para el 15 de octubre a las 3pm", PandaIA es capaz de interpretar la fecha e insertar automáticamente la cita en el calendario Firebase del usuario.

## Brand & Tone Commitments
- **Tono de Voz:** Empático, seguro, claro y despojado de jerga médica intimidante (aunque clínicamente riguroso). Funciona como un acompañante, no como un médico regañón.
- **Estética "Warm Botanical Sanctuary":** (Ver `DESIGN.md`). Se eliminaron los estilos de IA genéricos, adoptando colores cálidos (Terracotta, Sage) y modos oscuros profundos y amables para reducir la ansiedad. Animaciones orgánicas presentes en cada interacción (`animate-in`, `slide-in`, `fade-in`).
