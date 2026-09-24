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
  const statusRef = doc(collection(db, "mom_status_logs"));
  await setDoc(statusRef, {
    pregnancyId,
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
  const logsRef = collection(db, "mom_status_logs");
  const q = query(logsRef, where("pregnancyId", "==", pregnancyId), orderBy("createdAt", "desc"), limit(1));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      callback(snapshot.docs[0].data());
    }
  });
}
