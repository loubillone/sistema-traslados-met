/** $11.250 */
export function formatCurrency(value) {
  return `$${Number(value ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** 12.345.678 */
export function formatDni(dni) {
  return String(dni ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Tamaño legible de un archivo. */
export function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Devuelve los elementos de la página indicada (páginas desde 1). */
export function paginate(list, page, pageSize) {
  return list.slice((page - 1) * pageSize, page * pageSize);
}

/** Elimina tildes y pasa a minúsculas para comparar textos. */
export function normalizeText(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
