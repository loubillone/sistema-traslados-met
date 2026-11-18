import { FunnelX } from "lucide-react";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import { formatDni } from "../../utils/format";

/** Filtros del historial de presupuestos: pasajero y período de emisión. */
export default function BudgetFilters({ filters, onChange, onClear, pasajeros, dateError, canClear }) {
  const field = (name) => ({
    id: `filtro-presupuesto-${name}`,
    name,
    value: filters[name],
    onChange: (event) => onChange(name, event.target.value),
  });

  const opciones = [...pasajeros]
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"))
    .map((p) => ({ value: p.id, label: `${p.apellido}, ${p.nombre} · DNI ${formatDni(p.dni)}${p.activo ? "" : " (inactivo)"}` }));

  return (
    <section className="trip-filters" aria-label="Filtros de presupuestos">
      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <SelectField {...field("pasajero")} label="Pasajero" placeholder="Todos los pasajeros" options={opciones} />
        </div>
        <div className="col-6 col-lg-2">
          <InputField {...field("desde")} type="date" label="Desde" max={filters.hasta || undefined} error={dateError} />
        </div>
        <div className="col-6 col-lg-2">
          <InputField {...field("hasta")} type="date" label="Hasta" min={filters.desde || undefined} />
        </div>
        <div className="col-12 col-lg-3 trip-filters-actions">
          <button type="button" className="btn-app btn-app-outline" onClick={onClear} disabled={!canClear}>
            <FunnelX size={16} strokeWidth={2} aria-hidden="true" />
            Limpiar filtros
          </button>
        </div>
      </div>
    </section>
  );
}
