---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/HerramientasModule.tsx","src/components/AgendaModule.tsx"]
---

# App PandaJR (PWA móvil, ruta única)

Modo: Operate. Audiencia: mamá primeriza y papá copiloto, a menudo de noche, con una mano y bajo estrés. Tarea: saber qué toca hoy, quién lo hace y si hay algo urgente; llegar a llamar en un toque. Restricciones: PRODUCT.md (principios, accesibilidad WCAG 2.1 AA, sin afirmar validación médica) y la paleta fijada por DESIGN.md.

Decisiones del usuario (2026-09-27): ampliar el mundo existente, no reemplazarlo; tipografía Alegreya + Alegreya Sans; firma botánica "una planta que crece contigo"; alcance profundo (menos tarjetas en toda la app, hub agrupado en listas, marca dentro de la paleta). Build code-led (`.impeccable/config.json`).

## Direction contract

THESIS: La Guía es un jardín compartido: el embarazo se lee como una planta que crece semana a semana y que la pareja cuida junta. Rechaza la ficha fetal de categoría (número grande, fruta, tarjetas apiladas) y la sopa de tarjetas.

OWN-WORLD: Suelo alabastro #faf9f5; tinta terracota #a54833 para acción y alarma; sage-ink #44695a para crecimiento y completado; obsidiana violeta #181520/#221d2d de noche. Alegreya (títulos, caligráfica) + Alegreya Sans (UI). Trazo botánico de 1.5px en sage. Listas con divisores en lugar de tarjetas; radios suaves solo en lo que se toca.

STORY: Abren la app, ven en qué semana van (la planta), qué toca hoy y quién lo hace, y si algo es urgente llegan a llamar en un toque.

FIRST VIEWPORT: Guía a 390px. Cabecera: wordmark en Alegreya y «Síntomas». Bloque de semana: planta SVG (~120px) a la izquierda, «Semana 24 + 3 días» en Alegreya 28–32px, FPP debajo. Debajo, «Hoy» como lista con divisores (tus tareas, las de tu pareja, próxima cita). Desde la semana 36, «¿Es la hora?» arriba con CallActions.

FORM: Expansión del mundo que fija DESIGN.md (sin tirada de concept-seed: el brief fija el mundo). Firma: la planta que crece (semanas 1–42), con una única animación al cambiar de semana.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
