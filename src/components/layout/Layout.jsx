import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { readJSON, writeJSON } from "../../utils/storage";

const COLLAPSED_KEY = "traslados-demo:menu-contraido";
const MOBILE_QUERY = "(max-width: 991.98px)";

export default function Layout() {
  // Escritorio: el menú se contrae a solo íconos (preferencia guardada).
  // Móvil/tablet: el menú se abre como panel superpuesto.
  const [collapsed, setCollapsed] = useState(() => readJSON(COLLAPSED_KEY) === true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      setMobileOpen((open) => !open);
    } else {
      const next = !collapsed;
      setCollapsed(next);
      writeJSON(COLLAPSED_KEY, next);
    }
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const shellClass = ["app-shell", collapsed && "is-collapsed", mobileOpen && "is-mobile-open"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <Sidebar collapsed={collapsed} onNavigate={closeMobile} />
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} aria-hidden="true" />}
      <div className="app-main">
        <Header onToggleSidebar={toggleSidebar} menuExpanded={mobileOpen || !collapsed} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
