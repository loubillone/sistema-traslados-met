import { Link } from "react-router-dom";
import { ClipboardPen, Eye, SquarePen } from "lucide-react";
import DataTable from "../common/DataTable";
import StatusBadge from "../common/StatusBadge";
import { formatDate } from "../../utils/dates";
import { formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { tripRoute } from "../../utils/trips";
import { attendanceNote } from "../../utils/attendance";

const BLOCKED_TITLES = {
  futuro: "Viaje futuro: la asistencia se registra el día del viaje o después",
  no_corresponde: "Viaje cancelado: no admite nuevas asistencias",
};

/** Planilla de viajes con su asistencia y la acción de registrar o editar. */
export default function AttendanceTable({ rows, instituciones, onOpen, emptyMessage, backTo = "/asistencias" }) {
  const columns = [
    { key: "fecha", header: "Fecha", render: (r) => formatDate(r.viaje.fecha), cellClassName: "text-nowrap" },
    { key: "hora", header: "Hora", render: (r) => r.viaje.hora },
    { key: "pasajero", header: "Pasajero", render: (r) => fullName(r.pasajero) },
    { key: "dni", header: "DNI", render: (r) => (r.pasajero ? formatDni(r.pasajero.dni) : "—"), cellClassName: "cell-muted text-nowrap" },
    { key: "origen", header: "Origen", render: (r) => tripRoute(r.viaje, instituciones[r.viaje.institucionId]).origen, cellClassName: "cell-muted" },
    { key: "destino", header: "Destino", render: (r) => tripRoute(r.viaje, instituciones[r.viaje.institucionId]).destino, cellClassName: "cell-muted" },
    { key: "viaje", header: "Estado del viaje", render: (r) => <StatusBadge estado={r.viaje.estado} /> },
    { key: "asistencia", header: "Asistencia", render: (r) => <StatusBadge type="registro" estado={r.status} /> },
    { key: "observaciones", header: "Observaciones", render: (r) => attendanceNote(r.asistencia), cellClassName: "cell-muted attendance-note-cell" },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-end",
      cellClassName: "text-end",
      render: (r) => {
        const label = `${fullName(r.pasajero)}, viaje ${r.viaje.id}`;
        return (
          <div className="trip-actions">
            {r.asistencia ? (
              <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => onOpen(r.viaje.id, { intent: "editar" })} aria-label={`Editar asistencia de ${label}`}>
                <SquarePen size={15} strokeWidth={2} aria-hidden="true" />
                Editar
              </button>
            ) : r.status === "sin_registrar" ? (
              <button type="button" className="btn-app btn-app-primary btn-app-sm" onClick={() => onOpen(r.viaje.id, { intent: "registrar" })} aria-label={`Registrar asistencia de ${label}`}>
                <ClipboardPen size={15} strokeWidth={2} aria-hidden="true" />
                Registrar
              </button>
            ) : (
              <span className="attendance-blocked" title={BLOCKED_TITLES[r.status]}>
                {r.status === "futuro" ? "Viaje futuro" : "Cancelado"}
              </span>
            )}
            <Link to={`/viajes/${r.viaje.id}`} state={{ from: backTo }} className="trip-action" title="Ver viaje" aria-label={`Ver viaje ${r.viaje.id}`}>
              <Eye size={17} strokeWidth={2} />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="attendance-table">
      <DataTable columns={columns} rows={rows} emptyMessage={emptyMessage} />
    </div>
  );
}
