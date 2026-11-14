import { useMemo, useState } from "react";
import { FileSpreadsheet, Info, Printer } from "lucide-react";
import ContentCard from "../common/ContentCard";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";
import { formatDate, formatDateTime, nowStamp } from "../../utils/dates";
import { formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { tripRoute } from "../../utils/trips";
import { sortPassengers } from "../../utils/passengers";
import { attendanceNote, buildPassengerSheet, getSheetPeriod } from "../../utils/attendance";

/**
 * CU-09: planilla de asistencias de un pasajero para una semana o un mes.
 * Se calcula al generarla con los datos actuales del estado global.
 */
export default function AttendanceSheet({ data, today, attendanceIndex, instituciones }) {
  const [form, setForm] = useState({ pasajeroId: "", tipo: "mensual", fecha: today, mes: today.slice(0, 7) });
  const [errors, setErrors] = useState({});
  const [request, setRequest] = useState(null); // { pasajeroId, desde, hasta, label, generadaEl }

  const pasajeros = useMemo(() => sortPassengers(data.pasajeros), [data.pasajeros]);

  // La planilla se recalcula si cambian los datos (por ejemplo, al editar una asistencia).
  const sheet = useMemo(
    () => (request ? buildPassengerSheet(data, { ...request, today, attendanceIndex }) : null),
    [request, data, today, attendanceIndex],
  );
  const pasajero = request ? data.pasajeros.find((p) => p.id === request.pasajeroId) : null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, periodo: undefined }));
  };

  const handleGenerate = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.pasajeroId) nextErrors.pasajeroId = "Seleccione el pasajero.";
    else if (!data.pasajeros.some((p) => p.id === form.pasajeroId)) nextErrors.pasajeroId = "El pasajero no existe.";
    const periodo = getSheetPeriod(form.tipo, form.tipo === "semanal" ? form.fecha : form.mes, today);
    if (periodo.error) nextErrors[form.tipo === "semanal" ? "fecha" : "mes"] = periodo.error;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setRequest(null);
      return;
    }
    setRequest({ pasajeroId: form.pasajeroId, desde: periodo.desde, hasta: periodo.hasta, label: periodo.label, tipo: form.tipo, generadaEl: nowStamp() });
  };

  const t = sheet?.totales;

  return (
    <>
      <ContentCard title="Generar Planilla" className="mb-4 no-print">
        <form className="row gx-4 align-items-start" onSubmit={handleGenerate} noValidate>
          <div className="col-12 col-lg-4">
            <SelectField
              id="planilla-pasajero"
              name="pasajeroId"
              label="Pasajero *"
              placeholder="Seleccione un pasajero"
              value={form.pasajeroId}
              onChange={handleChange}
              error={errors.pasajeroId}
              options={pasajeros.map((p) => ({
                value: p.id,
                label: `${p.apellido}, ${p.nombre} — DNI ${formatDni(p.dni)}${p.activo ? "" : " (inactivo)"}`,
              }))}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <SelectField
              id="planilla-tipo"
              name="tipo"
              label="Período *"
              value={form.tipo}
              onChange={handleChange}
              options={[
                { value: "semanal", label: "Semanal (lunes a domingo)" },
                { value: "mensual", label: "Mensual" },
              ]}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            {form.tipo === "semanal" ? (
              <InputField id="planilla-fecha" name="fecha" type="date" label="Fecha de referencia *" value={form.fecha} onChange={handleChange} error={errors.fecha} max={today} hint="Se toma la semana que contiene esta fecha." />
            ) : (
              <InputField id="planilla-mes" name="mes" type="month" label="Mes de referencia *" value={form.mes} onChange={handleChange} error={errors.mes} max={today.slice(0, 7)} />
            )}
          </div>
          <div className="col-12 col-lg-2 attendance-sheet-submit">
            <button type="submit" className="btn-app btn-app-primary btn-app-block">
              <FileSpreadsheet size={18} strokeWidth={2} aria-hidden="true" />
              Generar
            </button>
          </div>
        </form>
      </ContentCard>

      {sheet && pasajero && (
        <section className="content-card attendance-sheet print-area" data-testid="planilla">
          <div className="attendance-sheet-header">
            <div>
              <div className="attendance-sheet-brand">Transporte Acosta · Traslados Programados</div>
              <h2 className="attendance-sheet-title">Planilla de asistencias</h2>
            </div>
            <button type="button" className="btn-app btn-app-outline no-print" onClick={() => window.print()}>
              <Printer size={18} strokeWidth={2} aria-hidden="true" />
              Imprimir planilla
            </button>
          </div>

          <dl className="attendance-sheet-meta">
            <div>
              <dt>Pasajero</dt>
              <dd>{fullName(pasajero)}{pasajero.activo ? "" : " (inactivo)"}</dd>
            </div>
            <div>
              <dt>DNI</dt>
              <dd>{formatDni(pasajero.dni)}</dd>
            </div>
            <div>
              <dt>Período</dt>
              <dd>{request.label}</dd>
            </div>
            <div>
              <dt>Generada</dt>
              <dd>{formatDateTime(request.generadaEl)}</dd>
            </div>
          </dl>

          {sheet.rows.length === 0 ? (
            <EmptyState icon={Info} title="Sin registros en el período">
              <p>
                {fullName(pasajero)} no tiene viajes ni asistencias registrados entre el {formatDate(request.desde)} y el{" "}
                {formatDate(request.hasta)}.
              </p>
            </EmptyState>
          ) : (
            <>
              <div className="attendance-sheet-totals" data-testid="planilla-totales">
                <div className="attendance-metric attendance-metric--success">
                  <span className="attendance-metric-value">{t.presentes}</span>
                  <span className="attendance-metric-label">Presentes</span>
                </div>
                <div className="attendance-metric attendance-metric--danger">
                  <span className="attendance-metric-value">{t.ausentes}</span>
                  <span className="attendance-metric-label">Ausentes</span>
                </div>
                <div className="attendance-metric attendance-metric--warning">
                  <span className="attendance-metric-value">{t.justificadas}</span>
                  <span className="attendance-metric-label">Justificados</span>
                </div>
                <div className="attendance-metric attendance-metric--neutral">
                  <span className="attendance-metric-value">{t.sinRegistrar}</span>
                  <span className="attendance-metric-label">Sin asistencia registrada</span>
                </div>
                <div className="attendance-metric attendance-metric--info">
                  <span className="attendance-metric-value">{t.porcentaje === null ? "—" : `${t.porcentaje}%`}</span>
                  <span className="attendance-metric-label">Asistencia</span>
                </div>
              </div>

              <div className="table-responsive">
                <table className="app-table attendance-sheet-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Destino</th>
                      <th>Estado del viaje</th>
                      <th>Asistencia</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="text-nowrap">{formatDate(row.viaje.fecha)}</td>
                        <td>{row.viaje.hora}</td>
                        <td>{tripRoute(row.viaje, instituciones[row.viaje.institucionId]).destino}</td>
                        <td><StatusBadge estado={row.viaje.estado} /></td>
                        <td><StatusBadge type="registro" estado={row.status} /></td>
                        <td className="cell-muted">
                          {attendanceNote(row.asistencia) || (row.status === "no_corresponde" ? row.viaje.motivoCancelacion : "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-total-row">
                      <td colSpan={6}>
                        {t.viajes} {t.viajes === 1 ? "viaje" : "viajes"} · {t.presentes} presentes · {t.ausentes} ausentes ·{" "}
                        {t.justificadas} justificados · {t.sinRegistrar} sin asistencia registrada
                        {t.noCorresponde ? ` · ${t.noCorresponde} cancelados sin asistencia` : ""}
                        {t.futuros ? ` · ${t.futuros} viajes futuros` : ""}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="criteria-note mt-3 mb-0">
                <Info size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  Asistencia = presentes ÷ asistencias registradas
                  {t.total ? ` (${t.presentes} de ${t.total})` : ""}. Los viajes sin asistencia registrada, los
                  cancelados sin asistencia y los futuros no se cuentan como ausencias.
                </span>
              </p>
            </>
          )}
        </section>
      )}
    </>
  );
}
