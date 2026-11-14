import { FunnelX } from "lucide-react";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import { ESTADOS_VIAJE } from "../../constants/estados";
import { fullName } from "../../utils/selectors";

/** Panel de filtros combinables del historial de viajes (CU-05). */
export default function TripFilters({ filters, onChange, onClear, choferes, vehiculos, instituciones, dateError, activeCount }) {
  const field = (name) => ({
    id: `filtro-${name}`,
    name,
    value: filters[name],
    onChange: (event) => onChange(name, event.target.value),
  });

  return (
    <section className="trip-filters" aria-label="Filtros de viajes">
      <div className="row g-3">
        <div className="col-6 col-md-4 col-xl-2">
          <InputField {...field("desde")} type="date" label="Fecha desde" max={filters.hasta || undefined} error={dateError} />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <InputField {...field("hasta")} type="date" label="Fecha hasta" min={filters.desde || undefined} />
        </div>
        <div className="col-12 col-md-4 col-xl-3">
          <InputField
            {...field("pasajero")}
            type="search"
            label="Pasajero (DNI o nombre)"
            placeholder="Ej.: 12345678 o González"
            maxLength={60}
            autoComplete="off"
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-xl-2">
          <SelectField
            {...field("estado")}
            label="Estado"
            placeholder="Todos los estados"
            options={Object.entries(ESTADOS_VIAJE).map(([value, { label }]) => ({ value, label }))}
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-xl-3">
          <SelectField
            {...field("destino")}
            label="Destino"
            placeholder="Todos los destinos"
            options={instituciones.map((i) => ({ value: i.id, label: i.nombre }))}
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-xl-3">
          <SelectField
            {...field("chofer")}
            label="Chofer"
            placeholder="Todos los choferes"
            options={choferes.map((c) => ({ value: c.id, label: `${fullName(c)}${c.activo ? "" : " (inactivo)"}` }))}
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-xl-3">
          <SelectField
            {...field("vehiculo")}
            label="Vehículo"
            placeholder="Todos los vehículos"
            options={vehiculos.map((v) => ({ value: v.id, label: `${v.patente} · ${v.tipo}${v.activo === false ? " (de baja)" : ""}` }))}
          />
        </div>
        <div className="col-12 col-xl-6 trip-filters-actions">
          <button type="button" className="btn-app btn-app-outline" onClick={onClear} disabled={activeCount === 0}>
            <FunnelX size={16} strokeWidth={2} aria-hidden="true" />
            Limpiar filtros
          </button>
        </div>
      </div>
    </section>
  );
}
