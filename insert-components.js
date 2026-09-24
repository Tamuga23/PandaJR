const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let lines = fs.readFileSync(target, 'utf-8').split('\n');

const missionIndex = lines.findIndex(l => l.includes('1397:') || l.includes('Misi') && l.includes('Misi') && l.includes('{/*'));
const realMissionIndex = lines.findIndex(l => l.includes('<div className="bg-teal-50/70') && l.includes('border-t border-teal-100'));

if (realMissionIndex !== -1) {
  // Insert PregnancyProgressBar before the mission block
  lines.splice(realMissionIndex - 1, 0, 
    '          <div className="border-t border-stone-100 dark:border-white/[0.06] pt-5 mt-5 pb-5">',
    '            <PregnancyProgressBar week={week} />',
    '          </div>'
  );
}

const checklistIndex = lines.findIndex(l => l.includes('{/* 2. Checklist Module */}'));
if (checklistIndex !== -1) {
  // Insert MomStatusCard before the checklist module
  lines.splice(checklistIndex, 0,
    '      {/* 1.5 Mom Status (New Pareja Module) */}',
    '      <MomStatusCard profile={profile} />',
    ''
  );
}

fs.writeFileSync(target, lines.join('\n'), 'utf-8');
console.log('Components inserted via script');
