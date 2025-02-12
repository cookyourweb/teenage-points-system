import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const Signin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignin = async (e: React.FormEvent) => {
    // Remove hardcoded credentials for testing
    e.preventDefault();

    try {
      console.log("Intentando iniciar sesión en Firebase Auth...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Usuario autenticado:", user);

      // Obtener datos del usuario desde Firestore
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log("Datos del usuario obtenidos de Firestore:", userData);

        // Verificar si tiene familia asociada
        if (userData.familyId) {
          console.log("El usuario pertenece a la familia con ID:", userData.familyId);
          navigate("/dashboard");
        } else {
          console.error("No se encontró una familia asociada al usuario.");
          setError("Tu cuenta no tiene una familia asociada. Por favor, contacta al soporte.");
        }
      } else {
        console.error("No se encontraron datos para este usuario en Firestore.");
        setError("Tu cuenta no está configurada correctamente en el sistema.");
      }
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setError("Error al iniciar sesión: " + (err instanceof Error ? err.message : ""));
    }
  };

  return (
    <form onSubmit={handleSignin} className="space-y-4 p-4">
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded font-sans"
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded font-sans"
        required
      />
      {error && <p className="text-red-500" style={{ color: 'var(--color-red-500)' }}>{error}</p>}
      <button
        type="submit"
        className="w-full p-2 rounded"
        style={{ backgroundColor: 'var(--color-blue-500)', color: 'var(--color-white)' }}
      >
        Iniciar Sesión
      </button>
    </form>
  );
};

export default Signin;