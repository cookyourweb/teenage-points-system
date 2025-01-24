import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useState } from "react";
import { addFamily } from "../../services/familyService"; // Importar función para crear familia

const SignUp: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Crear el usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Crear una familia y obtener el ID generado
      const familyData = await addFamily(user.uid, name, email, "padre"); // Ensure family is created successfully
      if (!familyData.familyId) {
          throw new Error("Error creating family");
      }
      const familyId = familyData.familyId; // Solo guardamos el ID de la familia

      // Guardar el usuario en Firestore con el rol "padre" y asociar el familyId como cadena
      await setDoc(doc(db, "usuarios", user.uid), {
        nombre: name,
        email: user.email,
        rol: "padre",
        familyId: familyId, // Guardar solo el ID como cadena
      });

      // Actualizar el perfil del usuario con su nombre
      await updateProfile(user, { displayName: name });

      console.log("Usuario creado con rol padre y familia asociada");
    } catch (err) {
      setError("Hubo un error al registrarse.");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4 p-4">
      <input
        type="text"
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      {error && <p className="text-red-500">{error}</p>}
      <button
        type="submit"
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Registrarse
      </button>
    </form>
  );
};

export default SignUp;
