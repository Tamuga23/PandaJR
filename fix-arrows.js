const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Inside GuiaPapaView, change how `week` is managed:
const oldGuiaLogic = `  const week = profile.week || 14;
  const setWeek = (updater: number | ((w: number) => number)) => {
    const nextWeek = typeof updater === "function" ? updater(week) : updater;
    updateProfile({ week: nextWeek });
  };`;

const newGuiaLogic = `  const [week, setWeek] = useState(profile.week || 14);
  
  // Si el perfil real cambia por sincronización, actualizamos la vista
  useEffect(() => {
    if (profile.week) setWeek(profile.week);
  }, [profile.week]);`;

content = content.replace(oldGuiaLogic, newGuiaLogic);

fs.writeFileSync(target, content, 'utf-8');
console.log('Fixed Guia arrows to be local exploration only');
