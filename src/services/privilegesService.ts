import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { Privilege } from "../types/privilegeTypes";

// Obtener todos los privilegios
export const fetchPrivileges = async (): Promise<Privilege[]> => {
  const querySnapshot = await getDocs(collection(db, "privilegios"));
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Privilege)
  );
};

// Agregar nuevo privilegio
export const addPrivilege = async (privilegio: Privilege): Promise<void> => {
  await addDoc(collection(db, "privilegios"), privilegio);
};

// Actualizar privilegio existente
export const updatePrivilege = async (
  id: string,
  data: Partial<Privilege>
): Promise<void> => {
  await updateDoc(doc(db, "privilegios", id), data);
};
