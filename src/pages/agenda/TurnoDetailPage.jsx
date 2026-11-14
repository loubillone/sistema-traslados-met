import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, CalendarX, CircleCheck, CircleDashed, RotateCcw, SquarePen, Ban } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import StatusBadge from "../../components/common/StatusBadge";
import DetailItem from "../../components/common/DetailItem";
import EmptyState from "../../components/common/EmptyState";
import InputField from "../../components/common/InputField";
import SelectField from "../../components/common/SelectField";
import useData from "../../hooks/useData";
import useTurnoActions from "../../hooks/useTurnoActions";
import { DIAS_AGENDA, TRAMOS } from "../../constants/agenda";
import { TIPOS_VIAJE } from "../../constants/estados";
import { formatDate, todayISO } from "../../utils/dates";
import { formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { checkTurnoTrip, findOccurrenceTrip, getTurnoStatus, nextOccurrenceDates, turnoLegs, weekdayOf } from "../../utils/schedules";

/** Detalle de un turno recurrente y programación de viajes a partir de él. */
export default function TurnoDetailPage() {
  const { id } = useParams();
  const { data } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { deactivate, reactivate } = useTurnoActions();
  const today = todayISO();
  const turno = (data.turnos ?? []).find((t) => t.id === id);
  const pasajero = turno ? data.pasajeros.find((p) => p.id === turno.pasajeroId) : null;
  const legs = turno ? turnoLegs(turno) : [];

  // Fecha y trayecto iniciales: los del bloque elegido en el calendario o la próxima ocurrencia.
  const [programar, setProgramar] = useState(() => {
    const proxima = turno ? nextOccurrenceDates(turno, pasajero, today, 1)[0] ?? "" : "";
    const fecha = searchParams.get("fecha");
    const tramo = searchParams.get("tramo");
    return {
      fecha: fecha && fecha >= today ? fecha : proxima,
      tramo: legs.some((l) => l.tramo === tramo) ? tramo : legs[0]?.tramo ?? "",
    };
  });

  if (!turno) {
    return (
      <ContentCard>
        <EmptyState icon={CalendarX} title="Turno no encontrado">
          <p>El turno solicitado no existe o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/agenda" className="btn-app btn-app-primary">Volver a la Agenda</Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const status = getTurnoStatus(turno, pasajero);
  const institucion = data.instituciones.find((i) => i.id === turno.institucionId);
  const chequeo = checkTurnoTrip(data, turno, programar, today);
  const proximas = nextOccurrenceDates(turno, pasajero, today, 6);

  const irAlFormulario = (fecha, tramo) =>
    navigate(`/viajes/nuevo?turno=${turno.id}&fecha=${fecha}&tramo=${tramo}`, { state: { from: `/agenda/${turno.id}` } });

  return (
    <>
      <Link to="/agenda" className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Volver a la Agenda
      </Link>

      <PageHeader
        title={`Turno ${turno.id}`}
        subtitle={
          <span className="detail-subtitle">
            {fullName(pasajero)}
            <StatusBadge type="turno" estado={status} />
          </span>
        }
        actions={
          <>
            {turno.activo && (
              <Link to={`/agenda/${turno.id}/editar`} className="btn-app btn-app-outline btn-app-lg">
                <SquarePen size={18} strokeWidth={2} aria-hidden="true" />
                Editar
              </Link>
            )}
            {turno.activo ? (
              <button type="button" className="btn-app btn-app-danger-outline btn-app-lg" onClick={() => deactivate(turno)}>
                <Ban size={18} strokeWidth={2} aria-hidden="true" />
                Desactivar
              </button>
            ) : (
              <button type="button" className="btn-app btn-app-primary btn-app-lg" onClick={() => reactivate(turno)}>
                <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
                Reactivar
              </button>
            )}
          </>
        }
      />

      {status !== "activo" && (
        <div className="inactive-notice" role="status">
          <CalendarX size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            {status === "inactivo"
              ? `Turno desactivado${turno.fechaBaja ? ` el ${formatDate(turno.fechaBaja)}` : ""}. No genera ocurrencias ni viajes nuevos; sus datos se conservan.`
              : "El pasajero está inactivo: el turno queda suspendido y no genera ocurrencias."}
          </span>
        </div>
      )}

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-6">
          <ContentCard title="Turno recurrente" className="h-100">
            <div className="weekday-chips" aria-label="Días del turno">
              {DIAS_AGENDA.map((dia) => (
                <span key={dia.value} className={`weekday-chip${turno.dias.includes(dia.value) ? " is-active" : ""}`} title={dia.label}>
                  {dia.short.slice(0, 2)}
                </span>
              ))}
            </div>
            <dl className="detail-grid detail-grid--2">
              <DetailItem label="Pasajero">
                <Link to={`/pasajeros/${turno.pasajeroId}`} className="link-app">{fullName(pasajero)}</Link>
                {pasajero && <span className="cell-muted"> · DNI {formatDni(pasajero.dni)}</span>}
              </DetailItem>
              <DetailItem label="Tipo de traslado">
                <span className={`agenda-type-tag agenda-type-tag--${turno.tipo}`}>{TIPOS_VIAJE[turno.tipo]}</span>
              </DetailItem>
              <DetailItem label="Horario de ida">{turno.tipo === "vuelta" ? "No corresponde" : turno.horaIda}</DetailItem>
              <DetailItem label={turno.tipo === "ida_vuelta" ? "Horario de regreso" : "Horario de vuelta"}>
                {turno.tipo === "ida" ? "No corresponde" : turno.horaVuelta || (turno.tipo === "ida_vuelta" ? "Sin definir: complete el horario de regreso" : "")}
              </DetailItem>
              <DetailItem label="Institución" className="detail-span-2">
                {institucion ? `${institucion.nombre} · ${institucion.direccion}` : ""}
              </DetailItem>
              <DetailItem label="Domicilio del pasajero" className="detail-span-2">{pasajero?.domicilio}</DetailItem>
              <DetailItem label="Recorrido" className="detail-span-2">
                {legs.map((l) => (l.tramo === "vuelta" ? `Vuelta: institución → domicilio` : `Ida: domicilio → institución`)).join(" · ")}
              </DetailItem>
              <DetailItem label="Observaciones" className="detail-span-2">{turno.observaciones}</DetailItem>
              <DetailItem label="Vigente desde">{turno.fechaAlta ? formatDate(turno.fechaAlta) : ""}</DetailItem>
            </dl>
          </ContentCard>
        </div>

        <div className="col-12 col-xl-6">
          <ContentCard title="Programar viaje" className="h-100">
            {status !== "activo" ? (
              <p className="section-empty">Solo los turnos activos de pasajeros activos permiten programar viajes.</p>
            ) : (
              <>
                <p className="field-hint mt-0">
                  Elija una fecha que coincida con los días del turno. Se abrirá el formulario de Nuevo Viaje con los datos
                  precargados para asignar chofer y vehículo; el viaje se crea recién al confirmarlo.
                </p>
                <div className="row gx-3">
                  <div className="col-sm-6">
                    <InputField id="programar-fecha" type="date" label="Fecha" min={today} value={programar.fecha} onChange={(event) => setProgramar((p) => ({ ...p, fecha: event.target.value }))} />
                  </div>
                  <div className="col-sm-6">
                    <SelectField
                      id="programar-tramo"
                      label="Trayecto"
                      value={programar.tramo}
                      onChange={(event) => setProgramar((p) => ({ ...p, tramo: event.target.value }))}
                      options={legs.map((l) => ({ value: l.tramo, label: `${TRAMOS[l.tramo]} · ${l.hora}` }))}
                      hint={turno.tipo === "ida_vuelta" ? "Cada trayecto se programa por separado." : undefined}
                    />
                  </div>
                </div>
                <div data-testid="programar-estado">
                  {chequeo.error ? (
                    <p className="field-error mt-0">{chequeo.error}</p>
                  ) : chequeo.viajeExistente ? (
                    <p className="trip-notice trip-notice--info mb-3">
                      <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
                      <span>
                        Ya existe el viaje <Link to={`/viajes/${chequeo.viajeExistente.id}`} className="link-app">{chequeo.viajeExistente.id}</Link> para ese día
                        ({chequeo.viajeExistente.hora}): no se creará un duplicado.
                      </span>
                    </p>
                  ) : (
                    <p className="field-hint mt-0">
                      {TRAMOS[programar.tramo]} del {formatDate(programar.fecha)} a las {chequeo.hora} ·{" "}
                      {programar.tramo === "vuelta"
                        ? `${institucion?.nombre ?? "Institución"} → ${pasajero?.domicilio ?? "domicilio"}`
                        : `${pasajero?.domicilio ?? "Domicilio"} → ${institucion?.nombre ?? "institución"}`}
                      .
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-app btn-app-primary"
                  disabled={Boolean(chequeo.error || chequeo.viajeExistente)}
                  onClick={() => irAlFormulario(programar.fecha, programar.tramo)}
                >
                  <CalendarPlus size={18} strokeWidth={2} aria-hidden="true" />
                  Programar viaje
                </button>
              </>
            )}
          </ContentCard>
        </div>
      </div>

      <ContentCard title="Próximas ocurrencias">
        {proximas.length === 0 ? (
          <p className="section-empty">El turno no tiene ocurrencias próximas.</p>
        ) : (
          <ul className="turno-occurrences" data-testid="proximas-ocurrencias">
            {proximas.flatMap((fecha) =>
              legs.map((leg) => {
                const viaje = findOccurrenceTrip(data.viajes, turno, fecha, leg.tramo, leg.hora);
                return (
                  <li key={`${fecha}-${leg.tramo}`} className={viaje ? "has-trip" : ""}>
                    <span className="turno-occurrence-date">
                      {DIAS_AGENDA[weekdayOf(fecha) - 1].label} {formatDate(fecha)} · {TRAMOS[leg.tramo]} {leg.hora}
                    </span>
                    {viaje ? (
                      <Link to={`/viajes/${viaje.id}`} state={{ from: `/agenda/${turno.id}` }} className="turno-occurrence-trip">
                        <CircleCheck size={15} strokeWidth={2} aria-hidden="true" /> Viaje {viaje.id}
                      </Link>
                    ) : (
                      <span className="turno-occurrence-actions">
                        <span className="cell-muted">
                          <CircleDashed size={15} strokeWidth={2} aria-hidden="true" /> Sin viaje
                        </span>
                        <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => irAlFormulario(fecha, leg.tramo)} aria-label={`Programar ${TRAMOS[leg.tramo].toLowerCase()} del ${formatDate(fecha)}`}>
                          Programar
                        </button>
                      </span>
                    )}
                  </li>
                );
              }),
            )}
          </ul>
        )}
      </ContentCard>
    </>
  );
}
