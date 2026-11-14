import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CalendarCheck, ChevronLeft, ChevronRight, Eye, FunnelX, Plus, SquarePen } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import SelectField from "../../components/common/SelectField";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import WeekCalendar from "../../components/agenda/WeekCalendar";
import useData from "../../hooks/useData";
import useTurnoActions from "../../hooks/useTurnoActions";
import { TIPOS_VIAJE } from "../../constants/estados";
import { todayISO } from "../../utils/dates";
import { buildIndex, fullName } from "../../utils/selectors";
import { sortPassengers } from "../../utils/passengers";
import { ownUrlState, urlBaseKey } from "../../utils/urlState";
import { buildWeek, describeDias, describeHorario, getTurnoStatus, matchesTurnoFilters, shiftWeek, weekLabel, weekStart } from "../../utils/schedules";

const URL_SCOPE = "agendaTurnos";
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FILTER_KEYS = ["pasajero", "institucion", "tipo"];

function readView(search, today) {
  const params = new URLSearchParams(search);
  const semana = params.get("semana");
  return {
    semana: FECHA_PATTERN.test(semana ?? "") ? weekStart(semana) : weekStart(today),
    ...Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? ""])),
  };
}

/** Agenda de Turnos (CU-10): calendario semanal de turnos recurrentes. */
export default function AgendaPage() {
  const location = useLocation();
  return <AgendaView key={urlBaseKey(location, URL_SCOPE)} />;
}

function AgendaView() {
  const { data } = useData();
  const { deactivate, reactivate } = useTurnoActions();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const today = todayISO();
  const actual = weekStart(today);
  const [view, setView] = useState(() => readView(location.search, today));

  const update = (changes) => {
    const next = { ...view, ...changes };
    setView(next);
    const params = new URLSearchParams();
    if (next.semana !== actual) params.set("semana", next.semana);
    FILTER_KEYS.forEach((key) => next[key] && params.set(key, next[key]));
    setSearchParams(params, { replace: true, state: ownUrlState(location, URL_SCOPE) });
  };

  const filters = useMemo(
    () => ({ pasajero: view.pasajero, institucion: view.institucion, tipo: view.tipo }),
    [view.pasajero, view.institucion, view.tipo],
  );
  const activeFilters = FILTER_KEYS.filter((key) => view[key]).length;
  const semana = useMemo(() => buildWeek(data, view.semana, filters), [data, view.semana, filters]);
  const pasajeros = useMemo(() => buildIndex(data.pasajeros), [data.pasajeros]);
  const instituciones = useMemo(() => buildIndex(data.instituciones), [data.instituciones]);

  const turnos = (data.turnos ?? [])
    .filter((t) => matchesTurnoFilters(t, filters))
    .sort((a, b) => fullName(pasajeros[a.pasajeroId]).localeCompare(fullName(pasajeros[b.pasajeroId]), "es") || a.id.localeCompare(b.id));

  const programados = semana.ocurrencias.filter((o) => o.viaje).length;

  const columns = [
    { key: "id", header: "Turno", render: (t) => <Link to={`/agenda/${t.id}`} className="vehicle-plate">{t.id}</Link>, cellClassName: "text-nowrap" },
    { key: "pasajero", header: "Pasajero", render: (t) => fullName(pasajeros[t.pasajeroId]) },
    { key: "dias", header: "Días", render: (t) => describeDias(t.dias), cellClassName: "cell-muted" },
    { key: "horario", header: "Horario", render: (t) => describeHorario(t), cellClassName: "text-nowrap" },
    { key: "tipo", header: "Tipo", render: (t) => <span className={`agenda-type-tag agenda-type-tag--${t.tipo}`}>{TIPOS_VIAJE[t.tipo]}</span> },
    { key: "institucion", header: "Institución", render: (t) => instituciones[t.institucionId]?.nombre ?? "—", cellClassName: "cell-muted" },
    { key: "estado", header: "Estado", render: (t) => <StatusBadge type="turno" estado={getTurnoStatus(t, pasajeros[t.pasajeroId])} /> },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-end",
      cellClassName: "text-end",
      render: (t) => (
        <div className="trip-actions">
          <Link to={`/agenda/${t.id}`} className="trip-action" title="Ver turno" aria-label={`Ver turno ${t.id}`}>
            <Eye size={17} strokeWidth={2} />
          </Link>
          {t.activo && (
            <Link to={`/agenda/${t.id}/editar`} className="trip-action" title="Editar" aria-label={`Editar turno ${t.id}`}>
              <SquarePen size={17} strokeWidth={2} />
            </Link>
          )}
          {t.activo ? (
            <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => deactivate(t)} aria-label={`Desactivar turno ${t.id}`}>
              Desactivar
            </button>
          ) : (
            <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => reactivate(t)} aria-label={`Reactivar turno ${t.id}`}>
              Reactivar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Agenda de Turnos"
        subtitle="Organización de horarios y traslados recurrentes"
        actions={
          <Link to="/agenda/nuevo" className="btn-app btn-app-primary btn-app-lg">
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nuevo Turno
          </Link>
        }
      />

      <div className="agenda-legend content-card mb-4" aria-label="Referencias">
        <span className="agenda-legend-item"><span className="agenda-swatch agenda-swatch--ida" /> Ida</span>
        <span className="agenda-legend-item"><span className="agenda-swatch agenda-swatch--vuelta" /> Vuelta</span>
        <span className="agenda-legend-item"><span className="agenda-swatch agenda-swatch--ida_vuelta" /> Ida y vuelta</span>
        <span className="agenda-legend-item"><span className="agenda-swatch agenda-swatch--viaje" /> Viaje sin turno</span>
        <span className="agenda-legend-note">Borde punteado: turno habitual sin viaje programado · ✓ con viaje concreto registrado</span>
      </div>

      <ContentCard
        title={weekLabel(view.semana)}
        actions={
          <div className="agenda-week-nav">
            <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => update({ semana: shiftWeek(view.semana, -1) })} aria-label="Semana anterior">
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => update({ semana: actual })} disabled={view.semana === actual}>
              <CalendarCheck size={15} strokeWidth={2} aria-hidden="true" />
              Semana actual
            </button>
            <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => update({ semana: shiftWeek(view.semana, 1) })} aria-label="Semana siguiente">
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        }
        className="mb-4"
      >
        <div className="row g-3 agenda-filters">
          <div className="col-12 col-md-4">
            <SelectField
              id="agenda-pasajero"
              label="Pasajero"
              placeholder="Todos los pasajeros"
              value={view.pasajero}
              onChange={(event) => update({ pasajero: event.target.value })}
              options={sortPassengers(data.pasajeros).map((p) => ({ value: p.id, label: `${p.apellido}, ${p.nombre}${p.activo ? "" : " (inactivo)"}` }))}
            />
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <SelectField
              id="agenda-institucion"
              label="Institución"
              placeholder="Todas las instituciones"
              value={view.institucion}
              onChange={(event) => update({ institucion: event.target.value })}
              options={data.instituciones.map((i) => ({ value: i.id, label: i.nombre }))}
            />
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <SelectField
              id="agenda-tipo"
              label="Tipo de traslado"
              placeholder="Todos los tipos"
              value={view.tipo}
              onChange={(event) => update({ tipo: event.target.value })}
              options={Object.entries(TIPOS_VIAJE).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div className="col-12 col-md-1 agenda-filters-clear">
            <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => update({ pasajero: "", institucion: "", tipo: "" })} disabled={!activeFilters} title="Limpiar filtros" aria-label="Limpiar filtros">
              <FunnelX size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="list-summary" data-testid="resumen-semana">
          {semana.ocurrencias.length} {semana.ocurrencias.length === 1 ? "trayecto habitual" : "trayectos habituales"} en la semana · {programados} con viaje programado ·{" "}
          {semana.ocurrencias.length - programados} sin viaje · {semana.extras.length} {semana.extras.length === 1 ? "viaje sin turno" : "viajes sin turno"}
        </p>
        <WeekCalendar fechas={semana.fechas} ocurrencias={semana.ocurrencias} extras={semana.extras} today={today} />
        <p className="field-hint mb-0 mt-3">
          Las ocurrencias se calculan a partir de los turnos y no se guardan como viajes. Para crear un viaje, abra el turno y use "Programar viaje".
        </p>
      </ContentCard>

      <ContentCard title="Turnos registrados">
        <p className="list-summary">
          {turnos.length} {turnos.length === 1 ? "turno" : "turnos"} · {turnos.filter((t) => getTurnoStatus(t, pasajeros[t.pasajeroId]) === "activo").length} activos
        </p>
        <DataTable columns={columns} rows={turnos} emptyMessage="No hay turnos que coincidan con los filtros." />
      </ContentCard>
    </>
  );
}
