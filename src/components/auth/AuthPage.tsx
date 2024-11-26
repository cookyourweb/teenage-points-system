import { useState } from "react";
import Signup from "./Signup";
import Signin from "./Signin";

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Pestañas */}
        <div className="flex border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab("signin")}
            className={`w-1/2 py-2 text-center text-lg font-semibold ${
              activeTab === "signin"
                ? "border-b-4 border-indigo-600 text-indigo-600"
                : "text-gray-500"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setActiveTab("signup")}
            className={`w-1/2 py-2 text-center text-lg font-semibold ${
              activeTab === "signup"
                ? "border-b-4 border-indigo-600 text-indigo-600"
                : "text-gray-500"
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Contenido de las pestañas */}
        <div className="mt-6">
          {activeTab === "signin" && <Signin />}
          {activeTab === "signup" && <Signup />}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
