import { useMemo, useRef, useState } from "react";
import { Save } from "lucide-react";
import ContentCard from "../common/ContentCard";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextareaField from "../common/TextareaField";
import ExpiryNotice from "./ExpiryNotice";
import { CATEGORIAS_LICENCIA, TURNOS_CHOFER } from "../../constants/recursos";
import { DISPONIBILIDAD_CHOFER } from "../../constants/estados";
import { showToast } from "../../utils/alerts";

const FIELD_ORDER = ["dni", "nombre", "apellido", "telefono", "licencia", "categoriaLicencia", "vencimientoLicencia", "disponibilidad", "observaciones"];

/** Alta y edición de choferes (CU-11). En edición el DNI no puede modificarse. */
export default function DriverForm({ initialValues, mode, validate, onSubmit, onCancel, today }) {
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
    id: `chofer-${name}`,
    name,
    value: form[name],
    onChange: (event) => {
      setForm((current) => ({ ...current, [name]: event.target.value }));
      if (event.target.tagName === "SELECT" || event.target.type === "date") touch(name);
    },
    onBlur: (event) => event.target.value.trim() && touch(name),
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

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <ContentCard title="Datos personales" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-4">
            <InputField
              {...field("dni")}
              label="DNI *"
              placeholder="Ej.: 30123456"
              inputMode="numeric"
              maxLength={10}
              disabled={isEdit}
              hint={isEdit ? "El DNI identifica al chofer y no puede modificarse." : "Solo números, 7 u 8 dígitos."}
            />
          </div>
          <div className="col-md-4">
            <InputField {...field("nombre")} label="Nombre *" placeholder="Ej.: Carlos" maxLength={60} autoComplete="off" />
          </div>
          <div className="col-md-4">
            <InputField {...field("apellido")} label="Apellido *" placeholder="Ej.: Ruiz" maxLength={60} autoComplete="off" />
          </div>
          <div className="col-md-4">
            <InputField {...field("telefono")} label="Teléfono *" placeholder="Ej.: 381-423-6789" inputMode="tel" maxLength={25} />
          </div>
          <div className="col-md-4">
            <SelectField
              {...field("turno")}
              label="Turno habitual"
              placeholder="Sin turno fijo"
              options={TURNOS_CHOFER.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div className="col-md-4">
            <SelectField
              {...field("disponibilidad")}
              label="Disponibilidad *"
              options={["disponible", "guardia", "no_disponible"].map((value) => ({ value, label: DISPONIBILIDAD_CHOFER[value].label }))}
              hint="No disponible: no puede asignarse a viajes nuevos."
            />
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Licencia de conducir" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-4">
            <InputField {...field("licencia")} label="Número de licencia *" placeholder="Ej.: B-12345678" maxLength={20} autoComplete="off" />
          </div>
          <div className="col-md-4">
            <SelectField
              {...field("categoriaLicencia")}
              label="Categoría *"
              placeholder="Seleccione la categoría"
              options={Object.entries(CATEGORIAS_LICENCIA).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div className="col-md-4">
            <InputField
              {...field("vencimientoLicencia")}
              type="date"
              label="Vencimiento *"
              min={isEdit ? undefined : today}
              hint={isEdit ? undefined : "No se admiten licencias vencidas."}
            />
          </div>
          {form.vencimientoLicencia && !errors.vencimientoLicencia && (
            <div className="col-12">
              <ExpiryNotice label="Licencia vence" fecha={form.vencimientoLicencia} today={today} />
            </div>
          )}
        </div>
      </ContentCard>

      <ContentCard title="Observaciones" className="mb-4">
        <TextareaField {...field("observaciones")} label="Observaciones" placeholder="Información adicional (opcional)" rows={3} maxLength={300} />
      </ContentCard>

      <div className="form-actions">
        <span className="form-required-note">* Campos obligatorios</span>
        <button type="button" className="btn-app btn-app-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-app btn-app-primary" disabled={saving}>
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          {isEdit ? "Guardar cambios" : "Registrar chofer"}
        </button>
      </div>
    </form>
  );
}
