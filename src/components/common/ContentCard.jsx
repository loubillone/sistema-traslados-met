export default function ContentCard({ title, actions, children, className = "" }) {
  return (
    <section className={`content-card ${className}`.trim()}>
      {(title || actions) && (
        <div className="content-card-header">
          {title && <h2 className="content-card-title">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
