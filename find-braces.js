const fs = require('fs');
const content = fs.readFileSync('src/app/page.tsx', 'utf-8');

let depth = 0;
let lines = content.split('\n');
let currentDepth = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') currentDepth++;
    if (line[j] === '}') currentDepth--;
  }
  if (currentDepth < 0) {
    console.log('Negative depth at line', i + 1);
    currentDepth = 0; // reset to find other errors
  }
}
console.log('Final depth:', currentDepth);

if (currentDepth !== 0) {
  // Let's print the last few lines to see where it stopped
  console.log('Tail of file:');
  console.log(lines.slice(lines.length - 10).join('\n'));
}
