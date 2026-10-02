/**
 * PandaMark — la mascota (mamá panda con su bebé), sin azulejo: se apoya directamente sobre el suelo
 * (alabastro #faf9f5 / obsidiana #181520).
 *
 * Procedencia (DESIGN.md §4.2): el logo final entregado el 2026-09-30 (scripts/brand/panda-mark-source.png,
 * PNG sin fondo), recortado y redimensionado por scripts/brand/render-brand.mjs a public/brand/
 * panda-mark-{128,384}.png. Es el archivo tal cual (no un trazado): conserva toda su calidad.
 * En oscuro, un halo de 1px en tinta clara separa el azul carbón de las orejas y los brazos de la obsidiana.
 *
 * Caja cuadrada de `size` px (o la que fije className) con la mascota centrada (object-contain), igual que
 * el vector anterior. Decorativo por defecto (alt="" y aria-hidden): quien lo usa ya dice "PandaJr" en
 * texto. Con `title`, es una imagen con ese nombre.
 */
export const PANDA_MARK_SRC = "/brand/panda-mark-384.png";
const SRC_SET = "/brand/panda-mark-128.png 106w, /brand/panda-mark-384.png 318w";

export function PandaMark({ size = 34, className, title }: { size?: number; className?: string; title?: string }) {
  const labelled = !!title;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo estático de public/ (srcset propio); next/image no aporta aquí
    <img
      src="/brand/panda-mark-128.png"
      srcSet={SRC_SET}
      sizes={`${size}px`}
      width={size}
      height={size}
      alt={labelled ? title : ""}
      aria-hidden={labelled ? undefined : true}
      decoding="async"
      draggable={false}
      className={`object-contain select-none dark:[filter:drop-shadow(0_0_1px_rgb(234_230_225/0.45))] ${className ?? ""}`}
    />
  );
}
