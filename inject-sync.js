const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Add imports
if (!content.includes('listenToPregnancy')) {
  content = content.replace(
    /import \{ ensureAuth, createPregnancyForMom, joinPregnancyAsDad \} from "@\/lib\/firebase\/pairing";/,
    'import { ensureAuth, createPregnancyForMom, joinPregnancyAsDad, listenToPregnancy, listenToMomStatus, updatePregnancyWeek, saveMomStatus } from "@/lib/firebase/pairing";'
  );
}

// Inject Real-time hooks in PandaJRApp
// Find where PandaJRApp starts and `useEffect(() => { setIsMounted(true) })` is.
const hookInjection = `  // --- Firebase Real-time Sync ---
  const [remoteMomStatus, setRemoteMomStatus] = useState<any>(null);

  useEffect(() => {
    if (profile?.pregnancyId) {
      const unsubPreg = listenToPregnancy(profile.pregnancyId, (data) => {
        if (data.week && data.week !== profile.week) {
          // Sync week to local store
          setProfile({ ...profile, week: data.week });
        }
      });
      const unsubStatus = listenToMomStatus(profile.pregnancyId, (status) => {
        setRemoteMomStatus({
          text: status.statusText,
          emoji: status.emoji,
          lastUpdated: "recién actualizado"
        });
      });
      return () => {
        unsubPreg();
        unsubStatus();
      };
    }
  }, [profile?.pregnancyId, profile?.week]);
  // -------------------------------
`;

if (!content.includes('// --- Firebase Real-time Sync ---')) {
  content = content.replace(
    /const toggleThemeStore = usePandaStore\(\(state\) => state\.toggleTheme\);/g,
    'const toggleThemeStore = usePandaStore((state) => state.toggleTheme);\n' + hookInjection
  );
}

// Update MomStatusCard to use remoteMomStatus
const momStatusRegex = /const \[momStatus, setMomStatus\] = useState\(\{ text: "¡El masaje de pies fue la gloria! Y el bebé no paró de responder a las caricias antes de cenar ✨", emoji: "💖 Muy feliz y relajada", lastUpdated: "hace 40 min por ella" \}\);/g;
const momStatusReplace = `const [localMomStatus, setLocalMomStatus] = useState({ text: "¡El masaje de pies fue la gloria! Y el bebé no paró de responder a las caricias antes de cenar ✨", emoji: "💖 Muy feliz y relajada", lastUpdated: "hace 40 min por ella" });
  const momStatus = remoteMomStatus || localMomStatus;`;

content = content.replace(momStatusRegex, momStatusReplace);

// Hook up updating the week in ProfileModal
const profileWeekRegex = /setWeek\(parseInt\(e\.target\.value\)\)/g;
content = content.replace(profileWeekRegex, `(val) => { const w = parseInt(val); setWeek(w); if (form.pregnancyId) updatePregnancyWeek(form.pregnancyId, w); }`);

// To actually trigger it, in ProfileModal week slider:
content = content.replace(
  /<input type="range" min="1" max="40" value=\{week\} onChange=\{\(e\) => \(val\) => \{ const w = parseInt\(val\); setWeek\(w\); if \(form\.pregnancyId\) updatePregnancyWeek\(form\.pregnancyId, w\); \}\}/g,
  '<input type="range" min="1" max="40" value={week} onChange={(e) => { const w = parseInt(e.target.value); setWeek(w); if (form.pregnancyId) updatePregnancyWeek(form.pregnancyId, w); }}'
);
// Wait, my regex logic is flawed. Let's do a safer replace for ProfileModal week:
content = content.replace(
  /onChange=\{\(e\) => setWeek\(parseInt\(e\.target\.value\)\)\}/g,
  'onChange={(e) => { const w = parseInt(e.target.value); setWeek(w); if (form.pregnancyId) updatePregnancyWeek(form.pregnancyId, w); }}'
);

// We should also replace the string for Copiloto connection name
content = content.replace(
  /onComplete\(\{ role: "papa", name: "Copiloto", week: 14, location: "", notes: "", pregnancyId \}\);/g,
  'onComplete({ role: "papa", name: "Copiloto de " + babyName, week: week || 14, location: "", notes: "", pregnancyId });'
);

// We need to pass `week` from `joinPregnancyAsDad` result in OnboardingModal
content = content.replace(
  /const \{ pregnancyId, babyName \} = await joinPregnancyAsDad\(uid, code\);/g,
  'const { pregnancyId, babyName, week } = await joinPregnancyAsDad(uid, code);'
);

fs.writeFileSync(target, content, 'utf-8');
console.log('Real-time sync injected');
