const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

// The original HerramientasView is:
// function HerramientasView({ showToast, profile }: { showToast: any, profile?: UserProfile }) {
// ...
// return ( ... )
// }

const newHerramientasView = `
function HerramientasView({ showToast, profile }: { showToast: any, profile?: UserProfile }) {
  const [activeTool, setActiveTool] = useState<any>(null);

  const tools = [
    { id: "sos", label: "SOS Mamá", icon: <HeartPulse size={24} />, desc: "Síntomas de alarma", color: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400", border: "border-rose-100 dark:border-rose-500/20" },
    { id: "contracciones", label: "Contracciones", icon: <Activity size={24} />, desc: "Contador 5-1-1", color: "bg-terracotta/10 text-terracotta", border: "border-terracotta/20" },
    { id: "patadas", label: "Patadas", icon: <Baby size={24} />, desc: "Monitor Cardiff", color: "bg-sage/10 text-sage", border: "border-sage/20" },
    { id: "diario", label: "Diario", icon: <FileText size={24} />, desc: "Memorias del bebé", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-500/20" },
    { id: "maleta", label: "Maleta", icon: <Package size={24} />, desc: "Hospital Go-Bag", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", border: "border-amber-100 dark:border-amber-500/20" },
    { id: "nombres", label: "Nombres", icon: <Users size={24} />, desc: "Votador en pareja", color: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400", border: "border-sky-100 dark:border-sky-500/20" },
    { id: "parto", label: "Plan de Parto", icon: <ClipboardList size={24} />, desc: "PDF Clínico", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-500/20" },
  ];

  if (activeTool) {
    const tool = tools.find(t => t.id === activeTool);
    return (
      <div className="flex flex-col h-full w-full bg-stone-50 dark:bg-[#120f18] animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#181520]/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-stone-200 dark:border-white/5">
          <button onClick={() => setActiveTool(null)} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-lg text-stone-800 dark:text-white leading-tight">{tool?.label}</h2>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-[#a6a1b2] font-bold">{tool?.desc}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTool === 'diario' && profile && <DiarioView profile={profile} onClose={() => setActiveTool(null)} />}
          {activeTool === 'maleta' && profile && <MaletaView profile={profile} onClose={() => setActiveTool(null)} />}
          {activeTool === 'sos' && <SOSSintomas />}
          {activeTool === 'patadas' && <ContadorPatadas showToast={showToast} />}
          {activeTool === 'contracciones' && <ContadorContracciones showToast={showToast} />}
          {activeTool === 'nombres' && <VotadorNombres showToast={showToast} />}
          {activeTool === 'parto' && <PlanParto profile={profile} showToast={showToast} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-stone-50 dark:bg-[#120f18] p-5 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-black text-stone-800 dark:text-white tracking-tight leading-none mb-1">
          Herramientas
        </h1>
        <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Todo lo que necesitas a un toque de distancia.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-20">
        {/* SOS takes full width */}
        <button 
          onClick={() => setActiveTool('sos')}
          className="col-span-2 bg-rose-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-rose-600/50 hover:bg-rose-600 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <HeartPulse size={28} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg leading-tight">SOS Síntomas</h3>
              <p className="text-rose-100 text-xs">Cuándo ir a urgencias</p>
            </div>
          </div>
          <ChevronRight size={24} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        {/* Other tools */}
        {tools.filter(t => t.id !== 'sos').map(tool => (
          <button 
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={\`bg-white dark:bg-[#181520] rounded-2xl p-4 flex flex-col gap-3 shadow-sm border border-stone-200/60 dark:border-white/[0.04] hover:border-stone-300 dark:hover:border-white/10 hover:shadow-md transition-all text-left group\`}
          >
            <div className={\`w-12 h-12 rounded-2xl \${tool.color} border \${tool.border} flex items-center justify-center group-hover:scale-105 transition-transform\`}>
              {tool.icon}
            </div>
            <div>
              <h3 className="font-bold text-stone-800 dark:text-white text-sm">{tool.label}</h3>
              <p className="text-[11px] text-stone-500 dark:text-[#a6a1b2] font-medium leading-tight mt-0.5">{tool.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
`;

pageContent = pageContent.replace(/function HerramientasView\(\{[\s\S]*?(?=interface KickRecord)/, newHerramientasView + '\n\n');

// Also need to remove the top bar from DiarioView and MaletaView because we now render a unified one!
pageContent = pageContent.replace(
  /<div className="sticky top-0 z-10 bg-white\/80 dark:bg-black\/80 backdrop-blur-md border-b border-stone-200 dark:border-white\/10 px-4 py-4 flex items-center gap-3">[\s\S]*?<\/div>\s*<div className="p-4 max-w-lg mx-auto">/g,
  '<div className="p-4 max-w-lg mx-auto">'
);

pageContent = pageContent.replace(
  /<div className="sticky top-0 z-10 bg-white\/80 dark:bg-black\/80 backdrop-blur-md border-b border-stone-200 dark:border-white\/10 px-4 py-4 flex items-center gap-3">[\s\S]*?<\/div>\s*<div className="p-4 max-w-lg mx-auto space-y-6 pb-20">/g,
  '<div className="p-4 max-w-lg mx-auto space-y-6 pb-20">'
);

// Actually, wait! DiarioView and MaletaView use `fixed inset-0` which makes them full screen!
// If they are full screen, the outer HerramientasView header will be COVERED.
// So we should remove `fixed inset-0 z-50 bg-stone-50 dark:bg-black overflow-y-auto animate-in slide-in-from-bottom-4` from DiarioView and MaletaView!
pageContent = pageContent.replace(
  /className="fixed inset-0 z-50 bg-stone-50 dark:bg-black overflow-y-auto animate-in slide-in-from-bottom-4"/g,
  'className="w-full"'
);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Redesigned HerramientasView grid');
