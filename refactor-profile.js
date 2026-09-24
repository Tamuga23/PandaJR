const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

const profileModalRegex = /function ProfileModal\(\{[\s\S]*?return \(\s*<div\s*role="dialog"[\s\S]*?<\/div>\s*\);\s*\}/m;

const newProfileModal = `function ProfileModal({ 
  profile, 
  onSave, 
  onClose,
  isDark,
  toggleTheme
}: { 
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onClose: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}) {
  const [form, setForm] = useState(profile);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200/80 dark:border-white/[0.08] flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-stone-50 dark:bg-[#1a1724] p-4 flex justify-between items-center border-b border-stone-100 dark:border-white/[0.04]">
          <h3 id="profile-modal-title" className="font-bold text-stone-800 dark:text-[#eae6e1] flex items-center gap-2">
            <Settings size={18} className="text-stone-500" /> Ajustes
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-stone-400 hover:text-stone-800 dark:hover:text-[#eae6e1] bg-white dark:bg-[#2d273a] shadow-sm transition-colors" 
            aria-label="Cerrar ventana de ajustes"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          
          {/* Vínculo Familiar */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-400 dark:text-[#a6a1b2] uppercase tracking-wider">Familia</h4>
            <div className="bg-stone-50 dark:bg-[#1a1724] border border-stone-200 dark:border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={\`p-2 rounded-xl \${form.role === 'mama' ? 'bg-terracotta/10 text-terracotta' : 'bg-sage/10 text-sage'}\`}>
                  {form.role === 'mama' ? <Baby size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <p className="font-bold text-stone-800 dark:text-[#eae6e1] text-sm">
                    {form.role === 'mama' ? 'Modo Mamá' : 'Modo Copiloto'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">{form.name}</p>
                </div>
              </div>
              <button className="text-xs font-bold text-stone-500 bg-white dark:bg-[#2d273a] border border-stone-200 dark:border-white/[0.06] px-3 py-1.5 rounded-lg shadow-sm">
                Desvincular
              </button>
            </div>
            {form.role === 'mama' && (
              <div className="bg-stone-900 dark:bg-[#2d273a] text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-0.5">Código de Pareja</p>
                  <p className="font-mono font-bold tracking-widest text-lg">PANDA-7284</p>
                </div>
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                  <ClipboardList size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Preferencias Médicas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-400 dark:text-[#a6a1b2] uppercase tracking-wider">Gestación & Detalles</h4>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-stone-700 dark:text-[#eae6e1]">Semana {form.week}</label>
                <span className="text-xs text-stone-500">Actualizar</span>
              </div>
              <input 
                type="range" min="1" max="40" 
                value={form.week} onChange={(e) => setForm({...form, week: parseInt(e.target.value)})}
                className="w-full accent-terracotta"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-stone-700 dark:text-[#eae6e1] block mb-1">Ciudad o País</label>
              <input 
                type="text" 
                value={form.location || ""} 
                onChange={(e) => setForm({...form, location: e.target.value})}
                placeholder="Para recomendaciones locales"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-stone-700 dark:text-[#eae6e1] block mb-1">Notas de rutina</label>
              <textarea 
                value={form.notes || ""} 
                onChange={(e) => setForm({...form, notes: e.target.value})}
                placeholder="Ej. Trabajo en turnos, parto programado..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-sm resize-none"
              />
            </div>
          </div>

          {/* Modo Oscuro Toggle */}
          <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#1a1724] rounded-2xl border border-stone-200/80 dark:border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="bg-stone-200 dark:bg-[#2d273a] p-2 rounded-xl text-stone-600 dark:text-[#a6a1b2]">
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-stone-800 dark:text-[#eae6e1]">Modo Oscuro</p>
                <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Ideal para la noche</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={toggleTheme}
              className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${isDark ? 'bg-terracotta' : 'bg-stone-300'}\`}
            >
              <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${isDark ? 'translate-x-6' : 'translate-x-1'}\`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 dark:border-white/[0.04] bg-white dark:bg-[#221d2d]">
          <button
            type="button"
            onClick={() => onSave(form)}
            className="w-full min-h-[44px] bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3 text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}`;

content = content.replace(profileModalRegex, newProfileModal);
fs.writeFileSync(target, content, 'utf-8');
console.log('ProfileModal redesigned to Settings successfully');
