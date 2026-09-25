# PandaJR - Design System & UI Documentation

## 1. Dirección de Arte: "Warm Botanical Sanctuary"
PandaJR rechaza el aspecto genérico de las aplicaciones médicas estándar (azul clínico, gris frío, interfaces estériles) y se aleja por completo de los tropos visuales de la IA (gradientes neón, bordes púrpura, botones brillantes). 

La aplicación está diseñada como un santuario cálido, orgánico y calmante para padres que navegan un momento de alta ansiedad.

### 1.1. Paleta de Colores (Tailwind v4)
Los colores se inyectan mediante clases directas de Tailwind o variables CSS mapeadas a utilidades semánticas:

*   **Terracotta (`#d97757`):** Color primario. Usado para acciones principales, botones de guardado, alertas rojas cálidas (SOS), y el estado de la madre. Representa el calor uterino y el amor terrenal.
*   **Sage (`#8ba888` / `#6b8e67`):** Color secundario. Usado para progreso, misiones completadas, confirmaciones y la conexión con la naturaleza.
*   **Amber (`#f59e0b` / `amber-500`):** Usado para orientación logística, preparación y advertencias no críticas.
*   **Alabastro / Light Mode (`#fdfbf7` / `#faf9f5`):** Fondos cálidos que imitan el papel pergamino. Nunca se usa blanco puro brillante (`#ffffff`) para fondos largos, previniendo la fatiga visual.
*   **Obsidiana / Dark Mode (`#181520` / `#221d2d`):** El Modo Oscuro no es un gris de terminal de código (como `slate-950`). Es un violeta profundo y cálido que envuelve al usuario sin ser agresivo durante la noche (ej. leyendo la app a las 3 AM).

### 1.2. Erradicación de Tropos "De-AI"
Para garantizar un aspecto de diseño "Crafted by Humans", el código fue sometido a una auditoría estricta para eliminar:
- Card Soup (exceso de tarjetas idénticas con bordes rígidos). Se reemplazaron por jerarquías visuales limpias (fondos mezclados, divisores tenues).
- Texto robótico en botones (se usan verbos claros: "Guardar", "Votar").
- Todo rastro de `bg-blue-500`, `text-indigo-600` o degradados de ciberseguridad.

## 2. Tipografía y Micro-Interacciones
El peso tipográfico se usa para guiar el ojo sin abrumar:
- **Títulos (h1, h2):** `font-black`, sin tracking excesivo.
- **Micro-Badges:** Etiquetas como "Ecografía Morfológica" usan texto muy pequeño (`text-[10px]`), en mayúsculas (`uppercase`), con espaciado amplio (`tracking-wider`) y fondo translúcido (`bg-terracotta/10`).
- **Animaciones Globales:** Debido a que Shadcn no soporta animaciones out-of-the-box en Tailwind v4, se inyectaron utilidades nativas (`@utility animate-in`, `slide-in-from-bottom-4`, `zoom-in-95`) en `globals.css`. Todo en PandaJR entra a la vista deslizándose suavemente, imitando aplicaciones nativas fluidas.

## 3. Compatibilidad PWA y iOS Safe Area
PandaJR está diseñada para instalarse como una Progressive Web App (PWA) de pantalla completa.

### 3.1. Dynamic Island y Notches (iOS)
Para evitar que el Header y el Bottom Navigation colisionen con la Dynamic Island o el indicador de inicio de iPhone, se declararon variables CSS nativas vinculadas a los Safe Areas de WebKit:
\`\`\`css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
\`\`\`
En el layout principal (`page.tsx`), las barras de navegación utilizan `pt-[var(--safe-top)]` y `pb-[var(--safe-bottom)]`. Esto permite que el fondo difuminado (blur) abarque toda la pantalla de cristal, pero los botones interactivos queden en la zona segura.

### 3.2. Manifest y Theme Color
El `manifest.json` y el componente `layout.tsx` están emparejados.
- `theme_color` (Light): `#fdfbf7` (Alabastro)
- `theme_color` (Dark): `#181520` (Obsidiana Cálida)
Esto garantiza que la barra de estado superior del teléfono adopte el color exacto del fondo de la aplicación, brindando una experiencia inmersiva y sin bordes feos del navegador.

## 4. Componentes Específicos
- **Línea de Tiempo (Diario):** Uso de una línea vertical absoluta (`w-px bg-stone-200`) que conecta avatares circulares. El uso de `animationDelay` escalonado permite que las entradas aparezcan una por una.
- **Contador de Contracciones (Circulo Ripple):** Uso de `animate-ping` de Tailwind en anillos concéntricos para guiar la respiración durante la contracción.
- **Interacciones Táctiles:** Todos los botones interactivos (incluyendo los de Herramientas) tienen estados `active:scale-95`, proporcionando un feedback táctil crítico en pantallas móviles.
