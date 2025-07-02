// src/services/privilegesService.ts
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { db } from "../firebase";
import { Privilege, PrivilegeHistory } from "../types/privilegeTypes";

// Obtener todos los privilegios
export const fetchPrivileges = async (): Promise<Privilege[]> => {
  try {
    const privilegesCollection = collection(db, "privileges");
    const q = query(privilegesCollection, orderBy("points", "asc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      privilegioId: docSnap.id,
      ...docSnap.data(),
    })) as Privilege[];
  } catch (error) {
    console.error("Error fetching privileges:", error);
    throw new Error("Failed to fetch privileges");
  }
};

// Obtener privilegio por ID
export const getPrivilegeById = async (id: string): Promise<Privilege | null> => {
  try {
    const privilegeDocRef = doc(db, "privileges", id);
    const docSnap = await getDoc(privilegeDocRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        privilegioId: docSnap.id,
        ...docSnap.data()
      } as Privilege;
    }
    return null;
  } catch (error) {
    console.error("Error getting privilege:", error);
    throw new Error("Failed to get privilege");
  }
};

// Agregar un nuevo privilegio
export const addPrivilege = async (privilege: Omit<Privilege, 'id' | 'privilegioId'>): Promise<Privilege> => {
  try {
    const privilegesCollection = collection(db, "privileges");
    const privilegeData = {
      ...privilege,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(privilegesCollection, privilegeData);
    
    return {
      id: docRef.id,
      privilegioId: docRef.id,
      ...privilegeData
    } as Privilege;
  } catch (error) {
    console.error("Error adding privilege:", error);
    throw new Error("Failed to add privilege");
  }
};

// Actualizar un privilegio
export const updatePrivilege = async (id: string, updatedPrivilege: Partial<Privilege>): Promise<void> => {
  try {
    const privilegeDocRef = doc(db, "privileges", id);
    const updateData = {
      ...updatedPrivilege,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(privilegeDocRef, updateData);
  } catch (error) {
    console.error("Error updating privilege:", error);
    throw new Error("Failed to update privilege");
  }
};

// Eliminar un privilegio
export const deletePrivilege = async (id: string): Promise<void> => {
  try {
    const privilegeDocRef = doc(db, "privileges", id);
    await deleteDoc(privilegeDocRef);
  } catch (error) {
    console.error("Error deleting privilege:", error);
    throw new Error("Failed to delete privilege");
  }
};

// Obtener historial de privilegios
export const getPrivilegeHistory = async (childId?: string): Promise<PrivilegeHistory[]> => {
  try {
    const historyCollection = collection(db, "privilegeHistory");
    let q;
    
    if (childId) {
      q = query(
        historyCollection, 
        where("childId", "==", childId),
        orderBy("dateUnlocked", "desc")
      );
    } else {
      q = query(historyCollection, orderBy("dateUnlocked", "desc"));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        dateUnlocked: data.dateUnlocked,
        unlockedBy: data.unlockedBy,
      } as PrivilegeHistory;
    });
  } catch (error) {
    console.error("Error fetching privilege history:", error);
    throw new Error("Failed to fetch privilege history");
  }
};

// Obtener privilegios por familia
export const getPrivilegesByFamily = async (familyId: string): Promise<Privilege[]> => {
  try {
    const privilegesCollection = collection(db, "privileges");
    const q = query(
      privilegesCollection, 
      where("familyId", "==", familyId),
      orderBy("points", "asc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      privilegioId: docSnap.id,
      ...docSnap.data(),
    })) as Privilege[];
  } catch (error) {
    console.error("Error fetching family privileges:", error);
    throw new Error("Failed to fetch family privileges");
  }
};

// Registrar redención de privilegio
export const redeemPrivilege = async (
  privilegeId: string, 
  childId: string, 
  redeemedBy: string,
  scheduledDate?: string
): Promise<void> => {
  try {
    const historyCollection = collection(db, "privilegeHistory");
    const historyData = {
      privilegeId,
      childId,
      redeemedBy,
      dateUnlocked: scheduledDate || new Date().toISOString(),
      redeemedAt: Timestamp.now()
    };
    
    await addDoc(historyCollection, historyData);
  } catch (error) {
    console.error("Error redeeming privilege:", error);
    throw new Error("Failed to redeem privilege");
  }
};

// Marcar privilegio como desbloqueado
export const unlockPrivilege = async (privilegeId: string): Promise<void> => {
  try {
    await updatePrivilege(privilegeId, { unlocked: true });
  } catch (error) {
    console.error("Error unlocking privilege:", error);
    throw new Error("Failed to unlock privilege");
  }
};

// Marcar privilegio como bloqueado
export const lockPrivilege = async (privilegeId: string): Promise<void> => {
  try {
    await updatePrivilege(privilegeId, { unlocked: false });
  } catch (error) {
    console.error("Error locking privilege:", error);
    throw new Error("Failed to lock privilege");
  }
};