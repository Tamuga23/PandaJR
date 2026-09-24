const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// 1. Add toggle for comparisonTheme in ProfileModal
const themeSetting = `
            {form.role === 'papa' && (
              <div className="bg-stone-50 dark:bg-white/[0.02] p-4 rounded-2xl flex items-center justify-between border border-stone-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800 dark:text-white mb-0.5">Tema de Comparación</p>
                    <p className="text-xs text-stone-500 dark:text-[#a6a1b2]">Frutas o estilo Geek</p>
                  </div>
                </div>
                <button 
                  onClick={() => setForm({...form, comparisonTheme: form.comparisonTheme === 'geek' ? 'frutas' : 'geek'})}
                  className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${form.comparisonTheme === 'geek' ? 'bg-indigo-500' : 'bg-stone-300 dark:bg-stone-700'}\`}
                >
                  <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${form.comparisonTheme === 'geek' ? 'translate-x-6' : 'translate-x-1'}\`} />
                </button>
              </div>
            )}
`;

content = content.replace(
  /\{form\.role === 'mama' && \(/,
  themeSetting + '\n            {form.role === \'mama\' && ('
);

// 2. Modify getWeekData to accept theme
const getWeekDataRegex = /function getWeekData\(week: number\) \{[^]+?return \{/m;
const newGetWeekData = `function getWeekData(week: number, theme: "frutas"|"geek" = "frutas") {
  const data = [
    { week: 4, size: { frutas: "Semilla de amapola 🌑", geek: "Dado D20 en miniatura 🎲" }, len: "0.1 cm", weight: "1 g" },
    { week: 8, size: { frutas: "Frambuesa 🫐", geek: "Ficha de LEGO de 1x1 🧱" }, len: "1.6 cm", weight: "1 g" },
    { week: 12, size: { frutas: "Ciruela 🍑", geek: "Dado D6 estándar 🎲" }, len: "5.4 cm", weight: "14 g" },
    { week: 14, size: { frutas: "Limón 🍋", geek: "Goma de borrar ✏️" }, len: "8.7 cm", weight: "43 g" },
    { week: 16, size: { frutas: "Aguacate 🥑", geek: "Mouse de computadora 🖱️" }, len: "11.6 cm", weight: "100 g" },
    { week: 20, size: { frutas: "Plátano 🍌", geek: "Control de Nintendo Switch (Joy-Con) 🎮" }, len: "25.6 cm", weight: "300 g" },
    { week: 24, size: { frutas: "Mazorca de maíz 🌽", geek: "Sable de luz (mango) 🔦" }, len: "30.0 cm", weight: "600 g" },
    { week: 27, size: { frutas: "Vegetal nutritivo 🥑", geek: "iPad Mini 📱" }, len: "33.8 cm", weight: "2922 g" },
    { week: 30, size: { frutas: "Repollo 🥬", geek: "Casco de realidad virtual 🥽" }, len: "39.9 cm", weight: "1319 g" },
    { week: 34, size: { frutas: "Melón cantalupo 🍈", geek: "Consola Steam Deck 🕹️" }, len: "45.0 cm", weight: "2146 g" },
    { week: 40, size: { frutas: "Sandía pequeña 🍉", geek: "PlayStation 5 (en proporción) 🎮" }, len: "51.2 cm", weight: "3462 g" },
  ];
  let closest = data[0];
  for (let d of data) {
    if (d.week <= week) closest = d;
  }
  return {
    size: closest.size[theme] || closest.size.frutas,
    len: closest.len,
    weight: closest.weight,
    milestone: week <= 12 ? "Fin de la organogénesis crítica" : week <= 20 ? "Glándula tiroides funcional" : "Desarrollo de sentidos y corteza cerebral",
    mission: profile => profile.role === "mama" 
      ? (week <= 12 ? "Acompáñala a la ecografía de tamizaje genético (traslucencia nucal) y anota todas las dudas médicas." : week <= 24 ? "Evita que cargue peso, mantén la casa ventilada y apóyala con las comidas ligeras." : "Cuiden la alineación de la espalda con la almohada de embarazo y mantengan rutinas de caminata.") 
      : (week <= 12 ? "El cerebro fetal triplica su sinapsis. Prepara cenas ricas en Colina (huevos) y DHA (salmón)." : "Ten lista la logística de transporte, tanque de gasolina lleno y números de emergencia a mano.")
  };
`;

content = content.replace(/function getWeekData\(week: number\) \{[\s\S]*?(?=\nfunction GuiaPapaView)/, newGetWeekData);

// 3. Update GuiaPapaView to use theme
content = content.replace(
  /const weekData = getWeekData\(week\);/,
  'const weekData = getWeekData(week, profile.comparisonTheme || "frutas");'
);

fs.writeFileSync(target, content, 'utf-8');
console.log('Added comparisonTheme UI and data');
