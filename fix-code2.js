const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

pageContent = pageContent.replace(
  /<p className="font-mono font-bold tracking-widest text-lg">PANDA-7284<\/p>/g,
  '<p className="font-mono font-bold tracking-widest text-lg">{form.inviteCode || "PANDA-----"}</p>'
);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Fixed second hardcoded code');
