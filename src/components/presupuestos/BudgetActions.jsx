import { Link, useLocation } from "react-router-dom";
import { Eye, FileDown, Printer } from "lucide-react";

/**
 * Acciones de un presupuesto en una tabla (Figma: ver, imprimir y descargar).
 * Imprimir y PDF abren el detalle, que contiene la vista imprimible, y lanzan
 * el diálogo de impresión del navegador.
 */
export default function BudgetActions({ presupuesto }) {
  const location = useLocation();
  const state = { from: `${location.pathname}${location.search}`, backState: location.state };
  const to = (accion) => `/presupuestos/${presupuesto.id}${accion ? `?accion=${accion}` : ""}`;
  const label = (text) => `${text} ${presupuesto.id}`;

  return (
    <div className="trip-actions">
      <Link to={to()} state={state} className="trip-action" title="Ver detalle" aria-label={label("Ver detalle del presupuesto")}>
        <Eye size={17} strokeWidth={2} />
      </Link>
      <Link to={to("imprimir")} state={state} className="trip-action" title="Imprimir" aria-label={label("Imprimir presupuesto")}>
        <Printer size={17} strokeWidth={2} />
      </Link>
      <Link to={to("pdf")} state={state} className="trip-action" title="Guardar como PDF" aria-label={label("Guardar como PDF el presupuesto")}>
        <FileDown size={17} strokeWidth={2} />
      </Link>
    </div>
  );
}
