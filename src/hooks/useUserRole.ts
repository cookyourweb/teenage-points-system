// useUserRole.ts
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export const useUserRole = (uid: string | undefined) => {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!uid) {
        setIsLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, "usuarios", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.rol || null);  // Aquí se obtiene el rol asignado
        } else {
          console.error("No se encontró el documento del usuario.");
          setError("No se encontró el documento del usuario.");
        }
      } catch (err) {
        console.error("Error al obtener el rol del usuario:", err);
        setError("Error al obtener el rol del usuario.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [uid]);

  return { role, isLoading, error };
};
