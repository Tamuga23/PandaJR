const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// Find the return of PandaJRApp
const regex = /(window\.addEventListener\("keydown", handleKeyDown\);\s*return \(\) => window\.removeEventListener\("keydown", handleKeyDown\);\s*\}, \[isProfileModalOpen, selectedPrepEvent\]\);\s*)(return \(\s*<div className=\{\`flex flex-col)/;

const newCode = `$1

  // Evitar hydration mismatch renderizando solo cuando el cliente monte
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  $2`;

content = content.replace(regex, newCode);

fs.writeFileSync(target, content, 'utf-8');
console.log('Hydration mismatch fix applied');
