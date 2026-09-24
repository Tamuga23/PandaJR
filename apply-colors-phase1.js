const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// --- DARK MODE HEX REPLACEMENTS ---
// Obsidian to Deep Warm Violet
content = content.replace(/#111317/g, '#181520');
// Cards to Elevated Violet
content = content.replace(/#181a20/g, '#221d2d');
// Muted to Muted Violet
content = content.replace(/#21242c/g, '#2d273a');
// Hover Muted
content = content.replace(/#282c36/g, '#383147');

// Primary Text
content = content.replace(/#f3f1ec/g, '#eae6e1');
// Secondary Text
content = content.replace(/#9ea3ae/g, '#a6a1b2');

// Headers that were deep green, make them deep violet to blend with the new dark mode
content = content.replace(/#132420/g, '#1a1724');
content = content.replace(/#182d27/g, '#1f1b2b');
content = content.replace(/#132c25/g, '#221d2d'); // Patadas button base
content = content.replace(/#0d1e19/g, '#181520'); // Patadas button bottom

// Replace some of the main "Teal" buttons with Terracotta to give it that warmth!
// We'll replace primary `bg-teal-600` and `bg-teal-500` for main call to actions.
content = content.replace(/bg-teal-600/g, 'bg-terracotta');
content = content.replace(/bg-teal-500/g, 'bg-terracotta');
content = content.replace(/text-teal-600/g, 'text-terracotta');
content = content.replace(/text-teal-500/g, 'text-terracotta');

// Hover states for those buttons
content = content.replace(/hover:bg-teal-700/g, 'hover:bg-terracotta-hover');
content = content.replace(/hover:bg-teal-600/g, 'hover:bg-terracotta-hover');

fs.writeFileSync(target, content, 'utf-8');
console.log('Phase 1 Colors Applied to page.tsx');
