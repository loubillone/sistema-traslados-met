import { useCallback } from "react";
import useData from "./useData";
import { confirmAction, showToast } from "../utils/alerts";

/** Restaura los datos de demostración, previa confirmación. */
export default function useResetDemo() {
  const { resetDemoData } = useData();

  return useCallback(async () => {
    const confirmed = await confirmAction({
      title: "¿Restaurar datos de demostración?",
      text: "Se descartarán los cambios realizados y se cargarán nuevamente los datos de prueba con las fechas actualizadas.",
      confirmText: "Restaurar",
      icon: "warning",
    });
    if (!confirmed) return;
    resetDemoData();
    showToast("Datos de demostración restaurados");
  }, [resetDemoData]);
}
