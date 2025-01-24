import { useState, useEffect } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { addFamily } from "../services/familyService";

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          const userDocRef = doc(db, "usuarios", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            console.log("Usuario nuevo detectado, creando familia...");

            // Crear la familia y obtener el ID generado
            const familyData = await addFamily(
              currentUser.uid,
              currentUser.displayName || "Usuario",
              currentUser.email || "",
              "padre"
            );
            const familyId = familyData.familyId; // Guardar solo el ID de la familia

            console.log("Familia creada con ID:", familyId);

            // Asignar solo el `familyId` al documento del usuario
            await setDoc(userDocRef, {
              nombre: currentUser.displayName || "Usuario",
              email: currentUser.email || "",
              rol: "padre",
              familyId: familyId, // Guardar solo el ID de la familia como cadena
            });

            console.log("Usuario actualizado con el familyId:", familyId);
          }
        } catch (error) {
          console.error("Error al manejar la autenticación:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/signin");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return { user, loading, logout };
};

export default useAuth;
