import { Link, useLocation } from "react-router-dom";
import { Ban, CircleCheck, Eye, Play, SquarePen, UserCog } from "lucide-react";

/**
 * Acciones de un viaje. Solo se muestran las que admite su estado.
 * variant "icons": botones compactos para la tabla.
 * variant "buttons": botones con texto para el encabezado del detalle.
 */
export default function TripActions({ viaje, actions, onStart, onFinish, onCancel, onReassign, variant = "icons", showDetail = true }) {
  const location = useLocation();
  // Desde el listado se recuerda la URL con sus filtros; desde el detalle se
  // conserva el origen que ya traía, para volver luego a la misma pantalla.
  const state = variant === "buttons" ? location.state : { from: `${location.pathname}${location.search}` };

  if (variant === "buttons") {
    return (
      <>
        {actions.editar && (
          <Link to={`/viajes/${viaje.id}/editar`} state={state} className="btn-app btn-app-outline btn-app-lg">
            <SquarePen size={18} strokeWidth={2} aria-hidden="true" />
            Editar
          </Link>
        )}
        {actions.reasignar && (
          <button type="button" className="btn-app btn-app-outline btn-app-lg" onClick={() => onReassign(viaje)}>
            <UserCog size={18} strokeWidth={2} aria-hidden="true" />
            Reasignar chofer
          </button>
        )}
        {actions.iniciar && (
          <button type="button" className="btn-app btn-app-primary btn-app-lg" onClick={() => onStart(viaje)}>
            <Play size={18} strokeWidth={2} aria-hidden="true" />
            Iniciar viaje
          </button>
        )}
        {actions.finalizar && (
          <button type="button" className="btn-app btn-app-primary btn-app-lg" onClick={() => onFinish(viaje)}>
            <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
            Finalizar viaje
          </button>
        )}
        {actions.cancelar && (
          <button type="button" className="btn-app btn-app-danger-outline btn-app-lg" onClick={() => onCancel(viaje)}>
            <Ban size={18} strokeWidth={2} aria-hidden="true" />
            Cancelar viaje
          </button>
        )}
      </>
    );
  }

  const label = (text) => `${text} ${viaje.id}`;

  return (
    <div className="trip-actions">
      {showDetail && (
        <Link to={`/viajes/${viaje.id}`} state={state} className="trip-action" title="Ver detalle" aria-label={label("Ver detalle del viaje")}>
          <Eye size={17} strokeWidth={2} />
        </Link>
      )}
      {actions.editar && (
        <Link to={`/viajes/${viaje.id}/editar`} state={state} className="trip-action" title="Editar" aria-label={label("Editar viaje")}>
          <SquarePen size={17} strokeWidth={2} />
        </Link>
      )}
      {actions.reasignar && (
        <button type="button" className="trip-action" title="Reasignar chofer" aria-label={label("Reasignar chofer del viaje")} onClick={() => onReassign(viaje)}>
          <UserCog size={17} strokeWidth={2} />
        </button>
      )}
      {actions.iniciar && (
        <button type="button" className="trip-action trip-action--info" title="Iniciar viaje" aria-label={label("Iniciar viaje")} onClick={() => onStart(viaje)}>
          <Play size={17} strokeWidth={2} />
        </button>
      )}
      {actions.finalizar && (
        <button type="button" className="trip-action trip-action--success" title="Finalizar viaje" aria-label={label("Finalizar viaje")} onClick={() => onFinish(viaje)}>
          <CircleCheck size={17} strokeWidth={2} />
        </button>
      )}
      {actions.cancelar && (
        <button type="button" className="trip-action trip-action--danger" title="Cancelar viaje" aria-label={label("Cancelar viaje")} onClick={() => onCancel(viaje)}>
          <Ban size={17} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
