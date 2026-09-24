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

if (!pageContent.includes('// MomStatus internal sync')) {
  pageContent = pageContent.replace(
    /function MomStatusCard\(\{ profile, updateProfile, showToast \}: \{ profile: UserProfile, updateProfile: any, showToast: any \}\) \{/,
    `function MomStatusCard({ profile, updateProfile, showToast }: { profile: UserProfile, updateProfile: any, showToast: any }) {\n// MomStatus internal sync\n${hookForMomStatus}`
  );
  
  fs.writeFileSync(targetPage, pageContent, 'utf-8');
  console.log('Injected MomStatus sync');
} else {
  console.log('MomStatus sync already injected');
}
