const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Replace dark mode backgrounds
content = content.replace(/dark:bg-slate-900/g, 'dark:bg-[#181a20]');
content = content.replace(/dark:bg-slate-950/g, 'dark:bg-[#111317]');
content = content.replace(/dark:bg-slate-800/g, 'dark:bg-[#21242c]');
content = content.replace(/dark:bg-slate-850/g, 'dark:bg-[#1c1e26]');
content = content.replace(/dark:bg-gray-900/g, 'dark:bg-[#181a20]');
content = content.replace(/dark:bg-gray-800/g, 'dark:bg-[#21242c]');

// Replace borders
content = content.replace(/dark:border-slate-800/g, 'dark:border-white/[0.08]');
content = content.replace(/dark:border-slate-700/g, 'dark:border-white/[0.06]');
content = content.replace(/dark:border-gray-800/g, 'dark:border-white/[0.08]');
content = content.replace(/dark:border-gray-700/g, 'dark:border-white/[0.06]');

// Replace text
content = content.replace(/dark:text-slate-100/g, 'dark:text-[#f3f1ec]');
content = content.replace(/dark:text-slate-200/g, 'dark:text-[#f3f1ec]');
content = content.replace(/dark:text-slate-300/g, 'dark:text-[#d7d5d0]');
content = content.replace(/dark:text-slate-400/g, 'dark:text-[#9ea3ae]');
content = content.replace(/dark:text-slate-500/g, 'dark:text-[#9ea3ae]/80');
content = content.replace(/dark:text-gray-400/g, 'dark:text-[#9ea3ae]');
content = content.replace(/dark:text-gray-300/g, 'dark:text-[#d7d5d0]');

// Teal dark replacements
content = content.replace(/dark:bg-teal-950\/60/g, 'dark:bg-teal-500/10');
content = content.replace(/dark:bg-teal-950/g, 'dark:bg-[#132420]');
content = content.replace(/dark:border-teal-800/g, 'dark:border-teal-500/20');
content = content.replace(/dark:border-teal-700/g, 'dark:border-teal-500/30');

// Replace hover states
content = content.replace(/dark:hover:bg-slate-800/g, 'dark:hover:bg-[#282c36]');
content = content.replace(/dark:hover:bg-slate-700/g, 'dark:hover:bg-[#282c36]');
content = content.replace(/dark:hover:text-slate-200/g, 'dark:hover:text-[#f3f1ec]');

fs.writeFileSync(target, content, 'utf-8');
console.log('Replacements complete');
