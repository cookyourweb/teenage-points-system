// src/App.tsx (Actualizado con ruta ChildView)
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./components/dashboard/Dashboard";
import RewardTracker from "./components/dashboard/RewardTracker";
import ChildView from "./components/dashboard/ChildView";
import FaqAdmin from "./components/dashboard/FaqAdmin";
import Faqs from "./components/dashboard/Faqs";

const App = () => {
  const [user, loading, error] = useAuthState(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center max-w-md">
          <div className="text-danger-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Error de Conexión
          </h2>
          <p className="text-danger-600 dark:text-danger-400 mb-4">
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
        
        {/* Administración de FAQs (requiere autenticación) */}
        <Route 
          path="/admin/faqs" 
          element={user ? <FaqAdmin /> : <Navigate to="/" replace />} 
        />
        
        {/* Ruta 404 - Página no encontrada */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
              <div className="text-center max-w-md">
                <div className="text-neutral-400 text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  Página no encontrada
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
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