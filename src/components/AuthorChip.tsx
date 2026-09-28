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
 * Círculo con la inicial de quien marcó/escribió algo. Terracota (tinta) para la mamá,
 * salvia (tinta) para el papá, neutro si no se sabe. Informativo, no interactivo.
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
  const tone =
    role === "mama"
      ? "bg-terracotta-ink text-white"
      : role === "papa"
        ? "bg-sage-ink text-white"
        : "bg-stone-600 text-white dark:bg-[#4a4458]";
  const dims = size === "xs" ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-[11px]";

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      title={label}
      className={`inline-grid shrink-0 select-none place-items-center rounded-full font-bold leading-none ${dims} ${tone}`}
    >
      <span aria-hidden="true">{initialOf(name, role)}</span>
    </span>
  );
}
