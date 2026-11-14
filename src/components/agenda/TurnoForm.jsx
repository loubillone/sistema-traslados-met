import { useMemo, useRef, useState } from "react";
import { CircleAlert, Save } from "lucide-react";
import ContentCard from "../common/ContentCard";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextareaField from "../common/TextareaField";
import { DIAS_AGENDA } from "../../constants/agenda";
import { TIPOS_VIAJE } from "../../constants/estados";
import { formatDni } from "../../utils/format";
import { sortPassengers } from "../../utils/passengers";
import { showToast } from "../../utils/alerts";

const FIELD_ORDER = ["pasajeroId", "institucionId", "dias", "tipo", "horaIda", "horaVuelta", "observaciones"];

/** Alta y edición de turnos recurrentes (CU-10). En edición el pasajero no cambia. */
export default function TurnoForm({ data, initialValues, mode, validate, onSubmit, onCancel }) {
  const isEdit = mode === "edit";
  const formRef = useRef(null);
  const [form, setForm] = useState(initialValues);
  const [touched, setTouched] = useState(() => new Set(initialValues.pasajeroId ? ["pasajeroId"] : []));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => validate(form), [validate, form]);
  const visible = (name) => (submitted || touched.has(name) ? errors[name] : undefined);
  const touch = (name) => setTouched((current) => (current.has(name) ? current : new Set([...current, name])));

  const pasajeros = useMemo(() => {
    const activos = sortPassengers(data.pasajeros.filter((p) => p.activo));
    const actual = data.pasajeros.find((p) => p.id === form.pasajeroId);
    // Un pasajero inactivo o inexistente recibido por URL se muestra para informar el error.
    if (form.pasajeroId && !activos.some((p) => p.id === form.pasajeroId)) {
      return [{ value: form.pasajeroId, label: actual ? `${actual.apellido}, ${actual.nombre} (inactivo)` : `Pasajero inexistente (${form.pasajeroId})` }, ...activos.map(toOption)];
    }
    return activos.map(toOption);
  }, [data.pasajeros, form.pasajeroId]);

  const set = (changes, name) => {
    setForm((current) => ({ ...current, ...changes }));
    if (name) touch(name);
  };

  // Al elegir el pasajero se ofrece su institución habitual (si no se eligió otra).
  const handlePassenger = (event) => {
    const nuevo = data.pasajeros.find((p) => p.id === event.target.value);
    setForm((current) => {
      const anterior = data.pasajeros.find((p) => p.id === current.pasajeroId);
      const sinCambios = !current.institucionId || current.institucionId === anterior?.institucionId;
      return { ...current, pasajeroId: event.target.value, institucionId: sinCambios ? nuevo?.institucionId ?? "" : current.institucionId };
    });
    touch("pasajeroId");
  };

  const toggleDia = (value) =>
    set({ dias: form.dias.includes(value) ? form.dias.filter((d) => d !== value) : [...form.dias, value] }, "dias");

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    const invalid = FIELD_ORDER.filter((name) => errors[name]);
    if (invalid.length > 0 || errors.duplicado) {
      const first = invalid[0] === "dias" ? "input[name='dias']" : invalid[0] ? `[name="${invalid[0]}"]` : null;
      if (first) formRef.current?.querySelector(first)?.focus();
      showToast(errors.duplicado && !invalid.length ? "El turno se superpone con otro existente" : "Revise los campos marcados en rojo", "error");
      return;
    }
    setSaving(true);
    onSubmit(form);
  };

  const conIda = form.tipo === "ida" || form.tipo === "ida_vuelta";
  const conVuelta = form.tipo === "vuelta" || form.tipo === "ida_vuelta";

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <ContentCard title="Pasajero y destino" className="mb-4">
        <div className="row gx-4">
          <div className="col-md-6">
            <SelectField
              id="turno-pasajeroId"
              name="pasajeroId"
              label="Pasajero *"
              placeholder="Seleccione un pasajero activo"
              value={form.pasajeroId}
              onChange={handlePassenger}
              options={pasajeros}
              error={visible("pasajeroId")}
              disabled={isEdit}
              hint={isEdit ? "El turno conserva la relación con su pasajero." : "Solo se listan pasajeros activos."}
            />
          </div>
          <div className="col-md-6">
            <SelectField
              id="turno-institucionId"
              name="institucionId"
              label="Institución de destino *"
              placeholder="Seleccione la institución"
              value={form.institucionId}
              onChange={(event) => set({ institucionId: event.target.value }, "institucionId")}
              options={data.instituciones.map((i) => ({ value: i.id, label: i.nombre }))}
              error={visible("institucionId")}
            />
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Días y horarios" className="mb-4">
        <fieldset className="form-field">
          <legend className="form-label-app">Días de la semana *</legend>
          <div className="turno-days" role="group" aria-invalid={Boolean(visible("dias"))}>
            {DIAS_AGENDA.map((dia) => (
              <label key={dia.value} className={`turno-day${form.dias.includes(dia.value) ? " is-selected" : ""}`}>
                <input type="checkbox" name="dias" value={dia.value} checked={form.dias.includes(dia.value)} onChange={() => toggleDia(dia.value)} />
                <span>{dia.short}</span>
                <span className="visually-hidden">{dia.label}</span>
              </label>
            ))}
          </div>
          {visible("dias") ? <div className="field-error">{visible("dias")}</div> : <div className="field-hint">Puede seleccionar varios días.</div>}
        </fieldset>

        <div className="row gx-4">
          <div className="col-md-4">
            <SelectField
              id="turno-tipo"
              name="tipo"
              label="Tipo de traslado *"
              placeholder="Seleccione el tipo"
              value={form.tipo}
              onChange={(event) => set({ tipo: event.target.value }, "tipo")}
              options={Object.entries(TIPOS_VIAJE).map(([value, label]) => ({ value, label }))}
              error={visible("tipo")}
            />
          </div>
          {conIda && (
            <div className="col-md-4">
              <InputField id="turno-horaIda" name="horaIda" type="time" label="Horario de ida *" value={form.horaIda} onChange={(event) => set({ horaIda: event.target.value }, "horaIda")} error={visible("horaIda")} />
            </div>
          )}
          {conVuelta && (
            <div className="col-md-4">
              <InputField
                id="turno-horaVuelta"
                name="horaVuelta"
                type="time"
                label={form.tipo === "ida_vuelta" ? "Horario de regreso *" : "Horario de vuelta *"}
                value={form.horaVuelta}
                onChange={(event) => set({ horaVuelta: event.target.value }, "horaVuelta")}
                error={visible("horaVuelta")}
                hint={form.tipo === "ida_vuelta" ? "Se indica por separado: no se calcula automáticamente." : undefined}
              />
            </div>
          )}
        </div>

        {(submitted || touched.has("horaIda") || touched.has("horaVuelta") || touched.has("dias")) && errors.duplicado && (
          <div className="trip-notice trip-notice--warning mb-0" role="alert" data-testid="turno-duplicado">
            <CircleAlert size={18} strokeWidth={2} aria-hidden="true" />
            <span>{errors.duplicado}</span>
          </div>
        )}
      </ContentCard>

      <ContentCard title="Observaciones" className="mb-4">
        <TextareaField
          id="turno-observaciones"
          name="observaciones"
          label="Observaciones"
          placeholder="Indicaciones del traslado habitual (opcional)"
          value={form.observaciones}
          onChange={(event) => set({ observaciones: event.target.value })}
          error={visible("observaciones")}
          rows={2}
          maxLength={300}
        />
      </ContentCard>

      <div className="form-actions">
        <span className="form-required-note">* Campos obligatorios</span>
        <button type="button" className="btn-app btn-app-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-app btn-app-primary" disabled={saving}>
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          {isEdit ? "Guardar cambios" : "Registrar turno"}
        </button>
      </div>
    </form>
  );
}

function toOption(p) {
  return { value: p.id, label: `${p.apellido}, ${p.nombre} — DNI ${formatDni(p.dni)}` };
}
