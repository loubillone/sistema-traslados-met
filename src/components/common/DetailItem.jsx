/** Par etiqueta / valor para fichas de detalle. */
export default function DetailItem({ label, children, className = "" }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={`detail-item ${className}`.trim()}>
      <dt className="detail-label">{label}</dt>
      <dd className={`detail-value${empty ? " is-empty" : ""}`}>{empty ? "Sin datos" : children}</dd>
    </div>
  );
}
