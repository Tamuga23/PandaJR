const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let c = fs.readFileSync(target, 'utf-8');

c = c.replace(
  /useEffect\(\(\) => \{\s*if \(profile\.pregnancyId\) \{\s*import\('@\/lib\/firebase\/pairing'\)\.then\(\(\{ listenToJournal \}\) => \{\s*return listenToJournal\(profile\.pregnancyId!, \(data\) => setEntries\(data\)\);\s*\}\);\s*\}\s*\}, \[profile\.pregnancyId\]\);/,
  `useEffect(() => {\n    let unsub: (() => void) | null = null;\n    if (profile.pregnancyId) {\n      import('@/lib/firebase/pairing').then(({ listenToJournal }) => {\n        unsub = listenToJournal(profile.pregnancyId!, (data) => setEntries(data));\n      });\n    }\n    return () => { if (unsub) unsub(); };\n  }, [profile.pregnancyId]);`
);

c = c.replace(
  /useEffect\(\(\) => \{\s*if \(profile\.pregnancyId\) \{\s*import\('@\/lib\/firebase\/pairing'\)\.then\(\(\{ listenToGoBag \}\) => \{\s*return listenToGoBag\(profile\.pregnancyId!, \(data\) => setBag\(data\)\);\s*\}\);\s*\}\s*\}, \[profile\.pregnancyId\]\);/,
  `useEffect(() => {\n    let unsub: (() => void) | null = null;\n    if (profile.pregnancyId) {\n      import('@/lib/firebase/pairing').then(({ listenToGoBag }) => {\n        unsub = listenToGoBag(profile.pregnancyId!, (data) => setBag(data));\n      });\n    }\n    return () => { if (unsub) unsub(); };\n  }, [profile.pregnancyId]);`
);

c = c.replace(
  /useEffect\(\(\) => \{\s*if \(profile\.pregnancyId\) \{\s*import\('@\/lib\/firebase\/pairing'\)\.then\(\(\{ listenToCustomTasks \}\) => \{\s*return listenToCustomTasks\(profile\.pregnancyId!, \(tasks\) => setCustomTasks\(tasks\)\);\s*\}\);\s*\}\s*\}, \[profile\.pregnancyId\]\);/,
  `useEffect(() => {\n    let unsub: (() => void) | null = null;\n    if (profile.pregnancyId) {\n      import('@/lib/firebase/pairing').then(({ listenToCustomTasks }) => {\n        unsub = listenToCustomTasks(profile.pregnancyId!, (tasks) => setCustomTasks(tasks));\n      });\n    }\n    return () => { if (unsub) unsub(); };\n  }, [profile.pregnancyId]);`
);

fs.writeFileSync(target, c, 'utf-8');
console.log('Fixed listeners');
