import { db } from "./config";
import { collection, doc, setDoc, getDocs, query, where, updateDoc, serverTimestamp } from "firebase/firestore";

// Función auxiliar para generar códigos aleatorios (ej: PANDA-8A2F)
const generateInviteCode = () => {
  return 'PANDA-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

/**
 * Paso 1: La Mamá se registra y crea el Embarazo (Pregnancy)
 */
export async function createPregnancyForMom(userId: string, babyName: string) {
  try {
    const inviteCode = generateInviteCode();
    
    // 1. Crear el documento del Embarazo
    const newPregnancyRef = doc(collection(db, "pregnancies"));
    await setDoc(newPregnancyRef, {
      babyName,
      inviteCode,
      createdAt: serverTimestamp(),
      status: "active"
    });

    // 2. Crear/Actualizar el perfil de la mamá vinculándola a este embarazo
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
    // 1. Buscar si existe un embarazo con ese código
    const pregnanciesRef = collection(db, "pregnancies");
    const q = query(pregnanciesRef, where("inviteCode", "==", inviteCode.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Código de invitación inválido o caducado.");
    }

    // Obtenemos el ID del embarazo
    const pregnancyDoc = querySnapshot.docs[0];
    const pregnancyId = pregnancyDoc.id;

    // 2. Crear/Actualizar el perfil del papá vinculándolo a ese embarazo
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      role: "papa",
      pregnancyId: pregnancyId,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { success: true, pregnancyId, babyName: pregnancyDoc.data().babyName };
  } catch (error) {
    console.error("Error joining pregnancy:", error);
    throw error;
  }
}

/**
 * Ejemplo de cómo guardar el estado de la mamá usando el ID compartido
 */
export async function saveMomStatus(pregnancyId: string, statusText: string, emoji: string) {
  const statusRef = doc(collection(db, "mom_status_logs"));
  await setDoc(statusRef, {
    pregnancyId,
    statusText,
    emoji,
    createdAt: serverTimestamp()
  });
}
