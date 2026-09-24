const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

if (!pageContent.includes('comparisonTheme?: "frutas" | "geek";')) {
  pageContent = pageContent.replace(
    /inviteCode\?: string;/g,
    'inviteCode?: string;\n  comparisonTheme?: "frutas" | "geek";'
  );
  fs.writeFileSync(targetPage, pageContent, 'utf-8');
}

const targetStore = path.join(__dirname, 'src', 'store', 'usePandaStore.ts');
let storeContent = fs.readFileSync(targetStore, 'utf-8');

if (!storeContent.includes('comparisonTheme?: "frutas" | "geek";')) {
  storeContent = storeContent.replace(
    /inviteCode\?: string;/g,
    'inviteCode?: string;\n  comparisonTheme?: "frutas" | "geek";'
  );
  fs.writeFileSync(targetStore, storeContent, 'utf-8');
}
console.log('Added comparisonTheme');
