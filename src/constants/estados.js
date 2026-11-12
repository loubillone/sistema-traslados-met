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

export const ESTADOS_VEHICULO = {
  activo: { label: "Activo", variant: "success" },
  mantenimiento: { label: "En mantenimiento", variant: "warning" },
  inactivo: { label: "Inactivo", variant: "neutral" },
};

export const TIPOS_VIAJE = {
  ida: "Ida",
  vuelta: "Vuelta",
  ida_vuelta: "Ida y vuelta",
};

/** Días de anticipación para alertar vencimientos (licencias, VTV, seguros). */
export const DIAS_ALERTA_VENCIMIENTO = 60;
