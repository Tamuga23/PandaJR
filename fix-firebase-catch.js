const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'lib', 'firebase', 'pairing.ts');
let content = fs.readFileSync(target, 'utf-8');

// Remove console.error from joinPregnancyAsDad
const oldCatch = /catch \(error\) \{\s*console\.error\("Error joining pregnancy:", error\);\s*throw error;\s*\}/;
const newCatch = `catch (error) {
    throw error;
  }`;

content = content.replace(oldCatch, newCatch);

fs.writeFileSync(target, content, 'utf-8');
console.log('Fixed console.error');
