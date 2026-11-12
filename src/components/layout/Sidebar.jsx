import { NavLink } from "react-router-dom";
import { Truck } from "lucide-react";
import { NAV_ITEMS } from "../../config/navigation";

export default function Sidebar({ collapsed, onNavigate }) {
  return (
    <aside className="sidebar" aria-label="Menú principal">
      <div className="sidebar-brand">
        <span className="brand-icon" aria-hidden="true">
          <Truck size={22} strokeWidth={1.75} />
        </span>
        <span className="brand-text">
          Traslados
          <br />
          Programados
        </span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            title={collapsed ? label : undefined}
            onClick={onNavigate}
          >
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="sidebar-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
