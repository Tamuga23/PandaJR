const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Fix encoding issues
content = content.replace(/Cmo se siente/g, '¿Cómo se siente');
content = content.replace(/??/g, '💖'); // wait ?? might break regex.
content = content.replace(/"El masaje de pies fue la gloria! Y el beb no par de responder a las caricias antes de cenar \?"/g, 
  '"¡El masaje de pies fue la gloria! Y el bebé no paró de responder a las caricias antes de cenar ✨"');
content = content.replace(/Llegada soada/g, 'Llegada soñada');
content = content.replace(/<span className="text-xs">\?\?<\/span>/g, '<span className="text-xs" aria-hidden="true">💖</span>');
content = content.replace(/<span className="text-xs">💖<\/span>/g, '<span className="text-xs" aria-hidden="true">💖</span>');

// Fix A11y for ProgressBar
content = content.replace(/<div className="h-2 w-full bg-stone-100 dark:bg-\[#2d273a\] rounded-full overflow-hidden">/g, 
  '<div className="h-2 w-full bg-stone-100 dark:bg-[#2d273a] rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del embarazo">');

// Fix A11y for Buttons (add min-h-[44px] and focus rings)
content = content.replace(/rounded-xl py-2\.5 text-xs font-bold transition-colors flex items-center justify-center gap-2"/g, 
  'rounded-xl min-h-[44px] text-xs font-bold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 dark:focus:ring-offset-[#221d2d]"');
  
content = content.replace(/rounded-xl py-2\.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"/g, 
  'rounded-xl min-h-[44px] text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2 dark:focus:ring-offset-[#221d2d]"');

fs.writeFileSync(target, content, 'utf-8');
console.log('A11y and encoding fixed');
