import PANDA from "./panda-paths.json";

/**
 * PandaMark — la mascota (mamá panda con su bebé) como vector en la paleta, sin azulejo: se apoya
 * directamente sobre el suelo (alabastro #faf9f5 / obsidiana #181520).
 *
 * Procedencia (DESIGN.md §4.2): trazado de la mascota original (git 2bf0815:src/app/icon.jpg) con
 * scripts/brand/render-brand.mjs → panda-paths.json. Capas: pelaje, cabeza del bebé, sombra del pecho y
 * manchas; colores = tokens --panda-* de globals.css (claro: contorno de tinta de 1.25px para separar el
 * pelaje del alabastro; oscuro: sin contorno, el pelaje se recorta solo contra la obsidiana).
 *
 * Decorativo por defecto (aria-hidden): quien lo usa ya dice "PandaJR" en texto. Con `title`, role="img".
 */
export function PandaMark({ size = 34, className, title }: { size?: number; className?: string; title?: string }) {
  const labelled = !!title;
  return (
    <svg
      viewBox={PANDA.viewBox}
      width={size}
      height={size}
      className={className}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      <path d={PANDA.fur} fill="var(--panda-fur)" />
      <path d={PANDA.baby} fill="var(--panda-baby)" />
      <path d={PANDA.shade} fill="var(--panda-shade)" />
      <path d={PANDA.patches} fill="var(--panda-patch)" fillRule="evenodd" />
      <path
        d={PANDA.fur}
        fill="none"
        stroke="var(--panda-line)"
        strokeWidth={1.25}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
