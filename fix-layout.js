const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'layout.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Ensure next/script is imported
if (!content.includes('import Script from "next/script"')) {
  content = 'import Script from "next/script";\n' + content;
}

// Replace <script with <Script id="theme-script" strategy="beforeInteractive"
content = content.replace(/<script\s+dangerouslySetInnerHTML/g, '<Script id="theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML');
content = content.replace(/<\/script>/g, '</Script>');

fs.writeFileSync(target, content, 'utf-8');
console.log('Layout.tsx script tag fixed');
