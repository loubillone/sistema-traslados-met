import { Menu } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";

export default function Header({ onToggleSidebar, menuExpanded }) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="icon-btn"
        onClick={onToggleSidebar}
        aria-label={menuExpanded ? "Contraer menú" : "Expandir menú"}
        title={menuExpanded ? "Contraer menú" : "Expandir menú"}
      >
        <Menu size={20} strokeWidth={1.75} />
      </button>

      <GlobalSearch />

      <div className="header-actions">
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
