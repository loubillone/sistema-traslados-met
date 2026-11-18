import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import ContentCard from "../common/ContentCard";
import CategoryLabel from "./CategoryLabel";
import ExpenseActions from "./ExpenseActions";
import useExpenseActions from "../../hooks/useExpenseActions";
import { formatDate } from "../../utils/dates";
import { formatAmount } from "../../utils/format";
import { getExpenseBlockReason, getTripExpenses, sumAmounts } from "../../utils/expenses";

/**
 * Gastos asociados a un viaje. Lee la misma colección que el módulo Gastos
 * (no hay copias): cualquier alta, edición o baja se ve en ambos lugares.
 * `currentId` resalta el gasto que se está consultando.
 */
export default function TripExpenses({ viaje, gastos, title = "Gastos asociados", currentId = null, onDeleteCurrent, showRegister = true }) {
  const location = useLocation();
  const { remove } = useExpenseActions();
  // Si se elimina el gasto que se está consultando, la pantalla decide adónde volver.
  const handleDelete = (g) => (g.id === currentId && onDeleteCurrent ? onDeleteCurrent() : remove(g));
  const lista = getTripExpenses(gastos, viaje.id);
  const total = sumAmounts(lista);
  const blockReason = getExpenseBlockReason(viaje);

  const columns = [
    { key: "categoria", header: "Categoría", render: (g) => <CategoryLabel categoria={g.categoria} />, cellClassName: "text-nowrap" },
    { key: "fecha", header: "Fecha", render: (g) => formatDate(g.fecha), cellClassName: "text-nowrap" },
    {
      key: "descripcion",
      header: "Descripción",
      render: (g) => (
        <>
          {g.descripcion}
          {g.id === currentId && <span className="expense-current-tag">este gasto</span>}
        </>
      ),
      cellClassName: "cell-muted expense-description",
    },
    { key: "monto", header: "Monto", render: (g) => formatAmount(g.monto), className: "text-end", cellClassName: "text-end text-nowrap" },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-end",
      cellClassName: "text-end",
      render: (g) => <ExpenseActions gasto={g} onDelete={handleDelete} />,
    },
  ];

  return (
    <ContentCard
      title={title}
      actions={
        showRegister &&
        !blockReason && (
          <Link
            to={`/gastos/nuevo?viaje=${viaje.id}`}
            state={{ from: `${location.pathname}${location.search}`, backState: location.state }}
            className="btn-app btn-app-primary"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Registrar gasto
          </Link>
        )
      }
    >
      <div data-testid="gastos-del-viaje">
        {lista.length === 0 ? (
          <p className="section-empty">No hay gastos asociados a este viaje.</p>
        ) : (
          <div className="table-responsive">
            <table className="app-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={c.className}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => (
                  <tr key={g.id} className={g.id === currentId ? "is-highlighted" : undefined}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.cellClassName}>
                        {c.render(g)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="table-total-row">
                  <td colSpan={3}>
                    Total de gastos del viaje ({lista.length} {lista.length === 1 ? "gasto" : "gastos"})
                  </td>
                  <td className="text-end text-nowrap" data-testid="total-gastos-viaje">
                    {formatAmount(total)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {blockReason && showRegister && <p className="field-hint mb-0 mt-3">{blockReason}</p>}
      </div>
    </ContentCard>
  );
}
