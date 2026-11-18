// Datos de demostración y migraciones de localStorage (v1 → v8).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { byId, freshData, REFERENCE } from "../support/fixtures.mjs";
import { createSeedData, DATA_VERSION } from "../../src/data/mockData.js";
import { migrateData } from "../../src/data/migrations.js";

describe("Semilla de demostración", () => {
  it("es determinística para una misma fecha", () => {
    assert.deepEqual(createSeedData(REFERENCE), createSeedData(REFERENCE));
  });

  it("usa la versión de datos actual", () => {
    assert.equal(freshData().version, DATA_VERSION);
    assert.equal(DATA_VERSION, 8);
  });

  it("no tiene identificadores repetidos en ninguna colección", () => {
    const data = freshData();
    for (const coleccion of ["pasajeros", "choferes", "vehiculos", "viajes", "asistencias", "presupuestos", "turnos", "gastos"]) {
      const ids = data[coleccion].map((x) => x.id);
      assert.equal(new Set(ids).size, ids.length, coleccion);
    }
  });

  it("no tiene relaciones rotas", () => {
    const data = freshData();
    const [pasajeros, choferes, vehiculos, instituciones, viajes] = ["pasajeros", "choferes", "vehiculos", "instituciones", "viajes"].map((c) => byId(data[c]));
    for (const v of data.viajes) {
      assert.ok(pasajeros[v.pasajeroId] && choferes[v.choferId] && vehiculos[v.vehiculoId] && instituciones[v.institucionId], v.id);
    }
    for (const a of data.asistencias) assert.ok(viajes[a.viajeId] && a.pasajeroId === viajes[a.viajeId].pasajeroId, a.id);
    for (const g of data.gastos) assert.ok(viajes[g.viajeId], g.id);
    for (const p of data.presupuestos) assert.ok(pasajeros[p.pasajeroId], p.id);
    for (const t of data.turnos) assert.ok(pasajeros[t.pasajeroId], t.id);
  });

  it("no hay viajes futuros con asistencia ni pasajeros inactivos con viajes futuros", () => {
    const data = freshData();
    const viajes = byId(data.viajes);
    const hoy = data.generadoEl;
    assert.ok(data.asistencias.every((a) => viajes[a.viajeId].fecha <= hoy));
    const inactivos = new Set(data.pasajeros.filter((p) => !p.activo).map((p) => p.id));
    assert.ok(!data.viajes.some((v) => inactivos.has(v.pasajeroId) && v.fecha > hoy && v.estado === "programado"));
  });
});

/** Estado guardado con la estructura de la Etapa 1 (v1), con estados en el formato anterior. */
function estadoV1() {
  const d = freshData();
  delete d.presupuestos;
  delete d.turnos;
  delete d.gastos;
  d.version = 1;
  d.viajes[0].estado = "Finalizado";
  const cancelado = d.viajes.find((v) => v.estado === "cancelado");
  cancelado.motivoCancelacion = undefined;
  cancelado.observaciones = "Motivo anterior a la Etapa 3";
  const ausente = d.asistencias.find((a) => a.estado === "ausente");
  delete ausente.motivo;
  ausente.observaciones = "No respondió llamadas";
  d.pasajeros[0].observaciones = "Dato cargado por el usuario";
  return { d, canceladoId: cancelado.id, ausenteId: ausente.id };
}

describe("Migraciones de localStorage", () => {
  it("migra de v1 a v8 sin perder registros del usuario", () => {
    const { d, canceladoId, ausenteId } = estadoV1();
    const m = migrateData(structuredClone(d));
    assert.equal(m.version, 8);
    assert.equal(m.viajes.length, d.viajes.length);
    assert.equal(m.asistencias.length, d.asistencias.length);
    assert.equal(m.pasajeros[0].observaciones, "Dato cargado por el usuario");
    assert.equal(m.viajes[0].estado, "finalizado");
    const cancelado = m.viajes.find((v) => v.id === canceladoId);
    assert.equal(cancelado.motivoCancelacion, "Motivo anterior a la Etapa 3");
    assert.equal(m.asistencias.find((a) => a.id === ausenteId).motivo, "No respondió llamadas");
    assert.ok(m.presupuestos.length > 0 && m.turnos.length > 0);
    // Los gastos de ejemplo dependen del día real en que se migra: se verifica su integridad.
    const viajes = byId(m.viajes);
    assert.ok(Array.isArray(m.gastos) && m.gastos.every((g) => viajes[g.viajeId]?.estado === "finalizado"));
  });

  it("v6 → v7 agrega gastos sin modificar los viajes", () => {
    const d = freshData();
    delete d.gastos;
    d.version = 6;
    const antes = JSON.stringify(d.viajes);
    const m = migrateData(structuredClone(d));
    assert.equal(JSON.stringify(m.viajes), antes);
    assert.ok(Array.isArray(m.gastos));
  });

  it("v7 → v8 conserva presupuestos (sin duplicar) y solo corrige totales erróneos", () => {
    const d = freshData();
    d.version = 7;
    d.presupuestos = d.presupuestos.map(({ observaciones: _o, ...p }) => p);
    d.presupuestos.push({ id: "PRE-099", fecha: "2026-01-10", pasajeroId: "PAS-001", institucionId: "", kilometros: 10, tarifaKm: 300, total: 2999 });
    const m = migrateData(structuredClone(d));
    assert.equal(m.presupuestos.length, d.presupuestos.length);
    assert.ok(m.presupuestos.every((p) => p.observaciones === ""));
    assert.equal(m.presupuestos.at(-1).total, 3000);
    assert.deepEqual(m.presupuestos.slice(0, -1).map((p) => p.total), d.presupuestos.slice(0, -1).map((p) => p.total));
  });

  it("conserva colecciones que el usuario ya tenía", () => {
    const d = freshData();
    d.version = 6;
    d.gastos = [{ id: "GAS-0001", viajeId: d.viajes[0].id, fecha: d.viajes[0].fecha, categoria: "extras", monto: 100, descripcion: "Mío" }];
    assert.equal(migrateData(structuredClone(d)).gastos.length, 1);
  });

  it("descarta datos irreconocibles (se regeneran los de demostración)", () => {
    assert.equal(migrateData(null), null);
    assert.equal(migrateData({ version: 1 }), null);
    assert.equal(migrateData({ version: 99, viajes: [], pasajeros: [] }), null);
  });
});
