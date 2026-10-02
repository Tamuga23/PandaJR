// Composición de src/app/opengraph-image.png y twitter-image.png (1200×630). Procedencia: DESIGN.md §4.2.
// Cómo se regenera: copiar este archivo a src/app/brand-og/page.tsx, abrir /brand-og en Chrome a 1200×630
// (dpr 1, tema claro), capturar la ventana y borrar la ruta. Usa los componentes reales (PandaMark,
// GrowingPlant) y las fuentes de la app (Alegreya / Alegreya Sans vía next/font), en los tokens claros.
import { GrowingPlant } from "@/components/GrowingPlant";
import { PandaMark } from "@/components/PandaMark";

const WEEKS = [8, 20, 32, 40] as const;
const SIZES = [84, 114, 152, 196] as const;

export default function BrandOgImage() {
  return (
    <div className="fixed inset-0 z-50 flex h-[630px] w-[1200px] items-center overflow-hidden bg-ground text-ink">
      <div className="flex w-[640px] shrink-0 flex-col ps-[88px]">
        <div className="flex items-center gap-5">
          <PandaMark size={124} />
          <p className="font-display text-[96px] leading-none font-extrabold tracking-[-0.01em] text-ink">
            Panda<span className="text-terracotta-ink">Jr</span>
          </p>
        </div>
        <p className="mt-10 font-display text-[46px] leading-[1.12] font-bold text-ink">El embarazo en pareja, semana a semana</p>
        <p className="mt-5 max-w-[30rem] text-[26px] leading-[1.35] text-ink-muted">
          Tareas compartidas, citas con el obstetra y a quién llamar si algo es urgente.
        </p>
      </div>
      {/* La firma: la planta que crece contigo, de la semana 8 a la 40, sobre una misma línea de tierra. */}
      <div className="relative flex h-full flex-1 items-end justify-center -space-x-3 pe-14 pb-[132px]">
        <span aria-hidden="true" className="absolute right-14 bottom-[131px] left-2 h-px bg-line-strong" />
        {WEEKS.map((w, i) => {
          const size = SIZES[i];
          // La tierra de GrowingPlant está a 100/120 del lado: se baja cada planta para que todas pisen la línea.
          return (
            <span key={w} className="relative block" style={{ marginBottom: -Math.round((size * 20) / 120) }}>
              <GrowingPlant week={w} size={size} animate={false} title="" className="block" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
