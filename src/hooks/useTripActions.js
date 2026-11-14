import { useCallback } from "react";
import Swal from "sweetalert2";
import useData from "./useData";
import { confirmAction, showInfo, showToast } from "../utils/alerts";
import { formatDate, nowStamp, todayISO } from "../utils/dates";
import { escapeHtml } from "../utils/format";
import { fullName } from "../utils/selectors";
import { appendTripEvent, checkTransition, getDriverIssue } from "../utils/trips";

const MOTIVO_MIN = 5;
const MOTIVO_MAX = 200;

const swalBase = {
  confirmButtonColor: "#1c398e",
  cancelButtonColor: "#6a7282",
  reverseButtons: true,
  customClass: { popup: "swal-app" },
};

/**
 * Acciones sobre un viaje: cambios de estado (CU-07 incluido) y reasignación de
 * chofer (CU-06). Toda modificación pasa por el DataProvider y queda en el
 * historial de cambios del viaje. Ninguna acción crea ni modifica asistencias.
 */
export default function useTripActions() {
  const { data, updateItem } = useData();

  const lookup = useCallback(
    (viaje) => ({
      pasajero: data.pasajeros.find((p) => p.id === viaje.pasajeroId),
      chofer: data.choferes.find((c) => c.id === viaje.choferId),
    }),
    [data.pasajeros, data.choferes],
  );

  const tripSummary = useCallback(
    (viaje) => {
      const { pasajero } = lookup(viaje);
      return `Viaje <b>${viaje.id}</b> · ${formatDate(viaje.fecha)} a las ${viaje.hora}<br/>Pasajero: <b>${escapeHtml(fullName(pasajero))}</b>`;
    },
    [lookup],
  );

  /** Informa el motivo si la transición no es válida. */
  const rejectTransition = useCallback(
    (viaje, destino) => {
      const reason = checkTransition(viaje, destino, { asistencias: data.asistencias, today: todayISO() });
      if (reason) showInfo({ title: "Acción no permitida", html: escapeHtml(reason), icon: "warning" });
      return Boolean(reason);
    },
    [data.asistencias],
  );

  /** Programado → En curso. */
  const start = useCallback(
    async (viaje) => {
      if (rejectTransition(viaje, "en_curso")) return false;
      const confirmed = await confirmAction({
        title: "¿Iniciar el viaje?",
        text: `El viaje ${viaje.id} pasará al estado En curso.`,
        confirmText: "Iniciar viaje",
      });
      if (!confirmed) return false;
      updateItem("viajes", viaje.id, {
        estado: "en_curso",
        eventos: appendTripEvent(viaje, { fecha: nowStamp(), tipo: "estado", detalle: "Estado: Programado → En curso" }),
      });
      showToast(`Viaje ${viaje.id} en curso`);
      return true;
    },
    [rejectTransition, updateItem],
  );

  /** En curso → Finalizado. */
  const finish = useCallback(
    async (viaje) => {
      if (rejectTransition(viaje, "finalizado")) return false;
      const confirmed = await confirmAction({
        title: "¿Finalizar el viaje?",
        text: `El viaje ${viaje.id} quedará registrado como Finalizado y ya no podrá modificarse.`,
        confirmText: "Finalizar viaje",
      });
      if (!confirmed) return false;
      updateItem("viajes", viaje.id, {
        estado: "finalizado",
        eventos: appendTripEvent(viaje, { fecha: nowStamp(), tipo: "estado", detalle: "Estado: En curso → Finalizado" }),
      });
      showToast(`Viaje ${viaje.id} finalizado`);
      return true;
    },
    [rejectTransition, updateItem],
  );

  /** CU-07: cancelación con motivo obligatorio. El registro del viaje se conserva. */
  const cancel = useCallback(
    async (viaje) => {
      if (rejectTransition(viaje, "cancelado")) return false;
      const result = await Swal.fire({
        ...swalBase,
        title: "¿Cancelar el viaje?",
        html: `${tripSummary(viaje)}<br/><br/>El traslado se conservará en el historial con estado <b>Cancelado</b>.`,
        icon: "warning",
        input: "textarea",
        inputLabel: "Motivo de la cancelación *",
        inputPlaceholder: "Ej.: La familia avisó que el pasajero no asistirá por un turno médico.",
        inputAttributes: { maxlength: String(MOTIVO_MAX), "aria-label": "Motivo de la cancelación" },
        showCancelButton: true,
        confirmButtonText: "Cancelar viaje",
        cancelButtonText: "Volver",
        confirmButtonColor: "#e7000b",
        inputValidator: (value) => {
          const motivo = value.trim();
          if (!motivo) return "Ingrese el motivo de la cancelación.";
          if (motivo.length < MOTIVO_MIN) return `Describa el motivo con al menos ${MOTIVO_MIN} caracteres.`;
          return undefined;
        },
      });
      if (!result.isConfirmed) return false;

      const motivo = result.value.trim().replace(/\s+/g, " ");
      updateItem("viajes", viaje.id, {
        estado: "cancelado",
        motivoCancelacion: motivo,
        fechaCancelacion: todayISO(),
        eventos: appendTripEvent(viaje, {
          fecha: nowStamp(),
          tipo: "cancelacion",
          detalle: `Viaje cancelado (estaba ${viaje.estado === "en_curso" ? "En curso" : "Programado"}). Motivo: ${motivo}`,
        }),
      });
      showToast(`Viaje ${viaje.id} cancelado`);
      return true;
    },
    [rejectTransition, tripSummary, updateItem],
  );

  /** CU-06: reasignación de chofer con validación de disponibilidad. */
  const reassignDriver = useCallback(
    async (viaje) => {
      if (viaje.estado !== "programado") {
        showInfo({
          title: "Acción no permitida",
          html: "Solo puede reasignarse el chofer de viajes en estado <b>Programado</b>.",
          icon: "warning",
        });
        return false;
      }

      const today = todayISO();
      const { chofer: actual } = lookup(viaje);
      const candidatos = data.choferes
        .filter((c) => c.id !== viaje.choferId && c.activo)
        .map((c) => ({
          chofer: c,
          issue: getDriverIssue(data, c.id, { fecha: viaje.fecha, hora: viaje.hora, excludeId: viaje.id, today }),
        }))
        .sort((a, b) => Number(Boolean(a.issue)) - Number(Boolean(b.issue)) || fullName(a.chofer).localeCompare(fullName(b.chofer), "es"));
      const disponibles = candidatos.filter((c) => !c.issue);

      if (disponibles.length === 0) {
        showInfo({
          title: "No hay choferes disponibles",
          html:
            `${tripSummary(viaje)}<br/><br/>Ningún otro chofer está disponible para esa fecha y hora:` +
            `<ul class="swal-list">${candidatos.map((c) => `<li>${escapeHtml(c.issue)}</li>`).join("")}</ul>` +
            "Se conserva la asignación actual.",
          icon: "warning",
        });
        return false;
      }

      const inputOptions = Object.fromEntries(
        candidatos.map(({ chofer, issue }) => [chofer.id, `${fullName(chofer)}${issue ? " — no disponible" : " — disponible"}`]),
      );

      const seleccion = await Swal.fire({
        ...swalBase,
        title: "Reasignar chofer",
        html:
          `${tripSummary(viaje)}<br/>Chofer actual: <b>${escapeHtml(fullName(actual))}</b>` +
          `<br/><br/>${disponibles.length} ${disponibles.length === 1 ? "chofer disponible" : "choferes disponibles"} para esa fecha y hora.`,
        input: "select",
        inputOptions,
        inputPlaceholder: "Seleccione el nuevo chofer",
        inputAttributes: { "aria-label": "Nuevo chofer" },
        showCancelButton: true,
        confirmButtonText: "Continuar",
        cancelButtonText: "Cancelar",
        inputValidator: (value) => {
          if (!value) return "Seleccione el nuevo chofer.";
          const candidato = candidatos.find((c) => c.chofer.id === value);
          if (!candidato) return "El chofer seleccionado no existe.";
          if (candidato.issue) return `No se puede reasignar: ${candidato.issue}`;
          return undefined;
        },
      });
      if (!seleccion.isConfirmed) return false;

      const nuevo = data.choferes.find((c) => c.id === seleccion.value);
      const confirmed = await confirmAction({
        title: "¿Confirmar la reasignación?",
        text: `Viaje ${viaje.id}: ${fullName(actual)} → ${fullName(nuevo)}.`,
        confirmText: "Reasignar",
      });
      if (!confirmed) return false;

      // Se vuelve a validar al confirmar, por si cambió la disponibilidad.
      const issue = getDriverIssue(data, nuevo.id, { fecha: viaje.fecha, hora: viaje.hora, excludeId: viaje.id, today });
      if (issue) {
        showInfo({ title: "No se pudo reasignar", html: escapeHtml(issue), icon: "error" });
        return false;
      }

      updateItem("viajes", viaje.id, {
        choferId: nuevo.id,
        eventos: appendTripEvent(viaje, {
          fecha: nowStamp(),
          tipo: "reasignacion",
          detalle: `Chofer reasignado: ${fullName(actual)} → ${fullName(nuevo)}`,
        }),
      });
      showToast(`Chofer reasignado a ${fullName(nuevo)}`);
      return true;
    },
    [data, lookup, tripSummary, updateItem],
  );

  return { start, finish, cancel, reassignDriver };
}
