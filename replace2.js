const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Convert cold grays to warm stones for Light Mode
content = content.replace(/bg-gray-50\b/g, 'bg-stone-50');
content = content.replace(/bg-gray-100\b/g, 'bg-stone-100');
content = content.replace(/bg-gray-200\b/g, 'bg-stone-200');
content = content.replace(/bg-gray-800\b/g, 'bg-stone-800');
content = content.replace(/bg-gray-900\b/g, 'bg-stone-900');

content = content.replace(/text-gray-300\b/g, 'text-stone-300');
content = content.replace(/text-gray-400\b/g, 'text-stone-400');
content = content.replace(/text-gray-500\b/g, 'text-stone-500');
content = content.replace(/text-gray-600\b/g, 'text-stone-600');
content = content.replace(/text-gray-700\b/g, 'text-stone-700');
content = content.replace(/text-gray-800\b/g, 'text-stone-800');
content = content.replace(/text-gray-900\b/g, 'text-stone-900');

content = content.replace(/border-gray-100\b/g, 'border-stone-100');
content = content.replace(/border-gray-200\b/g, 'border-stone-200');
content = content.replace(/border-gray-300\b/g, 'border-stone-300');
content = content.replace(/border-gray-400\b/g, 'border-stone-400');

// Fix any harsh red/orange to Rose and Amber in gradients or classes
content = content.replace(/from-red-500/g, 'from-rose-500');
content = content.replace(/to-red-600/g, 'to-rose-600');
content = content.replace(/text-red-500/g, 'text-rose-500');
content = content.replace(/text-red-600/g, 'text-rose-600');
content = content.replace(/bg-red-50/g, 'bg-rose-50');
content = content.replace(/bg-red-100/g, 'bg-rose-100');
content = content.replace(/border-red-200/g, 'border-rose-200');
content = content.replace(/border-red-500/g, 'border-rose-500');
content = content.replace(/bg-orange-50/g, 'bg-amber-50');

// Quieten the UI: remove tracking-wider and uppercase from small elements
content = content.replace(/uppercase tracking-wider/g, 'tracking-tight');
content = content.replace(/font-black text-gray/g, 'font-bold text-stone');
content = content.replace(/text-\[10px\]/g, 'text-xs');
content = content.replace(/text-\[11px\]/g, 'text-xs');

fs.writeFileSync(target, content, 'utf-8');
console.log('Light mode warm palette and quieter badges applied');
