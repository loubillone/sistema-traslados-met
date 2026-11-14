import { CircleDashed, TrendingUp } from "lucide-react";
import StatCard from "../common/StatCard";
import { monthLabel } from "../../utils/attendance";

const formatPct = (value) => `${String(value).replace(".", ",")}%`;

/**
 * Indicadores del mes (diseño de Figma) más los viajes sin asistencia, que se
 * muestran aparte para no confundir "Sin registrar" con "Ausente".
 */
export default function AttendanceStats({ resumen, monthKey }) {
  const mes = monthLabel(monthKey);
  return (
    <div className="row g-4 mb-4" data-testid="indicadores-asistencia">
      <div className="col-12 col-sm-6 col-xl-3">
        <StatCard
          layout="horizontal"
          icon={TrendingUp}
          color="green"
          value={resumen.porcentaje === null ? "—" : `${resumen.porcentaje}%`}
          label={`Asistencias del mes · ${mes}`}
          detail={resumen.total ? `${resumen.presentes} presentes de ${resumen.total} registradas` : "Sin asistencias registradas"}
        />
      </div>
      <div className="col-12 col-sm-6 col-xl-3">
        <StatCard
          layout="horizontal"
          icon={TrendingUp}
          color="red"
          value={resumen.ausentes}
          label="Ausencias del mes"
          detail={`${formatPct(resumen.pctAusentes)} de las registradas`}
        />
      </div>
      <div className="col-12 col-sm-6 col-xl-3">
        <StatCard
          layout="horizontal"
          icon={TrendingUp}
          color="yellow"
          value={resumen.justificadas}
          label="Ausencias justificadas"
          detail={`${formatPct(resumen.pctJustificadas)} de las registradas`}
        />
      </div>
      <div className="col-12 col-sm-6 col-xl-3">
        <StatCard
          layout="horizontal"
          icon={CircleDashed}
          color="gray"
          value={resumen.sinRegistrar}
          label="Viajes sin registrar"
          detail="De hoy o anteriores · no cuentan como ausencias"
        />
      </div>
    </div>
  );
}
