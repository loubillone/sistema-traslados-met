import { Link, useLocation } from "react-router-dom";
import { Eye, SquarePen, Trash2 } from "lucide-react";

/**
 * Acciones de un gasto en una tabla: ver detalle, editar y eliminar.
 * Recuerda la pantalla de origen (con sus filtros) para volver a ella.
 */
export default function ExpenseActions({ gasto, onDelete }) {
  const location = useLocation();
  const state = { from: `${location.pathname}${location.search}`, backState: location.state };
  const label = (text) => `${text} ${gasto.id}`;

  return (
    <div className="trip-actions">
      <Link to={`/gastos/${gasto.id}`} state={state} className="trip-action" title="Ver detalle" aria-label={label("Ver detalle del gasto")}>
        <Eye size={17} strokeWidth={2} />
      </Link>
      <Link to={`/gastos/${gasto.id}/editar`} state={state} className="trip-action" title="Editar" aria-label={label("Editar gasto")}>
        <SquarePen size={17} strokeWidth={2} />
      </Link>
      <button type="button" className="trip-action trip-action--danger" title="Eliminar" aria-label={label("Eliminar gasto")} onClick={() => onDelete(gasto)}>
        <Trash2 size={17} strokeWidth={2} />
      </button>
    </div>
  );
}
