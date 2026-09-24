const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'layout.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Add appleWebApp to metadata
content = content.replace(
  /applicationName: "PandaJR",/,
  'applicationName: "PandaJR",\n  manifest: "/manifest.json",\n  appleWebApp: {\n    capable: true,\n    statusBarStyle: "default",\n    title: "PandaJR",\n  },'
);

fs.writeFileSync(target, content, 'utf-8');
console.log('PWA layout config updated');
