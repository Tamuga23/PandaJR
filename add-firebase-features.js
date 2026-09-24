const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'lib', 'firebase', 'pairing.ts');
let content = fs.readFileSync(target, 'utf-8');

const newFunctions = `
// --- JOURNAL (Diario de a Dos) ---
export async function addJournalEntry(pregnancyId: string, authorRole: string, authorName: string, text: string) {
  const ref = doc(collection(db, "pregnancies", pregnancyId, "journal"));
  await setDoc(ref, {
    authorRole,
    authorName,
    text,
    createdAt: serverTimestamp()
  });
}

export function listenToJournal(pregnancyId: string, callback: (entries: any[]) => void) {
  const ref = collection(db, "pregnancies", pregnancyId, "journal");
  const q = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(entries);
  });
}

// --- CUSTOM TASKS ---
export async function addCustomTask(pregnancyId: string, text: string, trimester: number) {
  const ref = doc(collection(db, "pregnancies", pregnancyId, "tasks"));
  await setDoc(ref, {
    text,
    trimester,
    completed: false,
    createdAt: serverTimestamp()
  });
}

export async function toggleCustomTask(pregnancyId: string, taskId: string, completed: boolean) {
  const ref = doc(db, "pregnancies", pregnancyId, "tasks", taskId);
  await updateDoc(ref, { completed });
}

export function listenToCustomTasks(pregnancyId: string, callback: (tasks: any[]) => void) {
  const ref = collection(db, "pregnancies", pregnancyId, "tasks");
  return onSnapshot(ref, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tasks);
  });
}

// --- GO BAG (Maleta) ---
export async function toggleGoBagItem(pregnancyId: string, itemId: string, checked: boolean) {
  const ref = doc(collection(db, "pregnancies", pregnancyId, "gobag"), itemId);
  await setDoc(ref, { checked, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToGoBag(pregnancyId: string, callback: (items: any) => void) {
  const ref = collection(db, "pregnancies", pregnancyId, "gobag");
  return onSnapshot(ref, (snapshot) => {
    const bag: Record<string, boolean> = {};
    snapshot.docs.forEach(doc => {
      bag[doc.id] = doc.data().checked;
    });
    callback(bag);
  });
}
`;

content = content + newFunctions;

fs.writeFileSync(target, content, 'utf-8');
console.log('Added Firebase functions for Journal, Tasks, GoBag');
