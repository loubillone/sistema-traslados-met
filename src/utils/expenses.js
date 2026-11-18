// Reglas del módulo Gestión de Gastos (CU-13).
// Funciones puras sobre el estado global del DataProvider.
//
// Un gasto se vincula siempre con un viaje por su identificador. El vehículo NO
// se guarda en el gasto: se obtiene del viaje asociado. Solo admiten gastos los
// viajes en curso o finalizados, que ya no pueden editarse ni reasignarse, de
// modo que el vehículo del gasto no cambia. Registrar un gasto nunca modifica el
// viaje.

import {
  CATEGORIAS_GASTO,
  CATEGORIA_KEYS,
  DESCRIPCION_MAX,
  DESCRIPCION_MIN,
  ESTADOS_VIAJE_CON_GASTOS,
  MONTO_MAXIMO,
} from "../constants/gastos";
import { ESTADOS_VIAJE } from "../constants/estados";
import { formatDate, MONTH_LONG, parseISODate, toISODate } from "./dates";
import { formatAmount } from "./format";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidISODate = (value) => ISO_DATE.test(value ?? "") && toISODate(parseISODate(value)) === value;

// ---------------------------------------------------------------------------
// Viajes que admiten gastos
// ---------------------------------------------------------------------------

export const tripAcceptsExpenses = (viaje) => Boolean(viaje) && ESTADOS_VIAJE_CON_GASTOS.includes(viaje.estado);

/** Motivo por el que un viaje no admite gastos nuevos, o null. */
export function getExpenseBlockReason(viaje) {
  if (tripAcceptsExpenses(viaje)) return null;
  const estado = ESTADOS_VIAJE[viaje?.estado]?.label.toLowerCase() ?? viaje?.estado;
  return `Los gastos se registran para viajes en curso o finalizados. Este viaje está ${estado}.`;
}

/** Viajes de un día que admiten gastos, ordenados por hora. */
export function eligibleTripsOn(viajes, fecha) {
  if (!fecha) return [];
  return viajes
    .filter((v) => v.fecha === fecha && tripAcceptsExpenses(v))
    .sort((a, b) => a.hora.localeCompare(b.hora) || a.id.localeCompare(b.id));
}

/** Fecha más reciente (hasta hoy) con viajes que admiten gastos. */
export function latestEligibleDate(viajes, today) {
  return viajes.reduce((max, v) => (v.fecha <= today && tripAcceptsExpenses(v) && v.fecha > max ? v.fecha : max), "") || today;
}

// ---------------------------------------------------------------------------
// Monto
// ---------------------------------------------------------------------------

/**
 * Interpreta un importe en pesos. Acepta "15500", "15.500", "15.500,50",
 * "15500,5" y "15500.50" (hasta 2 decimales). Devuelve { value } o { error }.
 */
export function parseMonto(raw) {
  const text = String(raw ?? "").trim().replace(/^\$\s*/, "").replace(/\s+/g, "");
  if (!text) return { error: "Ingrese el monto del gasto." };
  if (text.startsWith("-")) return { error: "El monto no puede ser negativo." };

  let normalized = null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) normalized = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d+(,\d{1,2})?$/.test(text)) normalized = text.replace(",", ".");
  else if (/^\d+(\.\d{1,2})?$/.test(text)) normalized = text;
  if (normalized === null) return { error: "Ingrese un monto válido: solo números, con hasta 2 decimales." };

  const value = Math.round(Number(normalized) * 100) / 100;
  if (!Number.isFinite(value)) return { error: "Ingrese un monto válido." };
  if (value <= 0) return { error: "El monto debe ser mayor que cero." };
  if (value > MONTO_MAXIMO) return { error: `El monto supera el máximo permitido (${formatAmount(MONTO_MAXIMO)}).` };
  return { value };
}

/** Monto guardado → texto del campo ("15500" o "15500,5"). */
export const montoToInput = (monto) => (monto === undefined || monto === null ? "" : String(monto).replace(".", ","));

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

/**
 * Valida el formulario del gasto. En edición se acepta conservar el viaje
 * original aunque ya no admita gastos nuevos (por ejemplo, si luego se canceló).
 */
export function validateExpenseForm(form, { data, editing = null, today }) {
  const errors = {};
  const viaje = form.viajeId ? data.viajes.find((v) => v.id === form.viajeId) : null;
  const mantieneViaje = editing && editing.viajeId === form.viajeId;

  if (form.diaViaje && !isValidISODate(form.diaViaje)) errors.diaViaje = "Ingrese una fecha válida.";
  else if (form.diaViaje > today) errors.diaViaje = "No se registran gastos de viajes futuros.";

  if (!form.viajeId) errors.viajeId = "Seleccione el viaje asociado.";
  else if (!viaje) errors.viajeId = "El viaje seleccionado no existe.";
  else if (!mantieneViaje && !tripAcceptsExpenses(viaje)) errors.viajeId = getExpenseBlockReason(viaje);

  if (!form.fecha) errors.fecha = "Ingrese la fecha del gasto.";
  else if (!isValidISODate(form.fecha)) errors.fecha = "Ingrese una fecha válida.";
  else if (form.fecha > today) errors.fecha = "La fecha del gasto no puede ser posterior a hoy.";
  else if (viaje && form.fecha < viaje.fecha) errors.fecha = `La fecha no puede ser anterior al viaje (${formatDate(viaje.fecha)}).`;

  if (!form.categoria) errors.categoria = "Seleccione la categoría.";
  else if (!CATEGORIA_KEYS.includes(form.categoria)) errors.categoria = "La categoría seleccionada no es válida.";

  const monto = parseMonto(form.monto);
  if (monto.error) errors.monto = monto.error;

  const descripcion = form.descripcion.trim();
  if (!descripcion) errors.descripcion = "Ingrese una descripción del gasto.";
  else if (descripcion.length < DESCRIPCION_MIN) errors.descripcion = `Mínimo ${DESCRIPCION_MIN} caracteres.`;
  else if (descripcion.length > DESCRIPCION_MAX) errors.descripcion = `Máximo ${DESCRIPCION_MAX} caracteres.`;

  return errors;
}

/** Campos que se guardan. El vehículo no se guarda: se obtiene del viaje. */
export function formToExpenseFields(form) {
  return {
    viajeId: form.viajeId,
    fecha: form.fecha,
    categoria: form.categoria,
    monto: parseMonto(form.monto).value,
    descripcion: form.descripcion.trim(),
  };
}

export function expenseToForm(gasto, viaje) {
  return {
    diaViaje: viaje?.fecha ?? gasto.fecha,
    viajeId: gasto.viajeId,
    fecha: gasto.fecha,
    categoria: gasto.categoria,
    monto: montoToInput(gasto.monto),
    descripcion: gasto.descripcion ?? "",
  };
}

/** Lista de cambios para el aviso de edición. */
export function describeExpenseChanges(original, fields) {
  const cambios = [];
  if (original.viajeId !== fields.viajeId) cambios.push(`viaje ${original.viajeId} → ${fields.viajeId}`);
  if (original.fecha !== fields.fecha) cambios.push(`fecha ${formatDate(original.fecha)} → ${formatDate(fields.fecha)}`);
  if (original.categoria !== fields.categoria) {
    cambios.push(`categoría ${categoriaLabel(original.categoria)} → ${categoriaLabel(fields.categoria)}`);
  }
  if (original.monto !== fields.monto) cambios.push(`monto ${formatAmount(original.monto)} → ${formatAmount(fields.monto)}`);
  if ((original.descripcion ?? "") !== fields.descripcion) cambios.push("descripción");
  return cambios;
}

export const categoriaLabel = (categoria) => CATEGORIAS_GASTO[categoria]?.label ?? categoria;

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export const sumAmounts = (gastos) => Math.round(gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0) * 100) / 100;

/** Más recientes primero. */
export const sortExpenses = (gastos) =>
  [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

/** Gastos de un viaje, del más antiguo al más reciente. */
export const getTripExpenses = (gastos, viajeId) =>
  (gastos ?? []).filter((g) => g.viajeId === viajeId).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));

/** Vehículo del gasto, obtenido del viaje asociado. */
export const expenseVehicleId = (gasto, viajesById) => viajesById[gasto.viajeId]?.vehiculoId ?? null;

// ---------------------------------------------------------------------------
// Filtros del listado (se guardan en la URL)
// ---------------------------------------------------------------------------

export const EXPENSE_FILTER_KEYS = ["mes", "categoria", "vehiculo"];
/** Valor del filtro de mes para ver todos los meses. */
export const TODOS_LOS_MESES = "todos";

export const monthKeyOf = (isoDate) => isoDate.slice(0, 7);

export function monthName(key) {
  if (key === TODOS_LOS_MESES) return "Todos los meses";
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_LONG[month - 1]} ${year}`;
}

/** Filtros leídos de la URL. Sin "mes" se muestra el mes actual. */
export function readExpenseFilters(searchParams, currentMonth) {
  const mes = searchParams.get("mes");
  const categoria = searchParams.get("categoria") ?? "";
  return {
    mes: mes === TODOS_LOS_MESES || /^\d{4}-\d{2}$/.test(mes ?? "") ? mes : currentMonth,
    categoria: CATEGORIA_KEYS.includes(categoria) ? categoria : "",
    vehiculo: searchParams.get("vehiculo") ?? "",
  };
}

/** Meses con gastos (más el actual), del más reciente al más antiguo. */
export function buildMonthOptions(gastos, currentMonth) {
  const keys = new Set([currentMonth, ...gastos.map((g) => monthKeyOf(g.fecha))]);
  return [
    ...[...keys].sort().reverse().map((key) => ({ value: key, label: monthName(key) })),
    { value: TODOS_LOS_MESES, label: monthName(TODOS_LOS_MESES) },
  ];
}

/**
 * Aplica los filtros. `withCategory: false` ignora la categoría: el resumen y el
 * gráfico muestran todas las categorías del mes y vehículo seleccionados.
 */
export function filterExpenses(gastos, filters, viajesById, { withCategory = true } = {}) {
  return gastos.filter(
    (g) =>
      (filters.mes === TODOS_LOS_MESES || monthKeyOf(g.fecha) === filters.mes) &&
      (!filters.vehiculo || expenseVehicleId(g, viajesById) === filters.vehiculo) &&
      (!withCategory || !filters.categoria || g.categoria === filters.categoria),
  );
}

/** Totales por categoría: { combustible: { total, cantidad }, ... }. */
export function summarizeByCategory(gastos) {
  const summary = Object.fromEntries(CATEGORIA_KEYS.map((key) => [key, { total: 0, cantidad: 0 }]));
  gastos.forEach((g) => {
    if (!summary[g.categoria]) return;
    summary[g.categoria].total += Number(g.monto) || 0;
    summary[g.categoria].cantidad += 1;
  });
  CATEGORIA_KEYS.forEach((key) => {
    summary[key].total = Math.round(summary[key].total * 100) / 100;
  });
  return summary;
}
