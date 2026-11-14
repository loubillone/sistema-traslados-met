import { CalendarX } from "lucide-react";
import DetailItem from "../common/DetailItem";
import { DIAS_SEMANA } from "../../constants/pasajeros";
import { TIPOS_VIAJE } from "../../constants/estados";
import { formatDate } from "../../utils/dates";
import { fullName } from "../../utils/selectors";

/** Turnos recurrentes del pasajero y próximo viaje programado. */
export default function PassengerAgenda({ pasajero, chofer, vehiculo, proximoViaje }) {
  const dias = pasajero.diasSemana ?? [];

  if (dias.length === 0) {
    return (
      <div className="agenda-empty">
        <CalendarX size={20} strokeWidth={1.75} aria-hidden="true" />
        <span>Sin turnos recurrentes registrados. Se asignarán desde la Agenda de Turnos.</span>
      </div>
    );
  }

  return (
    <>
      {!pasajero.activo && (
        <p className="agenda-suspended">Agenda suspendida mientras el pasajero esté inactivo.</p>
      )}
      <div className="weekday-chips" aria-label="Días de traslado">
        {DIAS_SEMANA.map((dia) => {
          const active = dias.includes(dia.value);
          return (
            <span
              key={dia.value}
              className={`weekday-chip${active ? " is-active" : ""}`}
              title={`${dia.label}: ${active ? "con traslado" : "sin traslado"}`}
            >
              {dia.short}
            </span>
          );
        })}
      </div>
      <dl className="detail-grid detail-grid--2">
        <DetailItem label="Días">
          {DIAS_SEMANA.filter((d) => dias.includes(d.value))
            .map((d) => d.label)
            .join(", ")}
        </DetailItem>
        <DetailItem label="Hora habitual">{pasajero.horaHabitual}</DetailItem>
        <DetailItem label="Tipo de viaje">{TIPOS_VIAJE[pasajero.tipoViaje]}</DetailItem>
        <DetailItem label="Chofer asignado">{chofer ? fullName(chofer) : ""}</DetailItem>
        <DetailItem label="Vehículo">{vehiculo ? `${vehiculo.patente} · ${vehiculo.tipo}` : ""}</DetailItem>
        <DetailItem label="Próximo viaje">
          {proximoViaje ? `${formatDate(proximoViaje.fecha)} a las ${proximoViaje.hora}` : ""}
        </DetailItem>
      </dl>
    </>
  );
}
