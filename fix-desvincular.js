const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

// The line is: onClick={() => confirmUnlink ? null : setConfirmUnlink(true)}
// We need to change it so that if confirmUnlink is true, it deletes the profile.

pageContent = pageContent.replace(
  /onClick=\{\(\) => confirmUnlink \? null : setConfirmUnlink\(true\)\}/g,
  'onClick={() => { if (confirmUnlink) { usePandaStore.getState().setProfile(null); onClose(); } else { setConfirmUnlink(true); setTimeout(() => setConfirmUnlink(false), 3000); } }}'
);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Fixed Desvincular action');
