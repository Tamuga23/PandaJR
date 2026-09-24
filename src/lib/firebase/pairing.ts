import { db, auth } from "./config";
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
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

/**
 * Paso 1: La Mamá se registra y crea el Embarazo (Pregnancy)
 */
export async function createPregnancyForMom(userId: string, babyName: string) {
  try {
    const inviteCode = generateInviteCode();
    
    const newPregnancyRef = doc(collection(db, "pregnancies"));
    await setDoc(newPregnancyRef, {
      babyName,
      inviteCode,
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
  } catch (error) {
    console.error("Error creating pregnancy:", error);
    throw error;
  }
}

/**
 * Paso 2: El Papá introduce el código para vincularse al Embarazo
 */
export async function joinPregnancyAsDad(userId: string, inviteCode: string) {
  try {
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

    return { success: true, pregnancyId, babyName: pregnancyDoc.data().babyName };
  } catch (error) {
    throw error;
  }
}
