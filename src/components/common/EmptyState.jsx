/** Mensaje para listados sin resultados. */
export default function EmptyState({ icon: Icon, title, children, actions }) {
  return (
    <div className="empty-state" role="status">
      {Icon && (
        <div className="empty-state-icon" aria-hidden="true">
          <Icon size={28} strokeWidth={1.75} />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {children && <div className="empty-state-text">{children}</div>}
      {actions && <div className="empty-state-actions">{actions}</div>}
    </div>
  );
}
