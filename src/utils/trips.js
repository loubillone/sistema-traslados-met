// Reglas del módulo Gestión de Viajes (CU-04 a CU-07).
// Todas las funciones son puras: reciben el estado global del DataProvider y
// devuelven resultados derivados, sin guardar copias de los datos.

import { ESTADOS_VIAJE, TIPOS_VIAJE, TRANSICIONES_VIAJE } from "../constants/estados";
import { addDays, formatDate, parseISODate, toISODate } from "./dates";
import { analyzePassengerQuery, matchesPassengerName } from "./passengers";
import { fullName } from "./selectors";

/** Valores iniciales del formulario de viaje. */
export const EMPTY_TRIP_FORM = {
  pasajeroId: "",
  fecha: "",
  hora: "",
  choferId: "",
  vehiculoId: "",
  origen: "",
  destino: "",
  institucionId: "",
  tipo: "ida_vuelta",
  observaciones: "",
};

/** Filtros del historial (CU-05). Se guardan en la URL con estos mismos nombres. */
export const TRIP_FILTER_KEYS = ["desde", "hasta", "pasajero", "chofer", "vehiculo", "estado", "destino"];

/** Máxima anticipación permitida para programar un viaje. */
export const MAX_DIAS_ANTICIPACION = 365;

const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const estadoLabel = (estado) => ESTADOS_VIAJE[estado]?.label ?? estado;

/**
 * Sentido del recorrido (corrección Etapa 5B).
 * - Ida e ida y vuelta: origen = dirección (domicilio del pasajero), destino = institución.
 * - Vuelta: origen = institución, destino = dirección (domicilio del pasajero).
 * En el formulario, la dirección se carga en `origen` o en `destino` según el tipo.
 */
export const esRegreso = (tipo) => tipo === "vuelta";
export const campoDireccion = (tipo) => (esRegreso(tipo) ? "destino" : "origen");

/** Campos de recorrido del formulario con la dirección en el extremo que corresponde. */
export const routeFields = (tipo, direccion) => (esRegreso(tipo) ? { origen: "", destino: direccion } : { origen: direccion, destino: "" });

/** Texto de una institución: nombre, o nombre con dirección y localidad. */
export function institucionTexto(institucion, { detallado = false } = {}) {
  if (!institucion) return "";
  const direccion = [institucion.direccion, institucion.localidad].filter(Boolean).join(", ");
  return detallado && direccion ? `${institucion.nombre} · ${direccion}` : institucion.nombre;
}

/**
 * Origen y destino visibles de un viaje guardado.
 * Un viaje con `destino` (dirección) va de la institución a esa dirección.
 * Los viajes sin ese campo (todos los registrados antes de la corrección) se
 * muestran tal como se guardaron: del origen a la institución.
 */
export function tripRoute(viaje, institucion, { detallado = false } = {}) {
  const nombre = institucionTexto(institucion, { detallado });
  if (viaje.destino?.trim()) {
    return { origen: nombre || "Sin institución", destino: viaje.destino, regreso: true };
  }
  return { origen: viaje.origen || "—", destino: nombre || "Sin destino", regreso: false };
}

/** Viaje que ocupa al chofer o al vehículo (los cancelados liberan la asignación). */
const ocupaAsignacion = (viaje) => viaje.estado !== "cancelado";

/**
 * Busca otro viaje con el mismo valor en `field` para la misma fecha y hora.
 * El modelo no registra la duración de los recorridos: solo se detectan
 * coincidencias exactas de fecha y hora, sin inventar tiempos de viaje.
 */
export function findScheduleConflict(viajes, { field, value, fecha, hora, excludeId = null }) {
  if (!value || !fecha || !hora) return null;
  return (
    viajes.find(
      (v) => v.id !== excludeId && v[field] === value && v.fecha === fecha && v.hora === hora && ocupaAsignacion(v),
    ) ?? null
  );
}

const describeConflict = (viaje) => `el viaje ${viaje.id} del ${formatDate(viaje.fecha)} a las ${viaje.hora}`;

/** Mensaje de vencimiento de un documento respecto de la fecha del viaje. */
function expiryIssue(label, vencimiento, fecha, today) {
  if (!vencimiento || !fecha || vencimiento >= fecha) return null;
  return vencimiento < today
    ? `${label} venció el ${formatDate(vencimiento)}.`
    : `${label} vence el ${formatDate(vencimiento)}, antes de la fecha del viaje.`;
}

/**
 * Disponibilidad del chofer para una fecha y hora.
 * Devuelve el motivo por el que no está disponible, o null.
 */
export function getDriverIssue(data, choferId, { fecha, hora, excludeId = null, today }) {
  const chofer = data.choferes.find((c) => c.id === choferId);
  if (!chofer) return "El chofer seleccionado no existe.";
  if (!chofer.activo) return `${fullName(chofer)} está dado de baja (inactivo).`;
  if (chofer.disponibilidad === "no_disponible") return `${fullName(chofer)} figura como No disponible.`;
  const licencia = expiryIssue(`La licencia de ${fullName(chofer)}`, chofer.vencimientoLicencia, fecha, today);
  if (licencia) return licencia;
  const conflicto = findScheduleConflict(data.viajes, { field: "choferId", value: choferId, fecha, hora, excludeId });
  if (conflicto) return `${fullName(chofer)} ya tiene asignado ${describeConflict(conflicto)}.`;
  return null;
}

/**
 * Disponibilidad del vehículo: activo, con VTV y seguro vigentes en la fecha
 * del viaje y sin otro viaje en la misma fecha y hora.
 */
export function getVehicleIssue(data, vehiculoId, { fecha, hora, excludeId = null, today }) {
  const vehiculo = data.vehiculos.find((v) => v.id === vehiculoId);
  if (!vehiculo) return "El vehículo seleccionado no existe.";
  if (vehiculo.activo === false) return `El vehículo ${vehiculo.patente} está dado de baja.`;
  if (vehiculo.estado === "mantenimiento") return `El vehículo ${vehiculo.patente} está en mantenimiento.`;
  if (vehiculo.estado !== "activo") return `El vehículo ${vehiculo.patente} no está activo.`;
  const documentacion =
    expiryIssue(`La VTV del vehículo ${vehiculo.patente}`, vehiculo.vencimientoVTV, fecha, today) ??
    expiryIssue(`El seguro del vehículo ${vehiculo.patente}`, vehiculo.vencimientoSeguro, fecha, today);
  if (documentacion) return `Documentación vencida: ${documentacion}`;
  const conflicto = findScheduleConflict(data.viajes, { field: "vehiculoId", value: vehiculoId, fecha, hora, excludeId });
  if (conflicto) return `El vehículo ${vehiculo.patente} ya tiene asignado ${describeConflict(conflicto)}.`;
  return null;
}

/** El pasajero debe existir y estar activo. */
export function getPassengerIssue(data, pasajeroId) {
  if (!pasajeroId) return "Seleccione el pasajero.";
  const pasajero = data.pasajeros.find((p) => p.id === pasajeroId);
  if (!pasajero) return "El pasajero seleccionado no existe en el sistema.";
  if (!pasajero.activo) return `${fullName(pasajero)} está inactivo y no puede asignarse a viajes programados.`;
  return null;
}

/** Asistencia registrada para el viaje (si existe, es un registro histórico definitivo). */
export function getTripAttendance(asistencias, viajeId) {
  return asistencias.find((a) => a.viajeId === viajeId) ?? null;
}

/** Motivo por el que un viaje no puede editarse, o null si puede editarse. */
export function getEditBlockReason(viaje, asistencias) {
  if (viaje.estado !== "programado") {
    return `Solo pueden editarse viajes programados. Este viaje está ${estadoLabel(viaje.estado).toLowerCase()}.`;
  }
  if (getTripAttendance(asistencias, viaje.id)) {
    return "El viaje tiene una asistencia registrada y no puede modificarse.";
  }
  return null;
}

/**
 * Valida un cambio de estado. Devuelve el motivo del rechazo o null.
 * Programado → En curso (solo el día del viaje o pendientes de días anteriores),
 * En curso → Finalizado, Programado → Cancelado y En curso → Cancelado si no
 * tiene asistencia Presente registrada (Etapa 4: una ausencia registrada no
 * impide cancelar el traslado, como ocurre en el historial de la semilla).
 */
export function checkTransition(viaje, destino, { asistencias, today }) {
  const permitido = TRANSICIONES_VIAJE[viaje.estado] ?? [];
  if (!permitido.includes(destino)) {
    if (viaje.estado === "finalizado") return "El viaje ya finalizó: su estado no puede modificarse.";
    if (viaje.estado === "cancelado") return "El viaje está cancelado: su estado no puede modificarse.";
    if (destino === "finalizado") return "Solo pueden finalizarse viajes en curso. Primero inicie el viaje.";
    return `No se puede pasar de ${estadoLabel(viaje.estado)} a ${estadoLabel(destino)}.`;
  }
  if (destino === "en_curso" && viaje.fecha > today) {
    return `El viaje está programado para el ${formatDate(viaje.fecha)}: solo puede iniciarse ese día.`;
  }
  if (destino === "cancelado") {
    const asistencia = getTripAttendance(asistencias, viaje.id);
    if (asistencia?.estado === "presente") {
      return "El pasajero tiene asistencia Presente registrada: el viaje no puede cancelarse sin alterar ese registro histórico.";
    }
  }
  return null;
}

/** Acciones disponibles para un viaje, según su estado. */
export function getTripActions(viaje, { asistencias, today }) {
  return {
    editar: !getEditBlockReason(viaje, asistencias),
    reasignar: viaje.estado === "programado",
    iniciar: !checkTransition(viaje, "en_curso", { asistencias, today }),
    finalizar: !checkTransition(viaje, "finalizado", { asistencias, today }),
    cancelar: !checkTransition(viaje, "cancelado", { asistencias, today }),
  };
}

/**
 * Valida el formulario de alta (CU-04) o edición de un viaje.
 * @param options.editing viaje original cuando se edita
 * @param options.today fecha actual "YYYY-MM-DD"
 * @param options.now hora actual "HH:MM"
 */
export function validateTripForm(form, { data, editing = null, today, now }) {
  const errors = {};
  const excludeId = editing?.id ?? null;

  const pasajero = getPassengerIssue(data, form.pasajeroId);
  if (pasajero) errors.pasajeroId = pasajero;

  // Fecha y hora. Al editar, la fecha original se acepta aunque ya haya pasado.
  const horarioModificado = !editing || editing.fecha !== form.fecha || editing.hora !== form.hora;
  if (!form.fecha) errors.fecha = "Ingrese la fecha del viaje.";
  else if (!FECHA_PATTERN.test(form.fecha) || Number.isNaN(parseISODate(form.fecha).getTime())) {
    errors.fecha = "Ingrese una fecha válida.";
  } else if (horarioModificado && form.fecha < today) {
    errors.fecha = "No se pueden programar viajes en fechas pasadas.";
  } else if (form.fecha > toISODate(addDays(parseISODate(today), MAX_DIAS_ANTICIPACION))) {
    errors.fecha = "La fecha no puede superar un año de anticipación.";
  }

  if (!form.hora) errors.hora = "Ingrese la hora del viaje.";
  else if (!HORA_PATTERN.test(form.hora)) errors.hora = "Ingrese una hora válida (HH:MM).";
  else if (horarioModificado && !errors.fecha && form.fecha === today && form.hora < now) {
    errors.hora = "La hora indicada ya pasó.";
  }

  const horario = !errors.fecha && !errors.hora ? { fecha: form.fecha, hora: form.hora } : { fecha: form.fecha };
  const check = { ...horario, excludeId, today };

  if (!form.choferId) errors.choferId = "Seleccione el chofer.";
  else {
    const chofer = getDriverIssue(data, form.choferId, check);
    if (chofer) errors.choferId = chofer;
  }

  if (!form.vehiculoId) errors.vehiculoId = "Seleccione el vehículo.";
  else {
    const vehiculo = getVehicleIssue(data, form.vehiculoId, check);
    if (vehiculo) errors.vehiculoId = vehiculo;
  }

  // El pasajero no puede tener dos viajes a la misma hora.
  if (!errors.pasajeroId && horario.hora) {
    const conflicto = findScheduleConflict(data.viajes, {
      field: "pasajeroId",
      value: form.pasajeroId,
      fecha: form.fecha,
      hora: form.hora,
      excludeId,
    });
    if (conflicto) errors.hora = `El pasajero ya tiene ${describeConflict(conflicto)}.`;
  }

  // Recorrido: la dirección es el origen (ida) o el destino (vuelta); la institución, el otro extremo.
  const regreso = esRegreso(form.tipo);
  const campo = campoDireccion(form.tipo);
  const direccion = (form[campo] ?? "").trim();
  if (!direccion) errors[campo] = regreso ? "Ingrese la dirección de destino." : "Ingrese la dirección de origen.";
  else if (direccion.length < 5) errors[campo] = "Ingrese una dirección completa (calle y número).";

  if (!form.institucionId) errors.institucionId = regreso ? "Seleccione la institución de origen." : "Seleccione el destino.";
  else if (!data.instituciones.some((i) => i.id === form.institucionId)) {
    errors.institucionId = regreso ? "La institución de origen seleccionada no existe." : "El destino seleccionado no existe.";
  }

  if (form.observaciones.length > 500) errors.observaciones = "Máximo 500 caracteres.";

  return errors;
}

const limpiarDireccion = (value) => (value ?? "").trim().replace(/\s+/g, " ");

/** Campos editables de un viaje a partir del formulario. */
export function formToTripFields(form) {
  const regreso = esRegreso(form.tipo);
  return {
    fecha: form.fecha,
    hora: form.hora,
    choferId: form.choferId,
    vehiculoId: form.vehiculoId,
    // Solo se guarda la dirección del extremo que corresponde al sentido del viaje.
    origen: regreso ? "" : limpiarDireccion(form.origen),
    destino: regreso ? limpiarDireccion(form.destino) : "",
    institucionId: form.institucionId,
    tipo: form.tipo,
    observaciones: form.observaciones.trim(),
  };
}

/** Viaje → valores del formulario de edición. */
export function tripToForm(viaje) {
  return {
    pasajeroId: viaje.pasajeroId,
    fecha: viaje.fecha,
    hora: viaje.hora,
    choferId: viaje.choferId ?? "",
    vehiculoId: viaje.vehiculoId ?? "",
    ...tripAddressToForm(viaje),
    institucionId: viaje.institucionId ?? "",
    tipo: viaje.tipo ?? "ida_vuelta",
    observaciones: viaje.observaciones ?? "",
  };
}

/**
 * Dirección del viaje en el campo que corresponde a su tipo. Un viaje de
 * vuelta registrado antes de la corrección (sin `destino`) guardó el domicilio
 * como origen: al editarlo, esa dirección se ofrece como destino. El registro
 * guardado no cambia hasta que el operador confirma la edición.
 */
function tripAddressToForm(viaje) {
  const direccion = (esRegreso(viaje.tipo) ? viaje.destino || viaje.origen : viaje.origen || viaje.destino) ?? "";
  return routeFields(viaje.tipo, direccion);
}

/** Viaje de vuelta guardado con el sentido anterior a la corrección (domicilio → institución). */
export const isLegacyReturnTrip = (viaje) => esRegreso(viaje.tipo) && !viaje.destino?.trim();

/**
 * Describe los cambios de una edición para el historial del viaje.
 * Los nombres se resuelven por identificador en el momento del cambio.
 */
export function describeTripChanges(original, fields, data) {
  const choferes = Object.fromEntries(data.choferes.map((c) => [c.id, fullName(c)]));
  const vehiculos = Object.fromEntries(data.vehiculos.map((v) => [v.id, v.patente]));
  const instituciones = Object.fromEntries(data.instituciones.map((i) => [i.id, i.nombre]));
  const labels = {
    fecha: ["Fecha", formatDate],
    hora: ["Hora", (v) => v],
    choferId: ["Chofer", (v) => choferes[v] ?? v],
    vehiculoId: ["Vehículo", (v) => vehiculos[v] ?? v],
    tipo: ["Tipo", (v) => TIPOS_VIAJE[v] ?? v],
  };
  // El recorrido se describe completo (origen → destino) porque su sentido depende del tipo.
  const ruta = (v) => {
    const r = tripRoute(v, { nombre: instituciones[v.institucionId] ?? v.institucionId });
    return `${r.origen} → ${r.destino}`;
  };
  const rutaOriginal = ruta(original);
  const rutaNueva = ruta({ ...original, ...fields });
  const cambios = Object.entries(labels)
    .filter(([key]) => (original[key] ?? "") !== (fields[key] ?? ""))
    .map(([key, [label, format]]) => `${label}: ${format(original[key]) || "—"} → ${format(fields[key]) || "—"}`);
  if (rutaOriginal !== rutaNueva) cambios.push(`Recorrido: ${rutaOriginal} ⇒ ${rutaNueva}`);
  if ((original.observaciones ?? "") !== fields.observaciones) cambios.push("Observaciones actualizadas");
  return cambios;
}

/** Lee los filtros desde los parámetros de la URL. */
export function readTripFilters(searchParams) {
  return Object.fromEntries(TRIP_FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""]));
}

export const countActiveFilters = (filters) => TRIP_FILTER_KEYS.filter((key) => filters[key]).length;

/** Error de rango de fechas del filtro, o null. */
export function getDateRangeError(filters) {
  if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
    return "La fecha “desde” no puede ser posterior a la fecha “hasta”.";
  }
  return null;
}

/**
 * Aplica los filtros combinados del historial (CU-05).
 * El pasajero se busca por DNI (solo números) o por nombre y apellido,
 * resolviendo los datos a partir de su identificador.
 */
export function filterTrips(viajes, filters, pasajerosById) {
  const query = analyzePassengerQuery(filters.pasajero ?? "");
  const matchesPassenger = (viaje) => {
    if (query.mode === "none") return true;
    const pasajero = pasajerosById[viaje.pasajeroId];
    if (!pasajero) return false;
    if (query.mode === "dni") return pasajero.dni.startsWith(query.dni);
    return matchesPassengerName(pasajero, query.normalized);
  };

  return viajes.filter(
    (v) =>
      (!filters.desde || v.fecha >= filters.desde) &&
      (!filters.hasta || v.fecha <= filters.hasta) &&
      (!filters.chofer || v.choferId === filters.chofer) &&
      (!filters.vehiculo || v.vehiculoId === filters.vehiculo) &&
      (!filters.estado || v.estado === filters.estado) &&
      (!filters.destino || v.institucionId === filters.destino) &&
      matchesPassenger(v),
  );
}

/**
 * Orden de agenda: primero los viajes de hoy y próximos (del más cercano al
 * más lejano) y luego el historial (del más reciente al más antiguo).
 */
export function sortTripsAgenda(viajes, today) {
  const key = (v) => `${v.fecha} ${v.hora} ${v.id}`;
  const proximos = viajes.filter((v) => v.fecha >= today).sort((a, b) => key(a).localeCompare(key(b)));
  const anteriores = viajes.filter((v) => v.fecha < today).sort((a, b) => key(b).localeCompare(key(a)));
  return [...proximos, ...anteriores];
}

/** Agrega un evento al historial de cambios del viaje. */
export function appendTripEvent(viaje, evento) {
  return [...(viaje.eventos ?? []), evento];
}
