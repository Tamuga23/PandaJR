const fs = require('fs');
const path = require('path');

const targetStore = path.join(__dirname, 'src', 'store', 'usePandaStore.ts');
let storeContent = fs.readFileSync(targetStore, 'utf-8');

if (!storeContent.includes('inviteCode?: string')) {
  storeContent = storeContent.replace(
    /pregnancyId\?: string;/g,
    'pregnancyId?: string;\n  inviteCode?: string;'
  );
  fs.writeFileSync(targetStore, storeContent, 'utf-8');
}

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

// Update UserProfile interface in page.tsx
if (!pageContent.includes('inviteCode?: string;')) {
  pageContent = pageContent.replace(
    /pregnancyId\?: string;/g,
    'pregnancyId?: string;\n  inviteCode?: string;'
  );
}

// Update OnboardingModal to pass inviteCode
pageContent = pageContent.replace(
  /onComplete\(\{ role: "mama", name, week, location: "", notes: "", pregnancyId: tempPregnancyId \}\);/g,
  'onComplete({ role: "mama", name, week, location: "", notes: "", pregnancyId: tempPregnancyId, inviteCode: generatedCode });'
);

// Update ProfileModal to show actual code
// <p className="font-mono font-bold text-white tracking-widest text-lg">PANDA-7284</p>
const hardcodedCode = /<p className="font-mono font-bold text-white tracking-widest text-lg">PANDA-7284<\/p>/g;
pageContent = pageContent.replace(
  hardcodedCode,
  '<p className="font-mono font-bold text-white tracking-widest text-lg">{form.inviteCode || "PANDA-----"}</p>'
);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Fixed hardcoded invite code');
