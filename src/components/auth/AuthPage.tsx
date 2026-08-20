import Signin from "./Signin";
import Signup from "./Signup";

const AuthPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center transition-colors duration-300 bg-surface-page">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
        {/* Formulario de Iniciar Sesión */}
        <div className="p-6 rounded-lg shadow-md transition-colors duration-300 bg-surface">
          <h2 className="text-center text-3xl font-extrabold mb-6 text-content">
            Iniciar sesión
          </h2>
          <Signin />
        </div>

        {/* Formulario de Registro */}
        <div className="p-6 rounded-lg shadow-md transition-colors duration-300 bg-surface">
          <h2 className="text-center text-3xl font-extrabold mb-6 text-content">
            Registrarse
          </h2>
          <Signup />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;