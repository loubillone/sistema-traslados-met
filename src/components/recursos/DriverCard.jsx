import { Link } from "react-router-dom";
import { Eye, SquarePen, TriangleAlert, UserCheck, UserX } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import ExpiryNotice from "./ExpiryNotice";
import { DISPONIBILIDAD_CHOFER } from "../../constants/estados";
import { formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";

const initials = (chofer) => `${chofer.nombre[0] ?? ""}${chofer.apellido[0] ?? ""}`.toUpperCase();

/** Tarjeta del chofer (diseño de Figma) con disponibilidad y vencimiento de licencia. */
export default function DriverCard({ chofer, status, today, affected, onAvailability, onDeactivate, onReactivate }) {
  return (
    <article className={`driver-card${chofer.activo ? "" : " is-inactive"}`} data-testid={`chofer-${chofer.id}`}>
      <div className="driver-card-top">
        <div className="driver-avatar" aria-hidden="true">
          {initials(chofer)}
        </div>
        <div className="driver-card-info">
          <div className="driver-card-heading">
            <h3 className="driver-card-name">
              <Link to={`/choferes/${chofer.id}`}>{fullName(chofer)}</Link>
            </h3>
            <StatusBadge type="chofer" estado={status} />
          </div>
          <div className="driver-card-dni">DNI: {formatDni(chofer.dni)}</div>
          <dl className="driver-card-grid">
            <div>
              <dt>Teléfono</dt>
              <dd>{chofer.telefono}</dd>
            </div>
            <div>
              <dt>Nº Licencia</dt>
              <dd>
                {chofer.licencia}
                {chofer.categoriaLicencia && <span className="driver-card-category"> · {chofer.categoriaLicencia}</span>}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <ExpiryNotice label="Licencia vence" fecha={chofer.vencimientoLicencia} today={today} />

      {affected > 0 && (
        <div className="driver-card-affected" role="status">
          <TriangleAlert size={15} strokeWidth={2} aria-hidden="true" />
          {affected} {affected === 1 ? "viaje futuro requiere" : "viajes futuros requieren"} reasignación
        </div>
      )}

      <div className="driver-card-actions">
        <Link to={`/choferes/${chofer.id}`} className="card-action-btn">
          <Eye size={16} strokeWidth={2} aria-hidden="true" />
          Ver ficha
        </Link>
        <Link to={`/choferes/${chofer.id}/editar`} className="card-action-btn">
          <SquarePen size={16} strokeWidth={2} aria-hidden="true" />
          Editar
        </Link>
        {chofer.activo ? (
          <>
            <select
              className="input-app select-app driver-availability-select"
              value={chofer.disponibilidad}
              onChange={(event) => onAvailability(chofer, event.target.value)}
              aria-label={`Disponibilidad de ${fullName(chofer)}`}
            >
              {["disponible", "guardia", "no_disponible"].map((value) => (
                <option key={value} value={value}>
                  {DISPONIBILIDAD_CHOFER[value].label}
                </option>
              ))}
            </select>
            <button type="button" className="card-action-btn is-danger" onClick={() => onDeactivate(chofer)}>
              <UserX size={16} strokeWidth={2} aria-hidden="true" />
              Desactivar
            </button>
          </>
        ) : (
          <button type="button" className="card-action-btn is-success" onClick={() => onReactivate(chofer)}>
            <UserCheck size={16} strokeWidth={2} aria-hidden="true" />
            Reactivar
          </button>
        )}
      </div>
    </article>
  );
}
