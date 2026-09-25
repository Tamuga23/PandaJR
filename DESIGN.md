---
name: PandaJR
description: Copiloto Colaborativo para el Embarazo (Mobile-First PWA)
colors:
  primary: "#c96651" # Terracotta
  primary-light: "rgba(201, 102, 81, 0.1)"
  secondary: "#6c9a84" # Sage
  secondary-light: "rgba(108, 154, 132, 0.1)"
  background: "#fdfbf7" # Alabaster
  foreground: "#2d2a26" # Stone 800
  dark-background: "#181520" # Obsidian / Warm Violet
  dark-surface: "#221d2d"
typography:
  fontFamily: "Geist Sans, system-ui, sans-serif"
rounded:
  lg: "16px"
  xl: "24px"
  2xl: "32px"
---

# Design System: PandaJR

## Overview

**Creative North Star: "Warm Botanical Sanctuary" (Santuario Botánico Cálido)**

El diseño de PandaJR ha evolucionado para alejarse de la estética clínica, estéril o robótica (colores azules/turquesa fríos o fondos terminales). Al estar enfocado en padres primerizos que pueden sentirse abrumados o ansiosos, la interfaz prioriza la calidez humana, la empatía y la reducción de carga cognitiva. Se siente como un nido seguro o un refugio terrenal, tanto en Modo Claro como en Modo Oscuro (que evita el negro absoluto en favor de violetas cálidos profundos).

**Key Characteristics:**
- **Santuario Orgánico:** Uso del color para transmitir calidez terrenal y botánica (Terracotta para urgencias/vínculo emocional, Sage para progreso/naturaleza, Stone para fondos neutros).
- **Formas Suaves:** Esquinas redondeadas extremas (`rounded-3xl`, `rounded-2xl`) para eliminar cualquier sensación de software rígido corporativo.
- **Interacciones Táctiles:** Componentes de altura generosa (Mobile-First) con botones anchos (`py-3.5`).
- **Micro-interacciones Fluidas:** Uso exhaustivo de utilidades `animate-in` para transiciones orgánicas (`slide-in-from-bottom`, `zoom-in`, `fade-in`), lo que elimina cortes abruptos y proporciona "respiración" a la UI.

## Color Palette

La paleta es orgánica, terrenal y tranquilizadora, desterrando por completo el aspecto de "aplicación genérica de IA".

### Primary: Terracotta (Arcilla Cálida)
- **Base (`#c96651` / `text-terracotta`):** Color principal de la aplicación. Utilizado para el vínculo madre/bebé, urgencias (Contador de Contracciones, SOS Síntomas), y acciones primarias.
- Transmite vitalidad, calidez materna, y sangre/vida sin llegar al alarmismo de un rojo semáforo tradicional.

### Secondary: Sage (Salvia Botánica)
- **Base (`#6c9a84` / `text-sage`):** Color secundario. Usado para progreso continuo, éxito, confirmaciones, y elementos guiados (Checklists, Tareas del papá).
- Transmite crecimiento orgánico, naturaleza y estabilidad. 

### Neutral & Backgrounds (Light Mode)
- **Alabaster (`#fdfbf7`):** Fondo principal. Un blanco cálido y cremoso que reduce la fatiga visual.
- **Surface (`#ffffff`):** Para tarjetas y contenedores (`bg-white`).
- **Texto Principal (`#2d2a26`):** Gris piedra profundo (Stone-800) en lugar de negro puro, manteniendo la legibilidad sin alto contraste agresivo.

### Neutral & Backgrounds (Dark Mode - "De-AI")
- **Obsidian / Warm Violet (`#181520`):** Fondo nocturno. Se rehúye del clásico "azul terminal" (Slate-900) para un tono más orgánico, ideal para consultas a las 3 AM en la habitación del bebé.
- **Surface (`#221d2d`):** Tarjetas en modo oscuro.
- **Texto Oscuro (`#eae6e1`):** Blanco hueso cálido para contraste sin brillo enceguecedor.

## Typography

**Familia:** Geist Sans (`var(--font-geist-sans), system-ui, sans-serif`)

Humanista, geométrica, cálida y de alta legibilidad. Geist aporta claridad quirúrgica a los grandes números (temporizadores, semanas) y dignidad editorial a los textos de apoyo.

### Hierarchy & Scale
- **Display** (`text-3xl`, `text-4xl`, `font-black`, tracking-tight): Grandes contadores numéricos (semanas, patadas).
- **Headline** (`text-xl`, `font-bold`): Títulos principales de modales y herramientas.
- **Subheading** (`text-sm`, `font-bold`): Nombres de citas, secciones de herramientas.
- **Body** (`text-sm`, `text-stone-700`): Descripciones y tareas.
- **Label / Micro** (`text-xs`, `text-[10px]`, `font-bold`): Insignias compactas, chips, metadatos y menús de navegación inferior.

## Layout & Motion

- **Mobile-First:** Diseño restringido para sentirse como una app nativa PWA. Menú de navegación inferior fijo.
- **Elevación:** Sombras muy sutiles (`shadow-sm`, `shadow-md`) y bordes suaves (`border-stone-200/80` o `border-white/[0.08]` en dark mode). Nunca se usa `border-slate` agresivo.
- **Animaciones (Tailwind-animate):** Todo estado de carga o transición de vista usa animaciones orgánicas:
  - Modales: `animate-in slide-in-from-bottom-8 zoom-in-95`
  - Paneles/Tarjetas: `animate-in fade-in slide-in-from-bottom-4`
  - Feedback visual (Pulsaciones, IA pensando): `animate-pulse`, `animate-spin`, `animate-ping` (para botones activos como el inicio del temporizador de contracciones).

## Do's and Don'ts

### Do:
- **Do** usar botones masivos con iconos grandes para herramientas que ocurren bajo estrés (ej. botón gigante de Contracciones).
- **Do** mantener el feedback visual inmediato. Si hay una carga de red (Firebase), el botón debe mostrar "Conectando..." y deshabilitarse con un `animate-spin` integrado.
- **Do** respetar el esquema de color orgánico. Mantén el modo oscuro en los tonos de violeta cálido (`#181520`).

### Don't:
- **Don't** usar colores vibrantes estilo neón (Cyans, Magentas) o sombras severas.
- **Don't** usar componentes estáticos que "saltan" a la pantalla sin un `animate-in`.
- **Don't** crear un "Mar de Tarjetas" con bordes severos repetitivos. Usa fondos sutiles y separadores tenues.
