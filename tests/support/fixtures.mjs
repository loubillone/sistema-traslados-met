// Datos de prueba: la semilla de la demostración generada para una fecha FIJA,
// para que los resultados no dependan del día en que se ejecutan las pruebas.
import { createSeedData } from "../../src/data/mockData.js";

/** Miércoles 17/06/2026: día de referencia de todas las pruebas. */
export const REFERENCE = new Date(2026, 5, 17);
export const TODAY = "2026-06-17";

/** Estado completo y nuevo en cada llamada (las pruebas pueden modificarlo). */
export const freshData = () => createSeedData(REFERENCE);

export const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));
