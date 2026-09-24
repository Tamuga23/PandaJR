const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let c = fs.readFileSync(target, 'utf-8');

// Fix 1: Remove `export` from downloadIcsCalendar
c = c.replace('export function downloadIcsCalendar', 'function downloadIcsCalendar');

// Fix 2: Pass remoteMomStatus from PandaJRApp to GuiaPapaView
// GuiaPapaView is called like:
// <GuiaPapaView showToast={showToast} profile={profile} updateProfile={updateProfile} />
// We need to add remoteMomStatus prop
c = c.replace(
  '<GuiaPapaView showToast={showToast} profile={profile} updateProfile={updateProfile} />',
  '<GuiaPapaView showToast={showToast} profile={profile} updateProfile={updateProfile} remoteMomStatus={remoteMomStatus} />'
);

// Update GuiaPapaView function signature to accept remoteMomStatus
c = c.replace(
  'function GuiaPapaView({ showToast, profile, updateProfile }: { showToast: any, profile: UserProfile, updateProfile: (u: Partial<UserProfile>) => void }) {',
  'function GuiaPapaView({ showToast, profile, updateProfile, remoteMomStatus }: { showToast: any, profile: UserProfile, updateProfile: (u: Partial<UserProfile>) => void, remoteMomStatus?: any }) {'
);

// Fix 3: PlanParto setPatientData type
c = c.replace(
  'if (data.patient && Object.keys(data.patient).length > 0) setPatientData(prev => ({ ...prev, ...data.patient }));',
  'if (data.patient && Object.keys(data.patient).length > 0) setPatientData((prev: any) => ({ ...prev, ...data.patient }));'
);

fs.writeFileSync(target, c, 'utf-8');
console.log('Fixed TS errors: downloadIcsCalendar export, remoteMomStatus prop, PlanParto types');
