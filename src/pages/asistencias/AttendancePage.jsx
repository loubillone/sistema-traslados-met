import { useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { CalendarDays, FileSpreadsheet, FunnelX, List, Search } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import InputField from "../../components/common/InputField";
import SelectField from "../../components/common/SelectField";
import Pagination from "../../components/common/Pagination";
import AttendanceStats from "../../components/asistencias/AttendanceStats";
import AttendanceTable from "../../components/asistencias/AttendanceTable";
import AttendanceCalendar from "../../components/asistencias/AttendanceCalendar";
import AttendanceSheet from "../../components/asistencias/AttendanceSheet";
import useData from "../../hooks/useData";
import useAttendanceDialog from "../../hooks/useAttendanceDialog";
import { ESTADOS_REGISTRO_ASISTENCIA } from "../../constants/estados";
import { formatDate, todayISO } from "../../utils/dates";
import { paginate } from "../../utils/format";
import { buildIndex } from "../../utils/selectors";
import { ownUrlState, urlBaseKey } from "../../utils/urlState";
import {
  buildAttendanceRows,
  filterAttendanceRows,
  indexAttendanceByTrip,
  summarizeByDay,
  summarizeMonth,
} from "../../utils/attendance";

const PAGE_SIZE = 15;
const URL_SCOPE = "planillaAsistencias";
const VISTAS = ["lista", "calendario", "planilla"];
const FILTRO_ESTADOS = ["presente", "ausente", "justificado", "sin_registrar", "no_corresponde", "futuro"];
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MES_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Lee la vista desde la URL. Sin fecha se muestra el día de hoy; "todas" quita el filtro de fecha. */
function readView(search, today) {
  const params = new URLSearchParams(search);
  const rawFecha = params.get("fecha");
  const fecha = rawFecha === "todas" ? "" : FECHA_PATTERN.test(rawFecha ?? "") ? rawFecha : today;
  const mes = params.get("mes");
  return {
    vista: VISTAS.includes(params.get("vista")) ? params.get("vista") : "lista",
    fecha,
    busqueda: params.get("q") ?? "",
    estado: FILTRO_ESTADOS.includes(params.get("estado")) ? params.get("estado") : "",
    pendientes: params.get("pendientes") === "1",
    pagina: Math.max(1, Number(params.get("pagina")) || 1),
    mes: MES_PATTERN.test(mes ?? "") ? mes : (fecha || today).slice(0, 7),
  };
}

function toParams(view, today) {
  const params = new URLSearchParams();
  if (view.vista !== "lista") params.set("vista", view.vista);
  if (view.fecha !== today) params.set("fecha", view.fecha || "todas");
  if (view.busqueda) params.set("q", view.busqueda);
  if (view.estado) params.set("estado", view.estado);
  if (view.pendientes) params.set("pendientes", "1");
  if (view.pagina > 1) params.set("pagina", String(view.pagina));
  if (view.vista === "calendario") params.set("mes", view.mes);
  return params;
}

/** Planilla de Asistencias: vista lista (CU-08), calendario y generación de planilla (CU-09). */
export default function AttendancePage() {
  const location = useLocation();
  return <AttendanceView key={urlBaseKey(location, URL_SCOPE)} />;
}

function AttendanceView() {
  const { data } = useData();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const today = todayISO();
  const { open, dialog } = useAttendanceDialog();
  const [view, setView] = useState(() => readView(location.search, today));

  const update = (changes) => {
    const next = { ...view, ...changes };
    setView(next);
    setSearchParams(toParams(next, today), { replace: true, state: ownUrlState(location, URL_SCOPE) });
  };

  const attendanceIndex = useMemo(() => indexAttendanceByTrip(data.asistencias), [data.asistencias]);
  const instituciones = useMemo(() => buildIndex(data.instituciones), [data.instituciones]);

  const monthKey = view.vista === "calendario" ? view.mes : (view.fecha || today).slice(0, 7);
  const resumen = useMemo(
    () => summarizeMonth(data, monthKey, { today, attendanceIndex }),
    [data, monthKey, today, attendanceIndex],
  );

  const rows = useMemo(
    () => buildAttendanceRows(data, { fecha: view.fecha, today, attendanceIndex }),
    [data, view.fecha, today, attendanceIndex],
  );
  const filtered = useMemo(
    () => filterAttendanceRows(rows, { busqueda: view.busqueda, estado: view.estado, pendientes: view.pendientes }),
    [rows, view.busqueda, view.estado, view.pendientes],
  );
  const days = useMemo(() => summarizeByDay(data, { today, attendanceIndex }), [data, today, attendanceIndex]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(view.pagina, pageCount);
  const activeFilters = [view.busqueda, view.estado, view.pendientes].filter(Boolean).length;
  const backTo = `/asistencias${location.search}`;

  const listTitle = !view.fecha
    ? "Asistencias · todas las fechas hasta hoy"
    : view.fecha === today
      ? `Asistencias de Hoy - ${formatDate(today)}`
      : `Asistencias del ${formatDate(view.fecha)}`;

  const pendientesFecha = rows.filter((r) => r.status === "sin_registrar").length;
  const summary = `${filtered.length} ${filtered.length === 1 ? "viaje" : "viajes"}${
    activeFilters ? ` coinciden con ${activeFilters === 1 ? "el filtro" : `los ${activeFilters} filtros`}` : ""
  } · ${pendientesFecha} sin asistencia registrada${view.fecha ? " en la fecha" : ""}`;

  const vistaButton = (vista, Icon, label) => (
    <button
      type="button"
      className={`btn-app btn-app-lg ${view.vista === vista ? "btn-app-primary" : "btn-app-outline"}`}
      onClick={() => update({ vista, mes: vista === "calendario" ? (view.fecha || today).slice(0, 7) : view.mes })}
      aria-pressed={view.vista === vista}
    >
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  );

  const selectedDay = view.fecha || today;
  const dayRows = useMemo(
    () => (view.vista === "calendario" ? buildAttendanceRows(data, { fecha: selectedDay, today, attendanceIndex }) : []),
    [view.vista, data, selectedDay, today, attendanceIndex],
  );

  return (
    <>
      <PageHeader
        title="Planilla de Asistencias"
        subtitle="Control de asistencias de pasajeros"
        actions={
          <>
            {vistaButton("lista", List, "Vista Lista")}
            {vistaButton("calendario", CalendarDays, "Vista Calendario")}
            {vistaButton("planilla", FileSpreadsheet, "Generar Planilla")}
          </>
        }
      />

      {view.vista !== "planilla" && <AttendanceStats resumen={resumen} monthKey={monthKey} />}

      {view.vista === "lista" && (
        <ContentCard title={listTitle}>
          <div className="row g-3 attendance-filters">
            <div className="col-12 col-sm-6 col-lg-3">
              <InputField
                id="asistencia-fecha"
                type="date"
                label="Fecha"
                value={view.fecha}
                onChange={(event) => update({ fecha: event.target.value, pagina: 1 })}
                hint={
                  <span className="attendance-date-links">
                    <button type="button" className="link-app small" onClick={() => update({ fecha: today, pagina: 1 })}>
                      Hoy
                    </button>
                    <button type="button" className="link-app small" onClick={() => update({ fecha: "", pagina: 1 })} disabled={!view.fecha}>
                      Todas las fechas
                    </button>
                  </span>
                }
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <InputField
                id="asistencia-busqueda"
                type="search"
                label="Pasajero (DNI o nombre)"
                placeholder="Ej.: 12345678 o González"
                icon={Search}
                value={view.busqueda}
                onChange={(event) => update({ busqueda: event.target.value, pagina: 1 })}
                maxLength={60}
                autoComplete="off"
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <SelectField
                id="asistencia-estado"
                label="Estado de asistencia"
                placeholder="Todos los estados"
                value={view.estado}
                onChange={(event) => update({ estado: event.target.value, pagina: 1 })}
                options={FILTRO_ESTADOS.map((value) => ({ value, label: ESTADOS_REGISTRO_ASISTENCIA[value].label }))}
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3 attendance-filters-checks">
              <label className="checkbox-app">
                <input
                  type="checkbox"
                  id="asistencia-pendientes"
                  checked={view.pendientes}
                  onChange={(event) => update({ pendientes: event.target.checked, pagina: 1 })}
                />
                Solo pendientes de registrar
              </label>
              <button
                type="button"
                className="btn-app btn-app-outline btn-app-sm"
                onClick={() => update({ busqueda: "", estado: "", pendientes: false, pagina: 1 })}
                disabled={!activeFilters}
              >
                <FunnelX size={15} strokeWidth={2} aria-hidden="true" />
                Limpiar filtros
              </button>
            </div>
          </div>

          <p className="list-summary">{summary}</p>
          <AttendanceTable
            rows={paginate(filtered, page, PAGE_SIZE)}
            instituciones={instituciones}
            onOpen={open}
            backTo={backTo}
            emptyMessage={
              rows.length === 0
                ? view.fecha
                  ? `No hay viajes programados para el ${formatDate(view.fecha)}.`
                  : "No hay viajes registrados."
                : "Ningún viaje coincide con los filtros aplicados."
            }
          />
          <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={(value) => update({ pagina: value })} />
        </ContentCard>
      )}

      {view.vista === "calendario" && (
        <>
          <ContentCard title="Calendario de asistencias" className="mb-4">
            <AttendanceCalendar
              monthKey={view.mes}
              onMonthChange={(mes) => update({ mes })}
              selected={selectedDay}
              onSelect={(fecha) => update({ fecha, mes: fecha.slice(0, 7), pagina: 1 })}
              days={days}
              today={today}
            />
          </ContentCard>
          <ContentCard title={`Viajes del ${formatDate(selectedDay)}`}>
            <AttendanceTable
              rows={dayRows}
              instituciones={instituciones}
              onOpen={open}
              backTo={backTo}
              emptyMessage={`No hay viajes programados para el ${formatDate(selectedDay)}.`}
            />
          </ContentCard>
        </>
      )}

      {view.vista === "planilla" && (
        <AttendanceSheet data={data} today={today} attendanceIndex={attendanceIndex} instituciones={instituciones} />
      )}

      {dialog}
    </>
  );
}
