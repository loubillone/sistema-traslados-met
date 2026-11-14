// Cálculos y búsquedas del módulo Pasajeros. Todo se deriva del estado global.

import { normalizeText } from "./format";
import { DNI_MAX_DIGITS, DNI_MIN_DIGITS, normalizeDni } from "./validation";
import { fullName } from "./selectors";

/** Resumen de asistencias: el porcentaje se calcula sobre las asistencias registradas. */
export function summarizeAttendance(asistencias) {
  const resumen = { presentes: 0, ausentes: 0, justificadas: 0, total: asistencias.length, porcentaje: null };
  asistencias.forEach((a) => {
    if (a.estado === "presente") resumen.presentes += 1;
    else if (a.estado === "ausente") resumen.ausentes += 1;
    else if (a.estado === "justificado") resumen.justificadas += 1;
  });
  if (resumen.total > 0) resumen.porcentaje = Math.round((resumen.presentes * 100) / resumen.total);
  return resumen;
}

/** Contadores de historial de todos los pasajeros, en una sola pasada por los datos. */
export function getPassengerCounters(data) {
  const counters = {};
  const ensure = (id) => (counters[id] ??= { viajes: 0, asistencias: [], presupuestos: 0 });
  data.viajes.forEach((v) => {
    ensure(v.pasajeroId).viajes += 1;
  });
  data.asistencias.forEach((a) => {
    ensure(a.pasajeroId).asistencias.push(a);
  });
  (data.presupuestos ?? []).forEach((p) => {
    ensure(p.pasajeroId).presupuestos += 1;
  });
  return Object.fromEntries(
    Object.entries(counters).map(([id, c]) => [
      id,
      { viajes: c.viajes, presupuestos: c.presupuestos, asistencia: summarizeAttendance(c.asistencias) },
    ]),
  );
}

/**
 * Interpreta el texto del buscador (CU-01).
 * - Solo números (con o sin puntos): búsqueda por DNI.
 * - Cualquier otro texto: búsqueda por nombre y apellido.
 */
export function analyzePassengerQuery(rawTerm) {
  const term = rawTerm.trim();
  if (!term) return { mode: "none", term };
  if (/^[\d.\s]+$/.test(term)) {
    const dni = normalizeDni(term);
    return {
      mode: "dni",
      term,
      dni,
      complete: dni.length >= DNI_MIN_DIGITS && dni.length <= DNI_MAX_DIGITS,
      tooLong: dni.length > DNI_MAX_DIGITS,
    };
  }
  return { mode: "nombre", term, normalized: normalizeText(term) };
}

export function matchesPassengerName(pasajero, normalizedTerm) {
  const directo = normalizeText(fullName(pasajero));
  const inverso = normalizeText(`${pasajero.apellido} ${pasajero.nombre}`);
  return directo.includes(normalizedTerm) || inverso.includes(normalizedTerm);
}

/** Pasajero → valores del formulario. */
export function passengerToForm(pasajero) {
  return {
    dni: pasajero.dni,
    nombre: pasajero.nombre,
    apellido: pasajero.apellido,
    domicilio: pasajero.domicilio ?? "",
    telefono: pasajero.telefono ?? "",
    contactoNombre: pasajero.contactoEmergencia?.nombre ?? "",
    contactoVinculo: pasajero.contactoEmergencia?.vinculo ?? "",
    contactoTelefono: pasajero.contactoEmergencia?.telefono ?? "",
    condicion: pasajero.condicion ?? "",
    obraSocial: pasajero.obraSocial ?? "",
    institucionId: pasajero.institucionId ?? "",
    observaciones: pasajero.observaciones ?? "",
  };
}

/** Valores del formulario → campos editables del pasajero (sin DNI ni relaciones). */
export function formToPassengerFields(form) {
  const clean = (value) => value.trim().replace(/\s+/g, " ");
  return {
    nombre: clean(form.nombre),
    apellido: clean(form.apellido),
    domicilio: clean(form.domicilio),
    telefono: clean(form.telefono),
    contactoEmergencia: {
      nombre: clean(form.contactoNombre),
      vinculo: clean(form.contactoVinculo),
      telefono: clean(form.contactoTelefono),
    },
    condicion: form.condicion.trim(),
    obraSocial: form.obraSocial,
    institucionId: form.institucionId,
    observaciones: form.observaciones.trim(),
  };
}

/** Registro completo para un pasajero nuevo (CU-02). */
export function createPassengerRecord(form, todayIso) {
  return {
    dni: normalizeDni(form.dni),
    ...formToPassengerFields(form),
    fechaAlta: todayIso,
    fechaBaja: null,
    activo: true,
    // La agenda recurrente y la asignación de chofer/vehículo se definen en módulos posteriores.
    diasSemana: [],
    horaHabitual: "",
    tipoViaje: "ida_vuelta",
    choferId: null,
    vehiculoId: null,
    documentos: [],
  };
}

/** Ordena por apellido y nombre. */
export function sortPassengers(list) {
  return [...list].sort(
    (a, b) => a.apellido.localeCompare(b.apellido, "es") || a.nombre.localeCompare(b.nombre, "es"),
  );
}
