import { Truck } from "lucide-react";
import { EMPRESA, LEYENDA_DEMO } from "../../constants/presupuestos";
import { formatDate } from "../../utils/dates";
import { formatAmount, formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { formatKm } from "../../utils/budgets";

/**
 * Vista presentable del presupuesto: se muestra en el detalle y es lo único que
 * se imprime (clase print-area, ver estilos de impresión). Usa los mismos
 * valores guardados que el historial y la ficha del pasajero.
 */
export default function BudgetDocument({ presupuesto, pasajero, institucion }) {
  return (
    <article className="budget-document print-area" aria-label={`Presupuesto ${presupuesto.id}`} data-testid="presupuesto-documento">
      <header className="budget-document-header">
        <div className="budget-document-brand">
          <span className="budget-document-logo" aria-hidden="true">
            <Truck size={22} strokeWidth={2} />
          </span>
          <span className="budget-document-company">{EMPRESA}</span>
        </div>
        <div className="budget-document-meta">
          <div>
            <span>N.º</span> <strong data-testid="doc-id">{presupuesto.id}</strong>
          </div>
          <div>
            <span>Fecha</span> <strong>{formatDate(presupuesto.fecha)}</strong>
          </div>
        </div>
      </header>

      <h2 className="budget-document-title">Presupuesto de Traslado</h2>

      <dl className="budget-document-grid">
        <div>
          <dt>Pasajero</dt>
          <dd>{pasajero ? fullName(pasajero) : `Pasajero ${presupuesto.pasajeroId} (no existe)`}</dd>
        </div>
        <div>
          <dt>DNI</dt>
          <dd>{pasajero ? formatDni(pasajero.dni) : "—"}</dd>
        </div>
        {institucion && (
          <div className="budget-document-wide">
            <dt>Destino</dt>
            <dd>
              {institucion.nombre}
              {institucion.direccion ? ` · ${[institucion.direccion, institucion.localidad].filter(Boolean).join(", ")}` : ""}
            </dd>
          </div>
        )}
      </dl>

      <table className="budget-document-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th className="text-end">Kilómetros</th>
            <th className="text-end">Tarifa por km</th>
            <th className="text-end">Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Traslado programado</td>
            <td className="text-end" data-testid="doc-km">{formatKm(presupuesto.kilometros)}</td>
            <td className="text-end" data-testid="doc-tarifa">{formatAmount(presupuesto.tarifaKm)}</td>
            <td className="text-end">{formatAmount(presupuesto.total)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total presupuestado</td>
            <td className="text-end budget-document-total" data-testid="doc-total">
              {formatAmount(presupuesto.total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {presupuesto.observaciones && (
        <div className="budget-document-notes">
          <div className="budget-document-notes-label">Observaciones</div>
          <p>{presupuesto.observaciones}</p>
        </div>
      )}

      <footer className="budget-document-footer">
        <p>Importe en pesos argentinos. Presupuesto informativo: no constituye factura ni comprobante de pago.</p>
        <p className="budget-document-demo">{LEYENDA_DEMO}</p>
      </footer>
    </article>
  );
}
