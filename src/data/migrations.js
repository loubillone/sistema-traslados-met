// Migraciones de los datos guardados en localStorage.
// Nunca regeneran viajes ni asistencias: solo agregan los campos y colecciones
// que incorpora cada etapa, respetando los valores ya existentes.

import {
  createSeedPresupuestos,
  createSeedTurnos,
  DATA_VERSION,
  withAttendanceDefaults,
  withDriverDefaults,
  withPassengerDefaults,
  withTripDefaults,
  withVehicleDefaults,
} from "./mockData";
import { parseISODate } from "../utils/dates";

const MIGRATIONS = {
  // v1 (Etapa 1) → v2 (Etapa 2): ficha ampliada del pasajero y presupuestos.
  1: (state) => {
    const pasajeros = state.pasajeros.map(withPassengerDefaults);
    const reference = state.generadoEl ? parseISODate(state.generadoEl) : new Date();
    return {
      ...state,
      pasajeros,
      presupuestos: Array.isArray(state.presupuestos) ? state.presupuestos : createSeedPresupuestos(pasajeros, reference),
      version: 2,
    };
  },
  // v2 (Etapa 2) → v3 (Etapa 3): estados normalizados y motivo de cancelación.
  // Conserva todos los viajes (también los creados o modificados por el usuario)
  // con sus fechas, asignaciones y estados; las asistencias no se tocan.
  2: (state) => ({
    ...state,
    viajes: state.viajes.map(withTripDefaults),
    version: 3,
  }),
  // v3 (Etapa 3) → v4 (Etapa 4): motivo de ausencia o justificación separado de
  // las observaciones. Conserva todas las asistencias (también las editadas por
  // el usuario) con su fecha, pasajero y viaje; no toca los viajes.
  3: (state) => ({
    ...state,
    asistencias: state.asistencias.map(withAttendanceDefaults),
    version: 4,
  }),
  // v4 (Etapa 4) → v5 (Etapa 5A): disponibilidad y categoría de licencia de los
  // choferes; datos del seguro y baja de los vehículos. Conserva identificadores,
  // vencimientos y estados; no toca viajes, pasajeros ni asistencias.
  4: (state) => ({
    ...state,
    choferes: state.choferes.map(withDriverDefaults),
    vehiculos: state.vehiculos.map(withVehicleDefaults),
    version: 5,
  }),
  // v5 (Etapa 5A) → v6 (Etapa 5B): agenda de turnos recurrentes, creada a partir
  // de la agenda habitual de cada pasajero. No modifica pasajeros ni viajes.
  5: (state) => ({
    ...state,
    turnos: Array.isArray(state.turnos) ? state.turnos : createSeedTurnos(state.pasajeros),
    version: 6,
  }),
};

/** Devuelve el estado migrado a la versión actual, o null si no puede migrarse. */
export function migrateData(stored) {
  if (!stored || !Array.isArray(stored.viajes) || !Array.isArray(stored.pasajeros)) return null;
  let state = stored;
  while (state.version < DATA_VERSION) {
    const migrate = MIGRATIONS[state.version];
    if (!migrate) return null;
    state = migrate(state);
  }
  return state.version === DATA_VERSION ? state : null;
}
