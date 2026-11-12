/**
 * Tarjeta de indicador.
 * color: blue | green | orange | purple | indigo | red | yellow | navy
 */
export default function StatCard({ icon: Icon, color = "blue", value, label, detail }) {
  return (
    <article className={`stat-card stat-card--${color}`}>
      <div className="stat-card-icon" aria-hidden="true">
        <Icon size={24} strokeWidth={1.75} />
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {detail && <div className="stat-card-detail">{detail}</div>}
    </article>
  );
}
