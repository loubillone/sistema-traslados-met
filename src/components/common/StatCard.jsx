/**
 * Tarjeta de indicador.
 * color: blue | green | orange | purple | indigo | red | yellow | navy
 * layout: "vertical" (dashboard) | "horizontal" (encabezado de módulos, como en Figma)
 */
export default function StatCard({ icon: Icon, color = "blue", value, label, detail, layout = "vertical" }) {
  const icon = (
    <div className="stat-card-icon" aria-hidden="true">
      <Icon size={24} strokeWidth={1.75} />
    </div>
  );

  if (layout === "horizontal") {
    return (
      <article className={`stat-card stat-card--horizontal stat-card--${color}`}>
        {icon}
        <div>
          <div className="stat-card-value">{value}</div>
          <div className="stat-card-label">{label}</div>
          {detail && <div className="stat-card-detail">{detail}</div>}
        </div>
      </article>
    );
  }

  return (
    <article className={`stat-card stat-card--${color}`}>
      {icon}
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {detail && <div className="stat-card-detail">{detail}</div>}
    </article>
  );
}
