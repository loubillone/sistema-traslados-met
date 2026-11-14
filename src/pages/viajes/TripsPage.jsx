import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CarFront, Funnel, Plus, SearchX } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import DataTable from "../../components/common/DataTable";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import TripFilters from "../../components/viajes/TripFilters";
import TripActions from "../../components/viajes/TripActions";
import useData from "../../hooks/useData";
import useTripActions from "../../hooks/useTripActions";
import { formatDate, todayISO } from "../../utils/dates";
import { formatDni, paginate } from "../../utils/format";
import { buildIndex, fullName } from "../../utils/selectors";
import { tripRoute } from "../../utils/trips";
import { ownUrlState, urlBaseKey } from "../../utils/urlState";
import {
  countActiveFilters,
  filterTrips,
  getDateRangeError,
  getTripActions,
  readTripFilters,
  sortTripsAgenda,
  TRIP_FILTER_KEYS,
} from "../../utils/trips";

const PAGE_SIZE = 15;

const readPage = (searchParams) => Math.max(1, Number(searchParams.get("pagina")) || 1);

function buildParams(filters, page) {
  const params = new URLSearchParams();
  TRIP_FILTER_KEYS.forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  if (page > 1) params.set("pagina", String(page));
  return params;
}

const viewFromSearch = (search) => {
  const searchParams = new URLSearchParams(search);
  return { filters: readTripFilters(searchParams), page: readPage(searchParams) };
};

// Ver utils/urlState.js: los filtros se conservan en la URL sin perder escritura.
const URL_SCOPE = "filtrosViajes";

/**
 * Gestión de Viajes: listado, filtros combinados (CU-05) y acciones por viaje.
 * Los filtros y la página se guardan en la URL: se conservan al volver desde el
 * detalle, al actualizar la página y al llegar desde el buscador global.
 */
export default function TripsPage() {
  const location = useLocation();
  return <TripsView key={urlBaseKey(location, URL_SCOPE)} />;
}

/**
 * Los filtros viven en el estado local y se copian a la URL. React Router
 * aplica los cambios de URL dentro de una transición: si los campos leyeran la
 * URL directamente, al escribir rápido se perderían caracteres o filtros.
 */
function TripsView() {
  const { data } = useData();
  const tripActions = useTripActions();
  const [, setSearchParams] = useSearchParams();
  const location = useLocation();
  const today = todayISO();

  const [view, setView] = useState(() => viewFromSearch(location.search));
  const { filters } = view;
  const activeCount = countActiveFilters(filters);
  const dateError = getDateRangeError(filters);
  const [showFilters, setShowFilters] = useState(activeCount > 0);

  const lookups = useMemo(
    () => ({
      pasajeros: buildIndex(data.pasajeros),
      choferes: buildIndex(data.choferes),
      vehiculos: buildIndex(data.vehiculos),
      instituciones: buildIndex(data.instituciones),
    }),
    [data.pasajeros, data.choferes, data.vehiculos, data.instituciones],
  );

  const results = useMemo(
    () => (dateError ? [] : sortTripsAgenda(filterTrips(data.viajes, filters, lookups.pasajeros), today)),
    [data.viajes, filters, lookups.pasajeros, today, dateError],
  );

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(view.page, pageCount);

  const applyView = (nextFilters, nextPage) => {
    setView({ filters: nextFilters, page: nextPage });
    setSearchParams(buildParams(nextFilters, nextPage), { replace: true, state: ownUrlState(location, URL_SCOPE) });
  };

  // Cualquier cambio de filtro vuelve a la primera página.
  const handleFilterChange = (key, value) => applyView({ ...filters, [key]: value }, 1);
  const clearFilters = () => applyView(Object.fromEntries(TRIP_FILTER_KEYS.map((key) => [key, ""])), 1);
  const handlePageChange = (value) => applyView(filters, value);

  const columns = [
    { key: "fecha", header: "Fecha", render: (v) => formatDate(v.fecha), cellClassName: "text-nowrap" },
    { key: "hora", header: "Hora" },
    {
      key: "pasajero",
      header: "Pasajero",
      render: (v) => {
        const pasajero = lookups.pasajeros[v.pasajeroId];
        return (
          <div className="trip-passenger">
            <span>{fullName(pasajero)}</span>
            {pasajero && <span className="trip-passenger-dni">DNI {formatDni(pasajero.dni)}</span>}
          </div>
        );
      },
    },
    { key: "chofer", header: "Chofer", render: (v) => fullName(lookups.choferes[v.choferId]), cellClassName: "cell-muted" },
    {
      key: "vehiculo",
      header: "Vehículo",
      render: (v) => lookups.vehiculos[v.vehiculoId]?.patente ?? "—",
      cellClassName: "cell-muted text-nowrap",
    },
    { key: "origen", header: "Origen", render: (v) => tripRoute(v, lookups.instituciones[v.institucionId]).origen, cellClassName: "cell-muted" },
    { key: "destino", header: "Destino", render: (v) => tripRoute(v, lookups.instituciones[v.institucionId]).destino },
    { key: "estado", header: "Estado", render: (v) => <StatusBadge estado={v.estado} /> },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-end",
      cellClassName: "text-end",
      render: (v) => (
        <TripActions
          viaje={v}
          actions={getTripActions(v, { asistencias: data.asistencias, today })}
          onStart={tripActions.start}
          onFinish={tripActions.finish}
          onCancel={tripActions.cancel}
          onReassign={tripActions.reassignDriver}
        />
      ),
    },
  ];

  const summary = activeCount
    ? `${results.length} ${results.length === 1 ? "viaje coincide" : "viajes coinciden"} con ${activeCount === 1 ? "el filtro aplicado" : `los ${activeCount} filtros aplicados`}`
    : `${results.length} viajes registrados · primero los de hoy y próximos, luego el historial`;

  return (
    <>
      <PageHeader
        title="Gestión de Viajes"
        subtitle="Administre y planifique los traslados programados"
        actions={
          <>
            <button
              type="button"
              className={`btn-app btn-app-outline btn-app-lg${showFilters ? " is-pressed" : ""}`}
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
              aria-controls="panel-filtros"
            >
              <Funnel size={18} strokeWidth={2} aria-hidden="true" />
              Filtros
              {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
            </button>
            <Link to="/viajes/nuevo" className="btn-app btn-app-primary btn-app-lg">
              <Plus size={20} strokeWidth={2} aria-hidden="true" />
              Nuevo Viaje
            </Link>
          </>
        }
      />

      <ContentCard title="Viajes Programados">
        {showFilters && (
          <div id="panel-filtros">
            <TripFilters
              filters={filters}
              onChange={handleFilterChange}
              onClear={clearFilters}
              choferes={data.choferes}
              vehiculos={data.vehiculos}
              instituciones={data.instituciones}
              dateError={dateError}
              activeCount={activeCount}
            />
          </div>
        )}

        {!showFilters && activeCount > 0 && (
          <div className="active-filters-note" role="status">
            <span>
              {activeCount === 1 ? "Hay 1 filtro aplicado." : `Hay ${activeCount} filtros aplicados.`}
            </span>
            <button type="button" className="link-app" onClick={() => setShowFilters(true)}>
              Ver filtros
            </button>
            <button type="button" className="link-app" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        )}

        {results.length === 0 ? (
          <EmptyState icon={activeCount ? SearchX : CarFront} title={activeCount ? "No se encontraron viajes" : "No hay viajes registrados"}>
            <p>
              {dateError
                ? dateError
                : activeCount
                  ? "Ningún viaje cumple con todos los filtros aplicados. Pruebe ampliar el rango de fechas o quitar algún filtro."
                  : "Registre un nuevo viaje para comenzar."}
            </p>
            <div className="empty-state-actions">
              {activeCount > 0 && (
                <button type="button" className="btn-app btn-app-outline" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </EmptyState>
        ) : (
          <>
            <p className="list-summary">{summary}</p>
            <DataTable columns={columns} rows={paginate(results, page, PAGE_SIZE)} />
            <Pagination page={page} pageSize={PAGE_SIZE} totalItems={results.length} onPageChange={handlePageChange} />
          </>
        )}
      </ContentCard>
    </>
  );
}
