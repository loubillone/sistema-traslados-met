import { useCallback } from "react";
import Swal from "sweetalert2";
import useData from "./useData";
import { showToast } from "../utils/alerts";
import { formatDate } from "../utils/dates";
import { escapeHtml, formatAmount } from "../utils/format";
import { fullName } from "../utils/selectors";
import { budgetFileTitle } from "../utils/budgets";

const swalBase = { confirmButtonColor: "#1c398e", cancelButtonColor: "#6a7282", reverseButtons: true, customClass: { popup: "swal-app" } };

/**
 * Imprime la vista del presupuesto con el diálogo del navegador. El título del
 * documento se cambia mientras dura la impresión: es el nombre que el navegador
 * propone al elegir "Guardar como PDF".
 */
export function printBudget(presupuesto, pasajero) {
  const original = document.title;
  document.title = budgetFileTitle(presupuesto, pasajero);
  const restore = () => {
    document.title = original;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
  // Algunos navegadores no emiten "afterprint": se restaura igualmente.
  setTimeout(restore, 1000);
}

/** Acciones del módulo Presupuestos (CU-14). */
export default function useBudgetActions() {
  const { data, removeItem } = useData();

  /** Eliminación con confirmación: solo se quita el presupuesto (el pasajero y sus viajes no cambian). */
  const remove = useCallback(
    async (presupuesto) => {
      const pasajero = data.pasajeros.find((p) => p.id === presupuesto.pasajeroId);
      const result = await Swal.fire({
        ...swalBase,
        title: "¿Eliminar presupuesto?",
        html:
          `Se eliminará el presupuesto <b>${presupuesto.id}</b> de <b>${escapeHtml(fullName(pasajero))}</b> ` +
          `del ${formatDate(presupuesto.fecha)} por <b>${formatAmount(presupuesto.total)}</b>.<br/><br/>` +
          "Esta acción no se puede deshacer. Los demás presupuestos, el pasajero y sus viajes no se modifican.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#e7000b",
        focusCancel: true,
      });
      if (!result.isConfirmed) return false;
      removeItem("presupuestos", presupuesto.id);
      showToast("Presupuesto eliminado");
      return true;
    },
    [data.pasajeros, removeItem],
  );

  /** PDF mediante la impresión del navegador: se explica el paso antes de abrir el diálogo. */
  const savePdf = useCallback(async (presupuesto, pasajero) => {
    const result = await Swal.fire({
      ...swalBase,
      title: "Guardar como PDF",
      html:
        "Se abrirá el diálogo de impresión del navegador.<br/>En <b>Destino</b> elija <b>“Guardar como PDF”</b> y presione <b>Guardar</b>." +
        `<br/><br/><small>Nombre sugerido: ${escapeHtml(budgetFileTitle(presupuesto, pasajero))}.pdf</small>`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Continuar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    // Se espera a que SweetAlert cierre para que no aparezca en la impresión.
    setTimeout(() => printBudget(presupuesto, pasajero), 350);
  }, []);

  return { remove, savePdf, print: printBudget };
}
