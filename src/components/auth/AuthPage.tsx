import Signin from "./Signin";
import Signup from "./Signup";

const AuthPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
        {/* Formulario de Iniciar Sesión */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-300">
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-6">
            Iniciar sesión
          </h2>
          <Signin />
        </div>

        {/* Formulario de Registro */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-300">
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-6">
            Registrarse
          </h2>
          <Signup />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;