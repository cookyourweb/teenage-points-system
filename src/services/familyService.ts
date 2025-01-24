import { collection, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Family, Child } from "../types/familyTypes";

// Obtener una familia por ID
export const fetchFamilyById = async (familyId: string): Promise<Family | null> => {
  const familyDocRef = doc(db, "familias", familyId);
  const familySnapshot = await getDoc(familyDocRef);

  if (!familySnapshot.exists()) return null;

  const data = familySnapshot.data();
  return {
    familyId: familySnapshot.id,
    miembros: {
      padres: data.miembros?.padres || {}, // Aseguramos estructura
      hijos: data.miembros?.hijos || {}, // Aseguramos estructura
    },
  } as Family;
};

// Agregar una nueva familia y devolver solo el ID de la familia
export const addFamily = async (
  userId: string,
  name: string,
  email: string,
  rol: "padre" | "madre" | "tutor"
): Promise<Family> => {
  const familiesCollection = collection(db, "familias");
  const newFamily = {
    miembros: {
      padres: {
        [userId]: {
          id: userId,
          nombre: name,
          email: email,
          rol: rol,
        },
      },
      hijos: {},
    },
  };

  let docRef;
  try {
    docRef = await addDoc(familiesCollection, newFamily);
  } catch (error) {
    console.error("Error adding family:", error);
    throw new Error("Failed to create family");
  }

  return {
    familyId: docRef.id,
    miembros: {
      padres: {
        [userId]: {
          id: userId,
          nombre: name,
          email: email,
          rol: rol,
        },
      },
      hijos: {},
    },
  };
};

// Agregar un hijo a una familia
export const addChildToFamily = async (familyId: string, child: Child): Promise<void> => {
  const familyDocRef = doc(db, "familias", familyId);
  const familySnapshot = await getDoc(familyDocRef);

  if (!familySnapshot.exists()) throw new Error("Familia no encontrada");

  const data = familySnapshot.data();
  const hijos = data.miembros?.hijos || {}; // Aseguramos estructura
  hijos[child.id] = child;

  await updateDoc(familyDocRef, { "miembros.hijos": hijos });
};
