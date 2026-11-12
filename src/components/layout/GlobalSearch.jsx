import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import useData from "../../hooks/useData";
import useClickOutside from "../../hooks/useClickOutside";
import { searchAll } from "../../utils/search";

export default function GlobalSearch() {
  const { data } = useData();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => searchAll(data, term), [data, term]);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  const goTo = (item) => {
    navigate(`${item.path}?q=${encodeURIComponent(item.label)}`);
    setTerm("");
    setOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const first = results[0]?.items[0];
    if (first) goTo(first);
  };

  const showPanel = open && term.trim().length >= 2;

  return (
    <form className="global-search" role="search" onSubmit={handleSubmit} ref={containerRef}>
      <Search className="global-search-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
      <input
        type="search"
        className="global-search-input"
        placeholder="Buscar pasajeros, viajes..."
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Buscar pasajeros, viajes, choferes o vehículos"
      />

      {showPanel && (
        <div className="dropdown-panel search-panel">
          {results.length === 0 ? (
            <p className="dropdown-empty">Sin resultados para “{term.trim()}”.</p>
          ) : (
            results.map((group) => (
              <div key={group.group} className="search-group">
                <div className="dropdown-section-title">{group.group}</div>
                {group.items.map((item) => (
                  <button key={item.id} type="button" className="menu-item search-result" onClick={() => goTo(item)}>
                    <span className="search-result-label">{item.label}</span>
                    <span className="search-result-detail">{item.detail}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </form>
  );
}
