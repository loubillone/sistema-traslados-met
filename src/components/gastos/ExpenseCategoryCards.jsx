import { CATEGORIAS_GASTO, CATEGORIA_KEYS } from "../../constants/gastos";
import { formatAmount } from "../../utils/format";

/**
 * Totales por categoría con los colores e íconos de Figma. Cada tarjeta filtra
 * la tabla por su categoría; un segundo clic quita el filtro.
 */
export default function ExpenseCategoryCards({ summary, selected, onSelect }) {
  return (
    <div className="expense-category-grid" role="group" aria-label="Totales por categoría">
      {CATEGORIA_KEYS.map((key) => {
        const { label, color, icon: Icon } = CATEGORIAS_GASTO[key];
        const { total, cantidad } = summary[key];
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            className={`expense-category-card${active ? " is-active" : ""}`}
            style={{ "--category-color": color }}
            aria-pressed={active}
            title={active ? "Quitar el filtro de categoría" : `Ver solo los gastos de ${label}`}
            onClick={() => onSelect(active ? "" : key)}
            data-testid={`categoria-${key}`}
          >
            <span className="expense-category-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={1.75} />
            </span>
            <span className="expense-category-body">
              <span className="expense-category-name">{label}</span>
              <span className="expense-category-total">{formatAmount(total)}</span>
              <span className="expense-category-count">
                {cantidad} {cantidad === 1 ? "gasto" : "gastos"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
