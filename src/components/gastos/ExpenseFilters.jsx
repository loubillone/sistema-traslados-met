import { FunnelX } from "lucide-react";
import SelectField from "../common/SelectField";
import { CATEGORIAS_GASTO } from "../../constants/gastos";

/**
 * Filtros del registro de gastos. El mes y el vehículo se aplican a todo el
 * tablero; la categoría solo a la tabla (el gráfico muestra todas).
 */
export default function ExpenseFilters({ filters, onChange, onClear, monthOptions, vehiculos, canClear }) {
  const field = (name) => ({
    id: `filtro-gasto-${name}`,
    name,
    value: filters[name],
    onChange: (event) => onChange(name, event.target.value),
  });

  return (
    <section className="trip-filters expense-filters" aria-label="Filtros de gastos">
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-lg-3">
          <SelectField {...field("mes")} label="Mes" options={monthOptions} />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <SelectField
            {...field("vehiculo")}
            label="Vehículo"
            placeholder="Todos los vehículos"
            options={vehiculos.map((v) => ({ value: v.id, label: `${v.patente} · ${v.tipo}${v.activo === false ? " (de baja)" : ""}` }))}
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <SelectField
            {...field("categoria")}
            label="Categoría"
            placeholder="Todas las categorías"
            options={Object.entries(CATEGORIAS_GASTO).map(([value, { label }]) => ({ value, label }))}
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3 trip-filters-actions">
          <button type="button" className="btn-app btn-app-outline" onClick={onClear} disabled={!canClear}>
            <FunnelX size={16} strokeWidth={2} aria-hidden="true" />
            Limpiar filtros
          </button>
        </div>
      </div>
    </section>
  );
}
