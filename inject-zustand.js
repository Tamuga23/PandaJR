const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// 1. Add import
if (!content.includes("import { usePandaStore }")) {
  content = content.replace(
    /import React, \{ useState, useEffect, useRef \} from 'react';/,
    "import React, { useState, useEffect, useRef } from 'react';\\nimport { usePandaStore } from '@/store/usePandaStore';"
  );
}

// 2. Locate PandaJRApp component body
const appStartIdx = content.indexOf('export default function PandaJRApp() {');
if (appStartIdx === -1) throw new Error("PandaJRApp not found");

// We want to replace these lines:
/*
  // Perfil global de usuario (compartido en toda la app)
  const [profile, setProfile] = useState<UserProfile>({
    role: "papa",
    name: "",
    week: 14,
    location: "",
    notes: ""
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedPrepEvent, setSelectedPrepEvent] = useState<any | null>(null);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>("");

  // Control de Tema: Modo Oscuro / Claro con persistencia y háptica
  const [isDark, setIsDark] = useState<boolean>(false);
*/

const oldStateRegex = /const \[profile, setProfile\] = useState<UserProfile>\(\{[\s\S]*?\}\);\s*const \[isProfileModalOpen, setIsProfileModalOpen\] = useState\(false\);\s*const \[isHydrated, setIsHydrated\] = useState\(false\);\s*const \[showOnboarding, setShowOnboarding\] = useState\(false\);\s*const \[selectedPrepEvent, setSelectedPrepEvent\] = useState<any \| null>\(null\);\s*const \[aiInitialQuery, setAiInitialQuery\] = useState<string>\(""\);\s*\/\/\s*Control de Tema: Modo Oscuro \/ Claro con persistencia y h(á|a)ptica\s*const \[isDark, setIsDark\] = useState<boolean>\(false\);/m;

const newState = `// Zustand Global Store
  const profile = usePandaStore(state => state.profile);
  const setProfile = usePandaStore(state => state.setProfile);
  const isDark = usePandaStore(state => state.isDark);
  const toggleThemeStore = usePandaStore(state => state.toggleTheme);
  const hasHydrated = usePandaStore(state => state.hasHydrated);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedPrepEvent, setSelectedPrepEvent] = useState<any | null>(null);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>("");`;

content = content.replace(oldStateRegex, newState);

// 3. Remove old toggleTheme function
const oldToggleThemeRegex = /const toggleTheme = \(\) => \{[\s\S]*?\};\n/m;
content = content.replace(oldToggleThemeRegex, `const toggleTheme = () => {
    toggleThemeStore();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };\n`);

// 4. Remove old localStorage reads for profile and theme
// Remove the whole block from "useEffect(() => {" containing "document.documentElement.classList.contains" down to "setIsHydrated(true); }, []);"
// This is tricky. Let's just remove the specific blocks.
const oldThemeUseEffect = /useEffect\(\(\) => \{\s*if \(typeof window !== "undefined"\) \{\s*const isDarkMode = document\.documentElement\.classList\.contains\("dark"\);\s*setIsDark\(isDarkMode\);\s*\}\s*\}, \[\]\);/m;
content = content.replace(oldThemeUseEffect, '');

const oldProfileUseEffect = /\/\/ Cargar perfil global de localStorage\s*useEffect\(\(\) => \{\s*try \{\s*const saved = localStorage\.getItem\("pandajr_user_profile"\);\s*if \(saved && JSON\.parse\(saved\)\.name\) \{\s*setProfile\(JSON\.parse\(saved\)\);\s*\} else \{\s*setShowOnboarding\(true\);\s*\}\s*\} catch \(e\) \{\s*console\.error\(e\);\s*setShowOnboarding\(true\);\s*\}\s*setIsHydrated\(true\);\s*\}, \[\]\);/m;

const newProfileUseEffect = `// Detectar si el usuario necesita Onboarding
  useEffect(() => {
    if (hasHydrated && !profile.name) {
      setShowOnboarding(true);
    }
  }, [hasHydrated, profile.name]);`;

content = content.replace(oldProfileUseEffect, newProfileUseEffect);

// 5. Remove updateProfile function since setProfile from Zustand does partial updates already
const oldUpdateProfile = /const updateProfile = \(updates: Partial<UserProfile>\) => \{[\s\S]*?\}\n\s*\};\n/m;
content = content.replace(oldUpdateProfile, `const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(updates);
  };\n`);

// 6. Fix <ProfileModal> usages
// In the global modal, the onSave prop was:
// onSave={(newProfile) => {
//    updateProfile(newProfile);
//    showToast("Perfil actualizado en este dispositivo", () => {});
//    setIsProfileModalOpen(false);
// }}
// This is already perfectly fine and uses updateProfile.

// 7. Onboarding Modal usage
/*
      {showOnboarding && (
        <OnboardingModal 
          onComplete={(newProfile) => {
            setProfile(newProfile);
            try { localStorage.setItem("pandajr_user_profile", JSON.stringify(newProfile)); } catch(e) {}
            setShowOnboarding(false);
            ...
*/
content = content.replace(
  /setProfile\(newProfile\);\s*try \{ localStorage\.setItem\("pandajr_user_profile", JSON\.stringify\(newProfile\)\); \} catch\(e\) \{\}/g,
  "setProfile(newProfile);"
);

// 8. Wait, isMounted logic
// We added isMounted logic before. We can remove it because Zustand handles hydration!
// Actually, Zustand's hasHydrated does exactly what isMounted did.
const oldIsMounted = /\/\/ Evitar hydration mismatch renderizando solo cuando el cliente monte\s*const \[isMounted, setIsMounted\] = useState\(false\);\s*useEffect\(\(\) => \{\s*setIsMounted\(true\);\s*\}, \[\]\);\s*if \(!isMounted\) return null;/m;
content = content.replace(oldIsMounted, `if (!hasHydrated) return null;`);

// 9. Fix hydration issue with isHydrated var that is no longer there.
// If any other component uses isHydrated, it won't work. But we replaced it with hasHydrated.
content = content.replace(/!isHydrated/g, '!hasHydrated');

fs.writeFileSync(target, content, 'utf-8');
console.log('Zustand successfully integrated');
