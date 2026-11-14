import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, SearchX, ShieldAlert, UserCheck, UserCog, UserX, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import StatCard from "../../components/common/StatCard";
import SegmentedControl from "../../components/common/SegmentedControl";
import EmptyState from "../../components/common/EmptyState";
import DriverCard from "../../components/recursos/DriverCard";
import useData from "../../hooks/useData";
import useResourceActions from "../../hooks/useResourceActions";
import { todayISO } from "../../utils/dates";
import { countExpiring, getAffectedDriverTrips, getDriversOnTrip, getDriverStatus, matchesDriver } from "../../utils/resources";

const ESTADOS = {
  activos: (c) => c.activo,
  inactivos: (c) => !c.activo,
  todos: () => true,
};

/** Gestión de Choferes (CU-11): indicadores, búsqueda y tarjetas. */
export default function DriversPage() {
  const { data } = useData();
  const actions = useResourceActions();
  const today = todayISO();
  const [term, setTerm] = useState("");
  const [estado, setEstado] = useState("activos");

  const enViaje = useMemo(() => getDriversOnTrip(data.viajes, today), [data.viajes, today]);
  const activos = data.choferes.filter((c) => c.activo);
  const count = (disponibilidad) => activos.filter((c) => c.disponibilidad === disponibilidad).length;
  const vencimientos = countExpiring(activos.map((c) => c.vencimientoLicencia), today);

  const affected = useMemo(
    () => Object.fromEntries(data.choferes.map((c) => [c.id, getAffectedDriverTrips(data.viajes, c, today).length])),
    [data.choferes, data.viajes, today],
  );

  const results = data.choferes
    .filter(ESTADOS[estado])
    .filter((c) => matchesDriver(c, term))
    .sort((a, b) => a.apellido.localeCompare(b.apellido, "es") || a.nombre.localeCompare(b.nombre, "es"));

  return (
    <>
      <PageHeader
        title="Gestión de Choferes"
        subtitle="Administre el personal de conducción y su disponibilidad"
        actions={
          <Link to="/choferes/nuevo" className="btn-app btn-app-primary btn-app-lg">
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nuevo Chofer
          </Link>
        }
      />

      <div className="row g-4 mb-4" data-testid="indicadores-choferes">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard layout="horizontal" icon={UserCheck} color="green" value={count("disponible")} label="Choferes disponibles" detail={`${enViaje.size} en viaje ahora`} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard layout="horizontal" icon={UserCog} color="navy" value={count("guardia")} label="De guardia" detail="Pueden asignarse a viajes" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard layout="horizontal" icon={UserX} color="red" value={count("no_disponible")} label="No disponibles" detail={`${data.choferes.length - activos.length} inactivos aparte`} />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard layout="horizontal" icon={ShieldAlert} color="orange" value={vencimientos} label="Licencias próximas a vencer" detail="Vencidas o menos de 60 días" />
        </div>
      </div>

      <ContentCard title="Personal de conducción">
        <div className="passenger-toolbar">
          <div className="passenger-search" role="search">
            <div className="passenger-search-field">
              <Search className="input-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                className="input-app has-icon"
                placeholder="Buscar por DNI o nombre"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                aria-label="Buscar chofer por DNI o nombre"
                maxLength={60}
              />
              {term && (
                <button type="button" className="search-clear" onClick={() => setTerm("")} aria-label="Limpiar búsqueda">
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
          <SegmentedControl
            ariaLabel="Filtrar choferes por estado"
            value={estado}
            onChange={setEstado}
            options={[
              { value: "activos", label: "Activos", count: activos.length },
              { value: "inactivos", label: "Inactivos", count: data.choferes.length - activos.length },
              { value: "todos", label: "Todos", count: data.choferes.length },
            ]}
          />
        </div>

        <p className="list-summary">
          {results.length} {results.length === 1 ? "chofer" : "choferes"}
          {term.trim() ? ` coinciden con “${term.trim()}”` : ""}
        </p>

        {results.length === 0 ? (
          <EmptyState icon={SearchX} title="No se encontraron choferes">
            <p>{term.trim() ? `Ningún chofer ${estado === "todos" ? "" : estado} coincide con “${term.trim()}”.` : "No hay choferes en este estado."}</p>
          </EmptyState>
        ) : (
          <div className="driver-grid">
            {results.map((chofer) => (
              <DriverCard
                key={chofer.id}
                chofer={chofer}
                status={getDriverStatus(chofer, enViaje.has(chofer.id))}
                today={today}
                affected={affected[chofer.id]}
                onAvailability={actions.setDriverAvailability}
                onDeactivate={actions.deactivateDriver}
                onReactivate={actions.reactivateDriver}
              />
            ))}
          </div>
        )}
      </ContentCard>
    </>
  );
}
