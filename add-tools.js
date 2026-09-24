const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

const diarioComponent = `
function DiarioView({ profile, onClose }: { profile: UserProfile, onClose: () => void }) {
  const [entries, setEntries] = React.useState<any[]>([]);
  const [newEntry, setNewEntry] = React.useState("");

  useEffect(() => {
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToJournal }) => {
        return listenToJournal(profile.pregnancyId!, (data) => setEntries(data));
      });
    }
  }, [profile.pregnancyId]);

  const handlePost = async () => {
    if (newEntry.trim() && profile.pregnancyId) {
      const { addJournalEntry } = await import('@/lib/firebase/pairing');
      await addJournalEntry(profile.pregnancyId, profile.role, profile.name, newEntry.trim());
      setNewEntry("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 dark:bg-black overflow-y-auto animate-in slide-in-from-bottom-4">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-stone-200 dark:border-white/10 px-4 py-4 flex items-center gap-3">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-600 dark:text-stone-300">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-bold text-lg text-stone-800 dark:text-white leading-tight">Diario de a Dos 📖</h2>
          <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Memorias sincronizadas para el bebé</p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-white dark:bg-[#181a20] rounded-2xl p-4 shadow-sm border border-stone-200 dark:border-white/[0.05] mb-6">
          <textarea 
            value={newEntry}
            onChange={e => setNewEntry(e.target.value)}
            placeholder="Escribe un recuerdo, un pensamiento o un mensaje para el bebé..."
            className="w-full bg-transparent resize-none h-24 text-stone-800 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none"
          />
          <div className="flex justify-between items-center mt-2 border-t border-stone-100 dark:border-white/5 pt-3">
            <span className="text-xs font-bold text-stone-400 dark:text-stone-500">Publicando como {profile.name}</span>
            <button 
              onClick={handlePost}
              disabled={!newEntry.trim()}
              className="bg-terracotta text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Send size={16} /> Guardar
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mx-auto mb-4 text-sage">
                <FileText size={24} />
              </div>
              <h3 className="font-bold text-stone-800 dark:text-white mb-1">El diario está vacío</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">Escribe el primer recuerdo de este hermoso viaje.</p>
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="bg-white dark:bg-[#181a20] rounded-2xl p-4 shadow-sm border border-stone-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-2 mb-3">
                  <div className={\`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold \${entry.authorRole === 'mama' ? 'bg-terracotta/20 text-terracotta' : 'bg-sage/20 text-sage'}\`}>
                    {entry.authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800 dark:text-white">{entry.authorName}</p>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500">{entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleString() : 'Justo ahora'}</p>
                  </div>
                </div>
                <p className="text-stone-600 dark:text-stone-300 text-sm whitespace-pre-wrap">{entry.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
`;

content = content.replace(/function HerramientasView/, diarioComponent + '\nfunction HerramientasView');

const maletaComponent = `
function MaletaView({ profile, onClose }: { profile: UserProfile, onClose: () => void }) {
  const [bag, setBag] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    if (profile.pregnancyId) {
      import('@/lib/firebase/pairing').then(({ listenToGoBag }) => {
        return listenToGoBag(profile.pregnancyId!, (data) => setBag(data));
      });
    }
  }, [profile.pregnancyId]);

  const toggleItem = async (id: string, checked: boolean) => {
    setBag(prev => ({ ...prev, [id]: !checked })); // optimistic
    if (profile.pregnancyId) {
      const { toggleGoBagItem } = await import('@/lib/firebase/pairing');
      await toggleGoBagItem(profile.pregnancyId, id, !checked);
    }
  };

  const items = {
    mama: [
      { id: 'm1', label: 'Documentos médicos y de identidad' },
      { id: 'm2', label: 'Ropa cómoda y batas (abiertas adelante)' },
      { id: 'm3', label: 'Pantuflas y calcetines gruesos' },
      { id: 'm4', label: 'Artículos de aseo personal' },
      { id: 'm5', label: 'Ropa interior desechable o grande' },
      { id: 'm6', label: 'Ropa para salir del hospital' }
    ],
    bebe: [
      { id: 'b1', label: 'Pañales de recién nacido' },
      { id: 'b2', label: 'Toallitas húmedas' },
      { id: 'b3', label: 'Bodys y pijamas (3-4 mudas)' },
      { id: 'b4', label: 'Manta de algodón o lana' },
      { id: 'b5', label: 'Gorrito y calcetines' },
      { id: 'b6', label: 'Asiento de auto (instalado)' }
    ],
    papa: [
      { id: 'p1', label: 'Snacks y botellas de agua' },
      { id: 'p2', label: 'Cargador de celular (cable largo)' },
      { id: 'p3', label: 'Ropa de cambio cómoda' },
      { id: 'p4', label: 'Artículos de aseo personal' },
      { id: 'p5', label: 'Cámara o espacio en celular' }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 dark:bg-black overflow-y-auto animate-in slide-in-from-bottom-4">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-stone-200 dark:border-white/10 px-4 py-4 flex items-center gap-3">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-600 dark:text-stone-300">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-bold text-lg text-stone-800 dark:text-white leading-tight">Maleta del Hospital 🧳</h2>
          <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Lista sincronizada (Go Bag)</p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6 pb-20">
        
        {Object.entries(items).map(([category, list]) => (
          <div key={category}>
            <h3 className="font-black text-sm text-stone-400 uppercase tracking-wider mb-3">
              {category === 'mama' ? 'Para Mamá' : category === 'bebe' ? 'Para el Bebé' : 'Para Papá / Copiloto'}
            </h3>
            <div className="bg-white dark:bg-[#181a20] rounded-2xl shadow-sm border border-stone-200 dark:border-white/[0.05] overflow-hidden">
              {list.map((item, i) => (
                <div 
                  key={item.id} 
                  onClick={() => toggleItem(item.id, bag[item.id] || false)}
                  className={\`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-white/[0.02] \${i !== list.length - 1 ? 'border-b border-stone-100 dark:border-white/5' : ''}\`}
                >
                  <div className={\`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors \${bag[item.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 dark:border-stone-600'}\`}>
                    {bag[item.id] && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span className={\`text-sm font-medium transition-all \${bag[item.id] ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-700 dark:text-stone-200'}\`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

content = content.replace(/function HerramientasView/, maletaComponent + '\nfunction HerramientasView');

// Fix tools array syntax safely
const fixedToolsArray = `const tools = [
      { id: "sos", label: "SOS Mamá", icon: <HeartPulse size={16} /> },
      { id: "patadas", label: "Patadas", icon: <Baby size={16} /> },
      { id: "contracciones", label: "Contracc.", icon: <Activity size={16} /> },
      { id: "nombres", label: "Nombres", icon: <Users size={16} /> },
      { id: "parto", label: "Parto", icon: <ClipboardList size={16} /> },
      { id: "diario", label: "Diario", icon: <FileText size={16} /> },
      { id: "maleta", label: "Maleta", icon: <Package size={16} /> }
    ];`;
content = content.replace(/const tools = \[\s*\{ id: "sos"[\s\S]*?\];/, fixedToolsArray);

// Fix grid-cols-5
content = content.replace(
  /className="grid grid-cols-5 gap-1 bg-stone-100\/90 dark:bg-\[#221d2d\] p-1 rounded-2xl w-full"/g,
  'className="flex gap-1 bg-stone-100/90 dark:bg-[#221d2d] p-1 rounded-2xl w-full overflow-x-auto snap-x"'
);

content = content.replace(
  /className=\{\`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all \$\{/g,
  'className={`flex-shrink-0 min-w-[70px] snap-center flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${'
);

// Add rendering logic
const newRenderTools = `
          {activeTool === 'diario' && profile && <DiarioView profile={profile} onClose={() => setActiveTool(null)} />}
          {activeTool === 'maleta' && profile && <MaletaView profile={profile} onClose={() => setActiveTool(null)} />}
          <div className={activeTool === "sos" ? "block w-full h-full" : "hidden"}><SOSSintomas /></div>
`;
content = content.replace(
  /<div className=\{activeTool === "sos" \? "block w-full h-full" : "hidden"\}><SOSSintomas \/><\/div>/,
  newRenderTools
);

fs.writeFileSync(target, content, 'utf-8');
console.log('Added tools correctly');
