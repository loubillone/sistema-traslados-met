// CU-13 (gastos por viaje) y CU-14 (presupuestos): importes, validaciones y filtros.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { byId, freshData, TODAY } from "../support/fixtures.mjs";
import { filterExpenses, parseMonto, summarizeByCategory, sumAmounts, validateExpenseForm } from "../../src/utils/expenses.js";
import {
  budgetToForm,
  calcularTotal,
  filterBudgets,
  formToBudgetFields,
  parseKilometros,
  parseTarifa,
  previewTotal,
  sumarImportes,
  validateBudgetForm,
} from "../../src/utils/budgets.js";
import { formatAmount } from "../../src/utils/format.js";

describe("Gastos: montos (CU-13)", () => {
  it("interpreta separadores argentinos", () => {
    assert.equal(parseMonto("15500").value, 15500);
    assert.equal(parseMonto("15.500").value, 15500);
    assert.equal(parseMonto("15.500,50").value, 15500.5);
    assert.equal(parseMonto("$ 1.234.567").value, 1234567);
  });

  it("rechaza vacíos, negativos, cero, texto y excesos", () => {
    for (const malo of ["", "-500", "0", "0,00", "abc", "1e5", "12,345", "10000001"]) {
      assert.ok(parseMonto(malo).error, `debería rechazar "${malo}"`);
    }
  });

  it("formatea con centavos solo cuando corresponde", () => {
    assert.equal(formatAmount(15500), "$15.500");
    assert.equal(formatAmount(15500.5), "$15.500,50");
  });
});

describe("Gastos: validación e integridad (CU-13)", () => {
  const formPara = (viaje) => ({ diaViaje: viaje.fecha, viajeId: viaje.id, fecha: viaje.fecha, categoria: "combustible", monto: "15.500", descripcion: "Carga" });

  it("acepta un gasto de un viaje finalizado", () => {
    const data = freshData();
    const fin = data.viajes.find((v) => v.estado === "finalizado");
    assert.deepEqual(validateExpenseForm(formPara(fin), { data, today: TODAY }), {});
  });

  it("solo admite viajes en curso o finalizados", () => {
    const data = freshData();
    for (const estado of ["programado", "cancelado"]) {
      const viaje = data.viajes.find((v) => v.estado === estado && v.fecha <= TODAY);
      assert.match(validateExpenseForm(formPara(viaje), { data, today: TODAY }).viajeId, /en curso o finalizados/);
    }
  });

  it("la fecha no puede ser futura ni anterior al viaje", () => {
    const data = freshData();
    const fin = data.viajes.find((v) => v.estado === "finalizado" && v.fecha < TODAY);
    assert.ok(validateExpenseForm({ ...formPara(fin), fecha: "2026-06-18" }, { data, today: TODAY }).fecha);
    assert.ok(validateExpenseForm({ ...formPara(fin), fecha: "2020-01-01" }, { data, today: TODAY }).fecha);
  });

  it("los gastos de la semilla apuntan a viajes finalizados y algunos viajes tienen varios", () => {
    const data = freshData();
    const viajes = byId(data.viajes);
    assert.ok(data.gastos.length > 0);
    assert.ok(data.gastos.every((g) => viajes[g.viajeId]?.estado === "finalizado" && g.fecha === viajes[g.viajeId].fecha));
    const porViaje = {};
    data.gastos.forEach((g) => (porViaje[g.viajeId] = (porViaje[g.viajeId] ?? 0) + 1));
    assert.ok(Object.values(porViaje).some((n) => n > 1));
  });

  it("filtros y totales por categoría son coherentes", () => {
    const data = freshData();
    const viajes = byId(data.viajes);
    const mes = filterExpenses(data.gastos, { mes: "2026-06", categoria: "", vehiculo: "" }, viajes);
    const resumen = summarizeByCategory(mes);
    const suma = Object.values(resumen).reduce((acc, c) => acc + c.total, 0);
    assert.equal(Math.round(suma * 100), Math.round(sumAmounts(mes) * 100));
    const veh = filterExpenses(data.gastos, { mes: "todos", categoria: "", vehiculo: "VEH-02" }, viajes);
    assert.ok(veh.every((g) => viajes[g.viajeId].vehiculoId === "VEH-02"));
  });
});

describe("Presupuestos: cálculo monetario (CU-14)", () => {
  it("TOTAL = KILÓMETROS × TARIFA (ejemplo 45 × 250)", () => {
    assert.equal(calcularTotal(45, 250), 11250);
  });

  it("opera en centavos enteros, sin errores de coma flotante", () => {
    assert.equal(calcularTotal(0.1, 3), 0.3);
    assert.equal(calcularTotal(1.15, 100), 115);
    assert.equal(calcularTotal(12.35, 1250.75), 15446.76);
    assert.equal(sumarImportes([{ total: 0.1 }, { total: 0.2 }]), 0.3);
  });

  it("interpreta kilómetros y tarifas con separadores argentinos", () => {
    assert.equal(parseKilometros("45,5").value, 45.5);
    assert.equal(parseTarifa("1.250,50").value, 1250.5);
    for (const malo of ["", "0", "-5", "abc", "Infinity", "1e3", "12,345"]) {
      assert.ok(parseKilometros(malo).error, `km "${malo}"`);
      assert.ok(parseTarifa(malo).error, `tarifa "${malo}"`);
    }
  });

  it("formulario, vista previa y registro usan el mismo total", () => {
    const form = { kilometros: "12,35", tarifaKm: "1.250,75" };
    const campos = formToBudgetFields({ ...form, fecha: TODAY, institucionId: "", observaciones: "" });
    assert.equal(previewTotal(form).total, campos.total);
    assert.equal(formToBudgetFields(budgetToForm({ ...campos, pasajeroId: "PAS-001" })).total, campos.total);
  });
});

describe("Presupuestos: validación e historial (CU-14)", () => {
  it("valida pasajero activo, fecha y campos numéricos", () => {
    const data = freshData();
    const activo = data.pasajeros.find((p) => p.activo);
    const inactivo = data.pasajeros.find((p) => !p.activo);
    const base = { pasajeroId: activo.id, institucionId: "", fecha: TODAY, kilometros: "45", tarifaKm: "250", observaciones: "" };
    assert.deepEqual(validateBudgetForm(base, { data, today: TODAY }), {});
    assert.ok(validateBudgetForm({ ...base, pasajeroId: inactivo.id }, { data, today: TODAY }).pasajeroId);
    assert.ok(validateBudgetForm({ ...base, fecha: "2026-06-18" }, { data, today: TODAY }).fecha);
    const vacio = validateBudgetForm({ ...base, pasajeroId: "", fecha: "", kilometros: "", tarifaKm: "" }, { data, today: TODAY });
    for (const campo of ["pasajeroId", "fecha", "kilometros", "tarifaKm"]) assert.ok(vacio[campo], campo);
  });

  it("en edición no permite cambiar el pasajero", () => {
    const data = freshData();
    const editing = data.presupuestos[0];
    const otro = data.pasajeros.find((p) => p.activo && p.id !== editing.pasajeroId);
    assert.ok(validateBudgetForm({ ...budgetToForm(editing), pasajeroId: otro.id }, { data, editing, today: TODAY }).pasajeroId);
  });

  it("los presupuestos de la semilla cumplen km × tarifa y se filtran por pasajero y período", () => {
    const { presupuestos } = freshData();
    assert.ok(presupuestos.every((p) => p.total === calcularTotal(p.kilometros, p.tarifaKm)));
    const pasajero = presupuestos[0].pasajeroId;
    assert.ok(filterBudgets(presupuestos, { pasajero, desde: "", hasta: "" }).every((p) => p.pasajeroId === pasajero));
    const periodo = filterBudgets(presupuestos, { pasajero: "", desde: "2026-06-01", hasta: TODAY });
    assert.ok(periodo.length > 0 && periodo.every((p) => p.fecha >= "2026-06-01" && p.fecha <= TODAY));
  });
});
