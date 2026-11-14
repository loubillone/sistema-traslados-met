import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CarFront, ClipboardPen, Info, SquarePen, TriangleAlert } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import StatusBadge from "../../components/common/StatusBadge";
import DetailItem from "../../components/common/DetailItem";
import EmptyState from "../../components/common/EmptyState";
import TripActions from "../../components/viajes/TripActions";
import TripTimeline from "../../components/viajes/TripTimeline";
import useData from "../../hooks/useData";
import useTripActions from "../../hooks/useTripActions";
import useAttendanceDialog from "../../hooks/useAttendanceDialog";
import { TIPOS_VIAJE } from "../../constants/estados";
import { formatDate, formatDateTime, todayISO } from "../../utils/dates";
import { formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { getDriverIssue, getTripActions, getTripAttendance, getVehicleIssue, tripRoute } from "../../utils/trips";
import { getRegistrationBlock } from "../../utils/attendance";

/**
 * Detalle de un viaje (CU-05). Los datos del pasajero, chofer, vehículo y
 * destino se obtienen a partir de sus identificadores: no se duplican en el viaje.
 */
export default function TripDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { data } = useData();
  const tripActions = useTripActions();
  const attendanceDialog = useAttendanceDialog();
  const today = todayISO();

  const viaje = data.viajes.find((v) => v.id === id);
  // Se vuelve a la pantalla de origen (listado con sus filtros o ficha del pasajero).
  const backTo = location.state?.from ?? "/viajes";
  const BACK_LABELS = [
    ["/pasajeros", "Volver a la ficha del pasajero"],
    ["/asistencias", "Volver a Asistencias"],
    ["/choferes", "Volver a la ficha del chofer"],
    ["/vehiculos", "Volver a la ficha del vehículo"],
  ];
  const backLabel = BACK_LABELS.find(([prefix]) => backTo.startsWith(prefix))?.[1] ?? "Volver a Viajes";

  if (!viaje) {
    return (
      <ContentCard>
        <EmptyState icon={CarFront} title="Viaje no encontrado">
          <p>El viaje solicitado no existe o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/viajes" className="btn-app btn-app-primary">
              Volver a Viajes
            </Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const pasajero = data.pasajeros.find((p) => p.id === viaje.pasajeroId);
  const chofer = data.choferes.find((c) => c.id === viaje.choferId);
  const vehiculo = data.vehiculos.find((v) => v.id === viaje.vehiculoId);
  const institucion = data.instituciones.find((i) => i.id === viaje.institucionId);
  // Ida: domicilio → institución. Vuelta (con dirección de destino): institución → domicilio.
  const ruta = tripRoute(viaje, institucion, { detallado: true });
  const asistencia = getTripAttendance(data.asistencias, viaje.id);
  const registrationBlock = asistencia ? null : getRegistrationBlock(viaje, today);
  const actions = getTripActions(viaje, { asistencias: data.asistencias, today });

  // Advertencias para viajes pendientes cuya asignación dejó de ser válida
  // (por ejemplo, un seguro que vence antes de la fecha del viaje).
  const warnings = [];
  if (viaje.estado === "programado") {
    const horario = { fecha: viaje.fecha, hora: viaje.hora, excludeId: viaje.id, today };
    const driverIssue = getDriverIssue(data, viaje.choferId, horario);
    const vehicleIssue = getVehicleIssue(data, viaje.vehiculoId, horario);
    if (driverIssue) warnings.push(driverIssue);
    if (vehicleIssue) warnings.push(vehicleIssue);
    if (pasajero && !pasajero.activo) warnings.push(`${fullName(pasajero)} está inactivo.`);
    if (viaje.fecha < today) warnings.push("La fecha del viaje ya pasó y sigue en estado Programado.");
  }

  const contacto = pasajero?.contactoEmergencia;

  return (
    <>
      <Link to={backTo} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {backLabel}
      </Link>

      <PageHeader
        title={`Viaje ${viaje.id}`}
        subtitle={
          <span className="detail-subtitle">
            {formatDate(viaje.fecha)} · {viaje.hora} hs
            <StatusBadge estado={viaje.estado} />
          </span>
        }
        actions={
          <TripActions
            variant="buttons"
            viaje={viaje}
            actions={actions}
            onStart={tripActions.start}
            onFinish={tripActions.finish}
            onCancel={tripActions.cancel}
            onReassign={tripActions.reassignDriver}
          />
        }
      />

      {viaje.estado === "cancelado" && (
        <div className="trip-notice trip-notice--danger" role="status">
          <Ban size={18} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>Viaje cancelado{viaje.fechaCancelacion ? ` el ${formatDate(viaje.fechaCancelacion)}` : ""}.</strong>{" "}
            Motivo: {viaje.motivoCancelacion}
            <div className="trip-notice-note">El registro se conserva en el historial y no admite modificaciones.</div>
          </div>
        </div>
      )}

      {viaje.estado === "finalizado" && (
        <div className="trip-notice trip-notice--info" role="status">
          <Info size={18} strokeWidth={2} aria-hidden="true" />
          <span>Viaje finalizado. Se conserva como registro histórico y no admite modificaciones.</span>
        </div>
      )}

      {viaje.estado === "en_curso" && !actions.cancelar && (
        <div className="trip-notice trip-notice--info" role="status">
          <Info size={18} strokeWidth={2} aria-hidden="true" />
          <span>El viaje está en curso y el pasajero tiene asistencia Presente registrada: solo puede finalizarse.</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="trip-notice trip-notice--warning" role="alert">
          <TriangleAlert size={18} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>Revise la asignación de este viaje:</strong>
            <ul className="trip-notice-list">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-7">
          <ContentCard title="Datos del traslado" className="h-100">
            <dl className="detail-grid detail-grid--2">
              <DetailItem label="Fecha">{formatDate(viaje.fecha)}</DetailItem>
              <DetailItem label="Hora">{viaje.hora} hs</DetailItem>
              <DetailItem label="Estado">
                <StatusBadge estado={viaje.estado} />
              </DetailItem>
              <DetailItem label="Tipo de traslado">{TIPOS_VIAJE[viaje.tipo] ?? viaje.tipo}</DetailItem>
              <DetailItem label="Origen" className="detail-span-2">{ruta.origen}</DetailItem>
              <DetailItem label="Destino" className="detail-span-2">{ruta.destino}</DetailItem>
              <DetailItem label="Observaciones" className="detail-span-2">{viaje.observaciones}</DetailItem>
              {viaje.estado === "cancelado" && (
                <DetailItem label="Motivo de cancelación" className="detail-span-2">{viaje.motivoCancelacion}</DetailItem>
              )}
              {viaje.creadoEl && <DetailItem label="Registrado el">{formatDateTime(viaje.creadoEl)}</DetailItem>}
            </dl>
          </ContentCard>
        </div>

        <div className="col-12 col-xl-5">
          <ContentCard title="Pasajero" className="h-100">
            {pasajero ? (
              <dl className="detail-grid detail-grid--2">
                <DetailItem label="Nombre" className="detail-span-2">
                  <Link to={`/pasajeros/${pasajero.id}`} className="link-app">
                    {fullName(pasajero)}
                  </Link>{" "}
                  {!pasajero.activo && <StatusBadge type="pasajero" estado="inactivo" />}
                </DetailItem>
                <DetailItem label="DNI">{formatDni(pasajero.dni)}</DetailItem>
                <DetailItem label="Teléfono">{pasajero.telefono}</DetailItem>
                <DetailItem label="Contacto de emergencia" className="detail-span-2">
                  {contacto?.nombre ? `${contacto.nombre}${contacto.telefono ? ` · ${contacto.telefono}` : ""}` : ""}
                </DetailItem>
                <DetailItem label="Condición o necesidad particular" className="detail-span-2">
                  {pasajero.condicion}
                </DetailItem>
              </dl>
            ) : (
              <p className="section-empty">El pasajero asociado ({viaje.pasajeroId}) no existe.</p>
            )}
          </ContentCard>
        </div>

        <div className="col-12 col-md-6">
          <ContentCard title="Chofer" className="h-100">
            {chofer ? (
              <dl className="detail-grid detail-grid--2">
                <DetailItem label="Nombre">{fullName(chofer)}</DetailItem>
                <DetailItem label="Teléfono">{chofer.telefono}</DetailItem>
                <DetailItem label="Licencia">{chofer.licencia}</DetailItem>
                <DetailItem label="Vencimiento de licencia">{formatDate(chofer.vencimientoLicencia)}</DetailItem>
              </dl>
            ) : (
              <p className="section-empty">Sin chofer asignado.</p>
            )}
          </ContentCard>
        </div>

        <div className="col-12 col-md-6">
          <ContentCard title="Vehículo" className="h-100">
            {vehiculo ? (
              <dl className="detail-grid detail-grid--2">
                <DetailItem label="Patente">{vehiculo.patente}</DetailItem>
                <DetailItem label="Estado">
                  <StatusBadge type="vehiculo" estado={vehiculo.estado} />
                </DetailItem>
                <DetailItem label="Modelo">{`${vehiculo.tipo} ${vehiculo.modelo}`}</DetailItem>
                <DetailItem label="Capacidad">{`${vehiculo.capacidad} lugares`}</DetailItem>
                <DetailItem label="VTV vigente hasta">{formatDate(vehiculo.vencimientoVTV)}</DetailItem>
                <DetailItem label="Seguro vigente hasta">{formatDate(vehiculo.vencimientoSeguro)}</DetailItem>
              </dl>
            ) : (
              <p className="section-empty">Sin vehículo asignado.</p>
            )}
          </ContentCard>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <ContentCard title="Asistencia" className="h-100">
            {asistencia ? (
              <dl className="detail-grid" data-testid="asistencia-vinculada">
                <DetailItem label="Estado registrado">
                  <StatusBadge type="asistencia" estado={asistencia.estado} />
                </DetailItem>
                {asistencia.estado !== "presente" && (
                  <DetailItem label={asistencia.estado === "ausente" ? "Motivo de la ausencia" : "Justificación"}>
                    {asistencia.motivo}
                  </DetailItem>
                )}
                <DetailItem label="Observaciones">{asistencia.observaciones}</DetailItem>
                <DetailItem label="Registro">
                  {asistencia.id}
                  {asistencia.registradaEl ? ` · ${formatDateTime(asistencia.registradaEl)}` : ""}
                  {asistencia.modificadaEl ? ` · modificada ${formatDateTime(asistencia.modificadaEl)}` : ""}
                </DetailItem>
              </dl>
            ) : (
              <p className="section-empty">
                <StatusBadge type="registro" estado={registrationBlock ? (viaje.estado === "cancelado" ? "no_corresponde" : "futuro") : "sin_registrar"} />{" "}
                {registrationBlock ?? "El viaje todavía no tiene asistencia registrada."}
              </p>
            )}
            <div className="attendance-detail-actions">
              {asistencia ? (
                <button type="button" className="btn-app btn-app-outline" onClick={() => attendanceDialog.open(viaje.id, { intent: "editar" })}>
                  <SquarePen size={16} strokeWidth={2} aria-hidden="true" />
                  Editar asistencia
                </button>
              ) : (
                !registrationBlock && (
                  <button type="button" className="btn-app btn-app-primary" onClick={() => attendanceDialog.open(viaje.id, { intent: "registrar" })}>
                    <ClipboardPen size={16} strokeWidth={2} aria-hidden="true" />
                    Registrar asistencia
                  </button>
                )
              )}
              <Link to={`/asistencias?fecha=${viaje.fecha}`} className="link-app">
                Ver planilla del {formatDate(viaje.fecha)}
              </Link>
            </div>
            <p className="field-hint mb-0 mt-3">
              La asistencia queda vinculada a este viaje y no puede asociarse a otro. Registrarla no cambia el estado del viaje.
            </p>
          </ContentCard>
        </div>
        <div className="col-12 col-lg-7">
          <ContentCard title="Historial de cambios" className="h-100">
            <TripTimeline eventos={viaje.eventos} />
          </ContentCard>
        </div>
      </div>
      {attendanceDialog.dialog}
    </>
  );
}
