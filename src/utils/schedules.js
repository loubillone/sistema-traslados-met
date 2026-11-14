// Reglas de la Agenda de Turnos (CU-10).
//
// Un TURNO es una programación habitual (días y horarios); un VIAJE es un
// registro concreto con fecha, chofer y vehículo. Las ocurrencias semanales se
// calculan a partir de los turnos y NUNCA se guardan como viajes.
// Todas las fechas son locales ("YYYY-MM-DD"), sin conversiones a UTC.

import { DIAS_AGENDA, TRAMOS } from "../constants/agenda";
import { MONTH_LONG, addDays, formatDate, parseISODate, toISODate } from "./dates";
import { fullName } from "./selectors";
import { EMPTY_TRIP_FORM, routeFields } from "./trips";

const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIPOS = ["ida", "vuelta", "ida_vuelta"];

const diaLabel = (value) => DIAS_AGENDA.find((d) => d.value === value)?.label ?? String(value);

/** Día de la semana de una fecha local: 1 = lunes … 7 = domingo. */
export function weekdayOf(isoDate) {
  return ((parseISODate(isoDate).getDay() + 6) % 7) + 1;
}

/** Lunes de la semana que contiene la fecha. */
export function weekStart(isoDate) {
  return toISODate(addDays(parseISODate(isoDate), 1 - weekdayOf(isoDate)));
}

/** Las 7 fechas (lunes a domingo) de la semana que empieza en `monday`. */
export function weekDates(monday) {
  return Array.from({ length: 7 }, (_, index) => toISODate(addDays(parseISODate(monday), index)));
}

export const shiftWeek = (monday, weeks) => toISODate(addDays(parseISODate(monday), weeks * 7));

/** "Semana del 16 al 22 de Noviembre 2026" (o con dos meses si cambia). */
export function weekLabel(monday) {
  const start = parseISODate(monday);
  const end = addDays(start, 6);
  const mes = (d) => MONTH_LONG[d.getMonth()];
  if (start.getMonth() === end.getMonth()) {
    return `Semana del ${start.getDate()} al ${end.getDate()} de ${mes(end)} ${end.getFullYear()}`;
  }
  return `Semana del ${start.getDate()} de ${mes(start)} al ${end.getDate()} de ${mes(end)} ${end.getFullYear()}`;
}

/** Trayectos que genera un turno, con su horario. */
export function turnoLegs(turno) {
  const legs = [];
  if ((turno.tipo === "ida" || turno.tipo === "ida_vuelta") && turno.horaIda) legs.push({ tramo: "ida", hora: turno.horaIda });
  if ((turno.tipo === "vuelta" || turno.tipo === "ida_vuelta") && turno.horaVuelta) legs.push({ tramo: "vuelta", hora: turno.horaVuelta });
  return legs;
}

/** Estado visible: activo, desactivado o suspendido (pasajero inactivo). */
export function getTurnoStatus(turno, pasajero) {
  if (!turno.activo) return "inactivo";
  if (!pasajero || !pasajero.activo) return "suspendido";
  return "activo";
}

export const describeDias = (dias) => DIAS_AGENDA.filter((d) => dias.includes(d.value)).map((d) => d.label).join(", ");

export function describeHorario(turno) {
  return turnoLegs(turno)
    .map((leg) => `${TRAMOS[leg.tramo]} ${leg.hora}`)
    .join(" · ") || "Sin horario";
}

/**
 * Viaje concreto que cubre una ocurrencia del turno: del mismo pasajero y
 * fecha, no cancelado, y del mismo turno y tramo, de ida y vuelta (un solo
 * registro para ambos trayectos) o a la misma hora del trayecto.
 */
export function findOccurrenceTrip(viajes, turno, fecha, tramo, hora) {
  return (
    viajes.find(
      (v) =>
        v.pasajeroId === turno.pasajeroId &&
        v.fecha === fecha &&
        v.estado !== "cancelado" &&
        ((v.turnoId === turno.id && v.tramo === tramo) || v.tipo === "ida_vuelta" || v.hora === hora),
    ) ?? null
  );
}

/** El turno genera ocurrencias en la fecha (activo, pasajero activo, día configurado y vigente). */
export function occursOn(turno, pasajero, fecha) {
  return (
    getTurnoStatus(turno, pasajero) === "activo" &&
    turno.dias.includes(weekdayOf(fecha)) &&
    (!turno.fechaAlta || fecha >= turno.fechaAlta)
  );
}

/** Filtros combinados de la agenda: pasajero, institución y tipo. */
export const matchesTurnoFilters = (turno, filters) =>
  (!filters.pasajero || turno.pasajeroId === filters.pasajero) &&
  (!filters.institucion || turno.institucionId === filters.institucion) &&
  (!filters.tipo || turno.tipo === filters.tipo);

/**
 * Ocurrencias de la semana calculadas desde los turnos, cada una con el viaje
 * concreto que la cubre (si existe), y los viajes de la semana que no
 * corresponden a ningún turno. No se crea ni guarda ningún registro.
 */
export function buildWeek(data, monday, filters = {}) {
  const fechas = weekDates(monday);
  const pasajeros = Object.fromEntries(data.pasajeros.map((p) => [p.id, p]));
  const instituciones = Object.fromEntries(data.instituciones.map((i) => [i.id, i]));
  const usados = new Set();
  const ocurrencias = [];

  (data.turnos ?? []).filter((t) => matchesTurnoFilters(t, filters)).forEach((turno) => {
    const pasajero = pasajeros[turno.pasajeroId];
    fechas.forEach((fecha) => {
      if (!occursOn(turno, pasajero, fecha)) return;
      turnoLegs(turno).forEach((leg) => {
        const viaje = findOccurrenceTrip(data.viajes, turno, fecha, leg.tramo, leg.hora);
        if (viaje) usados.add(viaje.id);
        ocurrencias.push({
          key: `${turno.id}-${fecha}-${leg.tramo}`,
          turno,
          pasajero,
          institucion: instituciones[turno.institucionId],
          fecha,
          tramo: leg.tramo,
          hora: leg.hora,
          viaje,
        });
      });
    });
  });

  // Viajes concretos de la semana sin turno asociado (por ejemplo, traslados eventuales).
  const extras = data.viajes
    .filter((v) => fechas.includes(v.fecha) && !usados.has(v.id) && v.estado !== "cancelado")
    .filter((v) => (!filters.pasajero || v.pasajeroId === filters.pasajero) && (!filters.institucion || v.institucionId === filters.institucion) && (!filters.tipo || v.tipo === filters.tipo))
    .map((viaje) => ({ key: viaje.id, viaje, pasajero: pasajeros[viaje.pasajeroId], institucion: instituciones[viaje.institucionId], fecha: viaje.fecha, hora: viaje.hora }));

  const byTime = (a, b) => `${a.hora} ${a.key}`.localeCompare(`${b.hora} ${b.key}`);
  return { fechas, ocurrencias: ocurrencias.sort(byTime), extras: extras.sort(byTime) };
}

/** Próximas fechas (desde `from`, inclusive) en las que el turno tiene ocurrencias. */
export function nextOccurrenceDates(turno, pasajero, from, count = 6, maxDays = 120) {
  const dates = [];
  for (let i = 0; i <= maxDays && dates.length < count; i += 1) {
    const fecha = toISODate(addDays(parseISODate(from), i));
    if (occursOn(turno, pasajero, fecha)) dates.push(fecha);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

export function turnoToForm(turno) {
  return {
    pasajeroId: turno.pasajeroId,
    institucionId: turno.institucionId ?? "",
    dias: [...turno.dias],
    tipo: turno.tipo,
    horaIda: turno.horaIda ?? "",
    horaVuelta: turno.horaVuelta ?? "",
    observaciones: turno.observaciones ?? "",
  };
}

export function formToTurnoFields(form) {
  return {
    institucionId: form.institucionId,
    dias: [...form.dias].sort((a, b) => a - b),
    tipo: form.tipo,
    horaIda: form.tipo === "vuelta" ? "" : form.horaIda,
    horaVuelta: form.tipo === "ida" ? "" : form.horaVuelta,
    observaciones: form.observaciones.trim(),
  };
}

/**
 * Valida el turno. Rechaza duplicados (mismo pasajero, día, horario y tipo) y
 * superposiciones con otro turno activo del pasajero en el mismo día y hora.
 */
export function validateTurnoForm(form, { data, editingId = null }) {
  const errors = {};
  const pasajero = data.pasajeros.find((p) => p.id === form.pasajeroId);
  if (!form.pasajeroId) errors.pasajeroId = "Seleccione el pasajero.";
  else if (!pasajero) errors.pasajeroId = "El pasajero seleccionado no existe.";
  else if (!pasajero.activo) errors.pasajeroId = `${fullName(pasajero)} está inactivo: no se pueden registrar ni modificar sus turnos.`;

  if (!form.institucionId) errors.institucionId = "Seleccione la institución de destino.";
  else if (!data.instituciones.some((i) => i.id === form.institucionId)) errors.institucionId = "La institución no existe.";

  if (!form.dias.length) errors.dias = "Seleccione al menos un día de la semana.";
  else if (form.dias.some((d) => !DIAS_AGENDA.some((x) => x.value === d))) errors.dias = "Día inválido.";

  if (!form.tipo) errors.tipo = "Seleccione el tipo de traslado.";
  else if (!TIPOS.includes(form.tipo)) errors.tipo = "Tipo de traslado inválido.";

  const necesitaIda = form.tipo === "ida" || form.tipo === "ida_vuelta";
  const necesitaVuelta = form.tipo === "vuelta" || form.tipo === "ida_vuelta";
  if (necesitaIda) {
    if (!form.horaIda) errors.horaIda = "Ingrese el horario de ida.";
    else if (!HORA_PATTERN.test(form.horaIda)) errors.horaIda = "Ingrese un horario válido (HH:MM).";
  }
  if (necesitaVuelta) {
    if (!form.horaVuelta) errors.horaVuelta = form.tipo === "ida_vuelta" ? "Ingrese el horario de regreso." : "Ingrese el horario de vuelta.";
    else if (!HORA_PATTERN.test(form.horaVuelta)) errors.horaVuelta = "Ingrese un horario válido (HH:MM).";
    else if (form.tipo === "ida_vuelta" && !errors.horaIda && form.horaVuelta <= form.horaIda) {
      errors.horaVuelta = "El regreso debe ser posterior al horario de ida.";
    }
  }
  if (form.observaciones.length > 300) errors.observaciones = "Máximo 300 caracteres.";

  // Duplicados y superposiciones con otros turnos activos del pasajero.
  if (!errors.pasajeroId && !errors.dias && !errors.tipo && !errors.horaIda && !errors.horaVuelta) {
    const nuevos = turnoLegs(formToTurnoFields(form));
    const otros = (data.turnos ?? []).filter((t) => t.id !== editingId && t.activo && t.pasajeroId === form.pasajeroId);
    for (const otro of otros) {
      const dias = form.dias.filter((d) => otro.dias.includes(d));
      if (!dias.length) continue;
      const mismoHorario = otro.tipo === form.tipo && JSON.stringify(turnoLegs(otro)) === JSON.stringify(nuevos);
      if (mismoHorario) {
        errors.duplicado = `Ya existe el turno ${otro.id} con el mismo tipo y horario los días ${describeDias(dias)}.`;
        break;
      }
      const choque = nuevos.find((leg) => turnoLegs(otro).some((o) => o.hora === leg.hora));
      if (choque) {
        errors.duplicado = `Se superpone con el turno ${otro.id} (${describeHorario(otro)}) los días ${describeDias(dias)} a las ${choque.hora}.`;
        break;
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Programar viaje desde un turno
// ---------------------------------------------------------------------------

/**
 * Valores iniciales de Nuevo Viaje cuando se programa desde un turno:
 * pasajero, fecha, horario del trayecto, recorrido y tipo.
 * - Ida: horario de ida; origen = domicilio del pasajero, destino = institución.
 * - Vuelta: horario de regreso; origen = institución, destino = domicilio.
 * Un turno de ida y vuelta se programa por trayecto: cada viaje es Ida o Vuelta.
 * Todos los valores pueden modificarse en el formulario antes de guardar.
 */
export function turnoTripValues(data, turno, fecha, tramo) {
  const pasajero = data.pasajeros.find((p) => p.id === turno.pasajeroId);
  const leg = turnoLegs(turno).find((l) => l.tramo === tramo);
  const tipo = turno.tipo === "ida_vuelta" ? tramo : turno.tipo;
  return {
    ...EMPTY_TRIP_FORM,
    pasajeroId: turno.pasajeroId,
    fecha: fecha ?? "",
    hora: leg?.hora ?? "",
    ...routeFields(tipo, pasajero?.domicilio ?? ""),
    institucionId: turno.institucionId ?? "",
    tipo,
    observaciones: turno.observaciones ?? "",
  };
}

/**
 * Valida la fecha y el trayecto elegidos para programar un viaje desde el turno.
 * Devuelve { error } o { hora, viajeExistente }.
 */
export function checkTurnoTrip(data, turno, { fecha, tramo }, today) {
  const pasajero = data.pasajeros.find((p) => p.id === turno.pasajeroId);
  const status = getTurnoStatus(turno, pasajero);
  if (status === "inactivo") return { error: "El turno está desactivado: no genera viajes nuevos." };
  if (status === "suspendido") return { error: "El pasajero está inactivo: el turno está suspendido." };
  const leg = turnoLegs(turno).find((l) => l.tramo === tramo);
  if (!leg) return { error: "Seleccione un trayecto con horario definido." };
  if (!fecha || !FECHA_PATTERN.test(fecha)) return { error: "Seleccione la fecha del viaje." };
  if (fecha < today) return { error: "No se pueden programar viajes en fechas pasadas." };
  if (!turno.dias.includes(weekdayOf(fecha))) {
    return { error: `El ${formatDate(fecha)} es ${diaLabel(weekdayOf(fecha)).toLowerCase()}: el turno es los días ${describeDias(turno.dias)}.` };
  }
  const viajeExistente = findOccurrenceTrip(data.viajes, turno, fecha, tramo, leg.hora);
  return { hora: leg.hora, viajeExistente };
}
