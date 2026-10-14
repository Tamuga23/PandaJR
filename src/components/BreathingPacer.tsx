"use client";

// «Respirar juntos» del modo parto (crítica 2026-10-13): un círculo que marca el ritmo entre contracciones,
// inhalar 4 s y exhalar 6 s. Es el único bucle de la app que inicia la persona (la regla «solo se mueve lo que
// acaba de pasar»): arranca con su botón y se detiene con el mismo botón o al salir de la pantalla. Con
// movimiento reducido el círculo no escala; cambian la palabra y la cuenta. Sin Firebase.

import { useEffect, useId, useState } from "react";
import { RowButton } from "@/components/ui/List";

const INHALE = 4;
const EXHALE = 6;

export function BreathingPacer({ together }: { together: boolean }) {
  const titleId = useId();
  const [running, setRunning] = useState(false);
  // Segundos desde que empezó: de ahí salen la fase y la cuenta.
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const inCycle = elapsed % (INHALE + EXHALE);
  const inhaling = inCycle < INHALE;
  const left = inhaling ? INHALE - inCycle : INHALE + EXHALE - inCycle;
  const word = together ? (inhaling ? "Inhalen" : "Exhalen") : inhaling ? "Inhala" : "Exhala";
  const toggle = () => {
    setElapsed(0);
    setRunning((r) => !r);
  };

  return (
    <section aria-labelledby={titleId} className="rounded-2xl bg-sage-wash p-5">
      <h3 id={titleId} className="font-display text-body font-bold text-ink">
        {together ? "Respirar juntos" : "Respirar"}
      </h3>
      <p className="mt-0.5 text-meta text-ink-muted">
        {/* Los dos siguen el círculo (la misión de la semana 39: «ella marca el ritmo» de las contracciones). */}
        {together
          ? "Entre contracciones, sigan juntos el círculo: inhalen 4 segundos mientras crece y exhalen 6 mientras se encoge."
          : "Entre contracciones, sigue el círculo: inhala 4 segundos mientras crece y exhala 6 mientras se encoge. Suelta la mandíbula y los hombros."}
      </p>
      <div className="mt-4 flex items-center gap-5">
        {/* Crece al inhalar (4 s) y se encoge al exhalar (6 s); quieto si no está en marcha. */}
        <span aria-hidden="true" className="grid size-24 shrink-0 place-items-center">
          <span
            className={`block size-24 rounded-full bg-sage/30 ring-2 ring-sage-ink/40 transition-transform ease-in-out motion-reduce:transition-none ${
              running && inhaling ? "motion-safe:scale-100" : "motion-safe:scale-[0.6]"
            }`}
            style={{ transitionDuration: running ? `${inhaling ? INHALE : EXHALE}s` : "0s" }}
          />
        </span>
        <div className="min-w-0">
          {running ? (
            <p className="font-display text-title text-ink" aria-hidden="true">
              {word} <span className="tabular-nums text-sage-ink">{left}</span>
            </p>
          ) : (
            <p className="text-body text-ink-muted">{together ? "Cuando estén listos." : "Cuando estés lista."}</p>
          )}
          <RowButton
            onClick={toggle}
            aria-label={running ? "Detener la respiración guiada" : "Empezar la respiración guiada"}
            className="mt-2"
          >
            {running ? "Detener" : "Empezar"}
          </RowButton>
        </div>
      </div>
      {/* Para el lector: una sola frase al empezar o parar, no una cuenta cada segundo. */}
      <p role="status" className="sr-only">
        {running ? `Respiración guiada en marcha: ${together ? "inhalen 4 segundos y exhalen 6" : "inhala 4 segundos y exhala 6"}.` : ""}
      </p>
    </section>
  );
}
