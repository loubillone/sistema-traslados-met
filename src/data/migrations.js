// Migraciones de los datos guardados en localStorage.
// Nunca regeneran viajes ni asistencias: solo agregan los campos y colecciones
// que incorpora cada etapa, respetando los valores ya existentes.

import { createSeedPresupuestos, DATA_VERSION, withPassengerDefaults } from "./mockData";
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
