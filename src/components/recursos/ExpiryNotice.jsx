import { CircleCheck, TriangleAlert } from "lucide-react";
import { formatDate } from "../../utils/dates";
import { getExpiryInfo } from "../../utils/resources";

/**
 * Vencimiento con semáforo (diseño de Figma): rojo si está vencido o faltan
 * menos de 30 días, amarillo de 30 a 59 y verde con 60 días o más.
 * variant "box": recuadro de la tarjeta del chofer · "inline": celda de tabla.
 */
export default function ExpiryNotice({ label, fecha, today, variant = "box" }) {
  const info = getExpiryInfo(fecha, today);
  const Icon = info.level === "success" ? CircleCheck : TriangleAlert;

  if (variant === "inline") {
    return (
      <span className={`expiry-inline expiry-inline--${info.level}`} title={info.text}>
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
        {info.dias === null ? "—" : info.dias < 0 ? `Vencida (${-info.dias} d)` : `${info.dias} días`}
      </span>
    );
  }

  return (
    <div className={`expiry-box expiry-box--${info.level}`} data-nivel={info.level}>
      <div>
        <div className="expiry-box-title">
          {label}: {fecha ? formatDate(fecha) : "sin fecha"}
        </div>
        <div className="expiry-box-text">{info.text}</div>
      </div>
      {info.level !== "success" && <Icon size={20} strokeWidth={2} aria-hidden="true" />}
    </div>
  );
}
