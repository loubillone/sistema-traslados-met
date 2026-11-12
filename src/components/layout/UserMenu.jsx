import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, RotateCcw } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useResetDemo from "../../hooks/useResetDemo";
import useClickOutside from "../../hooks/useClickOutside";
import { confirmAction } from "../../utils/alerts";

function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const resetDemo = useResetDemo();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  const handleReset = async () => {
    setOpen(false);
    await resetDemo();
  };

  const handleLogout = async () => {
    setOpen(false);
    const confirmed = await confirmAction({
      title: "¿Cerrar sesión?",
      text: "Volverá a la pantalla de inicio de sesión.",
      confirmText: "Cerrar sesión",
    });
    if (!confirmed) return;
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="header-dropdown" ref={containerRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="avatar" aria-hidden="true">
          {getInitials(user?.nombre)}
        </span>
        <span className="user-meta">
          <span className="user-name">{user?.nombre}</span>
          <span className="user-email">{user?.email}</span>
        </span>
        <ChevronDown className="user-chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-panel user-panel" role="menu">
          <div className="user-panel-header">
            <span className="user-name">{user?.nombre}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button type="button" className="menu-item" role="menuitem" onClick={handleReset}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
            Restaurar datos de demostración
          </button>
          <div className="menu-divider" />
          <button type="button" className="menu-item is-danger" role="menuitem" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
