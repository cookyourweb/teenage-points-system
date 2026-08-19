import { useState } from "react";
import Field from "../ui/Field";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const Signin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Función para manejar errores de Firebase
  const handleFirebaseError = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return "No existe una cuenta con este email. ¿Necesitas registrarte?";
      case 'auth/wrong-password':
        return "Contraseña incorrecta. Inténtalo de nuevo.";
      case 'auth/invalid-email':
        return "El formato del email no es válido.";
      case 'auth/user-disabled':
        return "Esta cuenta ha sido deshabilitada.";
      case 'auth/too-many-requests':
        return "Demasiados intentos fallidos. Espera unos minutos.";
      case 'auth/network-request-failed':
        return "Error de conexión. Verifica tu internet.";
      default:
        return "Error al iniciar sesión. Verifica tus credenciales.";
    }
  };

  const validateInputs = () => {
    if (!email.trim()) {
      setError("El email es obligatorio");
      return false;
    }
    if (!email.includes("@")) {
      setError("Ingresa un email válido");
      return false;
    }
    if (!password) {
      setError("La contraseña es obligatoria");
      return false;
    }
    return true;
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiples envíos
    if (isLoading) return;
    
    // Limpiar errores previos
    setError("");
    
    // Validar inputs
    if (!validateInputs()) return;
    
    setIsLoading(true);

    try {
      console.log("Intentando iniciar sesión para:", email);
      
      // Autenticar usuario
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      console.log("Usuario autenticado:", user.uid);

      // Verificar datos del usuario en Firestore
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log("Datos del usuario obtenidos:", userData);

        if (userData.familyId) {
          console.log("Usuario pertenece a familia:", userData.familyId);
          navigate("/dashboard");
        } else {
          setError("Tu cuenta no tiene una familia asociada. Contacta al soporte.");
        }
      } else {
        console.error("No se encontró información del usuario en la base de datos");
        setError("Tu cuenta no está configurada correctamente.");
      }
    } catch (err: unknown) {
      console.error("Error al iniciar sesión:", err);

      // Manejar errores específicos de Firebase
      if (typeof err === "object" && err !== null && "code" in err) {
        setError(handleFirebaseError((err as { code: string }).code));
      } else if (typeof err === "object" && err !== null && "message" in err) {
        setError((err as { message?: string }).message || "Error inesperado al iniciar sesión");
      } else {
        setError("Error inesperado al iniciar sesión");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignin} className="space-y-4 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-md">
      <h2 className="text-center text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
        Iniciar Sesión
      </h2>
      
      <Field
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
        required
      />
      
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Tu contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
        required
      />
      
      {error && (
        <div className="p-3 bg-danger-100 dark:bg-danger-900/20 border border-danger-300 dark:border-danger-700 rounded-lg">
          <p className="text-danger-700 dark:text-danger-400 text-sm font-medium">
            {error}
          </p>
          {error.includes("email") && (
            <p className="text-danger-600 dark:text-danger-400 text-xs mt-1">
              💡 ¿Necesitas crear una cuenta? Usa el formulario de registro.
            </p>
          )}
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
            Iniciando sesión...
          </div>
        ) : (
          "Iniciar Sesión"
        )}
      </button>
      
      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        ¿No tienes cuenta?{" "}
        <span className="text-primary-600 dark:text-primary-400 font-medium">
          Usa el formulario de la derecha para registrarte
        </span>
      </p>
    </form>
  );
};

export default Signin;