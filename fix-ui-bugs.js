const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// --- FIX 1: P0 (Onboarding Skip) ---
content = content.replace(
  /function OnboardingModal\(\{\s*onComplete\s*\}\s*:\s*\{/,
  'function OnboardingModal({ onComplete, onSkip }: {'
);
content = content.replace(
  /onComplete:\s*\(\w+:\s*Partial<UserProfile>\)\s*=>\s*void;/,
  'onComplete: (profile: Partial<UserProfile>) => void; onSkip?: () => void;'
);

const roleButtonsRegex = /<button\s*onClick=\{\(\) => setRole\("mama"\)\}[\s\S]*?<\/button>\s*<\/div>/m;
const roleButtonsMatch = content.match(roleButtonsRegex);
if (roleButtonsMatch) {
  content = content.replace(
    roleButtonsRegex,
    roleButtonsMatch[0] + "\n\n          {/* Botón de Skip (P0) */}\n          <button \n            onClick={() => onSkip && onSkip()} \n            className=\"w-full mt-4 py-3 min-h-[44px] text-sm font-bold text-stone-400 hover:text-stone-600 dark:text-[#a6a1b2] dark:hover:text-white transition-colors\"\n          >\n            Explorar como invitado por ahora\n          </button>"
  );
}

content = content.replace(
  /<OnboardingModal\s*onComplete=\{\(newProfile\) => \{[\s\S]*?\}\}\s*\/>/m,
  "<OnboardingModal \n          onComplete={(newProfile) => {\n            setProfile(newProfile);\n            setShowOnboarding(false);\n          }}\n          onSkip={() => {\n            setProfile({ name: 'Invitado', role: 'papa', week: 1 });\n            setShowOnboarding(false);\n          }}\n        />"
);


// --- FIX 2 & 4: P1 & Touch Targets (ProfileModal) ---
content = content.replace(
  /const \[form, setForm\] = useState\(profile\);/m,
  "const [form, setForm] = useState(profile);\n  const [confirmUnlink, setConfirmUnlink] = useState(false);"
);

const unlinkBtnRegex = /<button className="text-xs font-bold text-stone-500 bg-white dark:bg-\[#2d273a\] border border-stone-200 dark:border-white\/\[0\.06\] px-3 py-1\.5 rounded-lg shadow-sm">\s*Desvincular\s*<\/button>/m;
content = content.replace(
  unlinkBtnRegex,
  "<button \n                onClick={() => confirmUnlink ? null : setConfirmUnlink(true)}\n                className={`text-xs font-bold min-h-[44px] min-w-[44px] px-4 rounded-lg shadow-sm transition-colors ${confirmUnlink ? 'bg-rose-500 text-white border-transparent' : 'text-stone-500 bg-white dark:bg-[#2d273a] border border-stone-200 dark:border-white/[0.06]'}`}\n              >\n                {confirmUnlink ? '¿Seguro?' : 'Desvincular'}\n              </button>"
);

content = content.replace(
  /<button className="p-2 bg-white\/10 hover:bg-white\/20 rounded-xl transition-colors">\s*<ClipboardList size=\{18\} \/>\s*<\/button>/m,
  '<button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-colors" aria-label="Copiar código">\n                  <ClipboardList size={18} />\n                </button>'
);

const switchRegex = /<button\s*type="button"\s*role="switch"[\s\S]*?<\/button>/m;
const switchMatch = content.match(switchRegex);
if (switchMatch) {
  content = content.replace(
    switchRegex,
    '<div className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer" onClick={toggleTheme}>\n              <button\n                type="button"\n                role="switch"\n                aria-checked={isDark}\n                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors pointer-events-none ${isDark ? "bg-terracotta" : "bg-stone-300"}`}\n              >\n                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? "translate-x-6" : "translate-x-1"}`} />\n              </button>\n            </div>'
  );
}


// --- FIX 3: P2 (PandaIA Smart Chips) ---
const emptyIaRegex = /\{messages\.length === 0 && \(\s*<div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 space-y-6">\s*<div className="bg-teal-100 dark:bg-\[#2d273a\] p-4 rounded-full shadow-inner">\s*<Bot size=\{40\} className="text-teal-600 dark:text-teal-400" \/>\s*<\/div>\s*<div className="space-y-2 max-w-\[250px\]">\s*<h3 className="font-bold text-stone-800 dark:text-\[#eae6e1\] text-xl tracking-tight">Soy PandaIA<\/h3>\s*<p className="text-sm text-stone-500 dark:text-\[#a6a1b2\] leading-relaxed">\s*Tu asistente perinatal 24\/7\. ¿En qué te ayudo hoy\?\s*<\/p>\s*<\/div>\s*<\/div>\s*\)\}/m;

const newEmptyIa = `{messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 space-y-6">
            <div className="bg-teal-100 dark:bg-[#2d273a] p-4 rounded-full shadow-inner">
              <Bot size={40} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div className="space-y-2 max-w-[250px]">
              <h3 className="font-bold text-stone-800 dark:text-[#eae6e1] text-xl tracking-tight">Soy PandaIA</h3>
              <p className="text-sm text-stone-500 dark:text-[#a6a1b2] leading-relaxed">
                Tu asistente perinatal 24/7. ¿En qué te ayudo hoy?
              </p>
            </div>
            {/* P2: Smart Chips Suggestions */}
            <div className="flex flex-col gap-2 w-full max-w-[300px] mt-2">
              {["¿Qué puedo comer si tengo náuseas?", "Tips para armar la maleta", "¿Cómo ayudar en contracciones?"].map((chip) => (
                <button 
                  key={chip} 
                  onClick={() => setInput(chip)} 
                  className="bg-white dark:bg-[#1a1724] border border-stone-200 dark:border-white/[0.08] text-sm text-stone-600 dark:text-[#a6a1b2] py-3 px-4 rounded-2xl hover:bg-stone-50 dark:hover:bg-[#221d2d] transition-colors shadow-sm text-left flex justify-between items-center w-full group min-h-[44px]"
                >
                  <span>{chip}</span>
                  <ArrowRight size={16} className="text-stone-300 dark:text-stone-600 group-hover:text-teal-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}`;

content = content.replace(emptyIaRegex, newEmptyIa);

fs.writeFileSync(target, content, 'utf-8');
console.log('UI Fixes successfully applied');
