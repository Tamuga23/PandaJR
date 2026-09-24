const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

const hookInjection = `  // --- Firebase Real-time Sync ---
  const [remoteMomStatus, setRemoteMomStatus] = useState<any>(null);

  useEffect(() => {
    if (profile?.pregnancyId) {
      const unsubPreg = listenToPregnancy(profile.pregnancyId, (data) => {
        if (data.week && data.week !== profile.week) {
          // Sync week to local store
          setProfile({ week: data.week });
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

if (!pageContent.includes('// --- Firebase Real-time Sync ---')) {
  pageContent = pageContent.replace(
    /const toggleThemeStore = usePandaStore\(state => state\.toggleTheme\);/g,
    'const toggleThemeStore = usePandaStore(state => state.toggleTheme);\n' + hookInjection
  );
  
  fs.writeFileSync(targetPage, pageContent, 'utf-8');
  console.log('Injected missing real-time sync hook');
} else {
  console.log('Already injected');
}
