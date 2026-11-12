import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

/** Simulación de sesión: sin sesión iniciada, redirige al login. */
export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
