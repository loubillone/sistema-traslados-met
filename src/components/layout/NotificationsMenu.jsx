import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CalendarClock, ShieldAlert } from "lucide-react";
import useData from "../../hooks/useData";
import useClickOutside from "../../hooks/useClickOutside";
import { getNotifications } from "../../utils/selectors";
import { todayISO } from "../../utils/dates";

const LEVEL_ICONS = { info: CalendarClock, warning: AlertTriangle, danger: ShieldAlert };

export default function NotificationsMenu() {
  const { data, markNotificationsRead } = useData();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  const today = todayISO();
  const notifications = useMemo(() => getNotifications(data, today), [data, today]);
  const unread = notifications.filter((n) => !data.notificacionesLeidas.includes(n.id));

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  const handleSelect = (notification) => {
    markNotificationsRead([notification.id]);
    setOpen(false);
    navigate(notification.path);
  };

  return (
    <div className="header-dropdown" ref={containerRef}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notificaciones${unread.length ? `: ${unread.length} sin leer` : ""}`}
        aria-expanded={open}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unread.length > 0 && <span className="notification-badge">{unread.length}</span>}
      </button>

      {open && (
        <div className="dropdown-panel notifications-panel">
          <div className="dropdown-header">
            <span className="dropdown-header-title">Notificaciones</span>
            <button
              type="button"
              className="link-app small"
              disabled={unread.length === 0}
              onClick={() => markNotificationsRead(unread.map((n) => n.id))}
            >
              Marcar todas como leídas
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="dropdown-empty">No hay notificaciones.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => {
                const Icon = LEVEL_ICONS[notification.level];
                const isUnread = !data.notificacionesLeidas.includes(notification.id);
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`notification-item${isUnread ? " is-unread" : ""}`}
                      onClick={() => handleSelect(notification)}
                    >
                      <span className={`notification-icon notification-icon--${notification.level}`}>
                        <Icon size={16} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span className="notification-text">
                        <span className="notification-title">{notification.title}</span>
                        <span className="notification-detail">{notification.detail}</span>
                      </span>
                      {isUnread && <span className="notification-dot" aria-label="Sin leer" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
