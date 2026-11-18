import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import PublicOnlyRoute from "./components/routing/PublicOnlyRoute";
import LoginPage from "./pages/LoginPage";

// Carga diferida por pantalla (Etapa 6): cada módulo se descarga al abrirlo por
// primera vez, lo que reduce el archivo inicial. El indicador de carga está en
// Layout (Suspense alrededor del contenido), así el menú no desaparece.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const PassengersPage = lazy(() => import("./pages/pasajeros/PassengersPage"));
const PassengerDetailPage = lazy(() => import("./pages/pasajeros/PassengerDetailPage"));
const PassengerFormPage = lazy(() => import("./pages/pasajeros/PassengerFormPage"));
const TripsPage = lazy(() => import("./pages/viajes/TripsPage"));
const TripDetailPage = lazy(() => import("./pages/viajes/TripDetailPage"));
const TripFormPage = lazy(() => import("./pages/viajes/TripFormPage"));
const AttendancePage = lazy(() => import("./pages/asistencias/AttendancePage"));
const DriversPage = lazy(() => import("./pages/choferes/DriversPage"));
const DriverDetailPage = lazy(() => import("./pages/choferes/DriverDetailPage"));
const DriverFormPage = lazy(() => import("./pages/choferes/DriverFormPage"));
const VehiclesPage = lazy(() => import("./pages/vehiculos/VehiclesPage"));
const VehicleDetailPage = lazy(() => import("./pages/vehiculos/VehicleDetailPage"));
const VehicleFormPage = lazy(() => import("./pages/vehiculos/VehicleFormPage"));
const AgendaPage = lazy(() => import("./pages/agenda/AgendaPage"));
const TurnoDetailPage = lazy(() => import("./pages/agenda/TurnoDetailPage"));
const TurnoFormPage = lazy(() => import("./pages/agenda/TurnoFormPage"));
const ExpensesPage = lazy(() => import("./pages/gastos/ExpensesPage"));
const ExpenseDetailPage = lazy(() => import("./pages/gastos/ExpenseDetailPage"));
const ExpenseFormPage = lazy(() => import("./pages/gastos/ExpenseFormPage"));
const BudgetsPage = lazy(() => import("./pages/presupuestos/BudgetsPage"));
const BudgetDetailPage = lazy(() => import("./pages/presupuestos/BudgetDetailPage"));
const BudgetFormPage = lazy(() => import("./pages/presupuestos/BudgetFormPage"));

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
        <Route path="/gastos" element={<ExpensesPage />} />
        <Route path="/gastos/nuevo" element={<ExpenseFormPage key="nuevo" />} />
        <Route path="/gastos/:id" element={<ExpenseDetailPage />} />
        <Route path="/gastos/:id/editar" element={<ExpenseFormPage key="editar" />} />
        <Route path="/presupuestos" element={<BudgetsPage />} />
        <Route path="/presupuestos/nuevo" element={<BudgetFormPage key="nuevo" />} />
        <Route path="/presupuestos/:id" element={<BudgetDetailPage />} />
        <Route path="/presupuestos/:id/editar" element={<BudgetFormPage key="editar" />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
