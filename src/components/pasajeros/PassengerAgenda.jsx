import { Link } from "react-router-dom";
import { CalendarPlus, CalendarX } from "lucide-react";
import DetailItem from "../common/DetailItem";
import StatusBadge from "../common/StatusBadge";
import useData from "../../hooks/useData";
import { DIAS_AGENDA } from "../../constants/agenda";
import { TIPOS_VIAJE } from "../../constants/estados";
import { formatDate } from "../../utils/dates";
import { fullName } from "../../utils/selectors";
import { describeHorario, getTurnoStatus } from "../../utils/schedules";

/**
 * Agenda habitual del pasajero: sus turnos recurrentes (Etapa 5B), leídos del
 * DataProvider, más el chofer y vehículo habituales y el próximo viaje.
 */
export default function PassengerAgenda({ pasajero, chofer, vehiculo, proximoViaje }) {
  const { data } = useData();
  const turnos = (data.turnos ?? [])
    .filter((t) => t.pasajeroId === pasajero.id)
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.id.localeCompare(b.id));
  const instituciones = Object.fromEntries(data.instituciones.map((i) => [i.id, i]));

  return (
    <>
      {!pasajero.activo && turnos.length > 0 && (
        <p className="agenda-suspended">Agenda suspendida mientras el pasajero esté inactivo.</p>
      )}

      {turnos.length === 0 ? (
        <div className="agenda-empty mb-3">
          <CalendarX size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>Sin turnos recurrentes registrados.</span>
        </div>
      ) : (
        <ul className="passenger-turnos" data-testid="agenda-pasajero">
          {turnos.map((turno) => (
            <li key={turno.id} className={turno.activo ? "" : "is-inactive"}>
              <div className="passenger-turno-head">
                <Link to={`/agenda/${turno.id}`} className="link-app">{turno.id}</Link>
                <span className={`agenda-type-tag agenda-type-tag--${turno.tipo}`}>{TIPOS_VIAJE[turno.tipo]}</span>
                <StatusBadge type="turno" estado={getTurnoStatus(turno, pasajero)} />
              </div>
              <div className="weekday-chips mb-1" aria-label="Días">
                {DIAS_AGENDA.map((dia) => (
                  <span key={dia.value} className={`weekday-chip${turno.dias.includes(dia.value) ? " is-active" : ""}`} title={dia.label}>
                    {dia.short.slice(0, 2)}
                  </span>
                ))}
              </div>
              <div className="passenger-turno-meta">
                {describeHorario(turno)} · {instituciones[turno.institucionId]?.nombre ?? "Sin institución"}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pasajero.activo && (
        <Link to={`/agenda/nuevo?pasajero=${pasajero.id}`} state={{ from: `/pasajeros/${pasajero.id}` }} className="btn-app btn-app-outline btn-app-sm mb-3">
          <CalendarPlus size={15} strokeWidth={2} aria-hidden="true" />
          Nuevo turno
        </Link>
      )}

      <dl className="detail-grid detail-grid--2">
        <DetailItem label="Chofer habitual">{chofer ? fullName(chofer) : ""}</DetailItem>
        <DetailItem label="Vehículo habitual">{vehiculo ? `${vehiculo.patente} · ${vehiculo.tipo}` : ""}</DetailItem>
        <DetailItem label="Próximo viaje" className="detail-span-2">
          {proximoViaje ? `${formatDate(proximoViaje.fecha)} a las ${proximoViaje.hora}` : ""}
        </DetailItem>
      </dl>
    </>
  );
}
