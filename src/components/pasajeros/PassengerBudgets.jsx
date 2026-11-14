import { formatDate } from "../../utils/dates";
import { formatCurrency } from "../../utils/format";

/** Presupuestos asociados al pasajero, con fila de totales (como en Figma). */
export default function PassengerBudgets({ presupuestos, instituciones }) {
  if (presupuestos.length === 0) {
    return <p className="section-empty">No hay presupuestos registrados para este pasajero.</p>;
  }

  const totalKm = presupuestos.reduce((sum, p) => sum + p.kilometros, 0);
  const totalImporte = presupuestos.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="table-responsive">
      <table className="app-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Destino</th>
            <th className="text-end">Kilómetros</th>
            <th className="text-end">Tarifa</th>
            <th className="text-end">Total</th>
          </tr>
        </thead>
        <tbody>
          {presupuestos.map((p) => (
            <tr key={p.id}>
              <td className="text-nowrap">{formatDate(p.fecha)}</td>
              <td className="cell-muted">{instituciones[p.institucionId]?.nombre ?? "—"}</td>
              <td className="text-end">{p.kilometros} km</td>
              <td className="text-end cell-accent">{formatCurrency(p.tarifaKm)}</td>
              <td className="text-end fw-medium">{formatCurrency(p.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="table-total-row">
            <td colSpan={2}>Totales</td>
            <td className="text-end">{totalKm} km</td>
            <td />
            <td className="text-end">{formatCurrency(totalImporte)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
