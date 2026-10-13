"use client";

import React, { useEffect, useRef } from "react";
import { UserRound } from "lucide-react";
import { AuthorChip } from "@/components/AuthorChip";
import type { MemberRole } from "@/lib/firebase/pairing";
import { playEmbrace } from "@/lib/motion";

export type Seat = { name?: string; role: MemberRole } | null;

/**
 * La pareja: dos monogramas de 40px, mamá a la izquierda y papá a la derecha (la misma imagen en los dos
 * teléfonos). Un asiento sin nadie es un pozo con el icono de persona, no un control. Decorativa: lo que
 * significa ya lo dice el texto de al lado («Compartido con Luis», «Luis te mandó un abrazo»).
 *
 * Quieta en la cabecera de «Juntos». En el abrazo que llega (`embrace`), al montar, los dos monogramas
 * llegan desde los lados y se juntan (src/lib/motion.ts › playEmbrace). `frame` es el color de la
 * superficie de debajo: el marco de 2px que separa los dos cuadrados tiene que ser del mismo tono.
 */
export function CoupleMark({
  seats,
  frame = "ground",
  embrace = false,
}: {
  seats: [Seat, Seat];
  frame?: "ground" | "raised";
  embrace?: boolean;
}) {
  const firstRef = useRef<HTMLSpanElement>(null);
  const secondRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!embrace) return;
    // La tarjeta aterriza primero (≈200 ms) y entonces se juntan: el encuentro se ve, no se adivina.
    const running = playEmbrace(firstRef.current, secondRef.current, { delay: 200 });
    return () => running.forEach((a) => a.cancel());
  }, [embrace]);

  const frameBg = frame === "raised" ? "bg-surface-raised" : "bg-ground";
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      {seats.map((seat, i) => (
        // El segundo monta 8px sobre el primero; su marco de 2px del color de la superficie los separa (sin sombra).
        <span key={i} ref={i === 0 ? firstRef : secondRef} className={`flex rounded-[5px] ${frameBg} p-0.5 ${i > 0 ? "-ms-2" : ""}`}>
          {seat ? (
            <AuthorChip name={seat.name} role={seat.role} size="lg" title={seat.name?.trim() || (seat.role === "mama" ? "Mamá" : "Papá")} decorative />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-[3px] border border-line-strong bg-surface-sunken text-ink-subtle">
              <UserRound size={20} strokeWidth={1.75} />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
