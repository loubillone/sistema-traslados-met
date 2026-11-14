// Cálculos derivados del estado global. Ningún indicador se guarda por separado:
// todo se calcula a partir de los datos, así los cambios se reflejan en todas
// las pantallas automáticamente.

import { DIAS_ALERTA_VENCIMIENTO } from "../constants/estados";
import { DIAS_VENCIMIENTO_CRITICO } from "../constants/recursos";
import { daysBetween, formatDate, lastMonths } from "./dates";

export const fullName = (persona) => (persona ? `${persona.nombre} ${persona.apellido}` : "—");

/** Convierte una lista en un objeto { id: registro } para búsquedas rápidas. */
export function buildIndex(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export function getDashboardStats(data, todayIso) {
  const pasajerosActivos = data.pasajeros.filter((p) => p.activo).length;

  const viajesHoy = data.viajes.filter((v) => v.fecha === todayIso);
  const finalizadosHoy = viajesHoy.filter((v) => v.estado === "finalizado").length;

  const choferesActivos = data.choferes.filter((c) => c.activo).length;
  const choferesEnViaje = new Set(viajesHoy.filter((v) => v.estado === "en_curso").map((v) => v.choferId)).size;

  // Vehículos de la flota: sin contar los dados de baja (Etapa 5A).
  const flota = data.vehiculos.filter((v) => v.activo !== false);
  const vehiculosActivos = flota.filter((v) => v.estado === "activo").length;

  const asistenciasHoy = data.asistencias.filter((a) => a.fecha === todayIso);
  const presentesHoy = asistenciasHoy.filter((a) => a.estado === "presente").length;
  const porcentajeAsistencia = asistenciasHoy.length
    ? Math.round((presentesHoy * 100) / asistenciasHoy.length)
    : null;

  return {
    pasajerosTotal: data.pasajeros.length,
    pasajerosActivos,
    viajesHoy: viajesHoy.length,
    finalizadosHoy,
    choferesActivos,
    choferesEnViaje,
    vehiculosTotal: flota.length,
    vehiculosActivos,
    asistenciasHoy: asistenciasHoy.length,
    presentesHoy,
    porcentajeAsistencia,
  };
}

/** Viajes realizados o programados por mes (sin cancelados), últimos 6 meses. */
export function getMonthlyTrips(viajes, reference = new Date()) {
  const months = lastMonths(6, reference);
  const counts = Object.fromEntries(months.map((m) => [m.key, 0]));
  viajes.forEach((viaje) => {
    const key = viaje.fecha.slice(0, 7);
    if (key in counts && viaje.estado !== "cancelado") counts[key] += 1;
  });
  return months.map((m) => ({ ...m, viajes: counts[m.key] }));
}

/** Asistencias por estado y por mes, últimos 6 meses. */
export function getMonthlyAttendance(asistencias, reference = new Date()) {
  const months = lastMonths(6, reference);
  const totals = Object.fromEntries(
    months.map((m) => [m.key, { presentes: 0, ausentes: 0, justificados: 0 }]),
  );
  const field = { presente: "presentes", ausente: "ausentes", justificado: "justificados" };
  asistencias.forEach((asistencia) => {
    const bucket = totals[asistencia.fecha.slice(0, 7)];
    if (bucket && field[asistencia.estado]) bucket[field[asistencia.estado]] += 1;
  });
  return months.map((m) => ({ ...m, ...totals[m.key] }));
}

/** Viajes de hoy ordenados por hora; si no hay, los últimos registrados. */
export function getRecentTrips(viajes, todayIso, fallbackLimit = 8) {
  const byDateTime = (a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`);
  const today = viajes.filter((v) => v.fecha === todayIso).sort(byDateTime);
  if (today.length > 0) return today;
  return viajes
    .filter((v) => v.fecha < todayIso)
    .sort((a, b) => byDateTime(b, a))
    .slice(0, fallbackLimit);
}

/** Alertas calculadas: vencimientos próximos y traslados pendientes del día. */
export function getNotifications(data, todayIso) {
  const notifications = [];

  const addExpiry = ({ id, fecha, vencido, proximo, detalle, path }) => {
    const dias = daysBetween(todayIso, fecha);
    if (dias > DIAS_ALERTA_VENCIMIENTO) return;
    notifications.push({
      id: `${id}-${fecha}`,
      level: dias < DIAS_VENCIMIENTO_CRITICO ? "danger" : "warning",
      title: dias < 0 ? vencido : proximo,
      detail: `${detalle} · ${dias < 0 ? "venció" : "vence"} el ${formatDate(fecha)}${dias >= 0 ? ` (${dias} días)` : ""}`,
      path,
      dias,
    });
  };

  data.choferes
    .filter((c) => c.activo)
    .forEach((chofer) =>
      addExpiry({
        id: `licencia-${chofer.id}`,
        fecha: chofer.vencimientoLicencia,
        vencido: "Licencia vencida",
        proximo: "Licencia próxima a vencer",
        detalle: fullName(chofer),
        path: `/choferes/${chofer.id}`,
      }),
    );

  data.vehiculos
    .filter((v) => v.activo !== false)
    .forEach((vehiculo) => {
      addExpiry({
        id: `vtv-${vehiculo.id}`,
        fecha: vehiculo.vencimientoVTV,
        vencido: "VTV vencida",
        proximo: "VTV próxima a vencer",
        detalle: `${vehiculo.tipo} ${vehiculo.patente}`,
        path: `/vehiculos/${vehiculo.id}`,
      });
      addExpiry({
        id: `seguro-${vehiculo.id}`,
        fecha: vehiculo.vencimientoSeguro,
        vencido: "Seguro vencido",
        proximo: "Seguro próximo a vencer",
        detalle: `${vehiculo.tipo} ${vehiculo.patente}`,
        path: `/vehiculos/${vehiculo.id}`,
      });
    });

  notifications.sort((a, b) => a.dias - b.dias);

  const pendientesHoy = data.viajes.filter((v) => v.fecha === todayIso && v.estado === "programado").length;
  if (pendientesHoy > 0) {
    notifications.unshift({
      id: `pendientes-${todayIso}`,
      level: "info",
      title: "Traslados pendientes hoy",
      detail: `${pendientesHoy} ${pendientesHoy === 1 ? "viaje programado" : "viajes programados"} para hoy`,
      path: `/viajes?desde=${todayIso}&hasta=${todayIso}&estado=programado`,
    });
  }

  return notifications;
}
