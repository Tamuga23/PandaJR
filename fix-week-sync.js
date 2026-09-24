const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

pageContent = pageContent.replace(
  /const updateProfile = \(updates: Partial<UserProfile>\) => \{\s*setProfile\(updates\);\s*\};/,
  'const updateProfile = (updates: Partial<UserProfile>) => {\n    setProfile(updates);\n    if (updates.pregnancyId && updates.week) {\n      updatePregnancyWeek(updates.pregnancyId, updates.week);\n    }\n  };'
);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Fixed week update sync');
