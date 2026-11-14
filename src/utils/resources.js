// Reglas de los módulos Choferes (CU-11) y Vehículos (CU-12).
// Funciones puras sobre el estado global del DataProvider.

import { CATEGORIAS_LICENCIA, DIAS_VENCIMIENTO_CRITICO, TIPOS_VEHICULO } from "../constants/recursos";
import { DIAS_ALERTA_VENCIMIENTO } from "../constants/estados";
import { addDays, daysBetween, formatDate, parseISODate, toISODate } from "./dates";
import { normalizeText } from "./format";
import { fullName } from "./selectors";
import { normalizeDni, validateDni, validateName, validatePhone } from "./validation";

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ANIOS_VENCIMIENTO = 15;

// ---------------------------------------------------------------------------
// Vencimientos
// ---------------------------------------------------------------------------

/**
 * Semáforo de un vencimiento, calculado con la fecha actual:
 * danger (vencido o menos de 30 días), warning (30 a 59) o success (60 o más).
 */
export function getExpiryInfo(fecha, today) {
  if (!fecha) return { dias: null, level: "neutral", text: "Sin fecha registrada" };
  const dias = daysBetween(today, fecha);
  const level = dias < DIAS_VENCIMIENTO_CRITICO ? "danger" : dias < DIAS_ALERTA_VENCIMIENTO ? "warning" : "success";
  let text;
  if (dias < 0) text = `Vencida hace ${-dias} ${dias === -1 ? "día" : "días"}`;
  else if (dias === 0) text = "Vence hoy";
  else text = `Faltan ${dias} ${dias === 1 ? "día" : "días"}`;
  return { dias, level, text, expired: dias < 0 };
}

/** Cuenta cuántos vencimientos de la lista caen en menos de 60 días (incluye vencidos). */
export const countExpiring = (fechas, today) =>
  fechas.filter((fecha) => fecha && daysBetween(today, fecha) < DIAS_ALERTA_VENCIMIENTO).length;

function validateExpiry(value, { label, allowPast, today }) {
  if (!value) return `Ingrese la fecha de vencimiento ${label}.`;
  if (!FECHA_PATTERN.test(value) || Number.isNaN(parseISODate(value).getTime())) return "Ingrese una fecha válida.";
  if (value < "2000-01-01") return "Ingrese una fecha válida.";
  if (value > toISODate(addDays(parseISODate(today), MAX_ANIOS_VENCIMIENTO * 365))) {
    return `La fecha no puede superar ${MAX_ANIOS_VENCIMIENTO} años.`;
  }
  if (!allowPast && value < today) return `La fecha ${label} ya pasó: no se puede registrar un vencimiento vencido.`;
  return null;
}

// ---------------------------------------------------------------------------
// Choferes
// ---------------------------------------------------------------------------

/** Chofer con un viaje en curso hoy (dato calculado, no se guarda). */
export function getDriversOnTrip(viajes, today) {
  return new Set(viajes.filter((v) => v.fecha === today && v.estado === "en_curso").map((v) => v.choferId));
}

/** Estado visible del chofer: inactivo, no disponible, en viaje, de guardia o disponible. */
export function getDriverStatus(chofer, enViaje) {
  if (!chofer.activo) return "inactivo";
  if (chofer.disponibilidad === "no_disponible") return "no_disponible";
  if (enViaje) return "en_viaje";
  return chofer.disponibilidad === "guardia" ? "guardia" : "disponible";
}

const LICENCIA_PATTERN = /^[A-Za-z0-9-]{5,20}$/;
export const normalizeLicense = (value) => value.trim().toUpperCase().replace(/\s+/g, "");

/** Valida el formulario de chofer. En edición el DNI no cambia. */
export function validateDriverForm(form, { choferes, editingId = null, today }) {
  const errors = {};
  if (!editingId) {
    const dniError = validateDni(form.dni);
    if (dniError) errors.dni = dniError;
    else {
      const duplicado = choferes.find((c) => c.dni === normalizeDni(form.dni));
      if (duplicado) errors.dni = `Ya existe un chofer con este DNI: ${fullName(duplicado)}${duplicado.activo ? "" : " (inactivo)"}.`;
    }
  }
  const nombre = validateName(form.nombre, "el nombre");
  if (nombre) errors.nombre = nombre;
  const apellido = validateName(form.apellido, "el apellido");
  if (apellido) errors.apellido = apellido;
  const telefono = validatePhone(form.telefono);
  if (telefono) errors.telefono = telefono;

  const licencia = normalizeLicense(form.licencia);
  if (!licencia) errors.licencia = "Ingrese el número de licencia.";
  else if (!LICENCIA_PATTERN.test(licencia)) errors.licencia = "Use entre 5 y 20 letras, números o guiones (ej.: B-12345678).";
  else {
    const repetida = choferes.find((c) => c.id !== editingId && normalizeLicense(c.licencia ?? "") === licencia);
    if (repetida) errors.licencia = `La licencia ya está registrada para ${fullName(repetida)}.`;
  }
  if (!form.categoriaLicencia) errors.categoriaLicencia = "Seleccione la categoría de la licencia.";
  else if (!CATEGORIAS_LICENCIA[form.categoriaLicencia]) errors.categoriaLicencia = "Categoría inválida.";

  const original = editingId ? choferes.find((c) => c.id === editingId) : null;
  const vencimiento = validateExpiry(form.vencimientoLicencia, {
    label: "de la licencia",
    // Al editar se acepta una fecha vencida (para registrar la situación real).
    allowPast: Boolean(original),
    today,
  });
  if (vencimiento) errors.vencimientoLicencia = vencimiento;

  if (!["disponible", "guardia", "no_disponible"].includes(form.disponibilidad)) errors.disponibilidad = "Seleccione la disponibilidad.";
  if (form.observaciones.length > 300) errors.observaciones = "Máximo 300 caracteres.";
  return errors;
}

const clean = (value) => value.trim().replace(/\s+/g, " ");

export function formToDriverFields(form) {
  return {
    nombre: clean(form.nombre),
    apellido: clean(form.apellido),
    telefono: clean(form.telefono),
    licencia: normalizeLicense(form.licencia),
    categoriaLicencia: form.categoriaLicencia,
    vencimientoLicencia: form.vencimientoLicencia,
    disponibilidad: form.disponibilidad,
    turno: form.turno,
    observaciones: form.observaciones.trim(),
  };
}

export function driverToForm(chofer) {
  return {
    dni: chofer.dni,
    nombre: chofer.nombre,
    apellido: chofer.apellido,
    telefono: chofer.telefono ?? "",
    licencia: chofer.licencia ?? "",
    categoriaLicencia: chofer.categoriaLicencia ?? "",
    vencimientoLicencia: chofer.vencimientoLicencia ?? "",
    disponibilidad: chofer.disponibilidad ?? "disponible",
    turno: chofer.turno ?? "",
    observaciones: chofer.observaciones ?? "",
  };
}

/** Búsqueda por DNI (solo números) o por nombre y apellido. */
export function matchesDriver(chofer, term) {
  const query = term.trim();
  if (!query) return true;
  if (/^[\d.\s]+$/.test(query)) return chofer.dni.startsWith(normalizeDni(query));
  const text = normalizeText(query);
  return normalizeText(fullName(chofer)).includes(text) || normalizeText(`${chofer.apellido} ${chofer.nombre}`).includes(text);
}

// ---------------------------------------------------------------------------
// Vehículos
// ---------------------------------------------------------------------------

/**
 * Normaliza la patente: mayúsculas y guiones.
 * "ab123cd" → "AB-123-CD" (formato Mercosur) · "abc123" → "ABC-123" (formato anterior).
 */
export function normalizePlate(value) {
  const raw = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(raw)) return `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
  if (/^[A-Z]{3}\d{3}$/.test(raw)) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return raw;
}

const plateKey = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function validateVehicleForm(form, { vehiculos, editingId = null, today }) {
  const errors = {};
  const original = editingId ? vehiculos.find((v) => v.id === editingId) : null;

  if (!original) {
    const key = plateKey(form.patente);
    if (!key) errors.patente = "Ingrese la patente.";
    else if (!/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(key) && !/^[A-Z]{3}\d{3}$/.test(key)) {
      errors.patente = "Formato inválido. Use AB-123-CD o ABC-123.";
    } else {
      const duplicada = vehiculos.find((v) => plateKey(v.patente) === key);
      if (duplicada) errors.patente = `La patente ya está registrada (${duplicada.tipo}${duplicada.activo === false ? ", dado de baja" : ""}).`;
    }
  }

  if (!form.tipo) errors.tipo = "Seleccione el tipo de vehículo.";
  else if (!TIPOS_VEHICULO.includes(form.tipo) && form.tipo !== original?.tipo) errors.tipo = "Tipo inválido.";

  const capacidad = Number(form.capacidad);
  if (form.capacidad === "" || form.capacidad === null) errors.capacidad = "Ingrese la capacidad de pasajeros.";
  else if (!Number.isInteger(capacidad) || capacidad <= 0) errors.capacidad = "La capacidad debe ser un número entero mayor a cero.";
  else if (capacidad > 60) errors.capacidad = "La capacidad no puede superar 60 pasajeros.";

  if (form.modelo.length > 60) errors.modelo = "Máximo 60 caracteres.";

  const vtv = validateExpiry(form.vencimientoVTV, { label: "de la VTV", allowPast: Boolean(original), today });
  if (vtv) errors.vencimientoVTV = vtv;
  if (!form.aseguradora.trim()) errors.aseguradora = "Ingrese la aseguradora.";
  else if (form.aseguradora.trim().length < 3) errors.aseguradora = "Ingrese el nombre completo de la aseguradora.";
  if (!form.poliza.trim()) errors.poliza = "Ingrese el número de póliza.";
  else if (!/^[A-Za-z0-9-/ ]{4,30}$/.test(form.poliza.trim())) errors.poliza = "Use entre 4 y 30 letras, números o guiones.";
  const seguro = validateExpiry(form.vencimientoSeguro, { label: "del seguro", allowPast: Boolean(original), today });
  if (seguro) errors.vencimientoSeguro = seguro;

  if (!["activo", "mantenimiento"].includes(form.estado)) errors.estado = "Seleccione el estado.";
  if (form.observaciones.length > 300) errors.observaciones = "Máximo 300 caracteres.";
  return errors;
}

export function formToVehicleFields(form) {
  return {
    tipo: form.tipo,
    modelo: clean(form.modelo),
    capacidad: Number(form.capacidad),
    vencimientoVTV: form.vencimientoVTV,
    aseguradora: clean(form.aseguradora),
    poliza: form.poliza.trim().toUpperCase(),
    vencimientoSeguro: form.vencimientoSeguro,
    estado: form.estado,
    observaciones: form.observaciones.trim(),
  };
}

export function vehicleToForm(vehiculo) {
  return {
    patente: vehiculo.patente,
    tipo: vehiculo.tipo ?? "",
    modelo: vehiculo.modelo ?? "",
    capacidad: String(vehiculo.capacidad ?? ""),
    vencimientoVTV: vehiculo.vencimientoVTV ?? "",
    aseguradora: vehiculo.aseguradora ?? "",
    poliza: vehiculo.poliza ?? "",
    vencimientoSeguro: vehiculo.vencimientoSeguro ?? "",
    estado: vehiculo.estado === "mantenimiento" ? "mantenimiento" : "activo",
    observaciones: vehiculo.observaciones ?? "",
  };
}

export function matchesVehicle(vehiculo, term) {
  const query = normalizeText(term);
  if (!query) return true;
  const key = plateKey(term);
  if (key && plateKey(vehiculo.patente).includes(key)) return true;
  return normalizeText(`${vehiculo.tipo} ${vehiculo.modelo}`).includes(query);
}

// ---------------------------------------------------------------------------
// Viajes asignados
// ---------------------------------------------------------------------------

/** Viajes futuros pendientes (programados de hoy en adelante) asignados al recurso. */
export function getUpcomingTrips(viajes, field, id, today) {
  return viajes
    .filter((v) => v[field] === id && v.estado === "programado" && v.fecha >= today)
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
}

/**
 * Viajes futuros que quedarían afectados por el nuevo estado de un chofer:
 * todos si está inactivo o no disponible; si no, los posteriores al vencimiento
 * de la licencia. Los viajes se conservan: solo se informan al operador.
 */
export function getAffectedDriverTrips(viajes, chofer, today) {
  const proximos = getUpcomingTrips(viajes, "choferId", chofer.id, today);
  if (!chofer.activo || chofer.disponibilidad === "no_disponible") return proximos;
  return proximos.filter((v) => chofer.vencimientoLicencia && chofer.vencimientoLicencia < v.fecha);
}

/** Igual que la anterior para vehículos: baja, mantenimiento, VTV o seguro vencidos. */
export function getAffectedVehicleTrips(viajes, vehiculo, today) {
  const proximos = getUpcomingTrips(viajes, "vehiculoId", vehiculo.id, today);
  if (vehiculo.activo === false || vehiculo.estado !== "activo") return proximos;
  return proximos.filter(
    (v) =>
      (vehiculo.vencimientoVTV && vehiculo.vencimientoVTV < v.fecha) ||
      (vehiculo.vencimientoSeguro && vehiculo.vencimientoSeguro < v.fecha),
  );
}

/** Texto breve de un viaje para avisos: "VIA-00964 · 16/11/2026 08:00". */
export const tripLabel = (viaje) => `${viaje.id} · ${formatDate(viaje.fecha)} ${viaje.hora}`;
