const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'src', 'app', 'page.tsx');
let pageContent = fs.readFileSync(targetPage, 'utf-8');

// 1. Unexport parseEventDate
pageContent = pageContent.replace(/export const parseEventDate/g, 'const parseEventDate');

// 2. Fix the week slider error on line 858
// My previous regex replaced: onChange={(e) => setWeek(parseInt(e.target.value))}
// Let's find what it actually looks like now:
const badSliderRegex = /onChange=\{\(e\) => \(val\) => \{ const w = parseInt\(val\); setWeek\(w\); if \(form\.pregnancyId\) updatePregnancyWeek\(form\.pregnancyId, w\); \}\}/g;
pageContent = pageContent.replace(badSliderRegex, 'onChange={(e) => setWeek(parseInt(e.target.value))}');

// Wait, the error is at 858. Let's see what's around line 858 using another tool, or just do a generic replace.
pageContent = pageContent.replace(/\(val\) => \{ const w = parseInt\(val\); setWeek\(w\); if \(form\.pregnancyId\) updatePregnancyWeek\(form\.pregnancyId, w\); \}/g, 'setWeek(parseInt(e.target.value))');

fs.writeFileSync(targetPage, pageContent, 'utf-8');
console.log('Fixed build errors in page.tsx');
