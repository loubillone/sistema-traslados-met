import { useCallback } from "react";
import Swal from "sweetalert2";
import useData from "./useData";
import { showToast } from "../utils/alerts";
import { todayISO } from "../utils/dates";
import { escapeHtml } from "../utils/format";
import { fullName } from "../utils/selectors";
import { DISPONIBILIDAD_CHOFER, ESTADOS_VEHICULO } from "../constants/estados";
import { getAffectedDriverTrips, getAffectedVehicleTrips, tripLabel } from "../utils/resources";

const MAX_LISTADOS = 8;

const swalBase = {
  confirmButtonColor: "#1c398e",
  cancelButtonColor: "#6a7282",
  reverseButtons: true,
  customClass: { popup: "swal-app" },
};

/** HTML con el detalle de los viajes futuros afectados (se conservan sin cambios). */
export function affectedTripsHtml(viajes, pasajeros) {
  if (viajes.length === 0) return "";
  const nombres = Object.fromEntries(pasajeros.map((p) => [p.id, fullName(p)]));
  const items = viajes
    .slice(0, MAX_LISTADOS)
    .map((v) => `<li>${escapeHtml(tripLabel(v))} · ${escapeHtml(nombres[v.pasajeroId] ?? "—")}</li>`)
    .join("");
  const resto = viajes.length > MAX_LISTADOS ? `<li>y ${viajes.length - MAX_LISTADOS} más…</li>` : "";
  return (
    `<div class="swal-affected"><b>Atención: ${viajes.length} ${viajes.length === 1 ? "viaje futuro quedaría afectado" : "viajes futuros quedarían afectados"}.</b>` +
    `<ul class="swal-list">${items}${resto}</ul>` +
    "Los viajes se conservan sin cambios: reasigne el chofer o el vehículo desde Gestión de Viajes.</div>"
  );
}

/**
 * Cambios de disponibilidad, estado y baja de choferes y vehículos.
 * Nunca modifica viajes: si hay viajes futuros afectados, se informan con su
 * detalle y el operador decide si confirma el cambio.
 */
export default function useResourceActions() {
  const { data, updateItem } = useData();

  const confirm = useCallback(
    async ({ title, text, affected, confirmText, danger = false }) => {
      const result = await Swal.fire({
        ...swalBase,
        title,
        html: `${escapeHtml(text)}${affected.length ? `<br/><br/>${affectedTripsHtml(affected, data.pasajeros)}` : ""}`,
        icon: affected.length || danger ? "warning" : "question",
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: "Cancelar",
        confirmButtonColor: danger ? "#e7000b" : swalBase.confirmButtonColor,
      });
      return result.isConfirmed;
    },
    [data.pasajeros],
  );

  /** Cambia la disponibilidad del chofer (Disponible, De guardia o No disponible). */
  const setDriverAvailability = useCallback(
    async (chofer, disponibilidad) => {
      if (chofer.disponibilidad === disponibilidad) return false;
      const affected = getAffectedDriverTrips(data.viajes, { ...chofer, disponibilidad }, todayISO());
      const label = DISPONIBILIDAD_CHOFER[disponibilidad].label;
      const ok = await confirm({
        title: `¿Marcar a ${fullName(chofer)} como ${label}?`,
        text:
          disponibilidad === "no_disponible"
            ? "No podrá asignarse a viajes nuevos ni a reasignaciones mientras siga No disponible."
            : "Podrá asignarse a viajes nuevos.",
        affected,
        confirmText: affected.length ? "Cambiar igualmente" : "Confirmar",
      });
      if (!ok) return false;
      updateItem("choferes", chofer.id, { disponibilidad });
      showToast(`${fullName(chofer)}: ${label}`);
      return true;
    },
    [data.viajes, confirm, updateItem],
  );

  const deactivateDriver = useCallback(
    async (chofer) => {
      const affected = getAffectedDriverTrips(data.viajes, { ...chofer, activo: false }, todayISO());
      const ok = await confirm({
        title: `¿Desactivar a ${fullName(chofer)}?`,
        text: "No podrá asignarse a viajes nuevos. Su historial de viajes se conserva y puede reactivarse en cualquier momento.",
        affected,
        confirmText: "Desactivar",
        danger: true,
      });
      if (!ok) return false;
      updateItem("choferes", chofer.id, { activo: false, fechaBaja: todayISO() });
      showToast(`${fullName(chofer)} fue desactivado`);
      return true;
    },
    [data.viajes, confirm, updateItem],
  );

  const reactivateDriver = useCallback(
    async (chofer) => {
      const ok = await confirm({
        title: `¿Reactivar a ${fullName(chofer)}?`,
        text: "Volverá a estar disponible para asignarse a viajes, según su disponibilidad y licencia.",
        affected: [],
        confirmText: "Reactivar",
      });
      if (!ok) return false;
      updateItem("choferes", chofer.id, { activo: true, fechaBaja: null });
      showToast(`${fullName(chofer)} fue reactivado`);
      return true;
    },
    [confirm, updateItem],
  );

  /** Cambia el estado del vehículo: Activo o En mantenimiento. */
  const setVehicleStatus = useCallback(
    async (vehiculo, estado) => {
      if (vehiculo.estado === estado) return false;
      const affected = getAffectedVehicleTrips(data.viajes, { ...vehiculo, estado }, todayISO());
      const ok = await confirm({
        title: `¿Cambiar ${vehiculo.patente} a ${ESTADOS_VEHICULO[estado].label}?`,
        text:
          estado === "mantenimiento"
            ? "Mientras esté en mantenimiento no podrá asignarse a viajes nuevos."
            : "Volverá a estar disponible para viajes, si su VTV y seguro están vigentes.",
        affected,
        confirmText: affected.length ? "Cambiar igualmente" : "Confirmar",
      });
      if (!ok) return false;
      updateItem("vehiculos", vehiculo.id, { estado });
      showToast(`${vehiculo.patente}: ${ESTADOS_VEHICULO[estado].label}`);
      return true;
    },
    [data.viajes, confirm, updateItem],
  );

  const deactivateVehicle = useCallback(
    async (vehiculo) => {
      const affected = getAffectedVehicleTrips(data.viajes, { ...vehiculo, activo: false }, todayISO());
      const ok = await confirm({
        title: `¿Dar de baja el vehículo ${vehiculo.patente}?`,
        text: "No podrá asignarse a viajes nuevos. Sus viajes históricos se conservan y puede reactivarse en cualquier momento.",
        affected,
        confirmText: "Dar de baja",
        danger: true,
      });
      if (!ok) return false;
      updateItem("vehiculos", vehiculo.id, { activo: false, fechaBaja: todayISO() });
      showToast(`${vehiculo.patente} fue dado de baja`);
      return true;
    },
    [data.viajes, confirm, updateItem],
  );

  const reactivateVehicle = useCallback(
    async (vehiculo) => {
      const ok = await confirm({
        title: `¿Reactivar el vehículo ${vehiculo.patente}?`,
        text: "Volverá a la flota con su estado actual.",
        affected: [],
        confirmText: "Reactivar",
      });
      if (!ok) return false;
      updateItem("vehiculos", vehiculo.id, { activo: true, fechaBaja: null });
      showToast(`${vehiculo.patente} fue reactivado`);
      return true;
    },
    [confirm, updateItem],
  );

  return { setDriverAvailability, deactivateDriver, reactivateDriver, setVehicleStatus, deactivateVehicle, reactivateVehicle };
}
