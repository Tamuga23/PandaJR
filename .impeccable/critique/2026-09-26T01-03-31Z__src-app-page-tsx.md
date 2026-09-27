---
target: el proyecto completo (src/app/page.tsx + Agenda + Herramientas)
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:C:\\Users\\carlo.DESKTOP-0BRP765\\Documents\\PandaJR\\src\\app\\page.tsx"
target_fingerprint: "sha256:f1f365901057c3e76265723ce6bf18a651f9f4d2196b23f7686e16e14884b964"
target_path: "C:\\Users\\carlo.DESKTOP-0BRP765\\Documents\\PandaJR\\src\\app\\page.tsx"
timestamp: 2026-09-26T01-03-31Z
slug: src-app-page-tsx
---
Method: dual-agent (A: síntesis a30e1804400d8f8bd sobre 5 revisores por superficie + 2 verificadores adversariales af628ac487bff8915 · a80163d68360445a8 · B: acf818664a68c0a6a)
Alcance: toda la app (src/app/page.tsx + src/components/AgendaModule.tsx + src/components/HerramientasModule.tsx). Primer intento colgado por contexto saturado de capturas y relanzado; no degradado.

## Design Health Score

| # | Heurística | Nota | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 1 | Estado falso: «2 Matches» sin voto de la pareja, «Sincronizado», «Guardado automático» con catch vacío, «recién actualizado» fijo, campana que late por citas pasadas; % de checklist vuelve a 0 al recargar |
| 2 | Mundo real | 2 | Jerga sin explicar (O'Sullivan, SGB, Cardiff, 5-1-1), léxico militar, «¡It's a Match!», semana por slider en vez de FPP |
| 3 | Control y libertad | 1 | 19 «Deshacer» vacíos vs 6 reales; flecha atrás destruye sesión Cardiff; onboarding sin Atrás; «Desvincular» primero en Ajustes |
| 4 | Consistencia | 2 | 3 patrones de contenedor, títulos triplicados, tokens DESIGN.md ≠ globals.css; terracota en CTA/SOS sí sancionado por el brief |
| 5 | Prevención de errores | 1 | Datos semilla como propios (citas Dra. Ramírez, sesiones de patadas, plan 24/25); semana no avanza; zoom bloqueado |
| 6 | Reconocer vs recordar | 2 | Nav con etiquetas; teléfono del obstetra/hospital no se guarda; fecha de cita ilegible en su guía; código copiado a mano |
| 7 | Flexibilidad | 2 | Chips, swipe, .ics, barra espaciadora; falta deep link, FPP, saltar de semana |
| 8 | Estética y minimalismo | 2 | Card soup en el hub (banner SOS + 10 tarjetas), tarjeta en tarjeta, «SOS Síntomas» ×3, 4 acentos en el header |
| 9 | Recuperación de errores | 1 | «habilitar Firestore y Auth Anónimo»; e.message crudo; «verifica tu configuración de Gemini» tras «estoy sangrando» |
| 10 | Ayuda | 2 | Guías Cardiff/cita/acompañante buenas; el «por qué» clínico (campo detail) nunca se muestra |
| **Total** | | **16/40** | **Poor** |

## Design Specificity Verdict

LLM: la idea es propia de PandaJR (pareja desde la primera pantalla, misiones por rol, guía del acompañante, contenido ACOG) y la forma es de categoría/stack (Geist por defecto, tarjetas blancas, stone-900, esqueleto BabyCenter, card soup que DESIGN.md §1.2 dice haber eliminado). «Warm Botanical Sanctuary» solo como tinte; nada botánico; mismo icono <Baby> las 40 semanas; la pareja casi nunca se ve en pantalla. font-black es prescrito por DESIGN.md §2 (tensión del brief, no desvío).

Detector CLI: exit 2, 2 hallazgos. ai-color-palette HM:2637 REAL (tema Nocturno indigo/violet, commit b1cd471; A coincide). gray-on-color HM:263 falso positivo (bg-rose-50 solo en hover; sí hay problema real de botón stone-300 de 24 px).
Detector navegador (6 vistas inyectadas por CDP headless): low-contrast (Semana de Gestación 1.0:1 page.tsx:1133; Etapa actual 1.1:1 Agenda:771; h2 blanco/terracota 2.9:1; SOS rose-500 3.8:1), nested-cards, overused-font Geist 100%, pulsing-dot (campana, punto online) — coinciden con A. Detector añadió: skipped-heading (Agenda h2→h4, Herramientas h1→h3), flat-type-hierarchy PandaIA (16/14/14 px). Falsos positivos: cream-palette (documentado), dark-glow y text-occlusion (overlay del detector), nested-cards en shell/header, cramped-padding page.tsx:902.
El detector no ve los P0/P1 de verdad y seguridad. Sin overlay visible (headless).

## Priority Issues

### [P0] La ruta de urgencia falla en el momento crítico
Dónde: HM:111 (max-h-96 overflow-hidden, contenido 484 px vs 384), HM:26-119 (0 tel:), HM:1340 (tel:911 «Llamar al Obstetra»), HM:1346 (maps genérico), page.tsx:1527-1533 (catch «configuración de Gemini»), route.ts:10-15 (sin API key → 200 con tutorial de desarrollador), route.ts:64 (alerta roja sin fiebre), route.ts:96-127 (sin campo urgency), page.tsx:1658-1663 (burbuja única), header/nav sin acceso a SOS. Sin cobertura de parto pretérmino (<37 sem) en SOS, IA ni contador.
Por qué: único flujo con daño por omisión; PRODUCT.md:49 promete instrucción directiva. (México usa 911; el problema es etiquetar «Obstetra» y marcar emergencias con número fijo sin región.)
Fix: CallActions compartido (obstetra guardado, emergencias por región, mi hospital, ≥56 px); alarmas estáticas «Ve a urgencias ya»; detector local de palabras antes del fetch y en el catch (+pretérmino, +fiebre); campo urgency con burbuja propia y aria-live assertive; acceso a síntomas en el header.
Comando: /impeccable harden

### [P0] La colaboración de pareja está en buena parte simulada
Dónde: page.tsx:8 y 1091-1096 (saveChecklistProgress nunca llamado), HM:1517-1564 (partnerLiked semilla + Math.random, status único), HM:1530-1535 + pairing.ts:214-217 (Nombres sobrescribe el array al montar antes del primer snapshot; ping-pong listener↔save), page.tsx:556-567 (misma carrera en Agenda), sin listenToKickSessions/listenToContractions en src, saveBirthPlan nunca llamado, page.tsx:902 (abrazo vacío), page.tsx:439 («recién actualizado» fijo). Presupuesto: gastos sí sincronizan; solo el tope de $5000 es local.
Por qué: confirma cosas que no pasaron (match, tareas); abrir Nombres borra los votos de la pareja; viola PRODUCT.md §2 y §5.
Fix: guardar solo en manejadores y nunca antes de hasLoadedRemote; votos por uid; autor visible; indicador honesto de sincronización; ocultar el abrazo hasta que funcione.
Comando: /impeccable harden

### [P1] Datos clínicos inventados como propios y controles que mienten
Dónde: page.tsx:487-490 (citas semilla), 501 (campana con citas pasadas), 504-507 (19 Deshacer vacíos), 1691-1700 (toda tarjeta = «Cita Médica Agendada»); HM:649-669 (sesiones semilla), 1086 («Evaluación médica» + mojibake), 1139 («Ritmo Normal» fijo), 1318 (umbral de parto activo sobre todo el historial), 1793-1859 (plan 24/25), 2665 (window.getWeekData inexistente → «Limón 45g»); AgendaModule:713-722 (sugerencia TN fija).
Por qué: público ansioso y literal; un deshacer que no deshace enseña que ninguna confirmación vale.
Fix: nada se muestra como del usuario si no lo creó; estados vacíos útiles; showToast(msg, onUndo?); «Parto Activo» se mantiene (PRODUCT.md §5) pero con ventana móvil de 60 min; la IA agenda directo solo con fecha dicha por el usuario y deshacer real.
Comando: /impeccable harden, luego /impeccable clarify

### [P1] Semana congelada; el producto no cambia con ella
Dónde: page.tsx:221/334 (slider 1-40, sin FPP/FUM), 1006-1008 (búsqueda por suelo sobre 20 entradas: 28→27, 39→38), 1137 (Math.min(40)); HM:491-525 (orden fijo del hub), 548-550 (contadores sin profile), 1319 (is511 sin semana). Semanas 41-42: decisión de brief abierta, no bug.
Por qué: hitos y contexto de IA desfasados; semanas 36-40 tratadas igual que la 20; contradice PRODUCT.md §3.1.
Fix: FPP/FUM con stepper como alternativa; semana derivada diaria; bloque «¿Es la hora?» desde la 36; Contracciones primero; aviso de pretérmino en contadores.
Comando: /impeccable shape

### [P1] Base de legibilidad y accesibilidad rota
Dónde: globals.css:12-19 (blanco/#e07a64 2.94:1, blanco/#6c9a84 3.19:1; alarmas SOS 2.54:1), text-sage/20 y /10 (page.tsx:1133, Agenda:434/771/776, HM:968/971) a 1.0–1.1:1, 84 clases de doble opacidad (41 sin dark: pintan bordes negros), layout.tsx:18-19 (userScalable:false), page.tsx:737 vs modales z-50 (nav encima), onboarding sin role=dialog/inert (43 botones tras él), 1 aria-live en src, layout.tsx:84-97 sin matchMedia. Foco invisible REFUTADO salvo ~28 outline-none sin alternativa (p. ej. textarea del chat).
Por qué: lo más importante es lo que peor se lee, de noche; WCAG 1.4.3, 1.4.4, 4.1.3.
Fix: tokens de tinta (terracotta-ink ≈#b4533d, sage-ink ≈#48705d); corregir clases y opacidades ≤/20 en texto; quitar bloqueo de zoom; overlays en portal z-60 con inert; tema Sistema/Claro/Oscuro; role=log en chat.
Comando: /impeccable audit, luego /impeccable harden

### Otros P1 verificados
- Código de pareja de 4 caracteres, sin unicidad ni confirmación antes de unirse (pairing.ts:6-52); ~38% de colisión con 1.000 embarazos.
- Copiloto sin nombre ni tareas propias; contadores le hablan a ella.
- Onboarding sin Atrás, errores de Firebase, sin deep link; invitado siempre copiloto en semana 1.
- Artefactos exportados rotos (plan de parto cortado y «â˜‘», Story desbordada); mojibake en CTAs («Ver en Agenda Médica â†’», «Abrir â†’»).
- Pérdidas silenciosas: flecha atrás borra Cardiff, chat solo en memoria, Diario sin vínculo no guarda.

## Persona Red Flags

Casey (móvil, 3 AM): arranca en blanco con el sistema en oscuro; SOS sin llamada y «Fiebre alta» cortada; nav tapa «Listo» y el input; flecha atrás borra Cardiff; recarga → checklist 0% y chat perdido.
Jordan (primeriza): cree que se perdió una eco de 12 semanas; cree propios «~20 min» y «2 Matches»; «Llamar al Obstetra» marca emergencias; lee «habilitar Firestore»; «Deshacer» de la semana no revierte y ya se sincronizó.
Sam (lector de pantalla): respuestas de PandaIA sin anunciar (incluida urgencia); 43 botones tabulables tras el onboarding; emojis de ánimo sin nombre; labels sin htmlFor; zoom bloqueado con textos a 1.0:1.
Diego (copiloto vía WhatsApp): copia el código a mano; sin nombre; lo que marca no llega a ella; abrazo vacío; abrir Nombres borra los votos de ella; «Hospital» busca cualquier maternidad.

## Minor Observations
- Sin ruta de salud mental perinatal (P2) pese a registrar el ánimo.
- skipped-heading y flat-type-hierarchy (detector).
- h-screen en PandaIA (usar h-dvh); theme_color del manifest #d97757 no coincide; icono maskable sin zona segura.
- «30.0 cm», «$-500»: usar Intl.NumberFormat('es').
- Animaciones infinitas sin prefers-reduced-motion.
- «LCR» usado para cráneo-caudal (también en el prompt); náusea común = hiperemesis.
- Restos de patch scripts: BOM, «]; ;», código muerto.
- Escritorio: columna de 448 px sin adaptación.

## Questions to Consider
- Si se cae Gemini, ¿cuántos toques hay entre «estoy sangrando» y un botón de llamada?
- ¿Cuánto de lo que la app afirma sobre la pareja sigue en pie cuando comparan teléfonos?
- ¿Por qué pedir la semana y no la FPP?
- ¿Qué debería cambiar el día de la semana 36?
- Si el terracota es CTA, completado, burbuja y alarma, ¿qué color significa peligro?
- Sin el panda, ¿qué pantalla dice «santuario botánico» y no «plantilla Next.js con Geist»?
