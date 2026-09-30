"use client";

import React from "react";

type Role = "mama" | "papa";

// La persona sin nombre: "Mamá" o "Papá" ("copiloto" es el rol, no cómo se le llama).
const ROLE_LABEL: Record<Role, string> = { mama: "Mamá", papa: "Papá" };

/** Primera letra visible del nombre (respeta acentos y emoji compuestos). */
function initialOf(name?: string, role?: Role): string {
  const source = (name ?? "").trim() || (role ? ROLE_LABEL[role] : "");
  const first = Array.from(source)[0];
  return first ? first.toLocaleUpperCase("es") : "?";
}

/**
 * Marca cuadrada (monograma) con la inicial de quien marcó/escribió algo. Terracota (tinta) para la mamá,
 * salvia (tinta) para el papá, neutro si no se sabe. Informativo, no interactivo: por eso es un cuadrado
 * (los radios suaves son de lo que se toca). El color de rol es la única excepción a "terracota = acción,
 * sage = crecimiento" (DESIGN.md §1.1): vive solo en este monograma, nunca en texto ni en fondos.
 */
export function AuthorChip({
  name,
  role,
  size = "sm",
  title,
  decorative = false,
}: {
  name?: string;
  role?: Role;
  size?: "xs" | "sm";
  /** Texto accesible y tooltip con contexto ("A Luis le gusta", "Agendada por Ana"). */
  title?: string;
  /** El nombre ya está escrito al lado: el círculo se oculta al lector de pantalla. */
  decorative?: boolean;
}) {
  const who = name?.trim() || (role ? ROLE_LABEL[role] : "tu pareja");
  const label = title?.trim() || `Marcado por ${who}`;
  // Rellenos de tinta con texto on-accent (≥4.5:1 en los dos temas). Sin rol: tinta neutra invertida
  // (ink-muted con el color del suelo encima: 7:1 en claro, 11:1 en oscuro).
  const tone =
    role === "mama"
      ? "bg-terracotta-ink text-on-accent"
      : role === "papa"
        ? "bg-sage-ink text-on-accent"
        : "bg-ink-muted text-ground";
  // Inicial en Alegreya (monograma de la marca), al mínimo de la escala (text-micro, 13px).
  const dims = size === "xs" ? "h-5 w-5" : "h-6 w-6";

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      title={label}
      className={`inline-grid shrink-0 select-none place-items-center rounded-[3px] font-display text-micro font-bold leading-none ${dims} ${tone}`}
    >
      <span aria-hidden="true">{initialOf(name, role)}</span>
    </span>
  );
}
