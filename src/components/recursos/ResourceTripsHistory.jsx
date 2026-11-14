import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import DataTable from "../common/DataTable";
import Pagination from "../common/Pagination";
import SegmentedControl from "../common/SegmentedControl";
import StatusBadge from "../common/StatusBadge";
import { formatDate } from "../../utils/dates";
import { paginate } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { sortTripsAgenda, tripRoute } from "../../utils/trips";

const PAGE_SIZE = 10;

const FILTERS = {
  todos: { label: "Todos", test: () => true },
  proximos: { label: "Próximos", test: (v, today) => v.fecha >= today && (v.estado === "programado" || v.estado === "en_curso") },
  realizados: { label: "Realizados", test: (v) => v.estado === "finalizado" },
  cancelados: { label: "Cancelados", test: (v) => v.estado === "cancelado" },
};

/**
 * Viajes asignados a un chofer o vehículo. Los datos relacionados se obtienen
 * por identificador. mode: "chofer" (muestra el vehículo) o "vehiculo" (muestra el chofer).
 */
export default function ResourceTripsHistory({ viajes, mode, lookups, today, backTo }) {
  const [filter, setFilter] = useState("todos");
  const [page, setPage] = useState(1);

  const ordered = useMemo(() => sortTripsAgenda(viajes, today), [viajes, today]);
  const filtered = useMemo(() => ordered.filter((v) => FILTERS[filter].test(v, today)), [ordered, filter, today]);

  const columns = [
    { key: "fecha", header: "Fecha", render: (v) => formatDate(v.fecha), cellClassName: "text-nowrap" },
    { key: "hora", header: "Hora" },
    { key: "pasajero", header: "Pasajero", render: (v) => fullName(lookups.pasajeros[v.pasajeroId]) },
    mode === "chofer"
      ? { key: "vehiculo", header: "Vehículo", render: (v) => lookups.vehiculos[v.vehiculoId]?.patente ?? "—", cellClassName: "cell-muted text-nowrap" }
      : { key: "chofer", header: "Chofer", render: (v) => fullName(lookups.choferes[v.choferId]), cellClassName: "cell-muted" },
    { key: "destino", header: "Destino", render: (v) => tripRoute(v, lookups.instituciones[v.institucionId]).destino, cellClassName: "cell-muted" },
    { key: "estado", header: "Estado", render: (v) => <StatusBadge estado={v.estado} /> },
    {
      key: "detalle",
      header: "Detalle",
      className: "text-end",
      cellClassName: "text-end",
      render: (v) => (
        <Link to={`/viajes/${v.id}`} state={{ from: backTo }} className="trip-action" title="Ver detalle del viaje" aria-label={`Ver detalle del viaje ${v.id}`}>
          <Eye size={17} strokeWidth={2} />
        </Link>
      ),
    },
  ];

  return (
    <>
      <div className="section-toolbar">
        <SegmentedControl
          ariaLabel="Filtrar viajes asignados"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={Object.entries(FILTERS).map(([value, f]) => ({ value, label: f.label, count: ordered.filter((v) => f.test(v, today)).length }))}
        />
      </div>
      <DataTable columns={columns} rows={paginate(filtered, page, PAGE_SIZE)} emptyMessage="No hay viajes para el filtro seleccionado." />
      <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
    </>
  );
}
