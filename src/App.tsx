// src/App.tsx (Actualizado con ruta ChildView)
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./components/dashboard/Dashboard";
import RewardTracker from "./components/dashboard/RewardTracker";
import ChildView from "./components/dashboard/ChildView";
import FaqAdmin from "./components/dashboard/FaqAdmin";
import RutaSoloAdmin from "./components/RutaSoloAdmin";
import Faqs from "./components/dashboard/Faqs";

const App = () => {
  const [user, loading, error] = useAuthState(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-content-muted">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="text-center max-w-md">
          <div className="text-danger-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2 text-content">
            Error de Conexión
          </h2>
          <p className="mb-4 text-negative-text">
            {error.message}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Reintentar
          </button>
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
        
        {/* Sistema de puntos completo para padres (requiere autenticación) */}
        <Route 
          path="/reward-tracker/:familyId/:childId" 
          element={user ? <RewardTracker /> : <Navigate to="/" replace />} 
        />
        
        {/* Vista simplificada para hijos (NO requiere autenticación) */}
        <Route 
          path="/child-view/:familyId/:childId" 
          element={<ChildView />} 
        />
        
        {/* FAQs públicas (NO requiere autenticación) */}
        <Route 
          path="/faqs" 
          element={<Faqs />} 
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