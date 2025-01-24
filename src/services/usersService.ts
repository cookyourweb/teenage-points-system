//usersService.ts
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// Actualizar el número de teléfono del usuario
export const updatePhoneNumber = async (userId: string, phone: string): Promise<void> => {
  const userRef = doc(db, "usuarios", userId);
  await updateDoc(userRef, { telefono: phone });
};
