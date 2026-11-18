// Reglas del módulo Gestión de Presupuestos (CU-14).
// Funciones puras sobre el estado global del DataProvider.
//
// Un presupuesto se vincula con el pasajero por su identificador (pasajeroId).
// El total se calcula SIEMPRE con la misma función (calcularTotal), en centavos
// enteros, para que formulario, detalle, historial e impresión coincidan y no
// aparezcan errores de punto flotante (por ejemplo 0,1 × 3).
// Guardar un presupuesto no crea ni modifica viajes.

import { KM_MAXIMO, OBSERVACIONES_MAX, TARIFA_MAXIMA } from "../constants/presupuestos";
import { formatDate, parseISODate, toISODate } from "./dates";
import { formatAmount } from "./format";
import { fullName } from "./selectors";

// ---------------------------------------------------------------------------
// Números con formato argentino
// ---------------------------------------------------------------------------

/**
 * Convierte un texto en un número con hasta 2 decimales, expresado en
 * centésimos enteros. Acepta "45", "45,5", "1.250", "1.250,50" y "1250.50".
 * Devuelve { hundredths } o { error } (sin texto: el llamador arma el mensaje).
 */
export function parseDecimalAR(raw) {
  const text = String(raw ?? "").trim().replace(/^\$\s*/, "").replace(/\s+/g, "");
  if (!text) return { error: "vacio" };
  if (text.startsWith("-")) return { error: "negativo" };

  let normalized = null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) normalized = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d+(,\d{1,2})?$/.test(text)) normalized = text.replace(",", ".");
  else if (/^\d+(\.\d{1,2})?$/.test(text)) normalized = text;
  if (normalized === null) return { error: "formato" };

  // Se separan parte entera y decimales como texto: sin multiplicaciones de coma flotante.
  const [entero, decimales = ""] = normalized.split(".");
  if (entero.length > 12) return { error: "maximo" };
  const hundredths = Number(entero) * 100 + Number(decimales.padEnd(2, "0"));
  if (!Number.isSafeInteger(hundredths)) return { error: "formato" };
  if (hundredths === 0) return { error: "cero" };
  return { hundredths };
}

function parsePositive(raw, { label, max, maxLabel }) {
  const result = parseDecimalAR(raw);
  const messages = {
    vacio: `Ingrese ${label}.`,
    negativo: "No se admiten valores negativos.",
    formato: "Ingrese un número válido, con hasta 2 decimales (ej.: 45 o 45,5).",
    cero: "Debe ser mayor que cero.",
    maximo: `El valor supera el máximo permitido (${maxLabel}).`,
  };
  if (result.error) return { error: messages[result.error] };
  if (result.hundredths > max * 100) return { error: messages.maximo };
  return { hundredths: result.hundredths, value: result.hundredths / 100 };
}

export const parseKilometros = (raw) =>
  parsePositive(raw, { label: "los kilómetros del recorrido", max: KM_MAXIMO, maxLabel: `${KM_MAXIMO.toLocaleString("es-AR")} km` });

export const parseTarifa = (raw) =>
  parsePositive(raw, { label: "la tarifa por kilómetro", max: TARIFA_MAXIMA, maxLabel: formatAmount(TARIFA_MAXIMA) });

/** Pasa un número a centésimos enteros sin arrastrar errores de coma flotante. */
const toHundredths = (value) => Math.round(Number(value) * 100);

/**
 * TOTAL = KILÓMETROS × TARIFA POR KILÓMETRO, redondeado al centavo.
 * Se opera con enteros: km en centésimos × tarifa en centavos / 100.
 */
export function calcularTotal(kilometros, tarifaKm) {
  const centavos = Math.round((toHundredths(kilometros) * toHundredths(tarifaKm)) / 100);
  return centavos / 100;
}

/** Suma importes en centavos enteros. */
export const sumarImportes = (lista, campo = "total") => lista.reduce((acc, item) => acc + toHundredths(item[campo] ?? 0), 0) / 100;

/** 45 km · 45,5 km */
export const formatKm = (km) => `${Number(km ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })} km`;

/** Número guardado → texto del campo ("45", "45,5", "1250,75"). */
export const numberToInput = (value) => (value === undefined || value === null || value === "" ? "" : String(value).replace(".", ","));

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isValidISODate = (value) => ISO_DATE.test(value ?? "") && toISODate(parseISODate(value)) === value;
const FECHA_MINIMA = "2000-01-01";

/** Vista previa del cálculo: { total } con datos válidos, o null. */
export function previewTotal(form) {
  const km = parseKilometros(form.kilometros);
  const tarifa = parseTarifa(form.tarifaKm);
  if (km.error || tarifa.error) return null;
  return { kilometros: km.value, tarifaKm: tarifa.value, total: calcularTotal(km.value, tarifa.value) };
}

/**
 * Valida el formulario. En edición el pasajero no puede cambiarse (se conserva
 * la relación); en el alta debe existir y estar activo.
 */
export function validateBudgetForm(form, { data, editing = null, today }) {
  const errors = {};
  const pasajero = data.pasajeros.find((p) => p.id === form.pasajeroId);

  if (editing) {
    if (form.pasajeroId !== editing.pasajeroId) errors.pasajeroId = "El pasajero de un presupuesto no puede modificarse.";
  } else if (!form.pasajeroId) errors.pasajeroId = "Seleccione el pasajero.";
  else if (!pasajero) errors.pasajeroId = "El pasajero seleccionado no existe.";
  else if (!pasajero.activo) errors.pasajeroId = `${fullName(pasajero)} está inactivo: reactívelo para emitirle presupuestos.`;

  if (form.institucionId && !data.instituciones.some((i) => i.id === form.institucionId)) {
    errors.institucionId = "El destino seleccionado no existe.";
  }

  if (!form.fecha) errors.fecha = "Ingrese la fecha de emisión.";
  else if (!isValidISODate(form.fecha) || form.fecha < FECHA_MINIMA) errors.fecha = "Ingrese una fecha válida.";
  else if (form.fecha > today) errors.fecha = "La fecha de emisión no puede ser posterior a hoy.";

  const km = parseKilometros(form.kilometros);
  if (km.error) errors.kilometros = km.error;
  const tarifa = parseTarifa(form.tarifaKm);
  if (tarifa.error) errors.tarifaKm = tarifa.error;

  if (form.observaciones.length > OBSERVACIONES_MAX) errors.observaciones = `Máximo ${OBSERVACIONES_MAX} caracteres.`;
  return errors;
}

/** Campos a guardar. El total se recalcula siempre a partir de km y tarifa. */
export function formToBudgetFields(form) {
  const kilometros = parseKilometros(form.kilometros).value;
  const tarifaKm = parseTarifa(form.tarifaKm).value;
  return {
    fecha: form.fecha,
    institucionId: form.institucionId || "",
    kilometros,
    tarifaKm,
    total: calcularTotal(kilometros, tarifaKm),
    observaciones: form.observaciones.trim(),
  };
}

export function budgetToForm(presupuesto) {
  return {
    pasajeroId: presupuesto.pasajeroId,
    institucionId: presupuesto.institucionId ?? "",
    fecha: presupuesto.fecha,
    kilometros: numberToInput(presupuesto.kilometros),
    tarifaKm: numberToInput(presupuesto.tarifaKm),
    observaciones: presupuesto.observaciones ?? "",
  };
}

export function describeBudgetChanges(original, fields, instituciones) {
  const nombre = (id) => instituciones.find((i) => i.id === id)?.nombre ?? "sin destino";
  const cambios = [];
  if (original.fecha !== fields.fecha) cambios.push(`fecha ${formatDate(original.fecha)} → ${formatDate(fields.fecha)}`);
  if ((original.institucionId ?? "") !== fields.institucionId) cambios.push(`destino ${nombre(original.institucionId)} → ${nombre(fields.institucionId)}`);
  if (original.kilometros !== fields.kilometros) cambios.push(`kilómetros ${formatKm(original.kilometros)} → ${formatKm(fields.kilometros)}`);
  if (original.tarifaKm !== fields.tarifaKm) cambios.push(`tarifa ${formatAmount(original.tarifaKm)} → ${formatAmount(fields.tarifaKm)}`);
  if (original.total !== fields.total) cambios.push(`total ${formatAmount(original.total)} → ${formatAmount(fields.total)}`);
  if ((original.observaciones ?? "") !== fields.observaciones) cambios.push("observaciones");
  return cambios;
}

/** Tarifa sugerida para un presupuesto nuevo: la del presupuesto más reciente. */
export function suggestedTarifa(presupuestos) {
  const ultimo = sortBudgets(presupuestos)[0];
  return ultimo ? numberToInput(ultimo.tarifaKm) : "";
}

// ---------------------------------------------------------------------------
// Historial y filtros (se guardan en la URL)
// ---------------------------------------------------------------------------

export const BUDGET_FILTER_KEYS = ["pasajero", "desde", "hasta"];

export function readBudgetFilters(searchParams) {
  return Object.fromEntries(
    BUDGET_FILTER_KEYS.map((key) => {
      const value = searchParams.get(key) ?? "";
      return [key, key === "pasajero" || isValidISODate(value) ? value : ""];
    }),
  );
}

export function getBudgetDateRangeError(filters) {
  return filters.desde && filters.hasta && filters.desde > filters.hasta
    ? "La fecha “desde” no puede ser posterior a la fecha “hasta”."
    : null;
}

export function filterBudgets(presupuestos, filters) {
  return presupuestos.filter(
    (p) =>
      (!filters.pasajero || p.pasajeroId === filters.pasajero) &&
      (!filters.desde || p.fecha >= filters.desde) &&
      (!filters.hasta || p.fecha <= filters.hasta),
  );
}

/** Más recientes primero. */
export const sortBudgets = (presupuestos) =>
  [...presupuestos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

/** Nombre sugerido del archivo al guardar como PDF desde el navegador. */
export const budgetFileTitle = (presupuesto, pasajero) =>
  `Presupuesto ${presupuesto.id}${pasajero ? ` - ${pasajero.apellido} ${pasajero.nombre}` : ""}`;
