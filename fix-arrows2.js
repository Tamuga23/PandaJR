const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

const regex = /const week = profile\.week \|\| 14;\s*const setWeek = \(updater: number \| \(\(w: number\) => number\)\) => \{\s*const nextWeek = typeof updater === "function" \? updater\(week\) : updater;\s*updateProfile\(\{ week: nextWeek \}\);\s*\};/g;

const replacement = `const [week, setWeek] = useState(profile.week || 14);
  useEffect(() => {
    if (profile.week) setWeek(profile.week);
  }, [profile.week]);`;

content = content.replace(regex, replacement);

fs.writeFileSync(target, content, 'utf-8');
console.log('Fixed arrows properly');
