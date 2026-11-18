// CU-01/02/03 (pasajeros) y CU-11/12 (choferes y vehículos): DNI, duplicados y documentación.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshData, TODAY } from "../support/fixtures.mjs";
import { normalizeDni, validateDni, validatePassengerForm } from "../../src/utils/validation.js";
import { analyzePassengerQuery } from "../../src/utils/passengers.js";
import { normalizePlate, validateDriverForm, validateVehicleForm } from "../../src/utils/resources.js";
import { EMPTY_PASSENGER_FORM } from "../../src/constants/pasajeros.js";
import { EMPTY_DRIVER_FORM, EMPTY_VEHICLE_FORM } from "../../src/constants/recursos.js";

describe("Pasajeros: DNI", () => {
  it("normaliza puntos y espacios", () => {
    assert.equal(normalizeDni("12.345.678"), "12345678");
    assert.equal(normalizeDni(" 8 765 432 "), "8765432");
  });

  it("acepta 7 u 8 dígitos y rechaza el resto", () => {
    assert.equal(validateDni("12345678"), null);
    assert.equal(validateDni("8765432"), null);
    for (const malo of ["", "123456", "123456789", "12a45678", "00000000"]) {
      assert.ok(validateDni(malo), `debería rechazar "${malo}"`);
    }
  });

  it("CU-01: distingue búsqueda por DNI y por nombre", () => {
    assert.equal(analyzePassengerQuery("12345678").mode, "dni");
    assert.equal(analyzePassengerQuery("González").mode, "nombre");
  });
});

describe("Pasajeros: alta y edición (CU-02 / CU-03)", () => {
  const valido = {
    ...EMPTY_PASSENGER_FORM,
    dni: "40111222",
    nombre: "Lucía",
    apellido: "Prueba",
    domicilio: "Av. Siempre Viva 742",
    telefono: "381-555-0000",
  };

  it("acepta un pasajero nuevo con datos completos", () => {
    const { pasajeros } = freshData();
    assert.deepEqual(validatePassengerForm(valido, { pasajeros }), {});
  });

  it("rechaza un DNI ya registrado, también si el pasajero está inactivo", () => {
    const { pasajeros } = freshData();
    const activo = pasajeros.find((p) => p.activo);
    const inactivo = pasajeros.find((p) => !p.activo);
    assert.match(validatePassengerForm({ ...valido, dni: activo.dni }, { pasajeros }).dni, /Ya existe un pasajero/);
    assert.match(validatePassengerForm({ ...valido, dni: inactivo.dni }, { pasajeros }).dni, /inactivo/);
  });

  it("en edición no vuelve a validar el DNI contra sí mismo", () => {
    const { pasajeros } = freshData();
    const p = pasajeros[0];
    const errors = validatePassengerForm({ ...valido, dni: p.dni }, { pasajeros, editingId: p.id });
    assert.equal(errors.dni, undefined);
  });

  it("exige nombre, apellido, domicilio y teléfono", () => {
    const errors = validatePassengerForm({ ...EMPTY_PASSENGER_FORM }, { pasajeros: [] });
    for (const campo of ["dni", "nombre", "apellido", "domicilio", "telefono"]) assert.ok(errors[campo], campo);
  });
});

describe("Choferes (CU-11)", () => {
  const valido = {
    ...EMPTY_DRIVER_FORM,
    dni: "30111222",
    nombre: "Raúl",
    apellido: "Prueba",
    telefono: "381-444-1111",
    licencia: "B-99887766",
    categoriaLicencia: "D1",
    vencimientoLicencia: "2027-06-17",
  };

  it("acepta un chofer nuevo válido", () => {
    const { choferes } = freshData();
    assert.deepEqual(validateDriverForm(valido, { choferes, today: TODAY }), {});
  });

  it("rechaza DNI y licencia duplicados", () => {
    const { choferes } = freshData();
    const otro = choferes[0];
    const errors = validateDriverForm({ ...valido, dni: otro.dni, licencia: otro.licencia.toLowerCase() }, { choferes, today: TODAY });
    assert.match(errors.dni, /Ya existe un chofer/);
    assert.match(errors.licencia, /ya está registrada/);
  });

  it("no admite una licencia vencida en el alta", () => {
    const { choferes } = freshData();
    assert.ok(validateDriverForm({ ...valido, vencimientoLicencia: "2026-01-01" }, { choferes, today: TODAY }).vencimientoLicencia);
  });
});

describe("Vehículos (CU-12)", () => {
  const valido = {
    ...EMPTY_VEHICLE_FORM,
    patente: "ZZ-999-ZZ",
    tipo: "Combi",
    capacidad: "10",
    vencimientoVTV: "2027-01-01",
    aseguradora: "Aseguradora Demo",
    poliza: "POL-1234",
    vencimientoSeguro: "2027-01-01",
  };

  it("normaliza los formatos de patente", () => {
    assert.equal(normalizePlate("ab123cd"), "AB-123-CD");
    assert.equal(normalizePlate("abc 123"), "ABC-123");
  });

  it("acepta un vehículo nuevo válido", () => {
    const { vehiculos } = freshData();
    assert.deepEqual(validateVehicleForm(valido, { vehiculos, today: TODAY }), {});
  });

  it("rechaza una patente duplicada aunque se escriba distinto", () => {
    const { vehiculos } = freshData();
    const errors = validateVehicleForm({ ...valido, patente: "ab 123 cd" }, { vehiculos, today: TODAY });
    assert.match(errors.patente, /ya está registrada/);
  });

  it("rechaza VTV o seguro vencidos y capacidades inválidas en el alta", () => {
    const { vehiculos } = freshData();
    const errors = validateVehicleForm(
      { ...valido, vencimientoVTV: "2026-01-01", vencimientoSeguro: "2026-06-16", capacidad: "0" },
      { vehiculos, today: TODAY },
    );
    assert.ok(errors.vencimientoVTV);
    assert.ok(errors.vencimientoSeguro);
    assert.ok(errors.capacidad);
  });
});
