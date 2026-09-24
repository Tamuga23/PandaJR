const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// 1. Remove Dark Mode Toggle from Header
const darkModeToggleRegex = /\{\/\* Switch Ergonmico de Modo Oscuro \/ Claro \*\/\}\s*<button[\s\S]*?<\/button>/m;
content = content.replace(darkModeToggleRegex, '');
// Handle different encoding cases
const darkModeToggleRegex2 = /\{\/\* Switch Ergon.mico de Modo Oscuro \/ Claro \*\/\}\s*<button[\s\S]*?<\/button>/m;
content = content.replace(darkModeToggleRegex2, '');
const darkModeToggleFallback = /<button\s*type="button"\s*role="switch"[\s\S]*?<\/button>/m;
content = content.replace(darkModeToggleFallback, '');

// 2. Add isDark and toggleTheme to ProfileModal props
const profileModalRegex = /function ProfileModal\(\{\s*profile,\s*onSave,\s*onClose\s*\}\:\s*\{[\s\S]*?\}\) \{/m;
const newProfileModalProps = `function ProfileModal({ 
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
}) {`;
content = content.replace(profileModalRegex, newProfileModalProps);

// 3. Add Dark Mode Toggle UI to ProfileModal just before the Save Button
const saveButtonRegex = /<button\s*type="button"\s*onClick=\{\(\) => onSave\(form\)\}/m;
const newDarkModeUI = `
          {/* Modo Oscuro Toggle */}
          <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#1a1724] rounded-2xl border border-stone-200/80 dark:border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="bg-stone-200 dark:bg-[#2d273a] p-2 rounded-xl text-stone-600 dark:text-[#a6a1b2]">
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-stone-800 dark:text-[#eae6e1]">Modo Oscuro</p>
                <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Reduce el brillo de la pantalla</p>
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

          <button
            type="button"
            onClick={() => onSave(form)}`;
content = content.replace(saveButtonRegex, newDarkModeUI);

// 4. Update ProfileModal usages to pass the new props
const modalUsageRegex = /<ProfileModal \s*profile=\{profile\}\s*onSave=\{updateProfile\}\s*onClose=\{\(\) => setShowProfileModal\(false\)\}\s*\/>/m;
const newModalUsage = `<ProfileModal 
          profile={profile} 
          onSave={updateProfile} 
          onClose={() => setShowProfileModal(false)}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />`;
content = content.replace(modalUsageRegex, newModalUsage);

fs.writeFileSync(target, content, 'utf-8');
console.log('Header and ProfileModal refactored successfully');
