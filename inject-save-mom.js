const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

pageContent = pageContent.replace(
  /setMomStatus\(\{([^]+?)lastUpdated: "recién actualizado por ella"\s*\}\);/g,
  `setMomStatus({$1lastUpdated: "recién actualizado por ella" }); if (profile.pregnancyId) { saveMomStatus(profile.pregnancyId, '"' + selectedNote + '"', selectedMood); }`
);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Injected saveMomStatus');
