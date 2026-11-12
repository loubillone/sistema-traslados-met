import { ESTADOS_ASISTENCIA, ESTADOS_VEHICULO, ESTADOS_VIAJE } from "../../constants/estados";

const CATALOGS = {
  viaje: ESTADOS_VIAJE,
  asistencia: ESTADOS_ASISTENCIA,
  vehiculo: ESTADOS_VEHICULO,
};

/** Etiqueta de estado coloreada. `type` indica el catálogo: viaje | asistencia | vehiculo. */
export default function StatusBadge({ estado, type = "viaje" }) {
  const config = CATALOGS[type]?.[estado] ?? { label: estado, variant: "neutral" };
  return <span className={`status-badge status-badge--${config.variant}`}>{config.label}</span>;
}
