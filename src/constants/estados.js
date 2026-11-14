// Catálogos de estados compartidos por todas las pantallas.
// `variant` define el color del StatusBadge.

export const ESTADOS_VIAJE = {
  programado: { label: "Programado", variant: "warning" },
  en_curso: { label: "En curso", variant: "info" },
  finalizado: { label: "Finalizado", variant: "success" },
  cancelado: { label: "Cancelado", variant: "danger" },
};

export const ESTADOS_ASISTENCIA = {
  presente: { label: "Presente", variant: "success" },
  ausente: { label: "Ausente", variant: "danger" },
  justificado: { label: "Justificado", variant: "warning" },
};

/**
 * Estado de asistencia de cada viaje en la planilla (Etapa 4). Además de las
 * asistencias registradas, distingue los viajes que todavía no la tienen:
 * "Sin registrar" NO equivale a "Ausente".
 */
export const ESTADOS_REGISTRO_ASISTENCIA = {
  ...ESTADOS_ASISTENCIA,
  sin_registrar: { label: "Sin registrar", variant: "neutral" },
  no_corresponde: { label: "No corresponde", variant: "neutral" },
  futuro: { label: "Viaje futuro", variant: "neutral" },
};

/** Disponibilidad del chofer (Etapa 5A). Disponible y De guardia admiten viajes nuevos. */
export const DISPONIBILIDAD_CHOFER = {
  disponible: { label: "Disponible", variant: "success" },
  guardia: { label: "De guardia", variant: "info" },
  no_disponible: { label: "No disponible", variant: "danger" },
  en_viaje: { label: "En viaje", variant: "info" },
  inactivo: { label: "Inactivo", variant: "neutral" },
};

/** Estado de un turno recurrente (Etapa 5B). Suspendido: el pasajero está inactivo. */
export const ESTADOS_TURNO = {
  activo: { label: "Activo", variant: "success" },
  inactivo: { label: "Desactivado", variant: "neutral" },
  suspendido: { label: "Suspendido", variant: "warning" },
};

export const ESTADOS_VEHICULO = {
  activo: { label: "Activo", variant: "success" },
  mantenimiento: { label: "En mantenimiento", variant: "warning" },
  inactivo: { label: "Inactivo", variant: "neutral" },
};

export const ESTADOS_PASAJERO = {
  activo: { label: "Activo", variant: "success" },
  inactivo: { label: "Inactivo", variant: "neutral" },
};

export const TIPOS_VIAJE = {
  ida: "Ida",
  vuelta: "Vuelta",
  ida_vuelta: "Ida y vuelta",
};

/** Días de anticipación para alertar vencimientos (licencias, VTV, seguros). */
export const DIAS_ALERTA_VENCIMIENTO = 60;

/**
 * Normaliza el estado de una asistencia ("Presente", "justificada") al valor
 * interno: "presente" | "ausente" | "justificado". Si no lo reconoce, devuelve
 * el valor original para no perder información.
 */
export function normalizeAttendanceStatus(value) {
  const key = String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/a$/, "o")
    .replace(/^presento$/, "presente");
  return ESTADOS_ASISTENCIA[key] ? key : value;
}

/**
 * Transiciones permitidas entre estados de viaje (Etapa 3).
 * Finalizado y Cancelado son estados terminales: no vuelven a Programado.
 */
export const TRANSICIONES_VIAJE = {
  programado: ["en_curso", "cancelado"],
  en_curso: ["finalizado", "cancelado"],
  finalizado: [],
  cancelado: [],
};

/**
 * Normaliza el nombre de un estado de viaje al valor interno.
 * Acepta variantes visibles ("En curso", "en-curso", "FINALIZADO") y devuelve
 * "programado" | "en_curso" | "finalizado" | "cancelado". Si no la reconoce,
 * devuelve el valor original para no perder información.
 */
export function normalizeTripStatus(value) {
  const key = String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  return ESTADOS_VIAJE[key] ? key : value;
}
