import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleAlert, MapPin, Save, UserRound } from "lucide-react";
import ContentCard from "../common/ContentCard";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextareaField from "../common/TextareaField";
import StatusBadge from "../common/StatusBadge";
import { TIPOS_VIAJE } from "../../constants/estados";
import { showToast } from "../../utils/alerts";
import { addDays, parseISODate, toISODate } from "../../utils/dates";
import { formatDni } from "../../utils/format";
import { buildIndex, fullName } from "../../utils/selectors";
import { sortPassengers } from "../../utils/passengers";
import { campoDireccion, esRegreso, getDriverIssue, getVehicleIssue, institucionTexto, MAX_DIAS_ANTICIPACION, routeFields } from "../../utils/trips";

const FIELD_ORDER = ["pasajeroId", "fecha", "hora", "choferId", "vehiculoId", "tipo", "origen", "institucionId", "destino", "observaciones"];

/**
 * Ubica la dirección del pasajero según el sentido del viaje: en el origen para
 * ida e ida y vuelta, en el destino para la vuelta. La institución es siempre
 * el otro extremo del recorrido.
 */
function withAddress(form, tipo, direccion) {
  return { ...form, tipo, ...routeFields(tipo, direccion) };
}

// Campos cuyo error se muestra apenas cambian (selecciones y fechas).
const SHOW_ON_CHANGE = new Set(["pasajeroId", "fecha", "hora", "choferId", "vehiculoId", "institucionId", "tipo"]);

/**
 * Formulario de registro (CU-04) y edición de viajes programados.
 * @param validate (form) => errores; aplica las reglas de disponibilidad.
 * @param editing viaje original cuando se edita (el pasajero no puede cambiarse).
 */
export default function TripForm({ data, initialValues, editing, today, validate, onSubmit, onCancel, initialTouched = [], lockPassenger = false, legacyNotice = null }) {
  const isEdit = Boolean(editing);
  const formRef = useRef(null);
  const [form, setForm] = useState(initialValues);
  const [touched, setTouched] = useState(() => new Set(initialTouched));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const pasajerosById = useMemo(() => buildIndex(data.pasajeros), [data.pasajeros]);
  const institucionesById = useMemo(() => buildIndex(data.instituciones), [data.instituciones]);
  const pasajero = pasajerosById[form.pasajeroId];

  // Las reglas se recalculan con cada cambio: fecha, hora, chofer y vehículo dependen entre sí.
  const errors = useMemo(() => validate(form), [validate, form]);
  const visibleError = (name) => (submitted || touched.has(name) ? errors[name] : undefined);

  const horario = { fecha: form.fecha, hora: form.hora, excludeId: editing?.id ?? null, today };

  const pasajeroOptions = useMemo(() => {
    const activos = sortPassengers(data.pasajeros.filter((p) => p.activo)).map((p) => ({
      value: p.id,
      label: `${p.apellido}, ${p.nombre} — DNI ${formatDni(p.dni)}`,
    }));
    // Un pasajero inactivo o inexistente recibido por URL o en edición se muestra para informar el error.
    if (form.pasajeroId && !activos.some((o) => o.value === form.pasajeroId)) {
      const p = pasajerosById[form.pasajeroId];
      activos.unshift({
        value: form.pasajeroId,
        label: p ? `${p.apellido}, ${p.nombre} — DNI ${formatDni(p.dni)} (inactivo)` : `Pasajero inexistente (${form.pasajeroId})`,
      });
    }
    return activos;
  }, [data.pasajeros, pasajerosById, form.pasajeroId]);

  // Los choferes y vehículos dados de baja no se ofrecen (salvo el ya asignado).
  // Los nuevos registros aparecen automáticamente porque se leen del DataProvider.
  const choferOptions = data.choferes
    .filter((c) => c.activo || c.id === form.choferId)
    .map((c) => {
      const issue = getDriverIssue(data, c.id, horario);
      const guardia = !issue && c.disponibilidad === "guardia" ? " — de guardia" : "";
      return { value: c.id, label: `${fullName(c)}${issue ? " — no disponible" : guardia}` };
    });

  const vehiculoOptions = data.vehiculos.filter((v) => v.activo !== false || v.id === form.vehiculoId).map((v) => {
    const issue = getVehicleIssue(data, v.id, horario);
    let estado = "";
    if (v.activo === false) estado = " — dado de baja";
    else if (v.estado === "mantenimiento") estado = " — en mantenimiento";
    else if (issue?.startsWith("Documentación vencida")) estado = " — documentación vencida";
    else if (issue) estado = " — no disponible";
    return { value: v.id, label: `${v.patente} · ${v.tipo}${estado}` };
  });

  const vehiculoSeleccionado = data.vehiculos.find((v) => v.id === form.vehiculoId);
  const vehiculoHint = vehiculoSeleccionado
    ? `${vehiculoSeleccionado.modelo} · ${vehiculoSeleccionado.capacidad} lugares`
    : "Debe estar activo y con VTV y seguro vigentes.";

  const markTouched = (name) =>
    setTouched((current) => (current.has(name) ? current : new Set([...current, name])));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (SHOW_ON_CHANGE.has(name)) markTouched(name);
  };

  // Al elegir el pasajero se ofrecen su domicilio y su institución habitual,
  // salvo que el operador ya los haya modificado. El domicilio va al origen o al
  // destino según el tipo de traslado.
  const handlePassengerChange = (event) => {
    const value = event.target.value;
    setForm((current) => {
      const anterior = pasajerosById[current.pasajeroId];
      const nuevo = pasajerosById[value];
      const direccion = current[campoDireccion(current.tipo)] ?? "";
      const direccionSinCambios = !direccion.trim() || direccion === anterior?.domicilio;
      const institucionSinCambios = !current.institucionId || current.institucionId === anterior?.institucionId;
      return withAddress(
        {
          ...current,
          pasajeroId: value,
          institucionId: institucionSinCambios ? nuevo?.institucionId ?? "" : current.institucionId,
        },
        nuevo?.tipoViaje ?? current.tipo,
        direccionSinCambios ? nuevo?.domicilio ?? "" : direccion,
      );
    });
    markTouched("pasajeroId");
  };

  // Al cambiar entre ida y vuelta se invierte el recorrido: la dirección cargada
  // (editada o no) pasa al otro extremo y la institución queda del lado opuesto.
  const handleTipoChange = (event) => {
    const tipo = event.target.value;
    setForm((current) => withAddress(current, tipo, current[campoDireccion(current.tipo)] ?? ""));
    markTouched("tipo");
    if (touched.has(campoDireccion(form.tipo))) markTouched(campoDireccion(tipo));
  };

  const handleBlur = (event) => {
    if (event.target.value.trim()) markTouched(event.target.name);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    const invalid = FIELD_ORDER.filter((name) => errors[name]);
    if (invalid.length > 0) {
      formRef.current?.querySelector(`[name="${invalid[0]}"]`)?.focus();
      showToast("Revise los campos marcados en rojo", "error");
      return;
    }
    setSaving(true);
    onSubmit(form);
  };

  const field = (name) => ({
    id: `viaje-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    onBlur: handleBlur,
    error: visibleError(name),
  });

  const institucionHabitual = institucionesById[pasajero?.institucionId];
  const regreso = esRegreso(form.tipo);
  const direccionCampo = campoDireccion(form.tipo);
  const direccionActual = form[direccionCampo] ?? "";
  const institucionElegida = institucionesById[form.institucionId];
  const resumenRuta = regreso
    ? [institucionTexto(institucionElegida), direccionActual.trim()]
    : [direccionActual.trim(), institucionTexto(institucionElegida)];

  const direccionInput = (
    <div key="direccion" className="col-lg-6">
      <InputField
        {...field(direccionCampo)}
        label={regreso ? "Destino *" : "Origen *"}
        placeholder="Calle y número"
        maxLength={120}
        autoComplete="off"
        hint={regreso ? "Dirección a la que regresa el pasajero." : "Dirección donde se retira al pasajero."}
      />
      {pasajero?.domicilio && direccionActual !== pasajero.domicilio && (
        <button
          type="button"
          className="link-app small trip-suggestion"
          onClick={() => {
            setForm((current) => ({ ...current, [direccionCampo]: pasajero.domicilio }));
            markTouched(direccionCampo);
          }}
        >
          Usar el domicilio del pasajero ({pasajero.domicilio})
        </button>
      )}
    </div>
  );

  const institucionSelect = (
    <div key="institucion" className="col-lg-6">
      <SelectField
        {...field("institucionId")}
        label={regreso ? "Origen (institución) *" : "Destino *"}
        placeholder={regreso ? "Seleccione la institución de origen" : "Seleccione el destino"}
        options={data.instituciones.map((i) => ({ value: i.id, label: i.nombre }))}
      />
      {institucionHabitual && form.institucionId !== institucionHabitual.id && (
        <button
          type="button"
          className="link-app small trip-suggestion"
          onClick={() => {
            setForm((current) => ({ ...current, institucionId: institucionHabitual.id }));
            markTouched("institucionId");
          }}
        >
          {regreso ? "Usar la institución habitual" : "Usar el destino habitual"} ({institucionHabitual.nombre})
        </button>
      )}
    </div>
  );
  const choferHabitual = data.choferes.find((c) => c.id === pasajero?.choferId);
  const maxFecha = toISODate(addDays(parseISODate(today), MAX_DIAS_ANTICIPACION));

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="trip-form">
      <ContentCard title="Pasajero" className="mb-4">
        <div className="row gx-4">
          <div className="col-lg-6">
            <SelectField
              {...field("pasajeroId")}
              onChange={handlePassengerChange}
              label="Pasajero *"
              placeholder="Seleccione un pasajero activo"
              options={pasajeroOptions}
              disabled={isEdit || lockPassenger}
              hint={
                lockPassenger
                  ? "El pasajero corresponde al turno recurrente."
                  : isEdit
                  ? "El pasajero no puede cambiarse. Para otro pasajero registre un nuevo viaje."
                  : "Solo se listan pasajeros activos, ordenados por apellido."
              }
            />
          </div>
          <div className="col-lg-6">
            {pasajero ? (
              <div className="trip-passenger-summary" data-testid="resumen-pasajero">
                <div className="trip-passenger-summary-icon" aria-hidden="true">
                  <UserRound size={20} strokeWidth={2} />
                </div>
                <div className="trip-passenger-summary-body">
                  <div className="trip-passenger-summary-name">
                    {fullName(pasajero)}
                    {!pasajero.activo && <StatusBadge type="pasajero" estado="inactivo" />}
                  </div>
                  <div className="trip-passenger-summary-meta">DNI {formatDni(pasajero.dni)} · {pasajero.telefono || "Sin teléfono"}</div>
                  <div className="trip-passenger-summary-meta">
                    <MapPin size={13} strokeWidth={2} aria-hidden="true" /> {pasajero.domicilio || "Sin domicilio"}
                    {institucionHabitual ? ` → ${institucionHabitual.nombre}` : ""}
                  </div>
                  {pasajero.condicion && (
                    <div className="trip-passenger-summary-alert">
                      <CircleAlert size={13} strokeWidth={2} aria-hidden="true" /> {pasajero.condicion}
                    </div>
                  )}
                  <Link to={`/pasajeros/${pasajero.id}`} className="trip-passenger-summary-link" target="_blank" rel="noreferrer">
                    Ver ficha del pasajero
                  </Link>
                </div>
              </div>
            ) : (
              <p className="trip-passenger-placeholder">Seleccione un pasajero para ver su nombre, DNI y destino habitual.</p>
            )}
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Fecha y asignación" className="mb-4">
        <div className="row gx-4">
          <div className="col-sm-6 col-lg-2">
            <InputField
              {...field("fecha")}
              type="date"
              label="Fecha *"
              min={isEdit ? undefined : today}
              max={maxFecha}
              hint={isEdit ? undefined : "No se admiten fechas pasadas."}
            />
          </div>
          <div className="col-sm-6 col-lg-2">
            <InputField
              {...field("hora")}
              type="time"
              label="Hora *"
              hint={pasajero?.horaHabitual ? `Horario habitual del pasajero: ${pasajero.horaHabitual}` : undefined}
            />
          </div>
          <div className="col-sm-6 col-lg-4">
            <SelectField
              {...field("choferId")}
              label="Chofer asignado *"
              placeholder="Seleccione un chofer"
              options={choferOptions}
              hint={choferHabitual ? `Chofer habitual: ${fullName(choferHabitual)}` : "Se verifica su disponibilidad para la fecha y hora."}
            />
          </div>
          <div className="col-sm-6 col-lg-4">
            <SelectField
              {...field("vehiculoId")}
              label="Vehículo asignado *"
              placeholder="Seleccione un vehículo"
              options={vehiculoOptions}
              hint={vehiculoHint}
            />
          </div>
        </div>
        <p className="field-hint mb-0">
          Los conflictos se controlan por coincidencia exacta de fecha y hora: el sistema no registra la duración de los recorridos.
        </p>
      </ContentCard>

      <ContentCard title="Recorrido" className="mb-4">
        <div className="row gx-4 align-items-start">
          <div className="col-sm-6 col-lg-3">
            <SelectField
              {...field("tipo")}
              onChange={handleTipoChange}
              label="Tipo de traslado"
              options={Object.entries(TIPOS_VIAJE).map(([value, label]) => ({ value, label }))}
              hint={regreso ? "Vuelta: de la institución al domicilio." : "Ida: del domicilio a la institución."}
            />
          </div>
          <div className="col-sm-6 col-lg-9">
            <p className="trip-route-summary" data-testid="resumen-recorrido" aria-live="polite">
              <span>{resumenRuta[0] || "Origen sin definir"}</span>
              <ArrowRight size={15} strokeWidth={2} aria-label="hacia" />
              <span>{resumenRuta[1] || "Destino sin definir"}</span>
            </p>
          </div>
        </div>
        {legacyNotice && <p className="field-hint trip-legacy-note" data-testid="aviso-sentido">{legacyNotice}</p>}
        <div className="row gx-4">{regreso ? [institucionSelect, direccionInput] : [direccionInput, institucionSelect]}</div>
      </ContentCard>

      <ContentCard title="Observaciones" className="mb-4">
        <TextareaField
          {...field("observaciones")}
          label="Observaciones del traslado"
          placeholder="Indicaciones para el chofer, acompañante, horarios de retiro, etc."
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
          {isEdit ? "Guardar cambios" : "Registrar viaje"}
        </button>
      </div>
    </form>
  );
}
