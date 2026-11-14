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
import TripsPage from "./pages/viajes/TripsPage";
import TripDetailPage from "./pages/viajes/TripDetailPage";
import TripFormPage from "./pages/viajes/TripFormPage";
import AttendancePage from "./pages/asistencias/AttendancePage";
import DriversPage from "./pages/choferes/DriversPage";
import DriverDetailPage from "./pages/choferes/DriverDetailPage";
import DriverFormPage from "./pages/choferes/DriverFormPage";
import VehiclesPage from "./pages/vehiculos/VehiclesPage";
import VehicleDetailPage from "./pages/vehiculos/VehicleDetailPage";
import VehicleFormPage from "./pages/vehiculos/VehicleFormPage";
import AgendaPage from "./pages/agenda/AgendaPage";
import TurnoDetailPage from "./pages/agenda/TurnoDetailPage";
import TurnoFormPage from "./pages/agenda/TurnoFormPage";
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
        <Route path="/viajes" element={<TripsPage />} />
        <Route path="/viajes/nuevo" element={<TripFormPage key="nuevo" />} />
        <Route path="/viajes/:id" element={<TripDetailPage />} />
        <Route path="/viajes/:id/editar" element={<TripFormPage key="editar" />} />
        <Route path="/asistencias" element={<AttendancePage />} />
        <Route path="/choferes" element={<DriversPage />} />
        <Route path="/choferes/nuevo" element={<DriverFormPage key="nuevo" />} />
        <Route path="/choferes/:id" element={<DriverDetailPage />} />
        <Route path="/choferes/:id/editar" element={<DriverFormPage key="editar" />} />
        <Route path="/vehiculos" element={<VehiclesPage />} />
        <Route path="/vehiculos/nuevo" element={<VehicleFormPage key="nuevo" />} />
        <Route path="/vehiculos/:id" element={<VehicleDetailPage />} />
        <Route path="/vehiculos/:id/editar" element={<VehicleFormPage key="editar" />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/agenda/nuevo" element={<TurnoFormPage key="nuevo" />} />
        <Route path="/agenda/:id" element={<TurnoDetailPage />} />
        <Route path="/agenda/:id/editar" element={<TurnoFormPage key="editar" />} />
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
