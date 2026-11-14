import { useCallback } from "react";
import Swal from "sweetalert2";
import useData from "./useData";
import { confirmAction, showToast } from "../utils/alerts";
import { fullName } from "../utils/selectors";
import { todayISO } from "../utils/dates";

const CANCEL_NOTE = "Cancelado por desactivación del pasajero";

/**
 * Desactivación y reactivación de pasajeros.
 * Desactivar NO elimina registros: el historial de viajes, asistencias y
 * presupuestos se conserva. Solo se cancelan los viajes futuros aún programados,
 * para que no queden traslados pendientes de un pasajero dado de baja.
 */
export default function usePassengerActions() {
  const { data, updateItem, updateMany } = useData();

  const deactivate = useCallback(
    async (pasajero) => {
      const today = todayISO();
      const pendientes = data.viajes.filter(
        (v) => v.pasajeroId === pasajero.id && v.fecha >= today && v.estado === "programado",
      );

      const result = await Swal.fire({
        title: `¿Desactivar a ${fullName(pasajero)}?`,
        html:
          "El pasajero no podrá seleccionarse para nuevos viajes.<br/>" +
          "Su historial de viajes, asistencias y presupuestos <b>se conserva</b> y podrá reactivarse en cualquier momento." +
          (pendientes.length
            ? `<br/><br/>Tiene <b>${pendientes.length} ${pendientes.length === 1 ? "viaje programado" : "viajes programados"}</b> desde hoy en adelante, que se marcarán como cancelados.`
            : ""),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Desactivar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#e7000b",
        cancelButtonColor: "#6a7282",
        reverseButtons: true,
        customClass: { popup: "swal-app" },
      });
      if (!result.isConfirmed) return false;

      updateItem("pasajeros", pasajero.id, { activo: false, fechaBaja: today });
      if (pendientes.length) {
        updateMany(
          "viajes",
          pendientes.map((v) => v.id),
          { estado: "cancelado", observaciones: CANCEL_NOTE },
        );
      }
      showToast(`${fullName(pasajero)} fue desactivado`);
      return true;
    },
    [data.viajes, updateItem, updateMany],
  );

  const reactivate = useCallback(
    async (pasajero) => {
      const confirmed = await confirmAction({
        title: `¿Reactivar a ${fullName(pasajero)}?`,
        text: "El pasajero volverá a estar disponible para programar viajes. Los viajes cancelados por la desactivación no se restauran automáticamente.",
        confirmText: "Reactivar",
      });
      if (!confirmed) return false;
      updateItem("pasajeros", pasajero.id, { activo: true, fechaBaja: null });
      showToast(`${fullName(pasajero)} fue reactivado`);
      return true;
    },
    [updateItem],
  );

  return { deactivate, reactivate };
}
