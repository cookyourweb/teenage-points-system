import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./components/dashboard/Dashboard";
import RewardTracker from "./components/dashboard/RewardTracker";
import FaqAdmin from "./components/dashboard/FaqAdmin";
import Faqs from "./components/dashboard/Faqs";

const App = () => {
  const [user, loading, error] = useAuthState(auth);

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/reward-tracker/:familyId/:childId" element={user ? <RewardTracker /> : <Navigate to="/" />} />
        <Route path="/faqs" element={user ? <Faqs /> : <Navigate to="/" />} />
        <Route path="/admin/faqs" element={user ? <FaqAdmin /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
