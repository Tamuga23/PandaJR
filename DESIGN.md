---
name: PandaJR
description: Herramienta colaborativa para padres primerizos
colors:
  primary: "#0d9488"
  primary-light: "#f0fdfa"
  secondary: "#f59e0b"
  secondary-light: "#fffbeb"
  tertiary: "#f43f5e"
  tertiary-light: "#fff1f2"
  neutral-bg: "#f9fafb"
  neutral-surface: "#ffffff"
  neutral-text: "#111827"
typography:
  display:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
rounded:
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: PandaJR

## Overview

**Creative North Star: "El Copiloto del Papá Primerizo"**

El diseño de PandaJR es empático, tranquilizador y altamente funcional. Al estar enfocado en padres primerizos que pueden sentirse abrumados o ansiosos, la interfaz prioriza la claridad, los toques lúdicos y la reducción de carga cognitiva. Las esquinas redondeadas extremas (`rounded-3xl`, `rounded-2xl`) y los colores cálidos evitan que la aplicación se sienta como un software médico estéril, acercándola más a un asistente personal amigable.

**Key Characteristics:**
- Interfaces amigables con bordes muy redondeados.
- Uso del color para agrupar semánticamente (Teal para progreso/guía, Amber para compras/alertas preventivas, Rose para urgencias/hospital).
- Interacciones táctiles grandes (Mobile-First).

## Colors

La paleta es tranquilizadora pero lo suficientemente vibrante para mantener el engagement.

### Primary
- **Teal Reasegurador** (#0d9488): El color base de la aplicación. Se usa para acciones principales, progreso positivo y la barra de navegación activa. Transmite calma y competencia médica.

### Secondary
- **Ámbar Energético** (#f59e0b): Usado para compras, listas y elementos lúdicos. Aporta calidez y contraste.

### Tertiary
- **Rosa Urgencia** (#f43f5e): Usado estrictamente para módulos hospitalarios, alertas de la regla 5-1-1 y la frecuencia de contracciones.

### Neutral
- **Gris Nube** (#f9fafb): Fondo principal de la app que permite que las tarjetas blancas destaquen suavemente.
- **Texto Carbón** (#111827): Texto principal para máxima legibilidad.

### Named Rules
**The Color-Coding Rule.** El color no es decorativo, es semántico. Todo lo relacionado con el hospital es Rosa, las tareas del hogar/compras son Ámbar, y el flujo general de la guía es Teal. 

## Typography

**Display Font:** System Sans-Serif
**Body Font:** System Sans-Serif

**Character:** Limpia, nativa y sin distracciones. Al usar la fuente del sistema (San Francisco en iOS, Roboto en Android), la PWA se siente inmediatamente familiar y nativa.

### Hierarchy
- **Display** (Black/900, 3xl): Usado para grandes contadores numéricos (semanas, temporizadores) donde la lectura rápida a distancia es vital.
- **Headline** (Bold/700, xl): Títulos de tarjetas y modales.
- **Body** (Medium/500, base/sm): Descripciones y tareas de checklist.
- **Label** (Bold/700, xs, uppercase): Pequeños subtítulos descriptivos (`tracking-wider`).

## Layout

Layout estrictamente "Mobile-First" constreñido a un ancho máximo (`max-w-md mx-auto`). El ritmo de espaciado es generoso (generalmente `p-5` o `gap-6`) para acomodar toques táctiles con el pulgar.

## Elevation & Depth

La aplicación utiliza un enfoque híbrido: fondos grises claros (`bg-gray-50`) con tarjetas blancas levantadas ligeramente por bordes sutiles y sombras muy tenues.

### Shadow Vocabulary
- **Card Shadow** (`shadow-sm border border-gray-100`): Levantamiento predeterminado para todas las tarjetas de contenido.

## Shapes

Extremadamente suaves. El radio de borde predeterminado para contenedores principales es de 24px (`rounded-3xl`), y para elementos interactivos internos es de 16px (`rounded-2xl`). Esto elimina cualquier sensación de "software rígido".

## Components

### Buttons
- **Shape:** Altamente redondeados (16px a 24px).
- **Primary:** Fondo Teal-600, texto blanco, relleno generoso (`p-4`).
- **Icon Actions:** Circulares, con fondos muy tenues (ej. `bg-teal-50`) al hacer hover o tap.

### Cards / Containers
- **Corner Style:** 24px (`rounded-3xl`).
- **Background:** Blanco puro.
- **Shadow Strategy:** Sutil (`shadow-sm`).
- **Border:** `border-gray-100`.

### Bottom Navigation
- **Style:** Fija en la parte inferior, iconos Lucide con texto muy pequeño (`text-[10px]`). Color Teal-600 para el estado activo, gris para inactivo.

## Do's and Don'ts

### Do:
- **Do** usar botones masivos para acciones que pueden ocurrir bajo estrés (ej. registrar contracción).
- **Do** mantener el feedback visual inmediato en cada interacción.

### Don't:
- **Don't** usar colores vibrantes sin propósito. Reserva el Rosa para emergencias médicas o el hospital.
- **Don't** introducir fuentes serif o elementos corporativos; esto es un producto para la familia.
