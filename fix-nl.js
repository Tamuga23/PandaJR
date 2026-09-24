const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Fix the \n literal
content = content.replace(/from "react";\\nimport \{ usePandaStore \}/g, 'from "react";\nimport { usePandaStore }');

fs.writeFileSync(target, content, 'utf-8');
