const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(target, 'utf-8');

// 1. Add import properly
if (!content.includes('import { usePandaStore }')) {
  content = content.replace(
    /import React, \{ useState, useEffect \} from "react";/,
    'import React, { useState, useEffect } from "react";\\nimport { usePandaStore } from "@/store/usePandaStore";'
  );
}

// 2. Fix setIsDark in PandaIAView or somewhere else
// Is there a setIsDark left?
content = content.replace(/setIsDark\(isDarkMode\);/g, '/* setIsDark removed */');

// 3. Fix Parameter 'prev' implicitly has an 'any' type in updateProfile
const updateProfileRegex = /const updateProfile = \(updates: Partial<UserProfile>\) => \{\n\s*setProfile\(prev => \{\n\s*const updated = \{ \.\.\.prev, \.\.\.updates \};\n\s*return updated;\n\s*\}\);\n\s*\};/m;
content = content.replace(updateProfileRegex, `const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(updates);
  };`);
// Also fix any loose setProfile(prev => ...)
content = content.replace(/setProfile\(prev => \{/g, 'setProfile((prev: any) => {');

// 4. In case the earlier regex for setIsDark didn't catch the system toggle
content = content.replace(/setIsDark\(/g, 'toggleThemeStore(');

fs.writeFileSync(target, content, 'utf-8');
console.log('Zustand fixes applied');
