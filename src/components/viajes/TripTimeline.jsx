import { Ban, CircleDot, PlusCircle, SquarePen, UserCog } from "lucide-react";
import { formatDateTime } from "../../utils/dates";

const ICONS = {
  creacion: PlusCircle,
  edicion: SquarePen,
  reasignacion: UserCog,
  estado: CircleDot,
  cancelacion: Ban,
};

/** Historial de cambios del viaje, del más reciente al más antiguo. */
export default function TripTimeline({ eventos = [] }) {
  if (eventos.length === 0) {
    return (
      <p className="section-empty">
        No hay cambios registrados. El historial se completa al registrar, editar, reasignar o cambiar el estado del viaje.
      </p>
    );
  }

  return (
    <ol className="trip-timeline">
      {[...eventos].reverse().map((evento, index) => {
        const Icon = ICONS[evento.tipo] ?? CircleDot;
        return (
          <li key={`${evento.fecha}-${index}`} className={`trip-timeline-item trip-timeline-item--${evento.tipo}`}>
            <span className="trip-timeline-icon" aria-hidden="true">
              <Icon size={15} strokeWidth={2} />
            </span>
            <div>
              <div className="trip-timeline-detail">{evento.detalle}</div>
              <div className="trip-timeline-date">{formatDateTime(evento.fecha)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
