import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "../../utils/dates";
import { getCalendarWeeks, monthLabel, shiftMonth } from "../../utils/attendance";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Orden y colores de los indicadores de cada día (mismos colores que los estados).
const CHIPS = [
  { key: "presente", label: "presentes", className: "is-success" },
  { key: "ausente", label: "ausentes", className: "is-danger" },
  { key: "justificado", label: "justificados", className: "is-warning" },
  { key: "sin_registrar", label: "sin registrar", className: "is-neutral" },
  { key: "futuro", label: "programados", className: "is-info" },
];

/**
 * Calendario mensual de asistencias. Cada día muestra cuántos viajes hay en
 * cada estado; al elegir un día se listan sus viajes debajo.
 */
export default function AttendanceCalendar({ monthKey, onMonthChange, selected, onSelect, days, today }) {
  const weeks = getCalendarWeeks(monthKey);

  return (
    <div className="attendance-calendar">
      <div className="attendance-calendar-toolbar">
        <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => onMonthChange(shiftMonth(monthKey, -1))} aria-label="Mes anterior">
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <h3 className="attendance-calendar-title" aria-live="polite">
          {monthLabel(monthKey)}
        </h3>
        <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={() => onMonthChange(shiftMonth(monthKey, 1))} aria-label="Mes siguiente">
          <ChevronRight size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="btn-app btn-app-outline btn-app-sm attendance-calendar-today"
          onClick={() => onSelect(today)}
        >
          Hoy
        </button>
      </div>

      <div className="attendance-calendar-grid" aria-label={`Asistencias de ${monthLabel(monthKey)}`}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="attendance-calendar-weekday">
            {day}
          </div>
        ))}
        {weeks.flat().map((iso) => {
          const info = days[iso];
          const outside = !iso.startsWith(monthKey);
          const classes = [
            "attendance-day",
            outside && "is-outside",
            iso === today && "is-today",
            iso === selected && "is-selected",
            !info && "is-empty",
          ]
            .filter(Boolean)
            .join(" ");
          const resumen = info
            ? CHIPS.filter((c) => info[c.key]).map((c) => `${info[c.key]} ${c.label}`).join(", ")
            : "sin viajes";
          return (
            <button
              key={iso}
              type="button"
              className={classes}
              onClick={() => onSelect(iso)}
              aria-pressed={iso === selected}
              aria-label={`${formatDate(iso)}: ${resumen}`}
              data-fecha={iso}
            >
              <span className="attendance-day-number">{Number(iso.slice(8))}</span>
              {info && (
                <span className="attendance-day-chips">
                  {CHIPS.filter((c) => info[c.key]).map((c) => (
                    <span key={c.key} className={`attendance-chip ${c.className}`} title={`${info[c.key]} ${c.label}`}>
                      {info[c.key]}
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="attendance-legend" aria-hidden="true">
        {CHIPS.map((c) => (
          <span key={c.key} className="attendance-legend-item">
            <span className={`attendance-chip ${c.className}`} /> {c.label[0].toUpperCase() + c.label.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
