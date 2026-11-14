import { useMemo, useRef, useState } from "react";
import { Save } from "lucide-react";
import ContentCard from "../common/ContentCard";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextareaField from "../common/TextareaField";
import ExpiryNotice from "./ExpiryNotice";
import { TIPOS_VEHICULO } from "../../constants/recursos";
import { showToast } from "../../utils/alerts";
import { normalizePlate } from "../../utils/resources";

const FIELD_ORDER = ["patente", "tipo", "modelo", "capacidad", "estado", "vencimientoVTV", "aseguradora", "poliza", "vencimientoSeguro", "observaciones"];

/** Alta y edición de vehículos (CU-12). En edición la patente no puede modificarse. */
export default function VehicleForm({ initialValues, mode, validate, onSubmit, onCancel, today }) {
  const isEdit = mode === "edit";
  const formRef = useRef(null);
  const [form, setForm] = useState(initialValues);
  const [touched, setTouched] = useState(() => new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => validate(form), [validate, form]);
  const visible = (name) => (submitted || touched.has(name) ? errors[name] : undefined);
  const touch = (name) => setTouched((current) => (current.has(name) ? current : new Set([...current, name])));

  const field = (name) => ({
    id: `vehiculo-${name}`,
    name,
    value: form[name],
    onChange: (event) => {
      setForm((current) => ({ ...current, [name]: event.target.value }));
      if (event.target.tagName === "SELECT" || event.target.type === "date") touch(name);
    },
    onBlur: (event) => {
      if (name === "patente" && event.target.value) setForm((current) => ({ ...current, patente: normalizePlate(current.patente) }));
      if (event.target.value.trim()) touch(name);
    },
    error: visible(name),
  });

  const tipos = TIPOS_VEHICULO.includes(form.tipo) || !form.tipo ? TIPOS_VEHICULO : [form.tipo, ...TIPOS_VEHICULO];

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
    const saved = await onSubmit({ ...form, patente: normalizePlate(form.patente) });
    if (!saved) setSaving(false);
  };

  const dateField = (name, label) => (
    <InputField {...field(name)} type="date" label={label} min={isEdit ? undefined : today} hint={isEdit ? undefined : "No se admiten fechas vencidas."} />
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <ContentCard title="Datos del vehículo" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-4">
            <InputField
              {...field("patente")}
              label="Patente *"
              placeholder="Ej.: AB-123-CD"
              maxLength={10}
              autoComplete="off"
              disabled={isEdit}
              hint={isEdit ? "La patente identifica al vehículo y no puede modificarse." : "Formato AB-123-CD o ABC-123."}
            />
          </div>
          <div className="col-md-4">
            <SelectField {...field("tipo")} label="Tipo de vehículo *" placeholder="Seleccione el tipo" options={tipos.map((t) => ({ value: t, label: t }))} />
          </div>
          <div className="col-md-4">
            <InputField {...field("capacidad")} type="number" label="Capacidad de pasajeros *" min={1} max={60} step={1} inputMode="numeric" />
          </div>
          <div className="col-md-8">
            <InputField {...field("modelo")} label="Marca y modelo" placeholder="Ej.: Renault Master" maxLength={60} />
          </div>
          <div className="col-md-4">
            <SelectField
              {...field("estado")}
              label="Estado *"
              options={[
                { value: "activo", label: "Activo" },
                { value: "mantenimiento", label: "En mantenimiento" },
              ]}
              hint="En mantenimiento: no admite viajes nuevos."
            />
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Documentación" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-4">{dateField("vencimientoVTV", "Vencimiento de VTV *")}</div>
          <div className="col-md-4">
            <InputField {...field("aseguradora")} label="Aseguradora *" placeholder="Nombre de la compañía" maxLength={60} />
          </div>
          <div className="col-md-4">
            <InputField {...field("poliza")} label="Nº de póliza *" placeholder="Ej.: AQ-2026-001845" maxLength={30} />
          </div>
          <div className="col-md-4">{dateField("vencimientoSeguro", "Vencimiento del seguro *")}</div>
        </div>
        <div className="row g-3">
          {form.vencimientoVTV && !errors.vencimientoVTV && (
            <div className="col-md-6">
              <ExpiryNotice label="VTV vence" fecha={form.vencimientoVTV} today={today} />
            </div>
          )}
          {form.vencimientoSeguro && !errors.vencimientoSeguro && (
            <div className="col-md-6">
              <ExpiryNotice label="Seguro vence" fecha={form.vencimientoSeguro} today={today} />
            </div>
          )}
        </div>
      </ContentCard>

      <ContentCard title="Observaciones" className="mb-4">
        <TextareaField {...field("observaciones")} label="Observaciones" placeholder="Equipamiento, rampa, novedades del taller, etc." rows={3} maxLength={300} />
      </ContentCard>

      <div className="form-actions">
        <span className="form-required-note">* Campos obligatorios</span>
        <button type="button" className="btn-app btn-app-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-app btn-app-primary" disabled={saving}>
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          {isEdit ? "Guardar cambios" : "Registrar vehículo"}
        </button>
      </div>
    </form>
  );
}
