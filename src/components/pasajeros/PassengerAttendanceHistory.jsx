import { useState } from "react";
import { Info } from "lucide-react";
import DataTable from "../common/DataTable";
import Pagination from "../common/Pagination";
import StatusBadge from "../common/StatusBadge";
import { formatDate } from "../../utils/dates";
import { paginate } from "../../utils/format";

const PAGE_SIZE = 10;

/** Historial de asistencias vinculadas a los viajes del pasajero. */
export default function PassengerAttendanceHistory({ asistencias, resumen, viajesById, lookups }) {
  const [page, setPage] = useState(1);

  const columns = [
    { key: "fecha", header: "Fecha", render: (a) => formatDate(a.fecha), cellClassName: "text-nowrap" },
    { key: "hora", header: "Hora", render: (a) => viajesById[a.viajeId]?.hora ?? "—" },
    {
      key: "destino",
      header: "Destino",
      render: (a) => lookups.instituciones[viajesById[a.viajeId]?.institucionId]?.nombre ?? "—",
      cellClassName: "cell-muted",
    },
    { key: "estado", header: "Estado", render: (a) => <StatusBadge type="asistencia" estado={a.estado} /> },
    { key: "observaciones", header: "Observaciones", render: (a) => a.observaciones || "", cellClassName: "cell-muted" },
  ];

  return (
    <>
      <div className="attendance-summary">
        <div className="attendance-metric attendance-metric--success">
          <span className="attendance-metric-value">{resumen.presentes}</span>
          <span className="attendance-metric-label">Presentes</span>
        </div>
        <div className="attendance-metric attendance-metric--danger">
          <span className="attendance-metric-value">{resumen.ausentes}</span>
          <span className="attendance-metric-label">Ausentes</span>
        </div>
        <div className="attendance-metric attendance-metric--warning">
          <span className="attendance-metric-value">{resumen.justificadas}</span>
          <span className="attendance-metric-label">Justificadas</span>
        </div>
        <div className="attendance-metric attendance-metric--info">
          <span className="attendance-metric-value">
            {resumen.porcentaje === null ? "—" : `${resumen.porcentaje}%`}
          </span>
          <span className="attendance-metric-label">Asistencia</span>
        </div>
      </div>

      <p className="criteria-note">
        <Info size={16} strokeWidth={2} aria-hidden="true" />
        <span>
          Porcentaje de asistencia = presentes ÷ asistencias registradas
          {resumen.total > 0 ? ` (${resumen.presentes} de ${resumen.total})` : ""}. Los viajes que todavía no se
          realizaron no tienen asistencia registrada y no se incluyen en el cálculo.
        </span>
      </p>

      <DataTable
        columns={columns}
        rows={paginate(asistencias, page, PAGE_SIZE)}
        emptyMessage="No hay asistencias registradas para este pasajero."
      />
      <Pagination page={page} pageSize={PAGE_SIZE} totalItems={asistencias.length} onPageChange={setPage} />
    </>
  );
}
