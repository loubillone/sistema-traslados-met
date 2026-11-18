import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CarFront, DollarSign, Info, Save } from "lucide-react";
import ContentCard from "../common/ContentCard";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextareaField from "../common/TextareaField";
import StatusBadge from "../common/StatusBadge";
import { CATEGORIAS_GASTO, DESCRIPCION_MAX } from "../../constants/gastos";
import { showToast } from "../../utils/alerts";
import { formatDate } from "../../utils/dates";
import { formatAmount } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { tripRoute } from "../../utils/trips";
import { eligibleTripsOn, getTripExpenses, sumAmounts } from "../../utils/expenses";

const FIELD_ORDER = ["diaViaje", "viajeId", "fecha", "categoria", "monto", "descripcion"];

/**
 * Registro y edición de un gasto (CU-13). El viaje se elige por día; el
 * vehículo se muestra a partir del viaje seleccionado y no se carga a mano.
 */
export default function ExpenseForm({ initialValues, initialTouched = [], data, editing = null, today, validate, onSubmit, onCancel }) {
  const formRef = useRef(null);
  const [form, setForm] = useState(initialValues);
  const [touched, setTouched] = useState(() => new Set(initialTouched));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => validate(form), [validate, form]);
  const visible = (name) => (submitted || touched.has(name) ? errors[name] : undefined);
  const touch = (name) => setTouched((current) => (current.has(name) ? current : new Set([...current, name])));

  const viaje = form.viajeId ? data.viajes.find((v) => v.id === form.viajeId) : null;
  const opciones = useMemo(() => {
    const list = eligibleTripsOn(data.viajes, form.diaViaje);
    // En edición se conserva el viaje original aunque ya no admita gastos nuevos.
    const original = editing ? data.viajes.find((v) => v.id === editing.viajeId) : null;
    if (original && original.fecha === form.diaViaje && !list.some((v) => v.id === original.id)) list.unshift(original);
    return list;
  }, [data.viajes, form.diaViaje, editing]);

  const pasajeros = useMemo(() => Object.fromEntries(data.pasajeros.map((p) => [p.id, p])), [data.pasajeros]);
  const vehiculos = useMemo(() => Object.fromEntries(data.vehiculos.map((v) => [v.id, v])), [data.vehiculos]);

  const tripOptionLabel = (v) =>
    `${v.hora} · ${v.id} · ${fullName(pasajeros[v.pasajeroId])} · ${vehiculos[v.vehiculoId]?.patente ?? "sin vehículo"}${
      v.estado === "en_curso" ? " (en curso)" : v.estado === "cancelado" ? " (cancelado)" : ""
    }`;

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const handleDayChange = (event) => {
    const dia = event.target.value;
    touch("diaViaje");
    setForm((current) => {
      const next = { ...current, diaViaje: dia };
      const sigue = data.viajes.find((v) => v.id === current.viajeId)?.fecha === dia;
      if (!sigue) next.viajeId = "";
      // La fecha del gasto acompaña al día del viaje mientras no se cambie a mano.
      if (!current.fecha || current.fecha === current.diaViaje) next.fecha = dia;
      return next;
    });
  };

  const handleTripChange = (event) => {
    const id = event.target.value;
    touch("viajeId");
    const elegido = data.viajes.find((v) => v.id === id);
    setForm((current) => ({
      ...current,
      viajeId: id,
      fecha: elegido && (!current.fecha || current.fecha < elegido.fecha) ? elegido.fecha : current.fecha,
    }));
  };

  const field = (name) => ({
    id: `gasto-${name}`,
    name,
    value: form[name],
    onChange: (event) => {
      setValue(name, event.target.value);
      if (event.target.tagName === "SELECT" || event.target.type === "date") touch(name);
    },
    onBlur: (event) => {
      if (event.target.value.trim()) touch(name);
    },
    error: visible(name),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    const invalid = FIELD_ORDER.filter((name) => errors[name]);
    if (invalid.length > 0) {
      formRef.current?.querySelector(`[name="${invalid[0]}"]`)?.focus();
      showToast("Revise los campos marcados en rojo", "error");
      return;
    }
    setSaving(true);
    const saved = await onSubmit(form);
    if (!saved) setSaving(false);
  };

  const institucion = viaje ? data.instituciones.find((i) => i.id === viaje.institucionId) : null;
  const ruta = viaje ? tripRoute(viaje, institucion) : null;
  const vehiculo = viaje ? vehiculos[viaje.vehiculoId] : null;
  const otrosGastos = viaje ? getTripExpenses(data.gastos, viaje.id).filter((g) => g.id !== editing?.id) : [];

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <ContentCard title="Viaje asociado" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-4">
            <InputField
              {...field("diaViaje")}
              onChange={handleDayChange}
              type="date"
              label="Día del viaje *"
              max={today}
              hint="Se listan los viajes en curso o finalizados de ese día."
            />
          </div>
          <div className="col-md-8">
            <SelectField
              {...field("viajeId")}
              onChange={handleTripChange}
              label="Viaje *"
              placeholder={!form.diaViaje ? "Elija primero el día del viaje" : opciones.length ? "Seleccione el viaje" : "No hay viajes en curso o finalizados ese día"}
              options={opciones.map((v) => ({ value: v.id, label: tripOptionLabel(v) }))}
              disabled={!form.diaViaje || errors.diaViaje !== undefined}
            />
          </div>
        </div>

        {viaje ? (
          <div className="expense-trip-summary" data-testid="viaje-seleccionado">
            <div className="expense-trip-summary-icon" aria-hidden="true">
              <CarFront size={18} strokeWidth={2} />
            </div>
            <dl className="expense-trip-summary-grid">
              <div>
                <dt>Viaje</dt>
                <dd>
                  <Link to={`/viajes/${viaje.id}`} className="link-app" target="_blank" rel="noreferrer">
                    {viaje.id}
                  </Link>{" "}
                  <StatusBadge estado={viaje.estado} />
                </dd>
              </div>
              <div>
                <dt>Fecha y hora</dt>
                <dd>
                  {formatDate(viaje.fecha)} · {viaje.hora} hs
                </dd>
              </div>
              <div>
                <dt>Pasajero</dt>
                <dd>{fullName(pasajeros[viaje.pasajeroId])}</dd>
              </div>
              <div>
                <dt>Chofer</dt>
                <dd>{fullName(data.choferes.find((c) => c.id === viaje.choferId))}</dd>
              </div>
              <div className="expense-trip-summary-wide">
                <dt>Recorrido</dt>
                <dd>
                  {ruta.origen} → {ruta.destino}
                </dd>
              </div>
              <div className="expense-trip-summary-vehicle">
                <dt>Vehículo (del viaje)</dt>
                <dd data-testid="vehiculo-del-viaje">
                  {vehiculo ? `${vehiculo.patente} · ${vehiculo.tipo}${vehiculo.modelo ? ` ${vehiculo.modelo}` : ""}` : "Sin vehículo asignado"}
                </dd>
              </div>
            </dl>
            {otrosGastos.length > 0 && (
              <p className="expense-trip-summary-note">
                <Info size={14} strokeWidth={2} aria-hidden="true" />
                Este viaje ya tiene {otrosGastos.length} {otrosGastos.length === 1 ? "gasto registrado" : "gastos registrados"} por{" "}
                {formatAmount(sumAmounts(otrosGastos))}. Un viaje puede tener varios gastos.
              </p>
            )}
          </div>
        ) : (
          <p className="field-hint mb-0">El vehículo se completa automáticamente a partir del viaje seleccionado.</p>
        )}
      </ContentCard>

      <ContentCard title="Datos del gasto" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-4">
            <InputField
              {...field("fecha")}
              type="date"
              label="Fecha del gasto *"
              min={viaje?.fecha}
              max={today}
              hint={viaje ? `Entre el ${formatDate(viaje.fecha)} y hoy.` : "No puede ser posterior a hoy."}
            />
          </div>
          <div className="col-md-4">
            <SelectField
              {...field("categoria")}
              label="Categoría *"
              placeholder="Seleccione la categoría"
              options={Object.entries(CATEGORIAS_GASTO).map(([value, { label }]) => ({ value, label }))}
            />
          </div>
          <div className="col-md-4">
            <InputField
              {...field("monto")}
              icon={DollarSign}
              label="Monto (ARS) *"
              placeholder="Ej.: 15.500 o 15500,50"
              inputMode="decimal"
              autoComplete="off"
              maxLength={16}
              hint="Pesos argentinos, mayor que cero."
            />
          </div>
          <div className="col-12">
            <TextareaField
              {...field("descripcion")}
              label="Descripción *"
              placeholder="Ej.: Carga de combustible en estación de servicio"
              rows={2}
              maxLength={DESCRIPCION_MAX}
            />
          </div>
        </div>
        <p className="field-hint mb-0">Registrar o modificar un gasto no cambia el estado del viaje.</p>
      </ContentCard>

      <div className="form-actions">
        <span className="form-required-note">* Campos obligatorios</span>
        <button type="button" className="btn-app btn-app-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-app btn-app-primary" disabled={saving}>
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          {editing ? "Guardar cambios" : "Registrar gasto"}
        </button>
      </div>
    </form>
  );
}
