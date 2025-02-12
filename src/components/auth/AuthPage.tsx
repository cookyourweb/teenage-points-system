import Signin from "./Signin";
import Signup from "./Signup";

const AuthPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulario de Iniciar Sesión */}
        <div>
          <h2 className="text-center text-3xl font-extrabold" style={{ color: 'var(--color-gray-900)' }}>
            Iniciar sesión
          </h2>
          <Signin />
        </div>

        {/* Formulario de Registro */}
        <div>
          <h2 className="text-center text-3xl font-extrabold" style={{ color: 'var(--color-gray-900)' }}>
            Registrarse
          </h2>
          <Signup />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;