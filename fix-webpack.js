const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'package.json');
let content = JSON.parse(fs.readFileSync(target, 'utf-8'));

content.scripts.dev = "next dev --webpack";
content.scripts.build = "next build --webpack"; // just in case

fs.writeFileSync(target, JSON.stringify(content, null, 2), 'utf-8');
console.log('package.json updated for Webpack');
