const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

// Find MomStatusCard
const hookForMomStatus = `  useEffect(() => {
    if (profile.pregnancyId) {
      return listenToMomStatus(profile.pregnancyId, (status) => {
        setMomStatus({
          text: status.statusText,
          emoji: status.emoji,
          lastUpdated: "recién actualizado"
        });
      });
    }
  }, [profile.pregnancyId]);`;

if (!pageContent.includes('listenToMomStatus(profile.pregnancyId')) {
  pageContent = pageContent.replace(
    /const \[momStatus, setMomStatus\] = useState\(\{ text: /g,
    hookForMomStatus + '\n  const [momStatus, setMomStatus] = useState({ text: '
  );
  
  fs.writeFileSync(targetPage, pageContent, 'utf-8');
  console.log('Injected MomStatus sync');
} else {
  console.log('MomStatus sync already injected');
}
