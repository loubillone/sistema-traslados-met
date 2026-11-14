// Catálogos de los módulos Choferes y Vehículos (Etapa 5A).

/** Categorías de licencia profesional (datos de demostración). */
export const CATEGORIAS_LICENCIA = {
  B1: "B1 · Automóviles y camionetas",
  D1: "D1 · Transporte de pasajeros hasta 8 plazas",
  D2: "D2 · Transporte de pasajeros de más de 8 plazas",
};

export const TURNOS_CHOFER = ["Mañana", "Tarde", "Completo"];

export const TIPOS_VEHICULO = ["Auto", "Camioneta", "Combi", "Minibús", "Utilitario adaptado"];

/** Días que faltan para un vencimiento: rojo < 30, amarillo 30 a 59, verde 60 o más. */
export const DIAS_VENCIMIENTO_CRITICO = 30;

export const EMPTY_DRIVER_FORM = {
  dni: "",
  nombre: "",
  apellido: "",
  telefono: "",
  licencia: "",
  categoriaLicencia: "",
  vencimientoLicencia: "",
  disponibilidad: "disponible",
  turno: "",
  observaciones: "",
};

export const EMPTY_VEHICLE_FORM = {
  patente: "",
  tipo: "",
  modelo: "",
  capacidad: "",
  vencimientoVTV: "",
  aseguradora: "",
  poliza: "",
  vencimientoSeguro: "",
  estado: "activo",
  observaciones: "",
};
