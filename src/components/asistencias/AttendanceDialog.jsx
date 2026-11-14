import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Save, X } from "lucide-react";
import TextareaField from "../common/TextareaField";
import StatusBadge from "../common/StatusBadge";
import { ESTADOS_ASISTENCIA } from "../../constants/estados";
import { formatDate, formatDateTime } from "../../utils/dates";
import { formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { tripRoute } from "../../utils/trips";
import { attendanceToForm, MOTIVO_MAX, OBSERVACIONES_MAX, validateAttendanceForm } from "../../utils/attendance";

const MOTIVO_LABELS = {
  ausente: { label: "Motivo de la ausencia *", placeholder: "Ej.: No respondió llamadas; la familia no estaba en el domicilio." },
  justificado: { label: "Justificación", placeholder: "Ej.: Aviso previo de la familia por un turno médico." },
};

/**
 * Registro (CU-08) o edición de la asistencia de un viaje.
 * El viaje y el pasajero son fijos: la asistencia no puede asociarse a otro viaje.
 */
export default function AttendanceDialog({ viaje, asistencia, pasajero, institucion, notice, onSave, onClose }) {
  const isEdit = Boolean(asistencia);
  const dialogRef = useRef(null);
  const [form, setForm] = useState(() => attendanceToForm(asistencia));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => validateAttendanceForm(form, { viaje }), [form, viaje]);
  const visible = (name) => (submitted || (name === "estado" && form.estado) ? errors[name] : undefined);

  // Foco inicial y cierre con Escape.
  useEffect(() => {
    dialogRef.current?.querySelector("input[name='estado']:not(:disabled)")?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      const first = errors.estado ? "input[name='estado']" : errors.motivo ? "[name='motivo']" : "[name='observaciones']";
      dialogRef.current?.querySelector(first)?.focus();
      return;
    }
    setSaving(true);
    onSave(form);
  };

  const cancelado = viaje.estado === "cancelado";
  const motivoConfig = MOTIVO_LABELS[form.estado];

  return (
    <div className="app-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="asistencia-titulo" ref={dialogRef}>
        <div className="app-modal-header">
          <h2 id="asistencia-titulo" className="app-modal-title">
            {isEdit ? "Editar asistencia" : "Registrar asistencia"}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="app-modal-body">
            <div className="attendance-trip-summary" data-testid="asistencia-viaje">
              <div className="attendance-trip-summary-name">
                {fullName(pasajero)} {pasajero && <span>· DNI {formatDni(pasajero.dni)}</span>}
              </div>
              <div>
                Viaje {viaje.id} · {formatDate(viaje.fecha)} a las {viaje.hora} · {tripRoute(viaje, institucion).destino}
              </div>
              <div className="attendance-trip-summary-state">
                Estado del viaje: <StatusBadge estado={viaje.estado} />
              </div>
            </div>

            {notice && (
              <div className="trip-notice trip-notice--info attendance-dialog-notice" role="status">
                <CircleAlert size={18} strokeWidth={2} aria-hidden="true" />
                <span>{notice}</span>
              </div>
            )}

            <fieldset className="form-field">
              <legend className="form-label-app">Estado de asistencia *</legend>
              <div className="attendance-options" role="radiogroup" aria-invalid={Boolean(visible("estado"))}>
                {Object.entries(ESTADOS_ASISTENCIA).map(([value, { label }]) => {
                  const disabled = value === "presente" && cancelado;
                  return (
                    <label
                      key={value}
                      className={`attendance-option attendance-option--${value}${form.estado === value ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
                    >
                      <input
                        type="radio"
                        name="estado"
                        value={value}
                        checked={form.estado === value}
                        disabled={disabled}
                        onChange={() => setForm((current) => ({ ...current, estado: value }))}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              {cancelado && (
                <div className="field-hint">El viaje está cancelado: solo puede registrarse Ausente o Justificado.</div>
              )}
              {visible("estado") && <div className="field-error">{visible("estado")}</div>}
            </fieldset>

            {motivoConfig && (
              <TextareaField
                id="asistencia-motivo"
                name="motivo"
                label={motivoConfig.label}
                placeholder={motivoConfig.placeholder}
                value={form.motivo}
                onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
                error={visible("motivo")}
                rows={2}
                maxLength={MOTIVO_MAX}
                hint={form.estado === "justificado" ? "Opcional: indique quién avisó y por qué." : undefined}
              />
            )}

            <TextareaField
              id="asistencia-observaciones"
              name="observaciones"
              label="Observaciones"
              placeholder="Información adicional (opcional)"
              value={form.observaciones}
              onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))}
              error={visible("observaciones")}
              rows={2}
              maxLength={OBSERVACIONES_MAX}
            />

            {isEdit && (
              <p className="field-hint mb-0">
                Registro {asistencia.id}
                {asistencia.registradaEl ? ` · registrado el ${formatDateTime(asistencia.registradaEl)}` : ""}
                {asistencia.modificadaEl ? ` · última modificación ${formatDateTime(asistencia.modificadaEl)}` : ""}. Se
                actualiza el mismo registro: no se crea una segunda asistencia.
              </p>
            )}
            <p className="field-hint mb-0">Registrar la asistencia no cambia el estado del viaje.</p>
          </div>

          <div className="app-modal-footer">
            <button type="button" className="btn-app btn-app-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-app btn-app-primary" disabled={saving}>
              <Save size={18} strokeWidth={2} aria-hidden="true" />
              {isEdit ? "Guardar cambios" : "Registrar asistencia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
