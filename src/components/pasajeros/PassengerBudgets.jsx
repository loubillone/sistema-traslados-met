import { formatDate } from "../../utils/dates";
import { formatAmount } from "../../utils/format";
import { formatKm, sumarImportes } from "../../utils/budgets";
import BudgetActions from "../presupuestos/BudgetActions";

/**
 * Presupuestos asociados al pasajero, con fila de totales (como en Figma).
 * Lee la misma colección que el módulo Presupuestos: altas, ediciones y bajas
 * se reflejan aquí de inmediato. Los importes son presupuestados, no cobrados.
 */
export default function PassengerBudgets({ presupuestos, instituciones }) {
  if (presupuestos.length === 0) {
    return <p className="section-empty">No hay presupuestos registrados para este pasajero.</p>;
  }

  const totalKm = sumarImportes(presupuestos, "kilometros");
  const totalImporte = sumarImportes(presupuestos, "total");

  return (
    <div className="table-responsive" data-testid="presupuestos-pasajero">
      <table className="app-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Destino</th>
            <th className="text-end">Kilómetros</th>
            <th className="text-end">Tarifa</th>
            <th className="text-end">Total</th>
            <th className="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {presupuestos.map((p) => (
            <tr key={p.id}>
              <td className="text-nowrap">{formatDate(p.fecha)}</td>
              <td className="cell-muted">{instituciones[p.institucionId]?.nombre ?? "—"}</td>
              <td className="text-end text-nowrap">{formatKm(p.kilometros)}</td>
              <td className="text-end text-nowrap cell-accent">{formatAmount(p.tarifaKm)}</td>
              <td className="text-end text-nowrap fw-medium">{formatAmount(p.total)}</td>
              <td className="text-center">
                <BudgetActions presupuesto={p} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="table-total-row">
            <td colSpan={2}>Totales</td>
            <td className="text-end text-nowrap">{formatKm(totalKm)}</td>
            <td />
            <td className="text-end text-nowrap" data-testid="total-presupuestos-pasajero">
              {formatAmount(totalImporte)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
