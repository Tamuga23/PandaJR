const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'lib', 'firebase', 'pairing.ts');
let content = fs.readFileSync(target, 'utf-8');

// Change saveMomStatus
content = content.replace(
  /const statusRef = doc\(collection\(db, "mom_status_logs"\)\);/g,
  'const statusRef = doc(collection(db, "pregnancies", pregnancyId, "status_logs"));'
);

content = content.replace(
  /pregnancyId,\n    statusText/g,
  'statusText'
);

// Change listenToMomStatus
content = content.replace(
  /const logsRef = collection\(db, "mom_status_logs"\);\n  const q = query\(logsRef, where\("pregnancyId", "==", pregnancyId\), orderBy\("createdAt", "desc"\), limit\(1\)\);/g,
  'const logsRef = collection(db, "pregnancies", pregnancyId, "status_logs");\n  const q = query(logsRef, orderBy("createdAt", "desc"), limit(1));'
);

fs.writeFileSync(target, content, 'utf-8');
console.log('Fixed Firestore index issue by using subcollection');
