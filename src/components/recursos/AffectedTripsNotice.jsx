import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { tripLabel } from "../../utils/resources";

/**
 * Aviso persistente en la ficha: viajes futuros asignados que no cumplen las
 * reglas actuales (baja, no disponible, mantenimiento o vencimientos).
 * Los viajes no se modifican: se resuelven desde Gestión de Viajes.
 */
export default function AffectedTripsNotice({ viajes, filterParam, resourceId, today, reason }) {
  if (viajes.length === 0) return null;
  return (
    <div className="trip-notice trip-notice--warning" role="alert" data-testid="viajes-afectados">
      <TriangleAlert size={18} strokeWidth={2} aria-hidden="true" />
      <div>
        <strong>
          {viajes.length} {viajes.length === 1 ? "viaje futuro asignado requiere" : "viajes futuros asignados requieren"} una nueva asignación.
        </strong>{" "}
        {reason}
        <ul className="trip-notice-list">
          {viajes.slice(0, 5).map((v) => (
            <li key={v.id}>
              <Link to={`/viajes/${v.id}`} className="link-app small">
                {tripLabel(v)}
              </Link>
            </li>
          ))}
          {viajes.length > 5 && <li>y {viajes.length - 5} más…</li>}
        </ul>
        <Link to={`/viajes?${filterParam}=${resourceId}&estado=programado&desde=${today}`} className="link-app">
          Resolver en Gestión de Viajes
        </Link>
      </div>
    </div>
  );
}
