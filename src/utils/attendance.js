// Reglas del módulo Gestión de Asistencias (CU-08 y CU-09).
// Funciones puras sobre el estado global: no guardan contadores ni copias.
// La asistencia se vincula siempre con un viaje por su identificador.

import { ESTADOS_ASISTENCIA } from "../constants/estados";
import { addDays, daysBetween, formatDate, MONTH_LONG, parseISODate, toISODate } from "./dates";
import { analyzePassengerQuery, matchesPassengerName, summarizeAttendance } from "./passengers";

export const ESTADOS_REGISTRABLES = Object.keys(ESTADOS_ASISTENCIA);

export const MOTIVO_MIN = 5;
export const MOTIVO_MAX = 200;
export const OBSERVACIONES_MAX = 300;

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MES_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Índice viajeId → asistencia (una sola por viaje). */
export function indexAttendanceByTrip(asistencias) {
  const index = new Map();
  asistencias.forEach((a) => {
    if (!index.has(a.viajeId)) index.set(a.viajeId, a);
  });
  return index;
}

/**
 * Estado de asistencia de un viaje en la planilla:
 * presente | ausente | justificado (registradas), sin_registrar (viaje de hoy o
 * anterior sin asistencia), no_corresponde (cancelado sin asistencia) o futuro.
 */
export function getAttendanceStatus(viaje, asistencia, today) {
  if (asistencia) return asistencia.estado;
  if (viaje.estado === "cancelado") return "no_corresponde";
  if (viaje.fecha > today) return "futuro";
  return "sin_registrar";
}

/** Motivo por el que no puede registrarse una asistencia NUEVA para el viaje, o null. */
export function getRegistrationBlock(viaje, today) {
  if (!viaje) return "El viaje no existe.";
  if (viaje.fecha > today) {
    return `El viaje es del ${formatDate(viaje.fecha)}: no se registran asistencias de viajes futuros.`;
  }
  if (viaje.estado === "cancelado") return "El viaje está cancelado: no admite nuevas asistencias.";
  return null;
}

/** Valores del formulario a partir de una asistencia existente (o vacíos). */
export function attendanceToForm(asistencia) {
  return {
    estado: asistencia?.estado ?? "",
    motivo: asistencia?.motivo ?? "",
    observaciones: asistencia?.observaciones ?? "",
  };
}

/**
 * Valida el formulario de asistencia.
 * Ausente exige motivo; Justificado admite una justificación opcional;
 * Presente no lleva motivo. Un viaje cancelado no puede quedar con Presente.
 */
export function validateAttendanceForm(form, { viaje }) {
  const errors = {};
  if (!form.estado) errors.estado = "Seleccione el estado de asistencia.";
  else if (!ESTADOS_REGISTRABLES.includes(form.estado)) errors.estado = "Estado de asistencia inválido.";
  else if (form.estado === "presente" && viaje?.estado === "cancelado") {
    errors.estado = "El viaje está cancelado: la asistencia no puede ser Presente.";
  }

  const motivo = form.motivo.trim();
  if (form.estado === "ausente") {
    if (!motivo) errors.motivo = "Ingrese el motivo de la ausencia.";
    else if (motivo.length < MOTIVO_MIN) errors.motivo = `Describa el motivo con al menos ${MOTIVO_MIN} caracteres.`;
  }
  if (form.estado !== "presente" && motivo.length > MOTIVO_MAX) errors.motivo = `Máximo ${MOTIVO_MAX} caracteres.`;
  if (form.observaciones.length > OBSERVACIONES_MAX) errors.observaciones = `Máximo ${OBSERVACIONES_MAX} caracteres.`;
  return errors;
}

/** Campos a guardar. Presente no conserva motivo. */
export function formToAttendanceFields(form) {
  const clean = (text) => text.trim().replace(/\s+/g, " ");
  return {
    estado: form.estado,
    motivo: form.estado === "presente" ? "" : clean(form.motivo),
    observaciones: form.observaciones.trim(),
  };
}

/** Texto combinado de motivo y observaciones para tablas y planillas. */
export function attendanceNote(asistencia) {
  if (!asistencia) return "";
  return [asistencia.motivo, asistencia.observaciones].filter((text) => text && text.trim()).join(" · ");
}

/**
 * Filas de la planilla: un viaje por fila con su asistencia (si existe).
 * fecha vacía = todos los viajes hasta hoy, del más reciente al más antiguo.
 */
export function buildAttendanceRows(data, { fecha, today, attendanceIndex }) {
  const pasajeros = Object.fromEntries(data.pasajeros.map((p) => [p.id, p]));
  const viajes = fecha ? data.viajes.filter((v) => v.fecha === fecha) : data.viajes.filter((v) => v.fecha <= today);
  return viajes
    .map((viaje) => {
      const asistencia = attendanceIndex.get(viaje.id) ?? null;
      return { id: viaje.id, viaje, asistencia, pasajero: pasajeros[viaje.pasajeroId], status: getAttendanceStatus(viaje, asistencia, today) };
    })
    .sort((a, b) =>
      fecha
        ? `${a.viaje.hora} ${a.id}`.localeCompare(`${b.viaje.hora} ${b.id}`)
        : `${b.viaje.fecha} ${b.viaje.hora} ${b.id}`.localeCompare(`${a.viaje.fecha} ${a.viaje.hora} ${a.id}`),
    );
}

/** Filtros combinados de la vista lista: pasajero (DNI o nombre), estado y pendientes. */
export function filterAttendanceRows(rows, { busqueda = "", estado = "", pendientes = false }) {
  const query = analyzePassengerQuery(busqueda);
  return rows.filter((row) => {
    if (pendientes && row.status !== "sin_registrar") return false;
    if (estado && row.status !== estado) return false;
    if (query.mode === "none") return true;
    if (!row.pasajero) return false;
    if (query.mode === "dni") return row.pasajero.dni.startsWith(query.dni);
    return matchesPassengerName(row.pasajero, query.normalized);
  });
}

/**
 * Indicadores de un mes ("YYYY-MM"). El porcentaje de presentes se calcula
 * sobre las asistencias registradas, con el mismo criterio de la ficha del
 * pasajero. Los viajes sin asistencia se informan aparte: no son ausencias.
 */
export function summarizeMonth(data, monthKey, { today, attendanceIndex }) {
  const resumen = summarizeAttendance(data.asistencias.filter((a) => a.fecha.startsWith(monthKey)));
  const sinRegistrar = data.viajes.filter(
    (v) => v.fecha.startsWith(monthKey) && getAttendanceStatus(v, attendanceIndex.get(v.id), today) === "sin_registrar",
  ).length;
  const pct = (value) => (resumen.total ? Math.round((value * 1000) / resumen.total) / 10 : 0);
  return {
    ...resumen,
    sinRegistrar,
    pctAusentes: pct(resumen.ausentes),
    pctJustificadas: pct(resumen.justificadas),
  };
}

/** "YYYY-MM" → "Noviembre 2026" */
export function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_LONG[month - 1]} ${year}`;
}

/** Suma meses a "YYYY-MM". */
export function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return toISODate(date).slice(0, 7);
}

/** Semanas (lunes a domingo) que cubren el mes, como fechas ISO. */
export function getCalendarWeeks(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const weeks = [];
  for (let day = start; day <= last || weeks.at(-1)?.length < 7; day = addDays(day, 1)) {
    if (!weeks.length || weeks.at(-1).length === 7) weeks.push([]);
    weeks.at(-1).push(toISODate(day));
  }
  return weeks;
}

/** Cantidad de viajes por estado de asistencia para cada día. */
export function summarizeByDay(data, { today, attendanceIndex }) {
  const days = {};
  data.viajes.forEach((viaje) => {
    const status = getAttendanceStatus(viaje, attendanceIndex.get(viaje.id), today);
    const day = (days[viaje.fecha] ??= { total: 0 });
    day.total += 1;
    day[status] = (day[status] ?? 0) + 1;
  });
  return days;
}

/** Lunes y domingo de la semana que contiene la fecha. */
export function weekRange(isoDate) {
  const date = parseISODate(isoDate);
  const monday = addDays(date, -((date.getDay() + 6) % 7));
  return { desde: toISODate(monday), hasta: toISODate(addDays(monday, 6)) };
}

/**
 * Período de la planilla (CU-09). tipo: "semanal" (referencia = fecha) o
 * "mensual" (referencia = "YYYY-MM"). Devuelve { desde, hasta, label } o { error }.
 */
export function getSheetPeriod(tipo, referencia, today) {
  if (tipo !== "semanal" && tipo !== "mensual") return { error: "Seleccione un período semanal o mensual." };
  if (!referencia) return { error: tipo === "semanal" ? "Seleccione una fecha de referencia." : "Seleccione el mes de referencia." };

  let range;
  if (tipo === "semanal") {
    if (!FECHA_PATTERN.test(referencia) || Number.isNaN(parseISODate(referencia).getTime())) {
      return { error: "Ingrese una fecha válida." };
    }
    range = weekRange(referencia);
  } else {
    if (!MES_PATTERN.test(referencia)) return { error: "Ingrese un mes válido." };
    const [year, month] = referencia.split("-").map(Number);
    range = { desde: `${referencia}-01`, hasta: toISODate(new Date(year, month, 0)) };
  }

  if (Number(range.desde.slice(0, 4)) < 2000) return { error: "El período está fuera del rango admitido." };
  if (range.desde > today) return { error: "El período seleccionado todavía no comenzó: no puede tener asistencias." };

  const label =
    tipo === "semanal"
      ? `Semana del ${formatDate(range.desde)} al ${formatDate(range.hasta)}`
      : `${monthLabel(referencia)} (${formatDate(range.desde)} al ${formatDate(range.hasta)})`;
  return { ...range, label, dias: daysBetween(range.desde, range.hasta) + 1 };
}

/** Planilla de asistencias de un pasajero en un período, con totales. */
export function buildPassengerSheet(data, { pasajeroId, desde, hasta, today, attendanceIndex }) {
  const rows = data.viajes
    .filter((v) => v.pasajeroId === pasajeroId && v.fecha >= desde && v.fecha <= hasta)
    .sort((a, b) => `${a.fecha} ${a.hora} ${a.id}`.localeCompare(`${b.fecha} ${b.hora} ${b.id}`))
    .map((viaje) => {
      const asistencia = attendanceIndex.get(viaje.id) ?? null;
      return { id: viaje.id, viaje, asistencia, status: getAttendanceStatus(viaje, asistencia, today) };
    });
  const resumen = summarizeAttendance(rows.filter((r) => r.asistencia).map((r) => r.asistencia));
  const count = (status) => rows.filter((r) => r.status === status).length;
  return {
    rows,
    totales: {
      ...resumen,
      viajes: rows.length,
      sinRegistrar: count("sin_registrar"),
      noCorresponde: count("no_corresponde"),
      futuros: count("futuro"),
    },
  };
}
