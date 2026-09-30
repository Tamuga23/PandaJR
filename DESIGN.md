---
name: PandaJR
description: Guía semanal del embarazo en pareja; un jardín compartido, cálido y legible de noche.
colors:
  ground: "#faf9f5"
  surface: "#fdfbf7"
  surface-raised: "#fffefb"
  surface-sunken: "#f3efe7"
  line: "#e8e2d7"
  line-strong: "#d8d0c1"
  line-control: "#8c8479"
  ink: "#2d2a26"
  ink-muted: "#5c554d"
  ink-subtle: "#6d665e"
  ink-disabled: "#9a938a"
  on-accent: "#ffffff"
  terracotta: "#e07a64"
  terracotta-ink: "#a54833"
  terracotta-ink-hover: "#8f3c2a"
  terracotta-wash: "#f6e6df"
  sage: "#6c9a84"
  sage-ink: "#44695a"
  sage-ink-hover: "#37574a"
  sage-wash: "#e5eee8"
  amber: "#f59e0b"
  amber-ink: "#8a5708"
  amber-wash: "#faf0dc"
  selection: "#f1d6cb"
  placeholder: "#6f6964"
  ground-dark: "#181520"
  surface-dark: "#221d2d"
  surface-raised-dark: "#2d273a"
  surface-sunken-dark: "#1a1724"
  line-dark: "#3a334b"
  line-strong-dark: "#4a4160"
  line-control-dark: "#857d9a"
  ink-dark: "#eae6e1"
  ink-muted-dark: "#cbc5d2"
  ink-subtle-dark: "#a6a1b2"
  ink-disabled-dark: "#6f6980"
  terracotta-dark: "#d16e5a"
  terracotta-ink-dark: "#eb9279"
  terracotta-ink-fill-dark: "#b4533d"
  terracotta-ink-hover-dark: "#9c4632"
  terracotta-wash-dark: "#3a2429"
  sage-dark: "#619b7e"
  sage-ink-dark: "#89bca0"
  sage-ink-fill-dark: "#48705d"
  sage-ink-hover-dark: "#3d5f4f"
  sage-wash-dark: "#1e2d2a"
  amber-ink-dark: "#eebd62"
  amber-wash-dark: "#342a1b"
  selection-dark: "#5a3440"
typography:
  display:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  subtitle:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Alegreya Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "lnum"
  row-title:
    fontFamily: "Alegreya Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  meta:
    fontFamily: "Alegreya Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  micro:
    fontFamily: "Alegreya Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0.01em"
  wordmark:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
rounded:
  monogram: "3px"
  control: "12px"
  group: "16px"
  sheet: "24px"
  pill: "9999px"
spacing:
  gutter: "16px"
  gutter-desktop: "32px"
  row-min: "48px"
  target-min: "44px"
  call-min: "56px"
  section-gap: "40px"
  section-gap-urgent: "32px"
  rail-width: "96px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta-ink}"
    textColor: "{colors.on-accent}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-ink-hover}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.terracotta-ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.row-title}"
    padding: "10px 16px"
    height: "48px"
  list-group-inset:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.group}"
  call-emergency:
    backgroundColor: "{colors.terracotta-ink}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.group}"
    padding: "10px 14px"
    height: "56px"
  call-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.group}"
    padding: "10px 14px"
    height: "56px"
  nav-item-active:
    backgroundColor: "{colors.terracotta-wash}"
    textColor: "{colors.terracotta-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
  field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.group}"
    padding: "10px 14px"
    height: "48px"
  sheet:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
---

# Design System: PandaJR

## Overview

**Creative North Star: "Warm Botanical Sanctuary: la Guía es un jardín compartido"**

PandaJR es un santuario cálido para una pareja que atraviesa un embarazo, a menudo de noche, con una mano y bajo estrés. Rechaza la estética clínica (azul hospital, gris frío, interfaces estériles) y los tropos visuales de la IA (neón, degradados púrpura, botones brillantes). El suelo es alabastro de día y obsidiana violeta de noche; la tinta es marrón cálido; hay dos acentos con oficio fijo: terracota para actuar y alarmar, sage para crecer y completar.

La ampliación de la fase 6 (2026-09-27) no reemplaza el mundo: lo lee como un jardín. El embarazo es una planta que crece semana a semana (la firma, `GrowingPlant`), la tipografía es Alegreya caligráfica para títulos y Alegreya Sans para la UI, y la estructura es de secciones con título y listas con divisores, no de tarjetas. Se rechaza la ficha fetal de categoría (número gigante, fruta, tarjetas apiladas) y la sopa de tarjetas.

La densidad es de lista tranquila: filas de 48px mínimo, texto de 16px, secundarias de 14px, divisores finos, mucho suelo entre secciones (40px). Lo urgente no se decora: sube arriba y se vuelve el botón más fuerte de la pantalla.

**Key Characteristics:**
- Suelo cálido (nunca blanco puro en fondos largos) y modo oscuro violeta que sube en luminosidad, no invierte el claro.
- Terracota = acción y alarma; sage = crecimiento y completado; amber = solo avisos logísticos.
- Alegreya (títulos) + Alegreya Sans (UI), cifras de caja alta en toda la app.
- Secciones y listas con divisores; una sola caja `inset` como máximo por grupo, nunca anidada.
- Una sola animación de autor: la planta al avanzar de semana.
- Contraste de texto ≥4.5:1 en los dos temas; objetivos ≥44px, llamadas ≥56px.

## Colors

Una paleta cálida de tierra y jardín: alabastro, tinta marrón, terracota y sage, con un ámbar reservado para la logística.

### Tabla de tokens (§1.1)

Un solo valor canónico por token: esta tabla, el frontmatter y `src/app/globals.css` dicen lo mismo. Los valores crudos viven en `:root` (claro) y `.dark` (oscuro); `@theme inline` los expone como utilidades (`bg-ground`, `text-ink-muted`, `border-line`…). Contrastes medidos con WCAG 2.1 sobre `ground`.

| Rol | Token / utilidad | Claro | Oscuro | Uso |
|---|---|---|---|---|
| Fondo | `ground` | `#faf9f5` | `#181520` | Fondo de la app, cabecera, barra inferior, riel. También `theme-color` y manifiesto. |
| Superficie | `surface` | `#fdfbf7` | `#221d2d` | Grupo inset, piezas de herramientas. |
| Superficie elevada | `surface-raised` | `#fffefb` | `#2d273a` | Diálogos, hojas, campos, llamadas secundarias. |
| Pozo | `surface-sunken` | `#f3efe7` | `#1a1724` | Pista de segmentado, chips, pozo de icono, switch apagado. |
| Hover/pressed | `surface-hover` | ink al 5% | ink al 6% | Estado de filas y botones contorno; translúcido, sirve sobre cualquier superficie. |
| Divisor | `line` | `#e8e2d7` | `#3a334b` | Filete entre filas, bordes de cabecera y barra (decorativo). |
| Separador visible | `line-strong` | `#d8d0c1` | `#4a4160` | Borde de grupo inset, llamadas secundarias, `BotanicalRule`, barras de scroll. |
| Borde de control | `line-control` | `#8c8479` (3.5:1) | `#857d9a` (4.6:1) | Campos, botón contorno, switch apagado, círculo de tarea sin hacer (≥3:1, WCAG 1.4.11). |
| Texto | `ink` | `#2d2a26` (13.6:1) | `#eae6e1` (14.5:1) | Cuerpo, títulos, título de fila. |
| Texto secundario | `ink-muted` | `#5c554d` (7.0:1) | `#cbc5d2` (10.7:1) | Línea 2 de fila, descripciones, iconos de fila. |
| Texto meta | `ink-subtle` | `#6d665e` (5.4:1) | `#a6a1b2` (7.2:1) | Horas, autores, contadores, chevrons (≥4.5:1 también sobre sunken y wash). |
| Deshabilitado | `ink-disabled` | `#9a938a` | `#6f6980` | Solo controles deshabilitados. |
| Sobre relleno | `on-accent` | `#ffffff` | `#ffffff` | Texto sobre `bg-terracotta-ink` / `bg-sage-ink`. |
| Terracota (tono) | `terracotta` | `#e07a64` | `#d16e5a` | Relleno del botón y la flor de la planta. No para texto. |
| Terracota (tinta) | `terracotta-ink` | `#a54833` (5.6:1) | texto `#eb9279` (7.6:1) · relleno `#b4533d` | Acción principal, alarma, foco, pestaña activa, "JR". `bg-terracotta-ink` usa el relleno. Hover: `#8f3c2a` / `#9c4632`. |
| Sage (tono) | `sage` | `#6c9a84` | `#619b7e` | Rellenos tenues de hojas (22–30% de opacidad). No para texto. |
| Sage (tinta) | `sage-ink` | `#44695a` (5.8:1) | texto `#89bca0` (8.4:1) · relleno `#48705d` | Crecimiento, completado, trazo botánico, `accent-color`. Hover: `#37574a` / `#3d5f4f`. |
| Amber | `amber` / `amber-ink` | `#f59e0b` / `#8a5708` | `#f59e0b` / `#eebd62` | Solo logística y avisos no críticos (ventana de una tarea, sincronía pendiente). |
| Lavados | `terracotta-wash`, `sage-wash`, `amber-wash` | `#f6e6df`, `#e5eee8`, `#faf0dc` | `#3a2429`, `#1e2d2a`, `#342a1b` | Fondos sólidos de estado; encima, la tinta del mismo tono (≥4.8:1). |
| Estados | `danger`, `success`, `warning` | = terracotta-ink, sage-ink, amber-ink | ídem | Alias semánticos para texto de estado. |
| Selección | `selection` | `#f1d6cb` | `#5a3440` | `::selection`, con `ink` encima. |
| Velo | `scrim` (`bg-scrim`) | negro al 50% | negro al 70% | Bajo hojas y diálogos (oscurece la app; nunca lleva texto). |
| Placeholder | `placeholder` | `#6f6964` | `#a6a1b2` | Texto de ejemplo en campos (≥4.5:1). |
| Panda | `panda-fur`, `panda-baby`, `panda-shade`, `panda-patch`, `panda-line` | `#fffefb`, `#f3efe7`, `#e8e2d7`, `#2d2a26`, `#2d2a26` | `#f3efe7`, `#e3ddd2`, `#cfc7b8`, `#2d2a26`, transparente | Solo el `PandaMark` (ver Components › Marca). |

### Primary
- **Terracota tinta** (`terracotta-ink`): la voz de la acción y la alarma. Botón principal, "Emergencias", "Síntomas", la pestaña activa, el anillo de foco, el cursor de texto y lo destructivo. Su tono claro `terracotta` solo rellena el botón y la flor de la planta.

### Secondary
- **Sage tinta** (`sage-ink`): crecimiento y completado. El trazo de la planta y del `BotanicalRule`, la tarea hecha, el switch encendido, el botón de conteo de movimientos, `accent-color` de los controles nativos.

### Tertiary
- **Ámbar** (`amber-ink` sobre `amber-wash`): solo logística y avisos no críticos. Nunca urgencia médica.

### Neutral
- **Alabastro / Obsidiana violeta** (`ground`, `surface`, `surface-raised`, `surface-sunken`): el suelo y sus capas; en oscuro la elevación sube en luminosidad.
- **Tinta cálida** (`ink`, `ink-muted`, `ink-subtle`): el tramo de lectura se distingue por color además de por tamaño.
- **Filetes** (`line`, `line-strong`, `line-control`): decorativos los dos primeros; `line-control` es el único borde que cumple 3:1 para controles.

### Named Rules
**The Two Voices Rule.** Terracota es acción y alarma; sage es crecimiento y completado; amber es solo logística. Un color no cambia de oficio. Las excepciones son el color por rol: el monograma de autor (`AuthorChip`) y el onboarding (botón principal y barra de progreso según el rol elegido) usan terracota para la mamá y sage para el papá. Es una seña de identidad del producto (la pareja desde la primera pantalla) y no se extiende a otros componentes.

**The Ink-For-Text Rule.** Los tonos (`terracotta`, `sage`, `amber`) no llegan a 4.5:1: son relleno y decoración. Todo texto de color usa la tinta (`*-ink`); en oscuro la tinta de texto y la de relleno se separan (`--*-ink-fill`).

**The Warm Ground Rule.** Nunca `#ffffff` como fondo largo; el blanco puro solo es texto sobre relleno (`on-accent`). Ningún color fuera de la paleta (sky, emerald, blue, indigo, rose, stone…).

## Typography

**Display Font:** Alegreya (con Georgia, serif)
**Body Font:** Alegreya Sans (con system-ui, sans-serif)
**Label/Mono Font:** pila del sistema (`ui-monospace`), solo para códigos de vinculación (`PANDA-XXXX-XXXX`) y cronómetros.

**Character:** Alegreya es caligráfica y cálida, con voz de libro de jardín; Alegreya Sans es su hermana humanista, legible a 13–16px. Ambas se sirven con `next/font` (self-hosted); Alegreya es variable (400–900) y de Alegreya Sans se cargan 400, 500, 700 y 800 (`font-semibold` resuelve a 700, `font-black` a 800).

### Hierarchy
Tokens `--text-*` en `globals.css`; cada utilidad trae su interlineado y los títulos su peso.
- **Display** (`text-display`, Alegreya 700, 30px/1.1, −0.01em): la semana en la Guía ("Semana 24 + 4 días"), héroes.
- **Title** (`text-title`, Alegreya 700, 24px/1.2): título de pantalla o de diálogo; "Hoy".
- **Subtitle** (`text-subtitle`, Alegreya 700, 20px/1.3): título de `Section` (h2).
- **Section sm** (Alegreya 700, 16px): título de `Section` h3 ("Tus tareas", "Próxima cita").
- **Body** (`text-body`, Alegreya Sans 400, 16px/1.5): cuerpo; título de fila en 700 (500 en listas largas y tranquilas).
- **Meta** (`text-meta`, Alegreya Sans 400–700, 14px/1.45, `ink-muted`): línea secundaria, descripciones, botones compactos.
- **Micro** (`text-micro`, Alegreya Sans 500+, 13px/1.35, +0.01em, `ink-subtle`): horas, autores, contadores, etiquetas de la barra.
- **Excepciones de cifra grande** (fuera de la escala a propósito, Alegreya 700 con `tabular-nums`): el número del contador de patadas dentro de su botón de 240px (6rem), «10 de 10» al completar el conteo (2.5rem) y el nombre en la tarjeta del votador de nombres (2.5rem). Se leen de un vistazo, con una mano y bajo estrés; no se usan en ningún otro sitio.
- **Impresión:** el plan de parto impreso usa negro #111827 sobre blanco (`@media print` en `globals.css`), fuera de la paleta de pantalla.

### Named Rules
**The Lining Figures Rule.** Las dos Alegreya traen cifras de estilo antiguo; el body fija `lining-nums` y todo contador u hora que cambia añade `tabular-nums`.

**The Thirteen Floor Rule.** Nada por debajo de 13px. La escala de títulos sube en pasos ≥1.2 (16 → 20 → 24 → 30); títulos con `text-wrap: balance`, párrafos con `pretty`.

**The Title Speaks Alone Rule.** Sin eyebrows ni kickers en mayúsculas sobre un título; sin mayúsculas forzadas ni tracking amplio en etiquetas. Una etiqueta de estado va en `text-micro font-bold` con su tinta sobre su lavado, dentro de la fila. (Solo los códigos en mono llevan tracking.)

## Layout

**Móvil (la app es una PWA de columna única).** Columna de hasta 448px (`max-w-md`) centrada; en `sm` la enmarcan filetes `line` a los lados. El margen lateral es `--gutter` (16px): las filas lo usan de padding y un `ListGroup` plano sangra hasta él con margen negativo, así los divisores tocan el borde de la columna. Un contenedor con otro padding redefine el gutter (`px-5 [--gutter:1.25rem]`).

**Ritmo.** Secciones separadas 40px (`gap-10`, `pt-6`); con la ruta de urgencia arriba (semana 36+) el ritmo se aprieta a 32px para que llegue antes. Un `BotanicalRule` cierra el bloque de semana. Filas de 48px mínimo con 10px de padding vertical.

**Cromo fijo.** Cabecera `sticky` sobre `ground` con filete inferior, `pt-[var(--safe-top)]`; barra inferior fija de cuatro destinos (Guía, Agenda, Herramientas, PandaIA) con `pb-[var(--safe-bottom)]`. `--safe-top: max(0.625rem, env(safe-area-inset-top))` y `--safe-bottom: max(0.75rem, env(safe-area-inset-bottom))` dejan libres la Dynamic Island y el indicador de inicio. `scroll-padding` evita que el foco quede debajo de lo fijo; con poca altura (≤500px) la cabecera deja de ser fija.

**Escritorio (`lg`, ≥1024px).** La barra inferior se convierte en un riel vertical de 96px a la izquierda (borde derecho `line`, iconos con etiqueta debajo) y el contenido se desplaza (`lg:ps-24`). La columna crece a 720px (`lg:max-w-[45rem]`) con 32px de padding; en `lg` el `--gutter` pasa a 0 porque la columna ya lleva su margen. En `xl` (≥1280px) la Guía se abre a dos columnas de 1120px (`xl:max-w-[70rem]`, 64px entre columnas): semana y ficha a la izquierda, "Hoy" a la derecha.

**Capas (`src/lib/layers.ts`).** Una sola escala z: cabecera 40, barra/riel 50, hojas y diálogos 60, diálogo sobre diálogo (Ajustes → Equipo de salud) 70, avisos (toast) 80. Nada por encima del toast; nunca `z-[999]`. Se usa `Z_CLASS` en `className`.

## Elevation & Depth

Plano por defecto: la profundidad se lee por tono (ground → surface → raised, más claro hacia arriba en oscuro) y por filetes. Las sombras son ambientales, cálidas y con dispersión negativa; solo en lo que flota sobre la app (hojas, diálogos, toast) y en la acción de emergencia, donde el halo terracota la señala como la más fuerte.

### Shadow Vocabulary
Tokens `--shadow-*` en `globals.css`; se usan solo como utilidades (`shadow-sheet`…), nunca como valores sueltos.
- **Hoja inferior** (`shadow-sheet`: `0 -8px 32px -8px rgba(24,21,32,0.28)`): hojas que suben desde abajo en móvil (Nueva cita, Equipo de salud, Ajustes, Presupuesto, Panda Audio).
- **Diálogo centrado** (`shadow-dialog`: `0 16px 48px -16px rgba(24,21,32,0.35)`): diálogos de confirmación y selección, PandaStory.
- **Toast** (`shadow-toast`: `0 12px 32px -12px rgba(24,21,32,0.5)`): aviso invertido (`bg-ink`, texto `ground`).
- **Halo de emergencia** (`shadow-emergency`: `0 3px 10px -3px color-mix(in srgb, var(--terracotta-ink-fill) 55%, transparent)`): solo el botón "Emergencias" (CallActions y el de SOS).
- **Pieza de herramienta** (`shadow-tool`: `0 18px 40px -20px rgb(45 42 38 / 0.6)`): los grandes objetos táctiles de las herramientas (botón de movimientos, botón de contracciones, tarjeta del votador de nombres).

### Named Rules
**The Flat Ground Rule.** Nada que viva en el flujo de la página lleva sombra; una sombra significa "esto flota sobre la app" o "esta es la llamada de emergencia".

## Shapes

Radios suaves solo en lo que se toca; lo informativo es recto o casi recto.
- **Píldora** (9999px): `RowButton`, `SectionAction`, botones de cabecera, pozo del icono activo en la barra, switch.
- **Grupo** (16px, `rounded-2xl`): `ListGroup` inset, campos, botones de llamada, toast.
- **Control de barra** (12px, `rounded-xl`): área táctil de cada destino de la barra/riel.
- **Hoja y diálogo** (24px, `rounded-3xl`; las hojas solo arriba en móvil y completas desde `sm`).
- **Monograma** (3px): `AuthorChip`, cuadrado porque no se toca.
- **Iconos**: lucide, trazo 1.75 (2 en insignias de 14px), 18–22px. El trazo botánico propio es 1.5px en pantalla a cualquier tamaño.

## Components

### Secciones y listas (`src/components/ui/List.tsx`)
La estructura de toda la app. Se lee en secciones con título y listas con divisores.
- **`Section`**: título Alegreya (h2 20px por defecto; h3 16px), acción opcional a la derecha (`SectionAction`: texto `terracotta-ink` 14px bold, ≥44px) y descripción en `meta`/`ink-muted`. Úsala para cada bloque con nombre ("Hoy", "Tus tareas", "Tareas por trimestre").
- **`ListGroup`**: un solo `<ul role="list">` de filas con divisores internos `line` que empiezan tras el icono. Tono `plain` (por defecto): sin caja, sangra hasta el gutter; `edges` añade filetes arriba y abajo. Tono `inset`: una caja `surface` con borde `line-strong` y radio 16px, para agrupar dentro de un fondo largo. Nunca dentro de otro `ListGroup` ni de una tarjeta.
- **`ListRow`**: fila ≥48px. Interactiva como `<button>`, `<a>` (trailing `chevron` o `external`) o switch (la fila entera es `role="switch"`); estática si no, con un control al final. Icono lucide de 20px en `ink-muted` (un icono no es estado; si marca completado, lleva `sage-ink`). Tono `danger` pone título e icono en `terracotta-ink`. Hover y pressed: `surface-hover`. Foco: contorno interior de 2px `terracotta-ink`.
- **`RowButton`**: botón compacto (≥44px, píldora, 14px bold) para el trailing de una fila estática o la acción de una sección. `primary` relleno `terracotta-ink`; `default` contorno `line-control`; `danger` contorno con tinta terracota y hover `terracotta-wash`.
- **`Divider`**: filete de 1px `line`, opcionalmente desde el gutter.
- **`BotanicalRule`**: filete `line-strong` con un ramito de dos hojas en trazo `sage-ink` 1.5px. Decorativo, cierra un bloque grande; máximo uno por pantalla, nunca entre filas.

### Buttons
- **Shape:** píldora (9999px) para acciones de fila y sección; 16px para botones de ancho completo (formularios, llamadas).
- **Primary:** relleno `terracotta-ink` con `on-accent`; hover `terracotta-ink-hover`. Uno por vista.
- **Hover / Focus:** transición solo de color; foco con anillo exterior de 2px `terracotta-ink` a 2px de separación (respaldo global en `:focus-visible`).
- **Contorno / Danger:** borde `line-control`, fondo transparente, hover `surface-hover` (o `terracotta-wash` si es destructivo).
- **Pieza de herramienta:** el contador de movimientos es un círculo de 240px `sage-ink` con anillo `sage-wash` de 8px y cifra Alegreya de 96px; el de contracciones, un bloque de 24px de radio. Son las únicas cifras grandes de la app, porque se tocan.

### Inputs / Fields
- **Style:** `surface-raised`, borde `line-control`, radio 16px, alto ≥48px, texto 16px (evita el zoom de iOS), placeholder `placeholder`.
- **Focus:** anillo de 2px `terracotta-ink`, cursor de texto terracota.
- **Controles nativos** (fecha, hora, select) siguen al tema con `color-scheme`; `accent-color` es `sage-ink`.
- **Control segmentado:** pista `surface-sunken`; la opción elegida en `sage-ink` con `on-accent` (Apariencia en Ajustes, vista del plan de parto, Panda Audio, Lecturas), sin sombra.

### Chips
- **Monograma de autor (`AuthorChip`):** cuadrado de 20–24px, radio 3px, inicial en Alegreya 13px bold; `terracotta-ink` (mamá), `sage-ink` (papá) o `ink-muted` (sin rol). Informativo, no interactivo.
- **Estado de sincronía (`SyncBadge`):** texto `micro` con icono de 14px, en la tinta de su tono sobre su lavado.

### Navigation
- **Barra inferior (móvil):** cuatro destinos en rejilla sobre `ground`, filete superior `line`. Icono en un pozo de 56×32px; activo: pozo `terracotta-wash`, icono y etiqueta `terracotta-ink` bold, `aria-current="page"`; inactivo: `ink-muted`, hover `surface-hover`. Etiqueta `micro`; por debajo de 300px de ancho queda solo el icono (la etiqueta sigue como nombre accesible).
- **Riel (escritorio):** la misma barra en columna de 96px a la izquierda, con los mismos estados.
- **Cabecera:** `Wordmark` responsive como `<h1>` y, a la derecha, "Síntomas" (píldora contorno con icono terracota), avisos y ajustes como botones redondos de 44px. Por debajo de 300px (zoom del 200%) "Síntomas" queda con su icono y la etiqueta sigue como nombre accesible, igual que en la barra.

### Ruta de urgencia (`src/components/CallActions.tsx`)
- **Emergencias siempre es la acción más fuerte:** relleno `terracotta-ink`, texto `on-accent` 18px bold, alto ≥56px, radio 16px, halo terracota, pozo de icono `on-accent` al 15%. Número con `tabular-nums`; si la región no está confirmada, una nota `meta` pide revisarlo.
- **Secundarias** (obstetra, hospital): `surface-raised` con borde `line-strong`, ≥56px (48px en compacto), pozo de icono `sage-wash`/`sage-ink` o `surface-sunken`. "Agregar teléfono" usa borde discontinuo `line-control`.
- **Pressed:** `scale(0.98)`, anulado con movimiento reducido. Con el botón muy estrecho (zoom 200%) los iconos ceden su sitio a la etiqueta (consultas `@container`); el texto nunca se trunca.
- Desde la semana 36, "¿Es la hora?" sube a lo alto de la Guía con estas acciones.

### Hojas y diálogos (`useModalDialog` + `ModalPortal`)
- **Visual:** `surface-raised`, borde `line`, radio 24px, sombra de hoja o de diálogo; en móvil las hojas suben desde abajo, en `sm+` se centran.
- **Patrón accesible obligatorio:** todo diálogo se monta en `<ModalPortal>` (portal a `body`, capa `data-modal-layer`, centinelas de foco) y usa `useModalDialog` (`role="dialog"` o `alertdialog`, `aria-modal`, `aria-labelledby`). Escape cierra solo el superior; Tab queda atrapado (incluye el toast exento); el resto queda `inert`; bloqueo de scroll con contador; el foco vuelve a quien abrió (en iOS, al último control tocado vía `useModalOpenerTracking`). Capa z según `layers.ts`.

### Tema (`ThemeSync`)
- Preferencia **Sistema / Claro / Oscuro** (`themePreference`). Un script síncrono en `<head>` pone `.dark` antes del primer pintado; `ThemeSync` la mantiene y sigue a `prefers-color-scheme` solo con "Sistema".
- `theme-color` del viewport y `manifest.json` (`theme_color`, `background_color`) = `ground`.

### La planta que crece contigo (`src/components/GrowingPlant.tsx`)
La firma del sistema. SVG paramétrico y determinista (viewBox 120; la variación sale de un hash de la semana en que brotó cada hoja, sin azar).
- **Etapas:** semilla (1–2; en la 2 asoma la raíz) → brote con cotiledones (3–6) → tallo que se alarga cada semana con una hoja nueva cada 4 semanas, alternando lados, que siguen creciendo (7–35) → botón terracota que engorda (36–39) → flor abierta de cinco pétalos (40–42). Sin semana conocida: brote neutro.
- **Trazo:** 1.5px en pantalla a cualquier tamaño en `sage-ink`; hojas con relleno `sage` al 22%; terracota (`terracotta` con contorno `terracotta-ink`) solo en botón y flor; montículo de tierra mínimo.
- **Tamaños en uso:** 120px en el bloque de semana de la Guía, 88px en la bienvenida (sin animar), 56px en el selector de semana.
- **Animación única de autor:** al avanzar de semana (no al montar ni al retroceder) el tallo se alarga, la punta sube y la hoja más joven crece desde su nudo: 600ms, `cubic-bezier(0.16, 1, 0.3, 1)`, Web Animations. Con `prefers-reduced-motion` no se anima: la planta aparece ya en su estado final (el estado por defecto es la planta completa).
- **Accesibilidad:** `role="img"` ("Planta de la semana 24"); `title=""` la vuelve decorativa cuando el texto de al lado ya dice la semana.

### Marca (§4.2)
- **PandaMark** (`src/components/PandaMark.tsx`): la mascota (mamá panda con su bebé) como vector en la paleta, sin azulejo, apoyada directamente en el suelo. Sus trazados están en `src/components/panda-paths.json`, generados con `node scripts/brand/render-brand.mjs trace <original>` a partir de la mascota original que conserva git (`git show 2bf0815:src/app/icon.jpg > panda-original.jpg`): cuatro capas (pelaje, cabeza del bebé, sombra del pecho, manchas) en viewBox de 100. Colores recoloreados con los tokens `--panda-*` de `globals.css`: en claro, pelaje `surface-raised`, bebé `surface-sunken`, sombra `line`, manchas y contorno `ink` (contorno de 1.25px para separar el pelaje del alabastro); en oscuro, sin contorno, el pelaje se recorta contra la obsidiana. Decorativo por defecto; con `title`, `role="img"`.
- **Wordmark** (`src/components/Wordmark.tsx`): PandaMark + "PandaJR" como texto vivo en Alegreya 800: "Panda" en `ink`, "JR" en `terracotta-ink` (el único uso de marca de la terracota). Por defecto panda 34px + texto 24px; `compact` 28px + 20px; `responsive` (cabecera) compacto por debajo de 380px y solo el panda por debajo de 360px, con el texto en `sr-only` para que el `<h1>` siga diciendo "PandaJR".
- **Rasters que se envían y su procedencia:**
  - `src/app/icon.svg` (favicon vectorial: PandaMark sobre alabastro con borde `line-strong`, radio 22) y `src/app/apple-icon.png` (180px): `node scripts/brand/render-brand.mjs icons`.
  - `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png` (los del manifiesto): `node scripts/brand/render-brand.mjs icons`, rasterizados con sharp sobre `#faf9f5`.
  - `src/app/opengraph-image.png` y `src/app/twitter-image.png` (1200×630, con sus `.alt.txt`): captura de `scripts/brand/og-page.tsx` (PandaMark, wordmark y la planta en las semanas 8, 20, 32 y 40, tokens claros) montada temporalmente como ruta y capturada en Chrome a 1200×630, dpr 1.
- No hay otros rasters de marca: la mascota en JPEG con azulejo menta y el logotipo en texto teal quedaron retirados y no deben volver.

## Do's and Don'ts

### Do:
- **Do** estructurar cada vista en `Section` + `ListGroup` + `ListRow`; usar `inset` solo para agrupar dentro de un fondo largo.
- **Do** usar `terracotta-ink` para la acción principal y la alarma, `sage-ink` para lo completado y lo que crece, `amber-ink` sobre `amber-wash` solo para avisos logísticos.
- **Do** mantener todo texto ≥4.5:1 y todo borde de control ≥3:1 en claro y en oscuro; medir antes de añadir un par nuevo.
- **Do** dar a cada objetivo táctil ≥44px de alto (filas ≥48px, llamadas ≥56px) y un foco visible `terracotta-ink` de 2px.
- **Do** dejar "Emergencias" como el botón más fuerte de cualquier pantalla donde aparece.
- **Do** montar todo diálogo con `ModalPortal` + `useModalDialog` y su capa de `layers.ts`.
- **Do** usar iconos lucide con trazo 1.75 y `tabular-nums` en contadores y horas.
- **Do** regenerar los rasters de marca con `scripts/brand/` cuando cambie un token del panda o del suelo.

### Don't:
- **Don't** apilar tarjetas como estructura de contenido ni anidar una caja dentro de otra (nada de tarjeta en tarjeta, ni `ListGroup` en `ListGroup`).
- **Don't** poner eyebrows o kickers en mayúsculas sobre un título ("TAMAÑO COMPARATIVO", "HITO DE LA SEMANA").
- **Don't** usar emoji ni glifos como iconos; un emoji guardado como dato (el estado de ánimo) se muestra por su nombre.
- **Don't** usar colores fuera de la paleta (sky, emerald, blue, indigo, rose, stone…), degradados de texto ni glassmorphism decorativo.
- **Don't** marcar estado con un `border-left` de color.
- **Don't** añadir animaciones de entrada deslizantes ni otra animación de autor: los cambios de estado se marcan con color y opacidad; las utilidades heredadas `animate-in`/`slide-in-from-*` se retiraron de `globals.css` y no deben volver.
- **Don't** reintroducir la ficha fetal de categoría (número gigante, fruta como héroe, tarjetas apiladas).
- **Don't** usar los alias de compatibilidad (`--background`, `--foreground`, `--surface-card`, `--surface-muted`, `--border-subtle`) en código nuevo.
