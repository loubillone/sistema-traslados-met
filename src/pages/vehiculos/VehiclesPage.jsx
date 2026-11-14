import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Plus, Search, Shield, SquarePen, TriangleAlert, Truck, Wrench, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import StatCard from "../../components/common/StatCard";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import SelectField from "../../components/common/SelectField";
import ExpiryNotice from "../../components/recursos/ExpiryNotice";
import useData from "../../hooks/useData";
import { formatDate, todayISO } from "../../utils/dates";
import { countExpiring, getAffectedVehicleTrips, getExpiryInfo, matchesVehicle } from "../../utils/resources";

const FILTROS = {
  activo: { label: "Activos", test: (v) => v.activo !== false && v.estado === "activo" },
  mantenimiento: { label: "En mantenimiento", test: (v) => v.activo !== false && v.estado === "mantenimiento" },
  inactivo: { label: "Dados de baja", test: (v) => v.activo === false },
};

/** Gestión de Vehículos (CU-12): indicadores, alertas de vencimiento y tabla de la flota. */
export default function VehiclesPage() {
  const { data } = useData();
  const today = todayISO();
  const [term, setTerm] = useState("");
  const [estado, setEstado] = useState("");

  const flota = data.vehiculos.filter((v) => v.activo !== false);
  const activos = flota.filter((v) => v.estado === "activo").length;
  const vtvPorVencer = countExpiring(flota.map((v) => v.vencimientoVTV), today);
  const seguroPorVencer = countExpiring(flota.map((v) => v.vencimientoSeguro), today);

  // Viajes futuros que requieren reasignación, por vehículo.
  const affected = Object.fromEntries(data.vehiculos.map((v) => [v.id, getAffectedVehicleTrips(data.viajes, v, today).length]));

  // Alertas: documentación vencida o con menos de 60 días, ordenadas por urgencia.
  const alertas = flota
    .flatMap((v) => [
      { vehiculo: v, doc: "VTV", fecha: v.vencimientoVTV },
      { vehiculo: v, doc: "Seguro", fecha: v.vencimientoSeguro },
    ])
    .map((a) => ({ ...a, info: getExpiryInfo(a.fecha, today) }))
    .filter((a) => a.info.level !== "success" && a.info.dias !== null)
    .sort((a, b) => a.info.dias - b.info.dias);

  const results = data.vehiculos
    .filter((v) => (estado ? FILTROS[estado].test(v) : true))
    .filter((v) => matchesVehicle(v, term))
    .sort((a, b) => Number(a.activo === false) - Number(b.activo === false) || a.patente.localeCompare(b.patente));

  const columns = [
    {
      key: "patente",
      header: "Patente",
      render: (v) => (
        <Link to={`/vehiculos/${v.id}`} className="vehicle-plate">
          {v.patente}
        </Link>
      ),
      cellClassName: "text-nowrap",
    },
    { key: "tipo", header: "Tipo", render: (v) => v.tipo, cellClassName: "cell-muted" },
    { key: "capacidad", header: "Capacidad", render: (v) => `${v.capacidad} personas`, cellClassName: "cell-muted text-nowrap" },
    { key: "fechaVTV", header: "Fecha VTV", render: (v) => formatDate(v.vencimientoVTV), cellClassName: "text-nowrap" },
    { key: "diasVTV", header: "Días VTV", render: (v) => <ExpiryNotice variant="inline" fecha={v.vencimientoVTV} today={today} /> },
    { key: "fechaSeguro", header: "Fecha Seguro", render: (v) => formatDate(v.vencimientoSeguro), cellClassName: "text-nowrap" },
    { key: "diasSeguro", header: "Días Seguro", render: (v) => <ExpiryNotice variant="inline" fecha={v.vencimientoSeguro} today={today} /> },
    {
      key: "estado",
      header: "Estado",
      render: (v) => (
        <span className="vehicle-status">
          <StatusBadge type="vehiculo" estado={v.activo === false ? "inactivo" : v.estado} />
          {affected[v.id] > 0 && (
            <span className="vehicle-affected" title={`${affected[v.id]} viajes futuros requieren reasignación`}>
              <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" /> {affected[v.id]}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-end",
      cellClassName: "text-end",
      render: (v) => (
        <div className="trip-actions">
          <Link to={`/vehiculos/${v.id}`} className="trip-action" title="Ver ficha" aria-label={`Ver ficha del vehículo ${v.patente}`}>
            <Eye size={17} strokeWidth={2} />
          </Link>
          <Link to={`/vehiculos/${v.id}/editar`} className="trip-action" title="Editar" aria-label={`Editar vehículo ${v.patente}`}>
            <SquarePen size={17} strokeWidth={2} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Gestión de Vehículos"
        subtitle="Control de flota y documentación vehicular"
        actions={
          <Link to="/vehiculos/nuevo" className="btn-app btn-app-primary btn-app-lg">
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nuevo Vehículo
          </Link>
        }
      />

      <div className="row g-4 mb-4" data-testid="indicadores-vehiculos">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard layout="horizontal" icon={Truck} color="navy" value={activos} label="Vehículos activos" detail={`de ${flota.length} en la flota`} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard layout="horizontal" icon={Wrench} color="yellow" value={flota.length - activos} label="En mantenimiento" detail="No admiten viajes nuevos" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard layout="horizontal" icon={TriangleAlert} color="orange" value={vtvPorVencer} label="VTV próximas a vencer" detail="Vencidas o menos de 60 días" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard layout="horizontal" icon={Shield} color="red" value={seguroPorVencer} label="Seguros próximos a vencer" detail="Vencidos o menos de 60 días" />
        </div>
      </div>

      {alertas.length > 0 && (
        <ContentCard title="Alertas de vencimiento" className="mb-4">
          <ul className="expiry-alerts" data-testid="alertas-vencimiento">
            {alertas.map((a) => (
              <li key={`${a.vehiculo.id}-${a.doc}`} className={`expiry-alert expiry-alert--${a.info.level}`}>
                <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  <Link to={`/vehiculos/${a.vehiculo.id}`} className="vehicle-plate">{a.vehiculo.patente}</Link> · {a.doc}{" "}
                  {a.info.expired ? "vencida" : "vence"} el {formatDate(a.fecha)} — {a.info.text}
                </span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      <ContentCard title="Flota de Vehículos">
        <div className="passenger-toolbar vehicle-toolbar">
          <div className="passenger-search" role="search">
            <div className="passenger-search-field">
              <Search className="input-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                className="input-app has-icon"
                placeholder="Buscar por patente, tipo o modelo"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                aria-label="Buscar vehículo por patente"
                maxLength={30}
              />
              {term && (
                <button type="button" className="search-clear" onClick={() => setTerm("")} aria-label="Limpiar búsqueda">
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
          <SelectField
            id="vehiculos-estado"
            className="vehicle-filter"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            placeholder="Todos los estados"
            options={Object.entries(FILTROS).map(([value, f]) => ({ value, label: f.label }))}
            aria-label="Filtrar por estado"
          />
        </div>
        <p className="list-summary">
          {results.length} {results.length === 1 ? "vehículo" : "vehículos"}
          {term.trim() ? ` coinciden con “${term.trim()}”` : ""}
        </p>
        <DataTable columns={columns} rows={results} emptyMessage="Ningún vehículo coincide con la búsqueda." />
      </ContentCard>
    </>
  );
}
