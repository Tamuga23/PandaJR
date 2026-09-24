const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let c = fs.readFileSync(target, 'utf-8');

// SOSSintomas
c = c.replace(
  /<div className="text-center mb-6">\s*<h3 className="text-xl font-bold text-stone-800 dark:text-\[#eae6e1\] flex justify-center items-center gap-2">\s*<HeartPulse className="text-terracotta\/100" \/> SOS Mam(a|á|ǭ)\s*<\/h3>\s*<p className="text-sm text-stone-500 dark:text-\[#a6a1b2\]">Gu(i|í|)a r(a|á|ǭ)pida de alivio de s(i|í|)ntomas<\/p>\s*<\/div>/g,
  ''
);
// Rename 'SOS Mamá' to 'SOS Síntomas' in HerramientasView list
c = c.replace(
  /\{ id: "sos", label: "SOS Mamá",/g,
  '{ id: "sos", label: "SOS Síntomas",'
);

// ContadorPatadas
c = c.replace(
  /<div className="text-center mb-6">\s*<h3 className="text-xl font-bold text-stone-800 dark:text-\[#eae6e1\] flex justify-center items-center gap-2">\s*<Baby className="text-sage" \/> Monitor de Patadas\s*<\/h3>\s*<p className="text-sm text-stone-500 dark:text-\[#a6a1b2\]">M(e|é|Ǹ)todo Cardiff \(+24 semanas\)<\/p>\s*<\/div>/g,
  ''
);

// ContadorContracciones
c = c.replace(
  /<div className="text-center mb-6">\s*<h3 className="text-xl font-bold text-stone-800 dark:text-\[#eae6e1\] flex justify-center items-center gap-2">\s*<Activity className="text-terracotta" \/> Contador de Contracciones\s*<\/h3>\s*<p className="text-sm text-stone-500 dark:text-\[#a6a1b2\]">Gu(i|í|)a 5-1-1 para parto activo<\/p>\s*<\/div>/g,
  ''
);

// VotadorNombres
c = c.replace(
  /<div className="text-center mb-4">\s*<h3 className="text-xl font-bold text-stone-800 dark:text-\[#eae6e1\] flex justify-center items-center gap-2">\s*<Heart className="text-rose-500" \/> Votador de Nombres\s*<\/h3>\s*<p className="text-sm text-stone-500 dark:text-\[#a6a1b2\]">Hará match con tu pareja\?<\/p>\s*<\/div>/g,
  ''
);

// PlanParto
c = c.replace(
  /<div className="mb-4">\s*<div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-500\/20 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold mb-2">\s*<ClipboardList size={14} \/> Plan de Parto Respetado\s*<\/div>\s*<h2 className="text-2xl font-black text-stone-800 dark:text-white leading-tight">Tu Plan de Parto<\/h2>\s*<p className="text-stone-500 dark:text-\[#a6a1b2\] text-sm mt-1">Personaliza tus preferencias para el hospital y exp(o|ó|)rtalas en un PDF oficial.<\/p>\s*<\/div>/g,
  ''
);

// Fix tools padding: they need to have uniform padding since the shell provides the header
// All these tools return `<div className="flex flex-col py-2 animate-in ...">` or similar.
// Actually it's better to just wrap the tools map in `<div className="p-4 max-w-lg mx-auto w-full">`
// Wait, DiarioView and MaletaView already have `<div className="p-4 max-w-lg mx-auto">` inside them.
// The other tools might not.

// Let's just fix the container in HerramientasView:
c = c.replace(
  /<div className="flex-1 overflow-y-auto">/g,
  '<div className="flex-1 overflow-y-auto p-4">'
);
// Remove padding from inner tools to avoid double padding if possible.
// Or just let them be, p-4 is standard.

fs.writeFileSync(target, c, 'utf-8');
console.log('Removed redundant tool headers');
