import { useCallback } from "react";
import useData from "./useData";
import { confirmAction, showInfo, showToast } from "../utils/alerts";
import { todayISO } from "../utils/dates";
import { escapeHtml } from "../utils/format";
import { fullName } from "../utils/selectors";
import { validateTurnoForm, turnoToForm } from "../utils/schedules";

/**
 * Desactivación y reactivación de turnos recurrentes. No se elimina ningún
 * dato: un turno desactivado deja de generar ocurrencias y viajes nuevos, pero
 * conserva su información y los viajes ya registrados no se modifican.
 */
export default function useTurnoActions() {
  const { data, updateItem } = useData();

  const deactivate = useCallback(
    async (turno) => {
      const pasajero = data.pasajeros.find((p) => p.id === turno.pasajeroId);
      const confirmed = await confirmAction({
        title: `¿Desactivar el turno ${turno.id}?`,
        text: `${fullName(pasajero)} dejará de tener este horario habitual en la agenda y no se podrán programar viajes desde él. Los viajes ya registrados se conservan sin cambios.`,
        confirmText: "Desactivar",
        icon: "warning",
      });
      if (!confirmed) return false;
      updateItem("turnos", turno.id, { activo: false, fechaBaja: todayISO() });
      showToast(`Turno ${turno.id} desactivado`);
      return true;
    },
    [data.pasajeros, updateItem],
  );

  const reactivate = useCallback(
    async (turno) => {
      // Al reactivar se vuelven a aplicar las validaciones (pasajero activo, duplicados).
      const errors = validateTurnoForm(turnoToForm(turno), { data, editingId: turno.id });
      const motivo = errors.pasajeroId ?? errors.duplicado ?? errors.institucionId;
      if (motivo) {
        showInfo({ title: "No se puede reactivar el turno", html: escapeHtml(motivo), icon: "warning" });
        return false;
      }
      const confirmed = await confirmAction({
        title: `¿Reactivar el turno ${turno.id}?`,
        text: "Volverá a mostrarse en la agenda semanal y podrán programarse viajes desde él.",
        confirmText: "Reactivar",
      });
      if (!confirmed) return false;
      updateItem("turnos", turno.id, { activo: true, fechaBaja: null });
      showToast(`Turno ${turno.id} reactivado`);
      return true;
    },
    [data, updateItem],
  );

  return { deactivate, reactivate };
}
