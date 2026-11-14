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
import { tripRoute } from "../../utils/trips";

const PAGE_SIZE = 10;

const FILTERS = {
  todos: () => true,
  programados: (v) => v.estado === "programado" || v.estado === "en_curso",
  realizados: (v) => v.estado === "finalizado",
  cancelados: (v) => v.estado === "cancelado",
};

/**
 * Historial de viajes del pasajero. Orden: primero los próximos (del más cercano
 * al más lejano) y luego los anteriores (del más reciente al más antiguo).
 */
export default function PassengerTripsHistory({ viajes, todayIso, lookups, backTo }) {
  const [filter, setFilter] = useState("todos");
  const [page, setPage] = useState(1);

  const ordered = useMemo(() => {
    const key = (v) => `${v.fecha} ${v.hora}`;
    const upcoming = viajes
      .filter((v) => v.fecha >= todayIso && v.estado !== "finalizado" && v.estado !== "cancelado")
      .sort((a, b) => key(a).localeCompare(key(b)));
    const upcomingIds = new Set(upcoming.map((v) => v.id));
    const rest = viajes.filter((v) => !upcomingIds.has(v.id)).sort((a, b) => key(b).localeCompare(key(a)));
    return [...upcoming, ...rest];
  }, [viajes, todayIso]);

  const filtered = useMemo(() => ordered.filter(FILTERS[filter]), [ordered, filter]);

  const options = Object.keys(FILTERS).map((value) => ({
    value,
    label: { todos: "Todos", programados: "Programados", realizados: "Realizados", cancelados: "Cancelados" }[value],
    count: ordered.filter(FILTERS[value]).length,
  }));

  const columns = [
    { key: "fecha", header: "Fecha", render: (v) => formatDate(v.fecha), cellClassName: "text-nowrap" },
    { key: "hora", header: "Hora" },
    { key: "origen", header: "Origen", render: (v) => tripRoute(v, lookups.instituciones[v.institucionId]).origen, cellClassName: "cell-muted" },
    { key: "destino", header: "Destino", render: (v) => tripRoute(v, lookups.instituciones[v.institucionId]).destino },
    { key: "chofer", header: "Chofer", render: (v) => fullName(lookups.choferes[v.choferId]), cellClassName: "cell-muted" },
    {
      key: "vehiculo",
      header: "Vehículo",
      render: (v) => lookups.vehiculos[v.vehiculoId]?.patente ?? "—",
      cellClassName: "cell-muted text-nowrap",
    },
    { key: "estado", header: "Estado", render: (v) => <StatusBadge estado={v.estado} /> },
    {
      key: "detalle",
      header: "Detalle",
      className: "text-end",
      cellClassName: "text-end",
      render: (v) => (
        <Link
          to={`/viajes/${v.id}`}
          state={backTo ? { from: backTo } : undefined}
          className="trip-action"
          title="Ver detalle del viaje"
          aria-label={`Ver detalle del viaje ${v.id}`}
        >
          <Eye size={17} strokeWidth={2} />
        </Link>
      ),
    },
  ];

  return (
    <>
      <div className="section-toolbar">
        <SegmentedControl
          options={options}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          ariaLabel="Filtrar viajes por estado"
        />
      </div>
      <DataTable
        columns={columns}
        rows={paginate(filtered, page, PAGE_SIZE)}
        emptyMessage="No hay viajes para el filtro seleccionado."
      />
      <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
    </>
  );
}
