import { useCallback, useState } from "react";
import Swal from "sweetalert2";
import AttendanceDialog from "../components/asistencias/AttendanceDialog";
import useData from "./useData";
import { showInfo } from "../utils/alerts";
import { nowStamp, todayISO } from "../utils/dates";
import { escapeHtml } from "../utils/format";
import { fullName } from "../utils/selectors";
import { ESTADOS_ASISTENCIA } from "../constants/estados";
import { formToAttendanceFields, getRegistrationBlock, validateAttendanceForm } from "../utils/attendance";

/**
 * Registro y edición de asistencias desde cualquier pantalla (planilla,
 * calendario o detalle del viaje). Devuelve la función para abrir el diálogo
 * y el elemento a renderizar. Todo se guarda en el DataProvider.
 */
export default function useAttendanceDialog() {
  const { data, addItem, updateItem } = useData();
  const [target, setTarget] = useState(null); // { viajeId, notice }

  const findAttendance = useCallback(
    (viajeId) => data.asistencias.find((a) => a.viajeId === viajeId) ?? null,
    [data.asistencias],
  );

  /**
   * Abre el diálogo. Si se pidió registrar y el viaje ya tiene asistencia, no se
   * crea otra: se abre la existente para editarla y se avisa al operador.
   */
  const open = useCallback(
    (viajeId, { intent = "editar" } = {}) => {
      const viaje = data.viajes.find((v) => v.id === viajeId);
      const existente = findAttendance(viajeId);
      if (!existente) {
        const block = getRegistrationBlock(viaje, todayISO());
        if (block) {
          showInfo({ title: "No se puede registrar la asistencia", html: escapeHtml(block), icon: "warning" });
          return;
        }
      }
      setTarget({
        viajeId,
        notice:
          existente && intent === "registrar"
            ? `Este viaje ya tiene una asistencia registrada (${existente.id}). Puede editarla; no se creará un registro duplicado.`
            : null,
      });
    },
    [data.viajes, findAttendance],
  );

  const close = useCallback(() => setTarget(null), []);

  const save = (form) => {
    const viaje = data.viajes.find((v) => v.id === target.viajeId);
    const existente = findAttendance(target.viajeId);
    const errors = validateAttendanceForm(form, { viaje });
    if (Object.keys(errors).length > 0) return;
    const fields = formToAttendanceFields(form);
    const pasajero = data.pasajeros.find((p) => p.id === viaje.pasajeroId);
    const estadoLabel = ESTADOS_ASISTENCIA[fields.estado].label;

    if (existente) {
      // Edición: mismo identificador, mismo viaje y mismo pasajero.
      updateItem("asistencias", existente.id, { ...fields, modificadaEl: nowStamp() });
    } else {
      const block = getRegistrationBlock(viaje, todayISO());
      if (block) {
        setTarget(null);
        showInfo({ title: "No se puede registrar la asistencia", html: escapeHtml(block), icon: "warning" });
        return;
      }
      addItem("asistencias", {
        fecha: viaje.fecha,
        pasajeroId: viaje.pasajeroId,
        viajeId: viaje.id,
        ...fields,
        registradaEl: nowStamp(),
      });
    }

    setTarget(null);
    Swal.fire({
      icon: "success",
      title: existente ? "Asistencia actualizada" : "Asistencia registrada",
      html: `<b>${escapeHtml(fullName(pasajero))}</b> · viaje ${viaje.id} del ${viaje.fecha.split("-").reverse().join("/")}<br/>Estado: <b>${estadoLabel}</b>${
        fields.motivo ? `<br/>${fields.estado === "ausente" ? "Motivo" : "Justificación"}: ${escapeHtml(fields.motivo)}` : ""
      }`,
      confirmButtonText: "Aceptar",
      confirmButtonColor: "#1c398e",
      customClass: { popup: "swal-app" },
    });
  };

  let dialog = null;
  if (target) {
    const viaje = data.viajes.find((v) => v.id === target.viajeId);
    if (viaje) {
      const asistencia = findAttendance(viaje.id);
      dialog = (
        <AttendanceDialog
          key={`${viaje.id}-${asistencia?.id ?? "nueva"}`}
          viaje={viaje}
          asistencia={asistencia}
          pasajero={data.pasajeros.find((p) => p.id === viaje.pasajeroId)}
          institucion={data.instituciones.find((i) => i.id === viaje.institucionId)}
          notice={target.notice}
          onSave={save}
          onClose={close}
        />
      );
    }
  }

  return { open, dialog };
}
