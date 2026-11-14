//useAuth.ts
import { useNavigate } from "react-router-dom";
import { useSesion } from "../auth/useSesion";

// Fachada sobre el AuthProvider: mantiene la API { user, loading, logout } para
// no tocar los componentes que ya la usan. La familia y el documento de
// `usuarios` los crea Signup.tsx, único sitio del alta.
const useAuth = () => {
  const sesion = useSesion();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await sesion.cerrarSesion();
      navigate("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return {
    user: sesion.tipo === "autenticado" ? sesion.user : null,
    loading: sesion.tipo === "cargando",
    logout,
  };
};

export default useAuth;
