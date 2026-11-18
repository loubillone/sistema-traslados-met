// CU-04 a CU-10: viajes, disponibilidad, estados, turnos recurrentes y asistencias.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshData, TODAY } from "../support/fixtures.mjs";
import {
  checkTransition,
  EMPTY_TRIP_FORM,
  getDriverIssue,
  getEditBlockReason,
  getVehicleIssue,
  validateTripForm,
} from "../../src/utils/trips.js";
import { checkTurnoTrip, findOccurrenceTrip, validateTurnoForm } from "../../src/utils/schedules.js";
import { getAttendanceStatus, getRegistrationBlock, validateAttendanceForm } from "../../src/utils/attendance.js";

const MANANA = "2026-06-18"; // jueves

/** Formulario de viaje válido para mañana con recursos libres. */
function viajeValido(data) {
  const pasajero = data.pasajeros.find((p) => p.activo);
  return {
    ...EMPTY_TRIP_FORM,
    pasajeroId: pasajero.id,
    fecha: MANANA,
    hora: "21:45",
    choferId: "CHO-01",
    vehiculoId: "VEH-02",
    origen: pasajero.domicilio,
    institucionId: pasajero.institucionId,
    tipo: "ida",
  };
}

describe("Registrar viaje (CU-04)", () => {
  it("acepta un viaje con pasajero, chofer y vehículo disponibles", () => {
    const data = freshData();
    assert.deepEqual(validateTripForm(viajeValido(data), { data, today: TODAY, now: "10:00" }), {});
  });

  it("rechaza fechas pasadas y horas ya transcurridas de hoy", () => {
    const data = freshData();
    assert.ok(validateTripForm({ ...viajeValido(data), fecha: "2026-06-16" }, { data, today: TODAY, now: "10:00" }).fecha);
    assert.ok(validateTripForm({ ...viajeValido(data), fecha: TODAY, hora: "09:00" }, { data, today: TODAY, now: "10:00" }).hora);
  });

  it("detecta conflictos de chofer, vehículo y pasajero a la misma fecha y hora", () => {
    const data = freshData();
    const ocupado = data.viajes.find((v) => v.fecha > TODAY && v.estado === "programado");
    const form = { ...viajeValido(data), fecha: ocupado.fecha, hora: ocupado.hora, choferId: ocupado.choferId, vehiculoId: ocupado.vehiculoId };
    const errors = validateTripForm(form, { data, today: TODAY, now: "10:00" });
    assert.match(errors.choferId, /ya tiene asignado/);
    assert.match(errors.vehiculoId, /ya tiene asignado/);
    const mismoPasajero = validateTripForm({ ...viajeValido(data), pasajeroId: ocupado.pasajeroId, fecha: ocupado.fecha, hora: ocupado.hora }, { data, today: TODAY, now: "10:00" });
    assert.match(mismoPasajero.hora, /El pasajero ya tiene/);
  });

  it("un viaje cancelado libera al chofer y al vehículo", () => {
    const data = freshData();
    const ocupado = data.viajes.find((v) => v.fecha > TODAY && v.estado === "programado");
    ocupado.estado = "cancelado";
    const horario = { fecha: ocupado.fecha, hora: ocupado.hora, today: TODAY };
    assert.equal(getDriverIssue(data, ocupado.choferId, horario), null);
    assert.equal(getVehicleIssue(data, ocupado.vehiculoId, horario), null);
  });

  it("valida la dirección según el sentido: origen en la ida, destino en la vuelta", () => {
    const data = freshData();
    const base = viajeValido(data);
    assert.ok(validateTripForm({ ...base, origen: "" }, { data, today: TODAY, now: "10:00" }).origen);
    const vuelta = validateTripForm({ ...base, tipo: "vuelta", origen: "", destino: "" }, { data, today: TODAY, now: "10:00" });
    assert.ok(vuelta.destino);
    assert.equal(vuelta.origen, undefined);
  });
});

describe("Disponibilidad y documentación (CU-06, CU-11, CU-12)", () => {
  it("rechaza choferes inactivos, no disponibles o con licencia vencida a la fecha del viaje", () => {
    const data = freshData();
    const horario = { fecha: MANANA, hora: "21:45", today: TODAY };
    const chofer = data.choferes[0];
    chofer.disponibilidad = "no_disponible";
    assert.match(getDriverIssue(data, chofer.id, horario), /No disponible/);
    chofer.disponibilidad = "disponible";
    chofer.vencimientoLicencia = TODAY;
    assert.match(getDriverIssue(data, chofer.id, horario), /vence/);
    chofer.activo = false;
    assert.match(getDriverIssue(data, chofer.id, horario), /dado de baja/);
  });

  it("rechaza vehículos en mantenimiento o con VTV/seguro vencidos", () => {
    const data = freshData();
    const horario = { fecha: MANANA, hora: "21:45", today: TODAY };
    assert.match(getVehicleIssue(data, "VEH-04", horario), /mantenimiento/);
    const vehiculo = data.vehiculos.find((v) => v.id === "VEH-02");
    vehiculo.vencimientoSeguro = "2026-06-01";
    assert.match(getVehicleIssue(data, vehiculo.id, horario), /Documentación vencida/);
  });
});

describe("Estados del viaje (CU-05 / CU-07)", () => {
  it("solo se inicia el día del viaje y solo se finaliza un viaje en curso", () => {
    const data = freshData();
    const futuro = data.viajes.find((v) => v.fecha > TODAY && v.estado === "programado");
    const opts = { asistencias: data.asistencias, today: TODAY };
    assert.match(checkTransition(futuro, "en_curso", opts), /solo puede iniciarse ese día/);
    assert.match(checkTransition(futuro, "finalizado", opts), /Primero inicie el viaje/);
    assert.equal(checkTransition(futuro, "cancelado", opts), null);
  });

  it("finalizados y cancelados no cambian de estado ni se editan", () => {
    const data = freshData();
    const fin = data.viajes.find((v) => v.estado === "finalizado");
    const canc = data.viajes.find((v) => v.estado === "cancelado");
    const opts = { asistencias: data.asistencias, today: TODAY };
    assert.ok(checkTransition(fin, "cancelado", opts));
    assert.ok(checkTransition(canc, "en_curso", opts));
    assert.ok(getEditBlockReason(fin, data.asistencias));
    assert.ok(getEditBlockReason(canc, data.asistencias));
  });

  it("no se cancela un viaje con asistencia Presente registrada", () => {
    const data = freshData();
    const enCurso = data.viajes.find((v) => v.estado === "en_curso");
    assert.ok(enCurso, "la semilla incluye viajes en curso hoy");
    const conPresente = data.asistencias.some((a) => a.viajeId === enCurso.id && a.estado === "presente");
    assert.ok(conPresente);
    assert.match(checkTransition(enCurso, "cancelado", { asistencias: data.asistencias, today: TODAY }), /Presente/);
  });
});

describe("Turnos recurrentes (CU-10)", () => {
  const turnoForm = (pasajeroId, institucionId) => ({
    pasajeroId,
    institucionId,
    dias: [3],
    tipo: "ida_vuelta",
    horaIda: "22:00",
    horaVuelta: "23:00",
    observaciones: "",
  });

  it("acepta un turno nuevo y exige el regreso posterior a la ida", () => {
    const data = freshData();
    const p = data.pasajeros.find((x) => x.activo);
    assert.deepEqual(validateTurnoForm(turnoForm(p.id, p.institucionId), { data }), {});
    assert.ok(validateTurnoForm({ ...turnoForm(p.id, p.institucionId), horaVuelta: "21:00" }, { data }).horaVuelta);
  });

  it("rechaza turnos duplicados o superpuestos del mismo pasajero", () => {
    const data = freshData();
    const existente = data.turnos.find((t) => t.activo && t.tipo === "ida_vuelta" && t.horaVuelta);
    const form = {
      pasajeroId: existente.pasajeroId,
      institucionId: existente.institucionId,
      dias: [existente.dias[0]],
      tipo: existente.tipo,
      horaIda: existente.horaIda,
      horaVuelta: existente.horaVuelta,
      observaciones: "",
    };
    assert.match(validateTurnoForm(form, { data }).duplicado, /Ya existe el turno/);
    assert.match(validateTurnoForm({ ...form, horaVuelta: "23:50" }, { data }).duplicado, /Se superpone/);
  });

  it("al programar desde el turno valida el día configurado y detecta el viaje ya existente", () => {
    const data = freshData();
    // Turno de los miércoles que NO incluye el jueves (MANANA).
    const turno = data.turnos.find((t) => t.activo && t.dias.includes(3) && !t.dias.includes(4) && t.tipo === "ida");
    assert.ok(turno, "la semilla tiene un turno de ida los miércoles sin jueves");
    assert.match(checkTurnoTrip(data, turno, { fecha: MANANA, tramo: "ida" }, TODAY).error, /el turno es los días/);
    assert.match(checkTurnoTrip(data, turno, { fecha: "2026-06-10", tramo: "ida" }, TODAY).error, /fechas pasadas/);
    const proximoMiercoles = "2026-06-24";
    const result = checkTurnoTrip(data, turno, { fecha: proximoMiercoles, tramo: "ida" }, TODAY);
    assert.equal(result.error, undefined);
    assert.ok(result.viajeExistente, "la semilla ya tiene ese viaje: no debe duplicarse");
  });

  it("un viaje cancelado no cubre la ocurrencia del turno", () => {
    const data = freshData();
    const turno = data.turnos.find((t) => t.activo && t.tipo === "ida" && t.dias.includes(3));
    const viaje = findOccurrenceTrip(data.viajes, turno, "2026-06-24", "ida", turno.horaIda);
    viaje.estado = "cancelado";
    assert.equal(findOccurrenceTrip(data.viajes, turno, "2026-06-24", "ida", turno.horaIda), null);
  });
});

describe("Asistencias (CU-08 / CU-09)", () => {
  it("una sola asistencia por viaje en la semilla", () => {
    const { asistencias } = freshData();
    const ids = asistencias.map((a) => a.viajeId);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("no se registran asistencias de viajes futuros ni cancelados", () => {
    const data = freshData();
    const futuro = data.viajes.find((v) => v.fecha > TODAY);
    const cancelado = data.viajes.find((v) => v.estado === "cancelado");
    assert.match(getRegistrationBlock(futuro, TODAY), /viajes futuros/);
    assert.match(getRegistrationBlock(cancelado, TODAY), /cancelado/);
    assert.equal(getRegistrationBlock(data.viajes.find((v) => v.estado === "finalizado"), TODAY), null);
  });

  it("Ausente exige motivo y un viaje cancelado no puede quedar Presente", () => {
    const vacio = { estado: "ausente", motivo: "", observaciones: "" };
    assert.ok(validateAttendanceForm(vacio, { viaje: { estado: "finalizado" } }).motivo);
    assert.ok(validateAttendanceForm({ ...vacio, estado: "presente" }, { viaje: { estado: "cancelado" } }).estado);
    assert.deepEqual(validateAttendanceForm({ ...vacio, estado: "justificado" }, { viaje: { estado: "finalizado" } }), {});
  });

  it("'Sin registrar' no equivale a 'Ausente'", () => {
    assert.equal(getAttendanceStatus({ fecha: TODAY, estado: "finalizado" }, null, TODAY), "sin_registrar");
    assert.equal(getAttendanceStatus({ fecha: MANANA, estado: "programado" }, null, TODAY), "futuro");
    assert.equal(getAttendanceStatus({ fecha: TODAY, estado: "cancelado" }, null, TODAY), "no_corresponde");
  });
});
