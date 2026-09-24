const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// 1. Define the OnboardingModal component just before PandaJRApp
const onboardingModalCode = `
function OnboardingModal({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"mama" | "papa" | null>(null);
  const [name, setName] = useState("");
  const [week, setWeek] = useState(14);
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const handleNext = () => {
    if (step === 1 && role) {
      setStep(2);
      if (role === "mama") {
        setGeneratedCode('PANDA-' + Math.random().toString(36).substring(2, 6).toUpperCase());
      }
    } else if (step === 2) {
      if (role === "mama" && name) {
        setStep(3); // Show code
      } else if (role === "papa" && code.length > 4) {
        // Mock successful pairing
        onComplete({ role: "papa", name: "Copiloto", week: 14, location: "", notes: "" });
      }
    } else if (step === 3) {
      onComplete({ role: "mama", name, week, location: "", notes: "" });
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-50 dark:bg-[#181520] z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#221d2d] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-500 border border-stone-200/80 dark:border-white/[0.08] p-6 text-center">
        
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-terracotta/10 dark:bg-terracotta/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <Heart className="text-terracotta" size={32} />
            </div>
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Bienvenido a PandaJR</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">¿Quién eres en esta hermosa aventura?</p>
            
            <div className="space-y-3 mt-4">
              <button 
                onClick={() => setRole("mama")}
                className={\`w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 \${role === "mama" ? "border-terracotta bg-terracotta/5" : "border-stone-100 dark:border-white/[0.06] hover:border-stone-300 dark:hover:border-white/[0.12]"}\`}
              >
                <Baby size={28} className={role === "mama" ? "text-terracotta" : "text-stone-400"} />
                <span className={\`font-bold \${role === "mama" ? "text-terracotta" : "text-stone-600 dark:text-[#a6a1b2]"}\`}>Soy la futura mamá</span>
              </button>
              <button 
                onClick={() => setRole("papa")}
                className={\`w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 \${role === "papa" ? "border-sage bg-sage/5" : "border-stone-100 dark:border-white/[0.06] hover:border-stone-300 dark:hover:border-white/[0.12]"}\`}
              >
                <Users size={28} className={role === "papa" ? "text-sage" : "text-stone-400"} />
                <span className={\`font-bold \${role === "papa" ? "text-sage" : "text-stone-600 dark:text-[#a6a1b2]"}\`}>Soy el copiloto (pareja)</span>
              </button>
            </div>
            <button 
              onClick={handleNext}
              disabled={!role}
              className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all mt-4"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && role === "mama" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Tu perfil</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Configura tu embarazo para personalizar la experiencia.</p>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block">Tu nombre</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Elena"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block">Semana de embarazo ({week})</label>
                <input 
                  type="range" min="1" max="40" 
                  value={week} onChange={(e) => setWeek(parseInt(e.target.value))}
                  className="w-full accent-terracotta"
                />
              </div>
            </div>
            <button 
              onClick={handleNext}
              disabled={!name}
              className="w-full bg-terracotta hover:bg-terracotta-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all"
            >
              Generar mi código
            </button>
          </div>
        )}

        {step === 2 && role === "papa" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">Vincular Cuenta</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Pídele a tu pareja su código de vinculación para compartir el diario.</p>
            
            <div className="pt-4">
              <label className="text-xs font-bold text-stone-600 dark:text-[#a6a1b2] mb-1 block text-left">Código de invitación</label>
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PANDA-XXXX"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-white/[0.1] bg-stone-50 dark:bg-[#1a1724] dark:text-[#eae6e1] text-center font-mono font-bold tracking-widest text-lg uppercase"
              />
            </div>
            <button 
              onClick={handleNext}
              disabled={code.length < 5}
              className="w-full bg-sage hover:bg-sage-hover text-white rounded-xl py-3.5 font-bold disabled:opacity-50 transition-all"
            >
              Conectar
            </button>
          </div>
        )}

        {step === 3 && role === "mama" && (
          <div className="space-y-6">
            <div className="bg-sage/10 dark:bg-sage/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="text-sage" size={32} />
            </div>
            <h2 className="text-2xl font-black text-stone-800 dark:text-[#eae6e1]">¡Todo listo!</h2>
            <p className="text-sm text-stone-500 dark:text-[#a6a1b2]">Comparte este código con tu pareja para que se vincule a tu embarazo.</p>
            
            <div className="bg-stone-50 dark:bg-[#1a1724] p-4 rounded-2xl border border-stone-200 dark:border-white/[0.1]">
              <p className="font-mono text-2xl font-black tracking-widest text-terracotta">{generatedCode}</p>
            </div>
            
            <button 
              onClick={handleNext}
              className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-[#eae6e1] dark:hover:bg-white dark:text-stone-900 text-white rounded-xl py-3.5 font-bold transition-all"
            >
              Entrar al Diario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PandaJRApp`;

content = content.replace(/export default function PandaJRApp/g, onboardingModalCode);

// 2. Add hydration and modal trigger to PandaJRApp
const pandaJRAppRegex = /const \[isProfileModalOpen, setIsProfileModalOpen\] = useState\(false\);/;
const pandaJRAppAdditions = `const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);`;
content = content.replace(pandaJRAppRegex, pandaJRAppAdditions);

// Update the useEffect that loads profile to set hydration and showOnboarding
const profileLoadRegex = /const saved = localStorage\.getItem\("pandajr_user_profile"\);\s*if \(saved\) \{\s*setProfile\(JSON\.parse\(saved\)\);\s*\}/;
const newProfileLoad = `const saved = localStorage.getItem("pandajr_user_profile");
      if (saved && JSON.parse(saved).name) {
        setProfile(JSON.parse(saved));
      } else {
        setShowOnboarding(true);
      }`;
content = content.replace(profileLoadRegex, newProfileLoad);

// Add setIsHydrated(true) right after the catch block of that useEffect
const afterCatchRegex = /\} catch \(e\) \{\s*console\.error\(e\);\s*\}\s*\}, \[\]\);/;
const newAfterCatch = `} catch (e) {
      console.error(e);
      setShowOnboarding(true);
    }
    setIsHydrated(true);
  }, []);`;
content = content.replace(afterCatchRegex, newAfterCatch);

// 3. Render OnboardingModal early if needed
const returnAppRegex = /return \(\s*<div className="flex justify-center bg-stone-50/;
const newReturnApp = `
  if (!isHydrated) return null; // Wait for client hydration

  return (
    <div className="flex justify-center bg-stone-50`;
content = content.replace(returnAppRegex, newReturnApp);

const profileModalGlobalRegex = /\{\/\* Profile Modal Global \*\/\}/;
const modalGlobalNew = `{/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal 
          onComplete={(newProfile) => {
            setProfile(newProfile);
            try { localStorage.setItem("pandajr_user_profile", JSON.stringify(newProfile)); } catch(e) {}
            setShowOnboarding(false);
            showToast(\`¡Bienvenid\${newProfile.role === 'mama' ? 'a' : 'o'} a PandaJR!\`, () => {});
          }} 
        />
      )}
      
      {/* Profile Modal Global */}`;
content = content.replace(profileModalGlobalRegex, modalGlobalNew);

fs.writeFileSync(target, content, 'utf-8');
console.log('Onboarding Modal injected successfully');
