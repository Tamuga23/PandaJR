import { db, auth } from "./config";
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp, onSnapshot, updateDoc, orderBy, limit } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

// Función auxiliar para generar códigos aleatorios (ej: PANDA-8A2F)
const generateInviteCode = () => {
  return 'PANDA-' + Math.random().toString(36).substring(2, 6).toUpperCase();
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
    throw new Error("Código de invitación inválido o caducado.");
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
