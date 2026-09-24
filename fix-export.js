const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

content = content.replace(/export function getAppointmentPrep/g, 'function getAppointmentPrep');

fs.writeFileSync(target, content, 'utf-8');
console.log('Fixed export error');
