import { useRef, useState } from "react";
import { Save } from "lucide-react";
import ContentCard from "../common/ContentCard";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextareaField from "../common/TextareaField";
import { OBRAS_SOCIALES } from "../../constants/pasajeros";
import { showToast } from "../../utils/alerts";

const FIELD_ORDER = [
  "dni", "nombre", "apellido", "telefono", "domicilio",
  "contactoNombre", "contactoVinculo", "contactoTelefono",
  "obraSocial", "institucionId", "condicion", "observaciones",
];

/**
 * Formulario de alta (CU-02) y edición (CU-03) de pasajeros.
 * @param validate función (form) => errores
 * @param onSubmit recibe los valores cuando no hay errores
 */
export default function PassengerForm({ initialValues, mode, instituciones, validate, onSubmit, onCancel }) {
  const isEdit = mode === "edit";
  const formRef = useRef(null);
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const obrasSociales = OBRAS_SOCIALES.includes(form.obraSocial) || !form.obraSocial
    ? OBRAS_SOCIALES
    : [form.obraSocial, ...OBRAS_SOCIALES];

  const refreshFieldError = (name, values) => {
    const all = validate(values);
    setErrors((current) => ({ ...current, [name]: all[name] }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next = { ...form, [name]: value };
    setForm(next);
    if (errors[name]) refreshFieldError(name, next);
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    if (value.trim()) refreshFieldError(name, form);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    const invalid = FIELD_ORDER.filter((name) => validation[name]);
    if (invalid.length > 0) {
      formRef.current?.querySelector(`[name="${invalid[0]}"]`)?.focus();
      showToast("Revise los campos marcados en rojo", "error");
      return;
    }
    setSaving(true);
    onSubmit(form);
  };

  const field = (name) => ({
    id: `pasajero-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    onBlur: handleBlur,
    error: errors[name],
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="passenger-form">
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
              hint={
                isEdit
                  ? "El DNI es el identificador único del pasajero y no puede modificarse."
                  : "Solo números, 7 u 8 dígitos. Se aceptan puntos."
              }
            />
          </div>
          <div className="col-md-4">
            <InputField {...field("nombre")} label="Nombre *" placeholder="Ej.: María" autoComplete="off" maxLength={60} />
          </div>
          <div className="col-md-4">
            <InputField {...field("apellido")} label="Apellido *" placeholder="Ej.: González" autoComplete="off" maxLength={60} />
          </div>
          <div className="col-md-4">
            <InputField {...field("telefono")} label="Teléfono *" placeholder="Ej.: 381-423-4567" inputMode="tel" maxLength={25} />
          </div>
          <div className="col-md-8">
            <InputField {...field("domicilio")} label="Dirección *" placeholder="Calle, número y localidad" maxLength={120} />
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Contacto de emergencia" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-5">
            <InputField {...field("contactoNombre")} label="Nombre y apellido" placeholder="Ej.: Claudia Pérez" maxLength={80} />
          </div>
          <div className="col-md-3">
            <InputField {...field("contactoVinculo")} label="Vínculo" placeholder="Ej.: Madre" maxLength={40} />
          </div>
          <div className="col-md-4">
            <InputField {...field("contactoTelefono")} label="Teléfono" placeholder="Ej.: 381-556-8902" inputMode="tel" maxLength={25} />
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Traslado y cobertura" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-6">
            <SelectField
              {...field("obraSocial")}
              label="Obra social"
              placeholder="Seleccione una obra social"
              options={obrasSociales.map((o) => ({ value: o, label: o }))}
            />
          </div>
          <div className="col-md-6">
            <SelectField
              {...field("institucionId")}
              label="Institución de destino habitual"
              placeholder="Sin destino habitual"
              options={instituciones.map((i) => ({ value: i.id, label: i.nombre }))}
              hint={isEdit ? "Se aplicará a los nuevos viajes. Los viajes ya registrados conservan su destino." : undefined}
            />
          </div>
          <div className="col-12">
            <TextareaField
              {...field("condicion")}
              label="Condición o necesidad particular"
              placeholder="Ej.: Usuario de silla de ruedas, requiere acompañante, etc."
              rows={2}
              maxLength={200}
            />
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Observaciones" className="mb-4">
        <TextareaField
          {...field("observaciones")}
          label="Observaciones generales"
          placeholder="Información adicional para el personal de traslados"
          rows={3}
          maxLength={500}
        />
      </ContentCard>

      <div className="form-actions">
        <span className="form-required-note">* Campos obligatorios</span>
        <button type="button" className="btn-app btn-app-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-app btn-app-primary" disabled={saving}>
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          {isEdit ? "Guardar cambios" : "Registrar pasajero"}
        </button>
      </div>
    </form>
  );
}
