import { PandaMark } from "@/components/PandaMark";

/**
 * Wordmark — la marca dentro de la paleta: el panda trazado (PandaMark, sin azulejo, directamente sobre el
 * suelo) y "PandaJR" como texto vivo en Alegreya 800: "Panda" en tinta, "JR" en terracota-ink, el único
 * uso de marca de la terracota (DESIGN.md §4.2). Legible en claro y oscuro: 13.6:1 y 5.6:1 sobre
 * alabastro; 14.5:1 y 7.6:1 sobre obsidiana.
 *
 * - Por defecto: panda 34px + texto 24px (bienvenida, pantallas amplias).
 * - compact: panda 28px + texto 20px.
 * - responsive (cabecera): compacto por debajo de 380px y, por debajo de 360px (o con zoom), solo el panda;
 *   el texto sigue en el DOM (sr-only), así que el h1 se llama "PandaJR" una sola vez.
 * El texto es el nombre accesible; el panda es decorativo. Para el h1 de la app: <h1><Wordmark responsive /></h1>
 */
export function Wordmark({ compact = false, responsive = false, className }: { compact?: boolean; responsive?: boolean; className?: string }) {
  const mark = responsive ? "size-7 min-[380px]:size-[2.125rem]" : compact ? "size-7" : "size-[2.125rem]";
  const text = responsive
    ? "text-subtitle min-[380px]:text-title max-[359px]:sr-only"
    : compact
      ? "text-subtitle"
      : "text-title";
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <PandaMark className={`shrink-0 ${mark}`} />
      <span className={`font-display font-extrabold leading-none tracking-[-0.01em] text-ink ${text}`}>
        Panda<span className="text-terracotta-ink">JR</span>
      </span>
    </span>
  );
}
