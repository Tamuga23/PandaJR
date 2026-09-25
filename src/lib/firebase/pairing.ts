import { db, auth } from "./config";
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp, onSnapshot, updateDoc, orderBy, limit, addDoc, deleteDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

// Función auxiliar para generar códigos aleatorios (ej: PANDA-8A2F)
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'PANDA-' + result;
};

export async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser?.uid;
}

export async function createPregnancyForMom(userId: string, babyName: string) {
  const inviteCode = generateInviteCode();
  const newPregnancyRef = doc(collection(db, "pregnancies"));
  await setDoc(newPregnancyRef, {
    babyName,
    inviteCode,
    week: 14, // Default
    createdAt: serverTimestamp(),
    status: "active"
  });

  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    role: "mama",
    pregnancyId: newPregnancyRef.id,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return { success: true, inviteCode, pregnancyId: newPregnancyRef.id };
}

export async function joinPregnancyAsDad(userId: string, inviteCode: string) {
  const pregnanciesRef = collection(db, "pregnancies");
  const q = query(pregnanciesRef, where("inviteCode", "==", inviteCode.toUpperCase()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Código no encontrado. Verifica si es O (letra) o 0 (cero) y vuelve a intentar.");
  }

  const pregnancyDoc = querySnapshot.docs[0];
  const pregnancyId = pregnancyDoc.id;

  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    role: "papa",
    pregnancyId: pregnancyId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return { success: true, pregnancyId, babyName: pregnancyDoc.data().babyName, week: pregnancyDoc.data().week || 14 };
}

// UPDATE SHARED DATA
export async function updatePregnancyWeek(pregnancyId: string, week: number) {
  const ref = doc(db, "pregnancies", pregnancyId);
  await updateDoc(ref, { week });
}

export async function saveMomStatus(pregnancyId: string, statusText: string, emoji: string) {
  const statusRef = doc(collection(db, "pregnancies", pregnancyId, "status_logs"));
  await setDoc(statusRef, {
    statusText,
    emoji,
    createdAt: serverTimestamp()
  });
}

// REALTIME LISTENERS
export function listenToPregnancy(pregnancyId: string, callback: (data: any) => void) {
  const ref = doc(db, "pregnancies", pregnancyId);
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  });
}

export function listenToMomStatus(pregnancyId: string, callback: (status: any) => void) {
  const logsRef = collection(db, "pregnancies", pregnancyId, "status_logs");
  const q = query(logsRef, orderBy("createdAt", "desc"), limit(1));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      callback(snapshot.docs[0].data());
    }
  });
}

// --- JOURNAL (Diario de a Dos) ---
export async function addJournalEntry(pregnancyId: string, authorRole: string, authorName: string, text: string, tag?: string, mood?: string) {
  const ref = doc(collection(db, "pregnancies", pregnancyId, "journal"));
  await setDoc(ref, {
    authorRole,
    authorName,
    text,
    tag: tag || null,
    mood: mood || null,
    createdAt: serverTimestamp()
  });
}

export async function deleteJournalEntry(pregnancyId: string, entryId: string) {
  const ref = doc(db, "pregnancies", pregnancyId, "journal", entryId);
  await deleteDoc(ref);
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

// --- EVENTS / AGENDA (citas médicas) ---
export async function saveEvents(pregnancyId: string, events: any[]) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "events");
  await setDoc(ref, { items: events, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToEvents(pregnancyId: string, callback: (events: any[]) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "events");
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().items || []);
    }
  });
}

// --- KICK SESSIONS (Monitor de Patadas) ---
export async function saveKickSessions(pregnancyId: string, sessions: any[]) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "kick_sessions");
  await setDoc(ref, { items: sessions, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToKickSessions(pregnancyId: string, callback: (sessions: any[]) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "kick_sessions");
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().items || []);
    }
  });
}

// --- CONTRACTIONS HISTORY ---
export async function saveContractions(pregnancyId: string, history: any[]) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "contractions");
  await setDoc(ref, { items: history, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToContractions(pregnancyId: string, callback: (history: any[]) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "contractions");
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().items || []);
    }
  });
}

// --- BABY NAMES (Votador de Nombres) ---
export async function saveBabyNames(pregnancyId: string, names: any[]) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "baby_names");
  await setDoc(ref, { items: names, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToBabyNames(pregnancyId: string, callback: (names: any[]) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "baby_names");
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().items || []);
    }
  });
}

// --- BIRTH PLAN (Plan de Parto) ---
export async function saveBirthPlan(pregnancyId: string, patient: any, sections: any[]) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "birth_plan");
  await setDoc(ref, { patient, sections, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToBirthPlan(pregnancyId: string, callback: (data: { patient: any, sections: any[] }) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "birth_plan");
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({ patient: data.patient || {}, sections: data.sections || [] });
    }
  });
}

// --- CHECKLIST PROGRESS (built-in trimester checklists) ---
export async function saveChecklistProgress(pregnancyId: string, progress: Record<string, boolean>) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "checklist_progress");
  await setDoc(ref, { items: progress, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToChecklistProgress(pregnancyId: string, callback: (progress: Record<string, boolean>) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "checklist_progress");
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().items || {});
    }
  });
}

// --- APPOINTMENT PREP (checklist de preparación de citas) ---
export async function saveAppointmentPrep(pregnancyId: string, eventId: string, data: { items: Record<string, boolean>, questions: Record<string, boolean> }) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "prep_" + eventId);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToAppointmentPrep(pregnancyId: string, eventId: string, callback: (data: { items: Record<string, boolean>, questions: Record<string, boolean> }) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "prep_" + eventId);
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({ items: data.items || {}, questions: data.questions || {} });
    }
  });
}

// --- BUDGET (Presupuesto) ---
export async function saveBudget(pregnancyId: string, budgetItems: any[]) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "budget");
  await setDoc(ref, { items: budgetItems, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenToBudget(pregnancyId: string, callback: (items: any[]) => void) {
  const ref = doc(db, "pregnancies", pregnancyId, "shared_data", "budget");
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().items || []);
    }
  });
}
