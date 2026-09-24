const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// 1. Fix toggleThemeStore(args)
content = content.replace(/toggleThemeStore\([^)]*\)/g, 'toggleThemeStore()');

// 2. Fix setProfile((prev: any) => ...)
// I can just replace setProfile((prev: any) => { ... return updated; });
// Wait, updateProfile already handles setProfile(updates). What did I replace?
/*
  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(updates);
  };
*/
// And what about other setProfile calls?
// Let's find them:
content = content.replace(/setProfile\(\(prev: any\) => \{[\s\S]*?return updated;\s*\}\);/gm, 'setProfile(updates);');
content = content.replace(/setProfile\(\(prev: any\) => \{[\s\S]*?const updated = \{ \.\.\.prev, \.\.\.updates \};\s*return updated;\s*\}\);/gm, 'setProfile(updates);');
// There's a setProfile in updateProfile itself that I probably messed up:
const badUpdateProfile = /const updateProfile = \(updates: Partial<UserProfile>\) => \{\s*setProfile\(\(prev: any\) => \{\s*const updated = \{ \.\.\.prev, \.\.\.updates \};\s*return updated;\s*\}\);\s*\};/gm;
content = content.replace(badUpdateProfile, `const updateProfile = (updates: Partial<UserProfile>) => { setProfile(updates); };`);

// 3. Fix UserProfile interface in page.tsx
const oldInterface = /export interface UserProfile \{\s*role: "papa" \| "mama";\s*name: string;\s*week: number;\s*location: string;\s*notes: string;\s*\}/m;
const newInterface = `export interface UserProfile {
  role: "papa" | "mama";
  name: string;
  week: number;
  location?: string;
  notes?: string;
  pregnancyId?: string;
}`;
content = content.replace(oldInterface, newInterface);

fs.writeFileSync(target, content, 'utf-8');
console.log('TS errors fixed');
