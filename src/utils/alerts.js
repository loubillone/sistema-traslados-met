// Diálogos con SweetAlert2 unificados con los colores del sistema.
import Swal from "sweetalert2";

const baseOptions = {
  confirmButtonColor: "#1c398e",
  cancelButtonColor: "#6a7282",
  reverseButtons: true,
  customClass: { popup: "swal-app" },
};

export async function confirmAction({ title, text, confirmText = "Confirmar", icon = "question" }) {
  const result = await Swal.fire({
    ...baseOptions,
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancelar",
  });
  return result.isConfirmed;
}

export function showInfo({ title, html, icon = "info" }) {
  return Swal.fire({ ...baseOptions, title, html, icon, confirmButtonText: "Entendido" });
}

export function showToast(title, icon = "success") {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });
}
