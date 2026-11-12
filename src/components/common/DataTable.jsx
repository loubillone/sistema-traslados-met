/**
 * Tabla reutilizable.
 * columns: [{ key, header, render?(row), className?, cellClassName? }]
 */
export default function DataTable({ columns, rows, rowKey = "id", emptyMessage = "No hay registros para mostrar." }) {
  return (
    <div className="table-responsive">
      <table className="app-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="app-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((column) => (
                  <td key={column.key} className={column.cellClassName}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
