"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Pencil, Phone, PhoneCall, Siren, UserPen } from "lucide-react";
import { useCareTeam } from "@/lib/useCareTeam";
import { hospitalMapsUrl, telHref } from "@/lib/urgency";
import { CareTeamSheet } from "@/components/CareTeamForm";
import { usePandaStore } from "@/store/usePandaStore";

type CallContext = "sos" | "contracciones" | "pretermino" | "patadas" | "chat";
type ActionKey = "emergency" | "ob" | "hospital" | "addOb";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-ink";

const baseAction =
  "flex w-full items-center gap-3 rounded-2xl px-3.5 text-left transition-[background-color,transform] " +
  "active:scale-[0.98] motion-reduce:active:scale-100 " +
  focusRing;

// Secundarias: panel elevado con borde de la paleta. El hover mezcla el panel con la tinta (más oscuro
// en claro, más claro en oscuro), como antes.
const secondaryAction =
  "bg-surface-raised border border-line-strong text-ink " +
  "hover:bg-[color-mix(in_srgb,var(--surface-raised),var(--ink)_6%)]";

const iconWell = "grid place-items-center shrink-0 rounded-full";
// Sin truncate: con zoom o nombres largos el texto pasa a otra línea en vez de cortarse (1.4.4).
const wrapText = "break-words";
// "Emergencias" es una sola palabra: si no cabe, se divide con guion (lang="es") en vez de salirse.
const wrapWord = "break-words hyphens-auto";
const subText = `block ${wrapText} text-meta leading-snug text-ink-muted`;
// Con el botón muy estrecho (zoom al 200%) los iconos ceden su sitio a la etiqueta: el de llamada
// al final primero y después el del inicio. Las consultas miden el propio botón (@container).
const endIconNarrow = "@max-[15rem]:hidden";
const startIconNarrow = "@max-[11rem]:hidden";

const emergencyClass =
  `${baseAction} @container min-h-[56px] py-2.5 bg-terracotta-ink hover:bg-terracotta-ink-hover text-on-accent shadow-[0_3px_10px_-3px_color-mix(in_srgb,var(--terracotta-ink-fill)_55%,transparent)]`;

/** Aviso cuando el número de emergencias no se pudo confirmar para la región. */
function EmergencyConfirmNote({ number }: { number: string }) {
  return (
    <p className="pt-1 text-meta leading-snug text-ink-muted">
      No pudimos confirmar tu región. Revisa que <span className="font-bold tabular-nums text-ink">{number}</span> sea el número de emergencias de tu país.
    </p>
  );
}

/**
 * Solo el botón "Emergencias · N" (a un toque), para pantallas donde el resto de las
 * llamadas va plegado. Con `withNote` añade el aviso si la región no está confirmada.
 */
export function EmergencyCallLink({
  className,
  withNote = false,
  compact = false,
}: {
  className?: string;
  withNote?: boolean;
  /** Para contenedores estrechos (burbuja del chat): texto e icono algo menores, mismo alto. */
  compact?: boolean;
}) {
  const { careTeam, emergency } = useCareTeam();
  const needsEmergencyConfirm = !careTeam.emergencyNumber && !emergency.confident;
  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ""}`}>
      <a href={telHref(emergency.number)} aria-label={`Llamar a emergencias, ${emergency.number}`} className={emergencyClass}>
        <span className={`${iconWell} ${startIconNarrow} ${compact ? "w-9 h-9" : "w-10 h-10"} bg-on-accent/15`}>
          <Siren size={compact ? 20 : 22} aria-hidden="true" />
        </span>
        <span className={`min-w-0 flex-1 ${wrapWord} ${compact ? "text-body" : "text-lg"} font-bold leading-tight`}>
          Emergencias <span className="whitespace-nowrap">· <span className="tabular-nums">{emergency.number}</span></span>
        </span>
        {/* En la variante compacta el icono final se omite para que "Emergencias · N" quepa en una línea. */}
        {!compact && <PhoneCall size={18} className={`shrink-0 ${endIconNarrow}`} aria-hidden="true" />}
      </a>
      {withNote && needsEmergencyConfirm && <EmergencyConfirmNote number={emergency.number} />}
    </div>
  );
}

/**
 * Acciones de llamada para la ruta de urgencia: emergencias, obstetra y hospital.
 * Emergencias es siempre la acción visualmente más fuerte.
 * - "contracciones" (5-1-1 de término): el camino habitual es obstetra → hospital.
 * - "pretermino": obstetra o emergencias, ya; el mapa al final.
 * - Resto: emergencias primero.
 * Sin teléfono del obstetra, la primera acción siempre es una llamada (emergencias),
 * nunca una búsqueda en el mapa.
 * `showEmergency={false}` omite emergencias cuando la pantalla ya lo muestra aparte.
 */
export function CallActions({
  context = "sos",
  className,
  showEmergency = true,
}: {
  context?: CallContext;
  className?: string;
  showEmergency?: boolean;
}) {
  const { careTeam, emergency } = useCareTeam();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Guardados desde esta hoja: confirma por lector de pantalla y recoloca el foco si el botón que
  // abrió la hoja ("Agregar el teléfono…") desapareció al guardar (ahora está "Llamar a…").
  const [savedCount, setSavedCount] = useState(0);
  const groupRef = useRef<HTMLDivElement>(null);
  const obLinkRef = useRef<HTMLAnchorElement>(null);
  // El papá también llama: "su obstetra" (el de la mamá), no "tu obstetra".
  const whose = usePandaStore((s) => s.profile.role) === "papa" ? "su" : "tu";

  const compact = context === "chat";
  const obPhone = careTeam.obPhone?.trim();
  const obName = careTeam.obName?.trim();
  const maps = hospitalMapsUrl(careTeam);
  const needsEmergencyConfirm = showEmergency && !careTeam.emergencyNumber && !emergency.confident;

  const baseOrder: ActionKey[] = !obPhone
    ? ["emergency", "hospital", "addOb"]
    : context === "contracciones"
      ? ["ob", "hospital", "emergency"]
      : context === "pretermino"
        ? ["ob", "emergency", "hospital"]
        : ["emergency", "ob", "hospital"];
  const order = showEmergency ? baseOrder : baseOrder.filter((k) => k !== "emergency");

  useEffect(() => {
    if (!savedCount) return;
    const doc = groupRef.current?.ownerDocument;
    if (!doc) return;
    const active = doc.activeElement;
    if (active && active !== doc.body && active.isConnected) return; // el foco ya volvió a su sitio
    (obLinkRef.current ?? groupRef.current?.querySelector<HTMLElement>("a[href], button"))?.focus();
  }, [savedCount]);

  // Llamar al obstetra es una llamada: 56px siempre. El mapa y "agregar" pueden ser más bajos en el chat.
  const callHeight = "min-h-[56px] py-2.5";
  const secondaryHeight = compact ? "min-h-[48px] py-2" : "min-h-[56px] py-2.5";
  const wellSize = compact ? "w-9 h-9" : "w-10 h-10";
  const iconSize = compact ? 18 : 20;

  const render = (key: ActionKey) => {
    switch (key) {
      case "emergency":
        return (
          <a
            key={key}
            href={telHref(emergency.number)}
            aria-label={`Llamar a emergencias, ${emergency.number}`}
            className={emergencyClass}
          >
            <span className={`${iconWell} ${startIconNarrow} ${wellSize} bg-on-accent/15`}>
              <Siren size={compact ? 20 : 22} aria-hidden="true" />
            </span>
            <span className={`min-w-0 flex-1 ${wrapWord} text-lg font-bold leading-tight`}>
              Emergencias <span className="whitespace-nowrap">· <span className="tabular-nums">{emergency.number}</span></span>
            </span>
            <PhoneCall size={18} className={`shrink-0 ${endIconNarrow}`} aria-hidden="true" />
          </a>
        );

      case "ob":
        return (
          <a key={key} ref={obLinkRef} href={telHref(obPhone || "")} className={`${baseAction} @container ${secondaryAction} ${callHeight}`}>
            <span className={`${iconWell} ${startIconNarrow} ${wellSize} bg-sage-wash text-sage-ink`}>
              <Phone size={iconSize} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${wrapText} text-body font-bold leading-tight`}>
                {obName ? `Llamar a ${obName}` : `Llamar a ${whose} obstetra`}
              </span>
              <span className={`${subText} tabular-nums`}>{obPhone}</span>
            </span>
          </a>
        );

      case "hospital": {
        const detail = maps.personalized
          ? careTeam.hospitalName && careTeam.hospitalAddress
            ? careTeam.hospitalAddress
            : "Abre la ruta en el mapa"
          : "Abre el mapa con opciones cerca de ti";
        return (
          <a
            key={key}
            href={maps.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseAction} @container ${secondaryAction} ${secondaryHeight}`}
          >
            <span className={`${iconWell} ${startIconNarrow} ${wellSize} bg-surface-sunken text-ink-muted`}>
              <MapPin size={iconSize} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${wrapText} text-body font-bold leading-tight`}>{maps.label}</span>
              {!compact && <span className={subText}>{detail}</span>}
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </span>
          </a>
        );
      }

      case "addOb":
        return (
          <button
            key={key}
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className={`${baseAction} @container ${secondaryHeight} border border-dashed border-line-control text-ink hover:bg-surface-hover`}
          >
            <span className={`${iconWell} ${startIconNarrow} ${wellSize} bg-sage-wash text-sage-ink`}>
              <UserPen size={iconSize} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${wrapText} text-body font-bold leading-tight`}>Agregar el teléfono de {whose} obstetra</span>
              {!compact && <span className={subText}>Para llamarle con un toque</span>}
            </span>
          </button>
        );
    }
  };

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label="Llamadas y ruta al hospital"
      className={`flex flex-col ${compact ? "gap-2" : "gap-2.5"}${className ? ` ${className}` : ""}`}
    >
      {order.map(render)}

      {needsEmergencyConfirm && <EmergencyConfirmNote number={emergency.number} />}

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        className={`self-start inline-flex items-center gap-1.5 min-h-[44px] px-1 rounded-lg text-meta font-bold text-ink-muted hover:text-ink underline-offset-4 decoration-line-control hover:underline transition-colors ${focusRing}`}
      >
        <Pencil size={14} aria-hidden="true" />
        Editar equipo de salud
      </button>

      <p role="status" className="sr-only">
        {savedCount > 0 ? (obPhone ? `Equipo de salud guardado. Ya puedes llamar a ${whose} obstetra.` : "Equipo de salud guardado.") : ""}
      </p>

      <CareTeamSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={() => setSavedCount((n) => n + 1)} />
    </div>
  );
}
