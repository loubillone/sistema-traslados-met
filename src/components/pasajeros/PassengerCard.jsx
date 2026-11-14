import { Link } from "react-router-dom";
import { DollarSign, Eye, FileText, History, SquarePen, UserCheck, UserX } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import { fullName } from "../../utils/selectors";

const ICON = { size: 16, strokeWidth: 2, "aria-hidden": true };

/** Tarjeta del listado de pasajeros (diseño de Figma). */
export default function PassengerCard({ pasajero, institucion, counters, highlighted = false, onDeactivate, onReactivate }) {
  const ficha = `/pasajeros/${pasajero.id}`;
  const asistencia = counters?.asistencia;
  const porcentaje = asistencia?.porcentaje;

  const className = ["passenger-card", !pasajero.activo && "is-inactive", highlighted && "is-highlighted"]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <div className="passenger-card-main">
        <div className="passenger-card-heading">
          <h3 className="passenger-card-name">
            <Link to={ficha}>{fullName(pasajero)}</Link>
          </h3>
          {!pasajero.activo && <StatusBadge type="pasajero" estado="inactivo" />}
        </div>
        <div className="passenger-card-dni">DNI: {pasajero.dni}</div>

        <dl className="passenger-card-grid">
          <div>
            <dt>Teléfono</dt>
            <dd>{pasajero.telefono || "—"}</dd>
          </div>
          <div>
            <dt>Obra Social</dt>
            <dd>{pasajero.obraSocial || "—"}</dd>
          </div>
          <div className="passenger-card-wide">
            <dt>Institución</dt>
            <dd>{institucion?.nombre ?? "Sin destino habitual"}</dd>
          </div>
        </dl>
      </div>

      <div className="passenger-card-column">
        <div className="passenger-card-column-title">Historial</div>
        <Link to={`${ficha}#viajes`} className="card-action-btn">
          <History {...ICON} />
          Viajes ({counters?.viajes ?? 0})
        </Link>
        <Link
          to={`${ficha}#asistencias`}
          className="card-action-btn"
          title="Porcentaje de presentes sobre las asistencias registradas"
        >
          <FileText {...ICON} />
          Asistencias ({porcentaje === null || porcentaje === undefined ? "—" : `${porcentaje}%`})
        </Link>
        <Link to={`${ficha}#presupuestos`} className="card-action-btn">
          <DollarSign {...ICON} />
          Presupuestos ({counters?.presupuestos ?? 0})
        </Link>
      </div>

      <div className="passenger-card-column">
        <div className="passenger-card-column-title">Acciones</div>
        <Link to={ficha} className="card-action-btn">
          <Eye {...ICON} />
          Ver ficha
        </Link>
        <Link to={`${ficha}/editar`} className="card-action-btn">
          <SquarePen {...ICON} />
          Editar
        </Link>
        {pasajero.activo ? (
          <button type="button" className="card-action-btn is-danger" onClick={() => onDeactivate(pasajero)}>
            <UserX {...ICON} />
            Desactivar
          </button>
        ) : (
          <button type="button" className="card-action-btn is-success" onClick={() => onReactivate(pasajero)}>
            <UserCheck {...ICON} />
            Reactivar
          </button>
        )}
      </div>
    </article>
  );
}
