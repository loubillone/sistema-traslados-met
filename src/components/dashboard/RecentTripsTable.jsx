import { useMemo } from "react";
import DataTable from "../common/DataTable";
import StatusBadge from "../common/StatusBadge";
import useData from "../../hooks/useData";
import { buildIndex, fullName } from "../../utils/selectors";
import { formatDate } from "../../utils/dates";

export default function RecentTripsTable({ viajes }) {
  const { data } = useData();

  const columns = useMemo(() => {
    const pasajeros = buildIndex(data.pasajeros);
    const choferes = buildIndex(data.choferes);
    const vehiculos = buildIndex(data.vehiculos);
    const instituciones = buildIndex(data.instituciones);

    return [
      { key: "fecha", header: "Fecha", render: (v) => formatDate(v.fecha), cellClassName: "text-nowrap" },
      { key: "hora", header: "Hora" },
      { key: "pasajero", header: "Pasajero", render: (v) => fullName(pasajeros[v.pasajeroId]) },
      { key: "chofer", header: "Chofer", render: (v) => fullName(choferes[v.choferId]), cellClassName: "cell-muted" },
      {
        key: "vehiculo",
        header: "Vehículo",
        render: (v) => vehiculos[v.vehiculoId]?.patente ?? "—",
        cellClassName: "cell-muted text-nowrap",
      },
      {
        key: "destino",
        header: "Destino",
        render: (v) => instituciones[v.institucionId]?.nombre ?? "—",
        cellClassName: "cell-muted",
      },
      { key: "estado", header: "Estado", render: (v) => <StatusBadge estado={v.estado} /> },
    ];
  }, [data.pasajeros, data.choferes, data.vehiculos, data.instituciones]);

  return <DataTable columns={columns} rows={viajes} emptyMessage="No hay viajes registrados." />;
}
