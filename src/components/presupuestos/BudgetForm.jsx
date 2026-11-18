import { useMemo, useRef, useState } from "react";
import { Calculator, DollarSign, Route, Save, UserRound } from "lucide-react";
import ContentCard from "../common/ContentCard";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextareaField from "../common/TextareaField";
import { OBSERVACIONES_MAX } from "../../constants/presupuestos";
import { showToast } from "../../utils/alerts";
import { formatAmount, formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { formatKm, previewTotal } from "../../utils/budgets";

const FIELD_ORDER = ["pasajeroId", "institucionId", "fecha", "kilometros", "tarifaKm", "observaciones"];

/**
 * Cálculo de presupuesto (CU-14). El total se muestra mientras se escribe,
 * con la misma función que se usa al guardar, en el detalle y en la impresión.
 * En edición el pasajero queda fijo: no se rompe la relación ni se toca su DNI.
 */
export default function BudgetForm({ initialValues, initialTouched = [], data, editing = null, today, validate, onSubmit, onCancel }) {
  const formRef = useRef(null);
  const [form, setForm] = useState(initialValues);
  const [touched, setTouched] = useState(() => new Set(initialTouched));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => validate(form), [validate, form]);
  const visible = (name) => (submitted || touched.has(name) ? errors[name] : undefined);
  const touch = (name) => setTouched((current) => (current.has(name) ? current : new Set([...current, name])));
  const preview = previewTotal(form);

  const pasajero = data.pasajeros.find((p) => p.id === form.pasajeroId);
  const opcionesPasajero = useMemo(
    () =>
      data.pasajeros
        .filter((p) => p.activo)
        .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"))
        .map((p) => ({ value: p.id, label: `${p.apellido}, ${p.nombre} · DNI ${formatDni(p.dni)}` })),
    [data.pasajeros],
  );

  const field = (name) => ({
    id: `presupuesto-${name}`,
    name,
    value: form[name],
    onChange: (event) => {
      const { value } = event.target;
      setForm((current) => ({ ...current, [name]: value }));
      if (event.target.tagName === "SELECT" || event.target.type === "date") touch(name);
    },
    onBlur: (event) => {
      if (event.target.value.trim()) touch(name);
    },
    error: visible(name),
  });

  // Al elegir el pasajero se propone su destino habitual, salvo que ya se haya elegido otro.
  const handlePassengerChange = (event) => {
    const id = event.target.value;
    touch("pasajeroId");
    setForm((current) => {
      const anterior = data.pasajeros.find((p) => p.id === current.pasajeroId);
      const nuevo = data.pasajeros.find((p) => p.id === id);
      const destinoPropuesto = !current.institucionId || current.institucionId === anterior?.institucionId;
      return { ...current, pasajeroId: id, institucionId: destinoPropuesto ? nuevo?.institucionId ?? "" : current.institucionId };
    });
  };

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

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-8">
          <ContentCard title="Datos del presupuesto" className="h-100">
            <div className="row gx-4">
              <div className="col-md-7">
                {editing ? (
                  <div className="form-field">
                    <span className="form-label-app">Pasajero</span>
                    <div className="budget-passenger-fixed" data-testid="pasajero-fijo">
                      <UserRound size={16} strokeWidth={2} aria-hidden="true" />
                      <span>
                        {fullName(pasajero)} · DNI {pasajero ? formatDni(pasajero.dni) : "—"}
                      </span>
                    </div>
                    <div className="field-hint">El pasajero no puede cambiarse: el presupuesto queda vinculado a su ficha.</div>
                    {visible("pasajeroId") && <div className="field-error">{errors.pasajeroId}</div>}
                  </div>
                ) : (
                  <SelectField
                    {...field("pasajeroId")}
                    onChange={handlePassengerChange}
                    label="Pasajero *"
                    placeholder="Seleccione el pasajero"
                    options={opcionesPasajero}
                    hint="Solo pasajeros activos registrados."
                  />
                )}
              </div>
              <div className="col-md-5">
                <InputField {...field("fecha")} type="date" label="Fecha de emisión *" max={today} />
              </div>
              <div className="col-12">
                <SelectField
                  {...field("institucionId")}
                  label="Destino del recorrido"
                  placeholder="Sin destino especificado"
                  options={data.instituciones.map((i) => ({ value: i.id, label: `${i.nombre} · ${i.localidad}` }))}
                  hint="Opcional. Se propone el destino habitual del pasajero."
                />
              </div>
              <div className="col-md-6">
                <InputField
                  {...field("kilometros")}
                  icon={Route}
                  label="Kilómetros del recorrido *"
                  placeholder="Ej.: 45 o 45,5"
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={12}
                  hint="Mayor que cero, hasta 2 decimales."
                />
              </div>
              <div className="col-md-6">
                <InputField
                  {...field("tarifaKm")}
                  icon={DollarSign}
                  label="Tarifa por kilómetro (ARS) *"
                  placeholder="Ej.: 250 o 1.250,50"
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={16}
                  hint="Valor ficticio de demostración."
                />
              </div>
              <div className="col-12">
                <TextareaField
                  {...field("observaciones")}
                  label="Observaciones"
                  placeholder="Ej.: Recorrido ida y vuelta con espera en la institución"
                  rows={3}
                  maxLength={OBSERVACIONES_MAX}
                />
              </div>
            </div>
          </ContentCard>
        </div>

        <div className="col-12 col-xl-4">
          <ContentCard title="Cálculo" className="h-100 budget-calc-card">
            <div className="budget-calc" aria-live="polite" data-testid="calculo-total">
              <div className="budget-calc-icon" aria-hidden="true">
                <Calculator size={22} strokeWidth={1.75} />
              </div>
              <div className="budget-calc-formula">
                {preview ? (
                  <>
                    {formatKm(preview.kilometros)} × {formatAmount(preview.tarifaKm)}
                  </>
                ) : (
                  "Kilómetros × tarifa por km"
                )}
              </div>
              <div className="budget-calc-label">Total</div>
              <div className="budget-calc-total" data-testid="total-calculado">
                {preview ? formatAmount(preview.total) : "—"}
              </div>
              <p className="budget-calc-hint">
                {preview
                  ? "Se actualiza al modificar kilómetros o tarifa."
                  : "Complete kilómetros y tarifa con valores válidos para ver el total."}
              </p>
            </div>
            <p className="field-hint mb-0">
              Importe presupuestado en pesos argentinos (no es un ingreso cobrado). Guardar el presupuesto no crea ni modifica viajes.
            </p>
          </ContentCard>
        </div>
      </div>

      <div className="form-actions">
        <span className="form-required-note">* Campos obligatorios</span>
        <button type="button" className="btn-app btn-app-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-app btn-app-primary" disabled={saving}>
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          {editing ? "Guardar cambios" : "Guardar presupuesto"}
        </button>
      </div>
    </form>
  );
}
