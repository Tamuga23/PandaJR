const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

content = content.replace(
  /onComplete:\s*\(profile:\s*UserProfile\)\s*=>\s*void\s*\}/m,
  'onComplete: (profile: UserProfile) => void; onSkip?: () => void; }'
);

// Wait, looking at the code above:
// `function OnboardingModal({ onComplete, onSkip }: { onComplete: (profile: UserProfile) => void }) {`
// Let's replace the whole signature to be safe.
content = content.replace(
  /function OnboardingModal\(\{\s*onComplete,\s*onSkip\s*\}\s*:\s*\{\s*onComplete:\s*\(profile:\s*UserProfile\)\s*=>\s*void\s*\}\)/m,
  'function OnboardingModal({ onComplete, onSkip }: { onComplete: (profile: Partial<UserProfile>) => void; onSkip?: () => void; })'
);

fs.writeFileSync(target, content, 'utf-8');
console.log('Fixed onSkip TS error');
