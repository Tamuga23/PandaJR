const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

const badToolsArray = /const tools = \[[^]+?\];/m;
const fixedToolsArray = `const tools = [
      { id: "sos", label: "SOS Mamá", icon: <HeartPulse size={16} /> },
      { id: "patadas", label: "Patadas", icon: <Baby size={16} /> },
      { id: "contracciones", label: "Contracc.", icon: <Activity size={16} /> },
      { id: "nombres", label: "Nombres", icon: <Users size={16} /> },
      { id: "parto", label: "Parto", icon: <ClipboardList size={16} /> },
      { id: "diario", label: "Diario", icon: <FileText size={16} /> },
      { id: "maleta", label: "Maleta", icon: <Package size={16} /> }
    ];`;
pageContent = pageContent.replace(badToolsArray, fixedToolsArray);

// Fix grid-cols-5 to overflow-x-auto flex
pageContent = pageContent.replace(
  /className="grid grid-cols-5 gap-1 bg-stone-100\/90 dark:bg-\[#221d2d\] p-1 rounded-2xl w-full"/g,
  'className="flex gap-1 bg-stone-100/90 dark:bg-[#221d2d] p-1 rounded-2xl w-full overflow-x-auto snap-x"'
);

pageContent = pageContent.replace(
  /className=\{\`flex flex-col items-center justify-center py-2 px-1/g,
  'className={`flex-shrink-0 min-w-[70px] snap-center flex flex-col items-center justify-center py-2 px-1'
);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Fixed tools array syntax');
