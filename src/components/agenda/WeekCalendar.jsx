import { Link } from "react-router-dom";
import { Car, CircleCheck, CircleDashed } from "lucide-react";
import { DIAS_AGENDA, TRAMOS } from "../../constants/agenda";
import { TIPOS_VIAJE } from "../../constants/estados";
import { formatDate } from "../../utils/dates";
import { fullName } from "../../utils/selectors";
import { tripRoute } from "../../utils/trips";

/** Bloque de una ocurrencia calculada desde un turno (no es un viaje guardado). */
function TurnoBlock({ item, today }) {
  const { turno, viaje } = item;
  const pasado = item.fecha < today;
  return (
    <Link
      to={`/agenda/${turno.id}?fecha=${item.fecha}&tramo=${item.tramo}`}
      className={`agenda-block agenda-block--${turno.tipo}${viaje ? " has-trip" : " no-trip"}${pasado ? " is-past" : ""}`}
      data-turno={turno.id}
      data-fecha={item.fecha}
      data-tramo={item.tramo}
      aria-label={`Turno ${turno.id}: ${fullName(item.pasajero)}, ${TRAMOS[item.tramo]} ${item.hora}, ${viaje ? `viaje ${viaje.id} programado` : "sin viaje programado"}`}
    >
      <span className="agenda-block-name">{fullName(item.pasajero)}</span>
      <span className="agenda-block-place">{item.institucion?.nombreCorto ?? item.institucion?.nombre ?? "Sin destino"}</span>
      <span className="agenda-block-meta">
        <span className="agenda-block-tag">
          {item.hora} · {turno.tipo === "ida_vuelta" ? `${TIPOS_VIAJE.ida_vuelta} (${TRAMOS[item.tramo].toLowerCase()})` : TIPOS_VIAJE[turno.tipo]}
        </span>
      </span>
      <span className={`agenda-block-trip${viaje ? " is-programmed" : ""}`}>
        {viaje ? <CircleCheck size={13} strokeWidth={2} aria-hidden="true" /> : <CircleDashed size={13} strokeWidth={2} aria-hidden="true" />}
        {viaje ? `${viaje.id}` : "Sin viaje"}
      </span>
    </Link>
  );
}

/** Viaje concreto de la semana que no corresponde a ningún turno. */
function TripBlock({ item }) {
  return (
    <Link to={`/viajes/${item.viaje.id}`} state={{ from: "/agenda" }} className="agenda-block agenda-block--viaje" data-viaje={item.viaje.id}>
      <span className="agenda-block-name">{fullName(item.pasajero)}</span>
      <span className="agenda-block-place">
        {tripRoute(item.viaje, item.institucion).regreso ? `${item.institucion?.nombreCorto ?? "Institución"} → domicilio` : item.institucion?.nombreCorto ?? item.institucion?.nombre ?? "—"}
      </span>
      <span className="agenda-block-tag">Viaje sin turno · {TIPOS_VIAJE[item.viaje.tipo] ?? item.viaje.tipo}</span>
      <span className="agenda-block-trip is-programmed">
        <Car size={13} strokeWidth={2} aria-hidden="true" />
        {item.hora} · Viaje {item.viaje.id}
      </span>
    </Link>
  );
}

const renderItem = (item, today) =>
  item.turno ? <TurnoBlock key={item.key} item={item} today={today} /> : <TripBlock key={item.key} item={item} />;

/**
 * Calendario semanal (lunes a domingo) con franjas horarias de una hora.
 * En pantallas chicas se muestra como lista por día, con la misma información.
 */
export default function WeekCalendar({ fechas, ocurrencias, extras, today }) {
  const items = [...ocurrencias, ...extras];
  const horas = [...new Set(items.map((i) => i.hora.slice(0, 2)))].sort();
  const enCelda = (fecha, hora) => items.filter((i) => i.fecha === fecha && i.hora.startsWith(hora)).sort((a, b) => a.hora.localeCompare(b.hora));

  if (items.length === 0) {
    return <p className="section-empty agenda-empty-week">No hay turnos ni viajes para esta semana con los filtros seleccionados.</p>;
  }

  return (
    <>
      <div className="agenda-grid-wrapper d-none d-md-block">
        <div className="agenda-grid" role="table" aria-label="Agenda semanal">
          <div className="agenda-grid-row agenda-grid-head" role="row">
            <div className="agenda-grid-time" role="columnheader">
              Horario
            </div>
            {fechas.map((fecha, index) => (
              <div key={fecha} className={`agenda-grid-day${fecha === today ? " is-today" : ""}`} role="columnheader">
                <span>{DIAS_AGENDA[index].label}</span>
                <small>{formatDate(fecha).slice(0, 5)}</small>
              </div>
            ))}
          </div>
          {horas.map((hora) => (
            <div key={hora} className="agenda-grid-row" role="row">
              <div className="agenda-grid-time" role="rowheader">
                {hora}:00
              </div>
              {fechas.map((fecha) => (
                <div key={fecha} className={`agenda-grid-cell${fecha === today ? " is-today" : ""}`} role="cell">
                  {enCelda(fecha, hora).map((item) => renderItem(item, today))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="agenda-day-list d-md-none">
        {fechas.map((fecha, index) => {
          const delDia = items.filter((i) => i.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora));
          return (
            <section key={fecha} className={`agenda-day-card${fecha === today ? " is-today" : ""}`}>
              <h3 className="agenda-day-title">
                {DIAS_AGENDA[index].label} {formatDate(fecha).slice(0, 5)}
                {fecha === today && <span className="agenda-today-tag">Hoy</span>}
              </h3>
              {delDia.length ? <div className="agenda-day-items">{delDia.map((item) => renderItem(item, today))}</div> : <p className="section-empty">Sin turnos.</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
