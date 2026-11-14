import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import PublicOnlyRoute from "./components/routing/PublicOnlyRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import PassengersPage from "./pages/pasajeros/PassengersPage";
import PassengerDetailPage from "./pages/pasajeros/PassengerDetailPage";
import PassengerFormPage from "./pages/pasajeros/PassengerFormPage";
import { PENDING_MODULES } from "./config/navigation";

const App = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pasajeros" element={<PassengersPage />} />
        <Route path="/pasajeros/nuevo" element={<PassengerFormPage key="nuevo" />} />
        <Route path="/pasajeros/:id" element={<PassengerDetailPage />} />
        <Route path="/pasajeros/:id/editar" element={<PassengerFormPage key="editar" />} />
        {PENDING_MODULES.map((module) => (
          <Route key={module.path} path={module.path} element={<ModulePlaceholder key={module.path} module={module} />} />
        ))}
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
