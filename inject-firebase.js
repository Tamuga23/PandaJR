const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// 1. Add firebase imports
if (!content.includes('import { ensureAuth')) {
  content = content.replace(
    /import \{ usePandaStore \} from "@\/store\/usePandaStore";/,
    'import { usePandaStore } from "@/store/usePandaStore";\nimport { ensureAuth, createPregnancyForMom, joinPregnancyAsDad } from "@/lib/firebase/pairing";'
  );
}

// 2. Modify OnboardingModal
const oldHandleNext = /const handleNext = \(\) => \{[\s\S]*?\} else if \(step === 3\) \{\s*onComplete\(\{ role: "mama", name, week, location: "", notes: "" \}\);\s*\}\s*\};\s*return/m;

const newHandleNext = `const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleNext = async () => {
    setErrorMsg("");
    if (step === 1 && role) {
      setStep(2);
    } else if (step === 2) {
      if (role === "mama" && name) {
        setIsLoading(true);
        try {
          const uid = await ensureAuth();
          if (!uid) throw new Error("No auth");
          const { inviteCode, pregnancyId } = await createPregnancyForMom(uid, name);
          setGeneratedCode(inviteCode);
          onComplete({ role: "mama", name, week, location: "", notes: "", pregnancyId }); // update global store but don't close modal yet
          setStep(3); // Show code
        } catch (e) {
          console.error(e);
          setErrorMsg("Error al crear. ¿Activaste Firestore/Auth Anónimo?");
        } finally {
          setIsLoading(false);
        }
      } else if (role === "papa" && code.length > 4) {
        setIsLoading(true);
        try {
          const uid = await ensureAuth();
          if (!uid) throw new Error("No auth");
          const { pregnancyId, babyName } = await joinPregnancyAsDad(uid, code);
          onComplete({ role: "papa", name: "Copiloto de " + babyName, week: 14, location: "", notes: "", pregnancyId });
        } catch (e: any) {
          setErrorMsg(e.message || "Código inválido");
        } finally {
          setIsLoading(false);
        }
      }
    } else if (step === 3) {
      // Mom just views the code, and closes
      onComplete({ role: "mama", name, week, location: "", notes: "" }); // Already updated above, but this triggers close in app if we modify the logic
    }
  };

  return`;

content = content.replace(oldHandleNext, newHandleNext);

// 3. To make step 3 actually close, wait, the App logic is:
/*
  onComplete={(newProfile) => {
    setProfile(newProfile);
    setShowOnboarding(false);
  }}
*/
// If I call onComplete in step 2 (for mama), it will close the modal BEFORE she sees the code!
// So for mama, step 2 should JUST save to firebase, and setGeneratedCode, and step 3 should call onComplete!
// Let me fix that regex logic.
const fixedHandleNext = `const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tempPregnancyId, setTempPregnancyId] = useState("");

  const handleNext = async () => {
    setErrorMsg("");
    if (step === 1 && role) {
      setStep(2);
    } else if (step === 2) {
      if (role === "mama" && name) {
        setIsLoading(true);
        try {
          const uid = await ensureAuth();
          if (!uid) throw new Error("No auth");
          const { inviteCode, pregnancyId } = await createPregnancyForMom(uid, name);
          setGeneratedCode(inviteCode);
          setTempPregnancyId(pregnancyId);
          setStep(3); // Show code
        } catch (e) {
          console.error(e);
          setErrorMsg("Error al crear. Asegúrate de habilitar Firestore y Auth Anónimo.");
        } finally {
          setIsLoading(false);
        }
      } else if (role === "papa" && code.length > 4) {
        setIsLoading(true);
        try {
          const uid = await ensureAuth();
          if (!uid) throw new Error("No auth");
          const { pregnancyId, babyName } = await joinPregnancyAsDad(uid, code);
          onComplete({ role: "papa", name: "Copiloto", week: 14, location: "", notes: "", pregnancyId });
        } catch (e: any) {
          setErrorMsg(e.message || "Código inválido");
        } finally {
          setIsLoading(false);
        }
      }
    } else if (step === 3) {
      onComplete({ role: "mama", name, week, location: "", notes: "", pregnancyId: tempPregnancyId });
    }
  };

  return`;

content = content.replace(newHandleNext, fixedHandleNext); // In case it matched, else replace the original
content = content.replace(oldHandleNext, fixedHandleNext); // Standard replace

// 4. Add error message to step 2 rendering
const step2Regex = /<div className="space-y-4 text-left">/g;
content = content.replace(step2Regex, '{errorMsg && <div className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900">{errorMsg}</div>}\n              <div className="space-y-4 text-left">');

// 5. Change "Continuar" button to show loading
const continueBtnRegex = /Continuar\s*<\/button>/m;
content = content.replace(continueBtnRegex, '{isLoading ? "Conectando..." : "Continuar"}\n              </button>');

fs.writeFileSync(target, content, 'utf-8');
console.log('Firebase integration injected');
