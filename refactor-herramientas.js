const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

const herramientasViewRegex = /function HerramientasView.*?return \([\s\S]*?\}\);?\s*\n\}/m;

const newHerramientasView = `function HerramientasView({ showToast, profile }: { showToast: any, profile?: UserProfile }) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  if (activeTool) {
    return (
      <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white dark:bg-[#181520] px-4 py-3 shadow-xs border-b border-stone-200/80 dark:border-white/[0.08] sticky top-0 z-10 w-full flex items-center gap-3">
          <button 
            onClick={() => setActiveTool(null)}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-[#221d2d] transition-colors"
          >
            <ArrowLeft size={20} className="text-stone-600 dark:text-[#a6a1b2]" />
          </button>
          <h2 className="font-bold text-stone-800 dark:text-[#eae6e1]">
            {activeTool === "sos" && "SOS Síntomas"}
            {activeTool === "patadas" && "Monitor de Patadas"}
            {activeTool === "contracciones" && "Monitor de Contracciones"}
            {activeTool === "nombres" && "Votador de Nombres"}
            {activeTool === "parto" && "Plan y Maleta de Parto"}
          </h2>
        </div>
        <div className="p-0 sm:p-5 flex-1 overflow-y-auto w-full">
          {activeTool === "sos" && <SOSSintomas />}
          {activeTool === "patadas" && <ContadorPatadas showToast={showToast} />}
          {activeTool === "contracciones" && <ContadorContracciones showToast={showToast} />}
          {activeTool === "nombres" && <VotadorNombres showToast={showToast} />}
          {activeTool === "parto" && <PlanParto profile={profile} showToast={showToast} />}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 flex-1 overflow-y-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
      <h2 className="text-xl font-bold text-stone-800 dark:text-[#eae6e1] mb-2 flex items-center gap-2">
        <Heart size={20} className="text-terracotta" />
        Cuidado Compartido
      </h2>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Card: Pataditas */}
        <button onClick={() => setActiveTool("patadas")} className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 border border-stone-200/80 dark:border-white/[0.08] flex flex-col items-start text-left transition-all hover:scale-[1.02] active:scale-95 shadow-sm">
          <div className="bg-sage/10 text-sage dark:bg-sage/20 dark:text-sage-hover px-2 py-1 rounded-md text-[10px] font-bold mb-3 flex items-center gap-1">
            <CheckCircle2 size={12} /> 10 / 10 ¡Completado!
          </div>
          <h3 className="font-bold text-stone-800 dark:text-[#eae6e1] mb-1">Pataditas</h3>
          <p className="text-[11px] text-stone-500 dark:text-[#a6a1b2] mb-4 flex-1">Última reg. hace 12 min</p>
          <span className="text-terracotta text-xs font-bold w-full border border-terracotta/20 rounded-xl py-1.5 text-center">Abrir monitor</span>
        </button>

        {/* Card: Maleta/Parto */}
        <button onClick={() => setActiveTool("parto")} className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 border border-stone-200/80 dark:border-white/[0.08] flex flex-col items-start text-left transition-all hover:scale-[1.02] active:scale-95 shadow-sm">
          <div className="bg-sage/10 text-sage dark:bg-sage/20 dark:text-sage-hover px-2 py-1 rounded-md text-[10px] font-bold mb-3 flex items-center gap-1">
            <CheckCircle2 size={12} /> 65% Lista
          </div>
          <h3 className="font-bold text-stone-800 dark:text-[#eae6e1] mb-1">Maleta de Parto</h3>
          <p className="text-[11px] text-stone-500 dark:text-[#a6a1b2] mb-2">16 listas de 24</p>
          <div className="w-full h-1.5 bg-stone-100 dark:bg-[#2d273a] rounded-full mb-3 overflow-hidden">
            <div className="h-full bg-sage w-[65%] rounded-full"></div>
          </div>
          <span className="text-stone-600 dark:text-[#eae6e1] bg-stone-50 dark:bg-[#1a1724] text-xs font-bold w-full rounded-xl py-1.5 text-center">Seguir sumando</span>
        </button>

        {/* Card: Nombres */}
        <button onClick={() => setActiveTool("nombres")} className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 border border-stone-200/80 dark:border-white/[0.08] flex flex-col items-start text-left transition-all hover:scale-[1.02] active:scale-95 shadow-sm">
          <div className="bg-terracotta/10 text-terracotta dark:bg-terracotta/20 dark:text-terracotta-hover px-2 py-1 rounded-md text-[10px] font-bold mb-3 flex items-center gap-1">
            <Heart size={12} /> ¡Match encontrado!
          </div>
          <h3 className="font-bold text-stone-800 dark:text-[#eae6e1] mb-1">Nombres</h3>
          <p className="text-[11px] text-stone-500 dark:text-[#a6a1b2] mb-4 flex-1">Ambos amáis: Mateo 💛</p>
          <span className="text-stone-600 dark:text-[#eae6e1] bg-stone-50 dark:bg-[#1a1724] text-xs font-bold w-full rounded-xl py-1.5 text-center">Ver top parejas</span>
        </button>

        {/* Card: Contracciones */}
        <button onClick={() => setActiveTool("contracciones")} className="bg-white dark:bg-[#221d2d] rounded-3xl p-4 border border-stone-200/80 dark:border-white/[0.08] flex flex-col items-start text-left transition-all hover:scale-[1.02] active:scale-95 shadow-sm">
          <div className="bg-stone-100 text-stone-500 dark:bg-[#2d273a] dark:text-[#a6a1b2] px-2 py-1 rounded-md text-[10px] font-bold mb-3 flex items-center gap-1">
            <Activity size={12} /> En calma
          </div>
          <h3 className="font-bold text-stone-800 dark:text-[#eae6e1] mb-1">Contracciones</h3>
          <p className="text-[11px] text-stone-500 dark:text-[#a6a1b2] mb-4 flex-1">Listo por si acaso</p>
          <span className="text-stone-600 dark:text-[#eae6e1] bg-stone-50 dark:bg-[#1a1724] text-xs font-bold w-full rounded-xl py-1.5 text-center">Abrir monitor</span>
        </button>
      </div>

      {/* SOS Banner */}
      <button onClick={() => setActiveTool("sos")} className="w-full bg-rose-50 dark:bg-[#2a1b1b] border border-rose-200 dark:border-rose-900/30 rounded-3xl p-4 flex items-center gap-4 transition-all hover:scale-[1.01] active:scale-95 shadow-sm mt-2">
        <div className="bg-rose-100 dark:bg-rose-900/40 p-3 rounded-full shrink-0">
          <HeartPulse size={24} className="text-rose-600 dark:text-rose-400" />
        </div>
        <div className="text-left flex-1">
          <h3 className="font-bold text-rose-800 dark:text-rose-300">SOS Síntomas</h3>
          <p className="text-[11px] text-rose-600 dark:text-rose-400/80 mt-0.5">Triaje rápido en caso de alerta</p>
        </div>
        <ArrowRight size={20} className="text-rose-400 shrink-0" />
      </button>
    </div>
  );
}`;

content = content.replace(herramientasViewRegex, newHerramientasView);
fs.writeFileSync(target, content, 'utf-8');
console.log('HerramientasView refactored successfully');
