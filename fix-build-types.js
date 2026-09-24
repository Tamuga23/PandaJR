const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

// 1. Ensure comparisonTheme is in UserProfile
if (!pageContent.includes('comparisonTheme?: "frutas" | "geek";')) {
  pageContent = pageContent.replace(
    /inviteCode\?: string;/g,
    'inviteCode?: string;\n    comparisonTheme?: "frutas" | "geek";'
  );
}

// 2. Fix getWeekData return signature
const replaceGetWeekData = /return \{\s*size: closest\.size\[theme\] \|\| closest\.size\.frutas,\s*len: closest\.len,\s*weight: closest\.weight,\s*milestone: [^]+?\};/m;

const newReturn = `return {
    size: closest.size[theme] || closest.size.frutas,
    length: closest.len,
    weight: closest.weight,
    milestone: week <= 12 ? "Fin de la organogénesis crítica" : week <= 20 ? "Glándula tiroides funcional" : "Desarrollo de sentidos y corteza cerebral",
    momMission: week <= 12 ? "Evita que cargue peso, mantén la casa ventilada y apóyala con las comidas ligeras." : week <= 24 ? "Evita que cargue peso, mantén la casa ventilada y apóyala con las comidas ligeras." : "Cuiden la alineación de la espalda con la almohada de embarazo y mantengan rutinas de caminata.",
    dadMission: week <= 12 ? "El cerebro fetal triplica su sinapsis. Prepara cenas ricas en Colina (huevos) y DHA (salmón)." : "Ten lista la logística de transporte, tanque de gasolina lleno y números de emergencia a mano."
  };`;

pageContent = pageContent.replace(replaceGetWeekData, newReturn);

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Fixed build types for getWeekData');
