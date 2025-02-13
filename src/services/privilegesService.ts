//privilegesService.ts
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Privilege } from "../types/privilegeTypes";

// Obtener todos los privilegios
export const fetchPrivileges = async (): Promise<Privilege[]> => {
  try {
    const privilegesCollection = collection(db, "privilegios");
    const querySnapshot = await getDocs(privilegesCollection);
    return querySnapshot.docs.map((docSnap: DocumentSnapshot) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data?.name || "Sin Nombre",
        description: data?.description || "",
        points: data?.points || 0,
        unlocked: data?.unlocked || false,
        history: data?.history || [],
      } as Privilege;
    });
  } catch (error) {
    console.error("Error fetching privileges:", error);
    throw new Error("Failed to fetch privileges");
  }
};

// Agregar un nuevo privilegio
export const addPrivilege = async (privilege: Privilege): Promise<Privilege> => {
  try {
    const privilegesCollection = collection(db, "privilegios");
    const docRef = await addDoc(privilegesCollection, privilege);
    return { ...privilege, privilegioId: docRef.id as string };
  } catch (error) {
    console.error("Error adding privilege:", error);
    throw new Error("Failed to add privilege");
  }
};

// Actualizar un privilegio
export const updatePrivilege = async (id: string, updatedPrivilege: Partial<Privilege>): Promise<void> => {
  try {
    const privilegeDocRef = doc(db, "privilegios", id);
    await updateDoc(privilegeDocRef, updatedPrivilege);
  } catch (error) {
    console.error("Error updating privilege:", error);
    throw new Error("Failed to update privilege");
  }
};

// Eliminar un privilegio
export const deletePrivilege = async (id: string): Promise<void> => {
  try {
    const privilegeDocRef = doc(db, "privilegios", id);
    await deleteDoc(privilegeDocRef);
  } catch (error) {
    console.error("Error deleting privilege:", error);
    throw new Error("Failed to delete privilege");
  }
};
