const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

pageContent = pageContent.replace(
  /usePandaStore\.getState\(\)\.setProfile\(null\)/g,
  'usePandaStore.getState().setProfile({ name: "", pregnancyId: "", inviteCode: "" } as any)'
);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Fixed setProfile signature');
