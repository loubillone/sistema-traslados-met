import { useCallback } from "react";
import Swal from "sweetalert2";
import useData from "./useData";
import { showToast } from "../utils/alerts";
import { formatDate } from "../utils/dates";
import { escapeHtml, formatAmount } from "../utils/format";
import { categoriaLabel } from "../utils/expenses";

/**
 * Eliminación de gastos con confirmación (CU-13). Solo se quita el gasto: el
 * viaje asociado y los demás gastos no se modifican.
 */
export default function useExpenseActions() {
  const { removeItem } = useData();

  const remove = useCallback(
    async (gasto) => {
      const result = await Swal.fire({
        title: "¿Eliminar gasto?",
        html:
          `Se eliminará el gasto <b>${gasto.id}</b> de <b>${escapeHtml(categoriaLabel(gasto.categoria))}</b> ` +
          `por <b>${formatAmount(gasto.monto)}</b> del ${formatDate(gasto.fecha)} ` +
          `(viaje ${escapeHtml(gasto.viajeId)}).<br/><br/>Esta acción no se puede deshacer. El viaje no se modifica.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#e7000b",
        cancelButtonColor: "#6a7282",
        reverseButtons: true,
        focusCancel: true,
        customClass: { popup: "swal-app" },
      });
      if (!result.isConfirmed) return false;
      removeItem("gastos", gasto.id);
      showToast("Gasto eliminado");
      return true;
    },
    [removeItem],
  );

  return { remove };
}
