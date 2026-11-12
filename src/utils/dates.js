// Utilidades de fechas. Se trabaja con fechas locales en formato ISO "YYYY-MM-DD"
// para evitar desfasajes por zona horaria al usar toISOString().

const pad = (value) => String(value).padStart(2, "0");

export const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MONTH_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** dd/mm/aaaa */
export function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Días desde fromIso hasta toIso (negativo si toIso ya pasó). */
export function daysBetween(fromIso, toIso) {
  return Math.round((parseISODate(toIso) - parseISODate(fromIso)) / 86400000);
}

/** Últimos `count` meses (incluido el actual), del más antiguo al más reciente. */
export function lastMonths(count, reference = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(reference.getFullYear(), reference.getMonth() - (count - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
      label: MONTH_SHORT[date.getMonth()],
      nombre: `${MONTH_LONG[date.getMonth()]} ${date.getFullYear()}`,
    };
  });
}
