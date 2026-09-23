# 🐼 PandaJR — El Copiloto del Papá Primerizo

> **PWA móvil de acompañamiento prenatal y parental basada en evidencia médica materno-fetal, neurodesarrollo y corresponsabilidad familiar.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Tamuga23/PandaJR)

---

## 🌟 ¿Qué es PandaJR?

La mayoría de las apps de embarazo tratan a los padres como espectadores pasivos con recordatorios triviales. **PandaJR** transforma al papá primerizo en un **copiloto activo y protector**, fundamentado en la ciencia de los primeros 1,000 días y la plasticidad epigenética.

---

## 🚀 Características Principales

### 🧠 1. Guía Semanal con Pilares Científicos (Semanas 4 a 40)
- **Desarrollo Fetal Biológico:** Métricas reales de longitud, peso y comparativas anatómicas semana a semana.
- **Pilar 1: Neuro-Nutrición:** Enfoque clínico en sustratos críticos (Colina, DHA/Omega-3, Hierro, Calcio, Dátiles para dilatación cervical).
- **Pilar 2: Escudo Ambiental:** Eliminación activa de disruptores endocrinos (BPA, ftalatos, VOCs) y prevención de toxoplasmosis.
- **Pilar 3: Gestor de Cortisol:** Reducción de la carga mental materna para proteger la arquitectura cerebral fetal del estrés crónico.
- **Pilar 4: Microbioma y Biomecánica:** Siembra del microbioma al nacer, vacunación DTPa y preparación pélvica con pelota de pilates.
- **Checklists Reactivos por Trimestre:** Tareas que mutan orgánicamente según la etapa gestacional, con persistencia y botón de **Deshacer**.

### 📅 2. Agenda Médica Interactiva
- Programación, edición y control de citas y ecografías importantes.
- Selector de perfil dual (**Mamá / Papá**) con sugerencias contextuales específicas para cada rol.
- Integración directa con el asistente conversacional para agendamiento por lenguaje natural.

### 🛠️ 3. Suite Obstétrica de Herramientas
- **SOS Mamá ❤️:** Guía rápida de alivio para náuseas/mareos, acidez y ciática, con **botón de marcación de emergencia 1-Tap (`tel:911`) y ruta GPS al hospital más cercano**.
- **Contador de Contracciones:** Cronómetro de inicio y fin con diagnóstico automático de la **Regla 5-1-1** (parto activo) y llamada inmediata al obstetra.
- **Contador de Patadas:** Monitoreo de vitalidad fetal (meta de 10 movimientos) con métricas de duración y registro histórico.
- **Votador de Nombres (Swipe):** Interfaz táctil interactiva estilo Tinder con filtros por género y detección de coincidencias de pareja (*Match!*).
- **Plan de Parto:** Asistente paso a paso para definir preferencias de analgesia, acompañamiento y cordón umbilical.

### 🤖 4. PandaIA — Asistente Inteligente
- Respuestas obstétricas inmediatas y contextualizadas a la rutina familiar.
- **Cerebro Operativo:** Escribe *"Agendar cita médica el 28 de septiembre"* y la IA parseará la fecha, el motivo y lo inyectará directamente en tu Agenda.

---

## 🛠️ Stack Tecnológico

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **UI & Estilos:** [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Iconografía:** [Lucide React](https://lucide.dev/)
- **Diseño Móvil:** Mobile-First PWA Responsive Layout (Max-width container, iOS/Android dock bar)
- **Heurísticas:** Optimizado con el sistema de diseño Impeccable (Score de accesibilidad y micro-interacciones pulidas).

---

## 💻 Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/Tamuga23/PandaJR.git
cd PandaJR

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

---

## 🌐 Despliegue en Vercel

1. Ingresa a [vercel.com/new](https://vercel.com/new).
2. Conecta tu cuenta de GitHub y selecciona el repositorio **`Tamuga23/PandaJR`**.
3. Haz clic en **Deploy** (Vercel detectará la configuración de Next.js automáticamente).
