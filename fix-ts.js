const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

const regex = /<ProfileModal\s+profile=\{profile\}\s+onSave=\{\(newProfile\) => \{\s+updateProfile\(newProfile\);\s+showToast\("Perfil actualizado en este dispositivo", \(\) => \{\}\);\s+setIsProfileModalOpen\(false\);\s+\}\}\s+onClose=\{\(\) => setIsProfileModalOpen\(false\)\}\s+\/>/m;

const replacement = `<ProfileModal
          profile={profile}
          onSave={(newProfile) => {
            updateProfile(newProfile);
            showToast("Perfil actualizado en este dispositivo", () => {});
            setIsProfileModalOpen(false);
          }}
          onClose={() => setIsProfileModalOpen(false)}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />`;

content = content.replace(regex, replacement);
fs.writeFileSync(target, content, 'utf-8');
console.log('Fixed ProfileModal usage');
