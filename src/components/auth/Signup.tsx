import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useState } from "react";
import { addFamily } from "../../services/familyService";

const SignUp: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Función para limpiar y validar inputs
  const validateInputs = () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return false;
    }
    if (!email.trim()) {
      setError("El email es obligatorio");
      return false;
    }
    if (!email.includes("@")) {
      setError("Ingresa un email válido");
      return false;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    return true;
  };

  // Función para manejar errores de Firebase
  const handleFirebaseError = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return "Este email ya está registrado. Intenta iniciar sesión o usa otro email.";
      case 'auth/weak-password':
        return "La contraseña es muy débil. Usa al menos 6 caracteres.";
      case 'auth/invalid-email':
        return "El formato del email no es válido.";
      case 'auth/operation-not-allowed':
        return "El registro con email/contraseña no está habilitado.";
      case 'auth/too-many-requests':
        return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
      default:
        return "Error al registrarse. Inténtalo de nuevo.";
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiples envíos
    if (isLoading) return;
    
    // Limpiar errores previos
    setError("");
    
    // Validar inputs
    if (!validateInputs()) return;
    
    setIsLoading(true);

    try {
      console.log("Iniciando registro para:", email);
      
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      console.log("Usuario creado en Auth:", user.uid);

      // Crear familia para el nuevo usuario
      const familyData = await addFamily(user.uid, name.trim(), email.trim(), "padre");
      
      if (!familyData.familyId) {
        throw new Error("Error al crear la familia");
      }
      
      console.log("Familia creada con ID:", familyData.familyId);

      // Crear documento del usuario en Firestore
      await setDoc(doc(db, "usuarios", user.uid), {
        nombre: name.trim(),
        email: user.email,
        rol: "padre",
        familyId: familyData.familyId,
        fechaCreacion: new Date().toISOString(),
      });

      // Actualizar perfil de usuario
      await updateProfile(user, { displayName: name.trim() });

      console.log("Usuario registrado exitosamente");
      
      // Limpiar formulario
      setName("");
      setEmail("");
      setPassword("");
      
      // El usuario será redirigido automáticamente por useAuth
      
    } catch (err: unknown) {
      console.error("Error en registro:", err);

      // Manejar errores específicos de Firebase
      if (typeof err === "object" && err !== null && "code" in err) {
        setError(handleFirebaseError((err as { code: string }).code));
      } else if (typeof err === "object" && err !== null && "message" in err) {
        setError((err as { message?: string }).message || "Error inesperado al registrarse");
      } else {
        setError("Error inesperado al registrarse");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-md">
      <h2 className="text-center text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
        Crear Cuenta Nueva
      </h2>
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Nombre completo
        </label>
        <input
          id="name"
          type="text"
          placeholder="Tu nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          className="w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          required
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          required
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          required
          minLength={6}
        />
      </div>
      
      {error && (
        <div className="p-3 bg-danger-100 dark:bg-danger-900/20 border border-danger-300 dark:border-danger-700 rounded-lg">
          <p className="text-danger-700 dark:text-danger-400 text-sm font-medium">
            {error}
          </p>
        </div>
      )}
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full p-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Registrando...
          </div>
        ) : (
          "Registrarse"
        )}
      </button>
      
      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        ¿Ya tienes cuenta?{" "}
        <span className="text-primary-600 dark:text-primary-400 font-medium">
          Usa el formulario de la izquierda para iniciar sesión
        </span>
      </p>
    </form>
  );
};

export default SignUp;