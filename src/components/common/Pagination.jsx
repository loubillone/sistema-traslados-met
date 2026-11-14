import { ChevronLeft, ChevronRight } from "lucide-react";

/** Paginación simple: "Mostrando 1–10 de 70" + anterior / siguiente. */
export default function Pagination({ page, pageSize, totalItems, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <nav className="pagination-app" aria-label="Paginación">
      <span className="pagination-info">
        Mostrando {from}–{to} de {totalItems}
      </span>
      <div className="pagination-buttons">
        <button
          type="button"
          className="btn-app btn-app-outline btn-app-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <span className="pagination-page">
          Página {page} de {pageCount}
        </span>
        <button
          type="button"
          className="btn-app btn-app-outline btn-app-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}
