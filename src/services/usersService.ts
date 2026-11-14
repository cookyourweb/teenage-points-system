//usersService.ts
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { EstadoPerfil } from "../auth/useSesion";

// Actualizar el número de teléfono del usuario
export const updatePhoneNumber = async (userId: string, phone: string): Promise<void> => {
  const userRef = doc(db, "usuarios", userId);
  await updateDoc(userRef, { telefono: phone });
};

// Observa `usuarios/{uid}` en vivo. Devuelve la función de baja.
// Un documento inexistente no es un error: es 'sin-documento' (el alta aún no
// lo ha creado) y cuando aparezca llegará otro evento con 'listo'.
export const observarPerfil = (uid: string, alCambiar: (e: EstadoPerfil) => void): (() => void) =>
  onSnapshot(
    doc(db, "usuarios", uid),
    (snap) => {
      if (!snap.exists()) return alCambiar({ tipo: "sin-documento" });
      const d = snap.data();
      alCambiar({
        tipo: "listo",
        perfil: { nombre: d.nombre ?? "", rol: d.rol ?? "", familyId: d.familyId ?? "" },
      });
    },
    // Si Firestore rechaza la lectura (reglas, red) lo tratamos como sin perfil
    // para no dejar la pantalla en 'cargando' para siempre.
    () => alCambiar({ tipo: "sin-documento" }),
  );
