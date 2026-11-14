// Catálogos de la Agenda de Turnos (Etapa 5B).

/** Días de la semana de lunes (1) a domingo (7). */
export const DIAS_AGENDA = [
  { value: 1, short: "Lun", label: "Lunes" },
  { value: 2, short: "Mar", label: "Martes" },
  { value: 3, short: "Mié", label: "Miércoles" },
  { value: 4, short: "Jue", label: "Jueves" },
  { value: 5, short: "Vie", label: "Viernes" },
  { value: 6, short: "Sáb", label: "Sábado" },
  { value: 7, short: "Dom", label: "Domingo" },
];

export const TRAMOS = {
  ida: "Ida",
  vuelta: "Vuelta",
};

export const EMPTY_TURNO_FORM = {
  pasajeroId: "",
  institucionId: "",
  dias: [],
  tipo: "",
  horaIda: "",
  horaVuelta: "",
  observaciones: "",
};
