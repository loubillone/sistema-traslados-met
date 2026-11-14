import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CircleCheck, Plus, Search, SearchX, UserCheck, Users, UserX, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import StatCard from "../../components/common/StatCard";
import SegmentedControl from "../../components/common/SegmentedControl";
import EmptyState from "../../components/common/EmptyState";
import PassengerCard from "../../components/pasajeros/PassengerCard";
import useData from "../../hooks/useData";
import usePassengerActions from "../../hooks/usePassengerActions";
import { buildIndex, fullName } from "../../utils/selectors";
import { formatDni } from "../../utils/format";
import {
  analyzePassengerQuery,
  getPassengerCounters,
  matchesPassengerName,
  sortPassengers,
} from "../../utils/passengers";

const ESTADO_FILTERS = {
  activos: (p) => p.activo,
  inactivos: (p) => !p.activo,
  todos: () => true,
};

/** Gestión de Pasajeros: listado, búsqueda por DNI o nombre (CU-01) y acciones. */
export default function PassengersPage() {
  const { data } = useData();
  const navigate = useNavigate();
  const { deactivate, reactivate } = usePassengerActions();
  const [searchParams, setSearchParams] = useSearchParams();

  // El texto y el filtro se reflejan en la URL para conservarlos al volver desde una ficha.
  const [term, setTerm] = useState(() => searchParams.get("q") ?? "");
  const [estado, setEstado] = useState(() =>
    ESTADO_FILTERS[searchParams.get("estado")] ? searchParams.get("estado") : "activos",
  );
  const [submitError, setSubmitError] = useState("");

  const syncUrl = (nextTerm, nextEstado) => {
    const params = {};
    if (nextTerm.trim()) params.q = nextTerm.trim();
    if (nextEstado !== "activos") params.estado = nextEstado;
    setSearchParams(params, { replace: true });
  };

  const counters = useMemo(() => getPassengerCounters(data), [data]);
  const instituciones = useMemo(() => buildIndex(data.instituciones), [data.instituciones]);

  const totals = {
    total: data.pasajeros.length,
    activos: data.pasajeros.filter((p) => p.activo).length,
    inactivos: data.pasajeros.filter((p) => !p.activo).length,
  };

  const query = analyzePassengerQuery(term);

  // Resultado del filtro dinámico.
  const { results, exactMatch, otherEstadoMatches } = useMemo(() => {
    if (query.mode === "dni") {
      // La búsqueda por DNI recorre todos los pasajeros (activos e inactivos).
      const matches = data.pasajeros.filter((p) => p.dni.startsWith(query.dni));
      const exact = query.complete ? data.pasajeros.find((p) => p.dni === query.dni) ?? null : null;
      return { results: sortPassengers(matches), exactMatch: exact, otherEstadoMatches: 0 };
    }
    const byEstado = data.pasajeros.filter(ESTADO_FILTERS[estado]);
    if (query.mode === "nombre") {
      const matches = byEstado.filter((p) => matchesPassengerName(p, query.normalized));
      const others = data.pasajeros.filter(
        (p) => !ESTADO_FILTERS[estado](p) && matchesPassengerName(p, query.normalized),
      ).length;
      return { results: sortPassengers(matches), exactMatch: null, otherEstadoMatches: others };
    }
    return { results: sortPassengers(byEstado), exactMatch: null, otherEstadoMatches: 0 };
  }, [data.pasajeros, estado, query.mode, query.dni, query.complete, query.normalized]);

  const inlineError = (() => {
    if (query.mode === "dni" && query.tooLong) return "El DNI debe tener 7 u 8 dígitos.";
    if (query.mode === "nombre" && /\d/.test(term)) {
      return "Para buscar por DNI ingrese solo números; para buscar por nombre, solo letras.";
    }
    return submitError;
  })();

  const handleTermChange = (value) => {
    setTerm(value);
    setSubmitError("");
    syncUrl(value, estado);
  };

  const handleEstadoChange = (value) => {
    setEstado(value);
    syncUrl(term, value);
  };

  const clearSearch = () => handleTermChange("");

  // CU-01: al confirmar la búsqueda con un DNI válido y existente se abre la ficha.
  const handleSubmit = (event) => {
    event.preventDefault();
    if (query.mode === "dni") {
      if (!query.complete) {
        setSubmitError("Ingrese un DNI válido: 7 u 8 dígitos, solo números.");
        return;
      }
      if (exactMatch) navigate(`/pasajeros/${exactMatch.id}`);
      return;
    }
    if (query.mode === "nombre" && results.length === 1) navigate(`/pasajeros/${results[0].id}`);
  };

  const renderEmpty = () => {
    if (query.mode === "dni") {
      return (
        <EmptyState icon={SearchX} title="No se encontraron resultados">
          {query.complete ? (
            <p>
              No existe ningún pasajero registrado con DNI <strong>{formatDni(query.dni)}</strong>.
            </p>
          ) : (
            <p>
              Ningún DNI registrado comienza con <strong>{query.dni}</strong>.
            </p>
          )}
          <div className="empty-state-actions">
            {query.complete && (
              <Link to={`/pasajeros/nuevo?dni=${query.dni}`} className="btn-app btn-app-primary">
                <Plus size={18} strokeWidth={2} aria-hidden="true" />
                Registrar pasajero con este DNI
              </Link>
            )}
            <button type="button" className="btn-app btn-app-outline" onClick={clearSearch}>
              Limpiar búsqueda
            </button>
          </div>
        </EmptyState>
      );
    }
    if (query.mode === "nombre") {
      return (
        <EmptyState icon={SearchX} title="No se encontraron resultados">
          <p>
            No hay pasajeros {estado === "todos" ? "" : estado} que coincidan con <strong>“{query.term}”</strong>.
          </p>
          <div className="empty-state-actions">
            {otherEstadoMatches > 0 && (
              <button type="button" className="btn-app btn-app-primary" onClick={() => handleEstadoChange("todos")}>
                Ver {otherEstadoMatches} {otherEstadoMatches === 1 ? "coincidencia" : "coincidencias"} en otros estados
              </button>
            )}
            <button type="button" className="btn-app btn-app-outline" onClick={clearSearch}>
              Limpiar búsqueda
            </button>
          </div>
        </EmptyState>
      );
    }
    return (
      <EmptyState icon={Users} title={estado === "inactivos" ? "No hay pasajeros inactivos" : "No hay pasajeros"}>
        <p>
          {estado === "inactivos"
            ? "Los pasajeros desactivados aparecerán aquí y podrán reactivarse."
            : "Registre un nuevo pasajero para comenzar."}
        </p>
      </EmptyState>
    );
  };

  const summary = (() => {
    if (query.mode === "dni") {
      return `${results.length} ${results.length === 1 ? "resultado" : "resultados"} para el DNI ${query.dni} (activos e inactivos)`;
    }
    const base = `${results.length} ${results.length === 1 ? "pasajero" : "pasajeros"}`;
    if (query.mode === "nombre") return `${base} ${results.length === 1 ? "coincide" : "coinciden"} con “${query.term}”`;
    return `Mostrando ${base} ${{ activos: "activos", inactivos: "inactivos", todos: "en total" }[estado]}`;
  })();

  return (
    <>
      <PageHeader
        title="Gestión de Pasajeros"
        subtitle="Administración y consulta de pasajeros registrados"
        actions={
          <Link to="/pasajeros/nuevo" className="btn-app btn-app-primary btn-app-lg">
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nuevo Pasajero
          </Link>
        }
      />

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <StatCard
            layout="horizontal"
            icon={Users}
            color="navy"
            value={totals.total}
            label="Pasajeros registrados"
            detail="Activos e inactivos"
          />
        </div>
        <div className="col-12 col-md-4">
          <StatCard
            layout="horizontal"
            icon={UserCheck}
            color="green"
            value={totals.activos}
            label="Pasajeros activos"
            detail="Disponibles para programar viajes"
          />
        </div>
        <div className="col-12 col-md-4">
          <StatCard
            layout="horizontal"
            icon={UserX}
            color="orange"
            value={totals.inactivos}
            label="Pasajeros inactivos"
            detail="Con historial conservado"
          />
        </div>
      </div>

      <ContentCard title="Listado de Pasajeros">
        <div className="passenger-toolbar">
          <form className="passenger-search" role="search" onSubmit={handleSubmit} noValidate>
            <div className="passenger-search-field">
              <Search className="input-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                className={`input-app has-icon${inlineError ? " is-invalid" : ""}`}
                placeholder="Buscar por DNI o nombre"
                value={term}
                onChange={(event) => handleTermChange(event.target.value)}
                aria-label="Buscar pasajero por DNI o nombre"
                aria-invalid={Boolean(inlineError)}
                aria-describedby="passenger-search-help"
                maxLength={60}
              />
              {term && (
                <button type="button" className="search-clear" onClick={clearSearch} aria-label="Limpiar búsqueda">
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
            <button type="submit" className="btn-app btn-app-primary">
              Buscar
            </button>
          </form>

          <SegmentedControl
            ariaLabel="Filtrar pasajeros por estado"
            value={estado}
            onChange={handleEstadoChange}
            options={[
              { value: "activos", label: "Activos", count: totals.activos },
              { value: "inactivos", label: "Inactivos", count: totals.inactivos },
              { value: "todos", label: "Todos", count: totals.total },
            ]}
          />
        </div>

        <div id="passenger-search-help" className={inlineError ? "field-error mb-3" : "field-hint mb-3"}>
          {inlineError || "Ingrese un DNI (solo números) o parte del nombre o apellido. Presione Enter para abrir la ficha."}
        </div>

        {exactMatch && (
          <div className="search-match" role="status">
            <CircleCheck size={20} strokeWidth={2} aria-hidden="true" />
            <span>
              Pasajero encontrado: <strong>{fullName(exactMatch)}</strong> · DNI {exactMatch.dni}
              {!exactMatch.activo && " · Inactivo"}
            </span>
            <Link to={`/pasajeros/${exactMatch.id}`} className="btn-app btn-app-primary btn-app-sm">
              Ver ficha completa
            </Link>
          </div>
        )}

        {results.length > 0 && <p className="list-summary">{summary}</p>}

        {results.length === 0 ? (
          renderEmpty()
        ) : (
          <div className="passenger-list">
            {results.map((pasajero) => (
              <PassengerCard
                key={pasajero.id}
                pasajero={pasajero}
                institucion={instituciones[pasajero.institucionId]}
                counters={counters[pasajero.id]}
                highlighted={exactMatch?.id === pasajero.id}
                onDeactivate={deactivate}
                onReactivate={reactivate}
              />
            ))}
          </div>
        )}
      </ContentCard>
    </>
  );
}
