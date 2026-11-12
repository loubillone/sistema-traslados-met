import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

/** Si ya hay una sesión iniciada, el login redirige a la pantalla solicitada o al dashboard. */
export default function PublicOnlyRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user) return <Navigate to={location.state?.from ?? "/dashboard"} replace />;
  return children;
}
