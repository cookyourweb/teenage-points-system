// src/App.tsx (Actualizado con ruta ChildView)
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSesion } from "./auth/useSesion";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./components/dashboard/Dashboard";
import RewardTracker from "./components/dashboard/RewardTracker";
import ChildView from "./components/dashboard/ChildView";
import FaqAdmin from "./components/dashboard/FaqAdmin";
import RutaSoloAdmin from "./components/RutaSoloAdmin";
import RutaDeMiFamilia from "./components/RutaDeMiFamilia";
import PaginaFaqs from "./components/PaginaFaqs";

const App = () => {
  // La sesión la observa un solo AuthProvider (src/auth). App ya no se
  // suscribe a Firebase por su cuenta: solo lee lo que el proveedor expone.
  const sesion = useSesion();
  const user = sesion.tipo === "autenticado" ? sesion.user : null;

  if (sesion.tipo === "cargando") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-content-muted">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Ruta principal */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} 
        />
        
        {/* Dashboard principal (requiere autenticación) */}
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/" replace />} 
        />
        
        {/* Sistema de puntos. Requiere sesion Y PERTENECER a esa familia.
            Antes la condicion era solo `user`: cualquiera con cuenta que
            cambiara el familyId de la URL entraba en los puntos de otra
            familia, y no solo a mirar. */}
        <Route
          path="/reward-tracker/:familyId/:childId"
          element={
            <RutaDeMiFamilia uid={user?.uid}>
              <RewardTracker />
            </RutaDeMiFamilia>
          }
        />
        
        {/* Vista simplificada para hijos (NO requiere autenticación) */}
        <Route 
          path="/child-view/:familyId/:childId" 
          element={<ChildView />} 
        />
        
        {/* FAQs. Requieren sesión: el contenido es del método y sus
            reglas de Firestore ya no lo sirven a quien no ha iniciado sesión. */}
        <Route 
          path="/faqs" 
          element={user ? <PaginaFaqs /> : <Navigate to="/" replace />} 
        />
        
        {/* Administración de FAQs. SOLO administradores.
            Antes la condición era `user`, que solo comprueba que hayas
            iniciado sesión: cualquiera con cuenta podía borrar las FAQs de
            toda la familia escribiendo esta URL. */}
        <Route
          path="/admin/faqs"
          element={
            <RutaSoloAdmin uid={user?.uid}>
              <FaqAdmin />
            </RutaSoloAdmin>
          }
        />
        
        {/* Ruta 404 - Página no encontrada */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center bg-surface-page">
              <div className="text-center max-w-md">
                <div className="text-neutral-400 text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-bold mb-2 text-content">
                  Página no encontrada
                </h2>
                <p className="mb-4 text-content-muted">
                  La página que buscas no existe o ha sido movida.
                </p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Volver al inicio
                </button>
              </div>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;