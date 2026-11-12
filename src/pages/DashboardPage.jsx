import { useMemo } from "react";
import { Car, ClipboardCheck, Info, Truck, UserCheck, Users } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import ContentCard from "../components/common/ContentCard";
import StatCard from "../components/common/StatCard";
import MonthlyTripsChart from "../components/dashboard/MonthlyTripsChart";
import MonthlyAttendanceChart from "../components/dashboard/MonthlyAttendanceChart";
import RecentTripsTable from "../components/dashboard/RecentTripsTable";
import useData from "../hooks/useData";
import useResetDemo from "../hooks/useResetDemo";
import { formatDate, todayISO } from "../utils/dates";
import {
  getDashboardStats,
  getMonthlyAttendance,
  getMonthlyTrips,
  getRecentTrips,
} from "../utils/selectors";

export default function DashboardPage() {
  const { data } = useData();
  const resetDemo = useResetDemo();
  const today = todayISO();

  const stats = useMemo(() => getDashboardStats(data, today), [data, today]);
  const monthlyTrips = useMemo(() => getMonthlyTrips(data.viajes), [data.viajes]);
  const monthlyAttendance = useMemo(() => getMonthlyAttendance(data.asistencias), [data.asistencias]);
  const recentTrips = useMemo(() => getRecentTrips(data.viajes, today), [data.viajes, today]);

  // Si los datos se generaron otro día, los estados de "hoy" pueden no coincidir.
  const isStale = data.generadoEl !== today;

  return (
    <>
      <PageHeader title="Panel Principal" subtitle="Bienvenido al sistema de gestión de traslados" />

      {isStale && (
        <div className="demo-notice" role="status">
          <Info size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            Los datos de demostración se generaron el {formatDate(data.generadoEl)}. Restaurá los datos para
            actualizar los viajes y estados del día de hoy.
          </span>
          <button type="button" className="btn-app btn-app-outline btn-app-sm" onClick={resetDemo}>
            Restaurar datos
          </button>
        </div>
      )}

      <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-5 g-4 mb-4">
        <div className="col">
          <StatCard
            icon={Users}
            color="blue"
            value={stats.pasajerosTotal}
            label="Pasajeros registrados"
            detail={`${stats.pasajerosActivos} activos`}
          />
        </div>
        <div className="col">
          <StatCard
            icon={Car}
            color="green"
            value={stats.viajesHoy}
            label="Viajes de hoy"
            detail={`${stats.finalizadosHoy} completados`}
          />
        </div>
        <div className="col">
          <StatCard
            icon={UserCheck}
            color="orange"
            value={stats.choferesEnViaje}
            label="Choferes en viaje"
            detail={`de ${stats.choferesActivos} totales`}
          />
        </div>
        <div className="col">
          <StatCard
            icon={Truck}
            color="purple"
            value={stats.vehiculosActivos}
            label="Vehículos activos"
            detail={`de ${stats.vehiculosTotal} totales`}
          />
        </div>
        <div className="col">
          <StatCard
            icon={ClipboardCheck}
            color="indigo"
            value={stats.porcentajeAsistencia === null ? "—" : `${stats.porcentajeAsistencia}%`}
            label="Asistencias del día"
            detail={
              stats.asistenciasHoy
                ? `${stats.presentesHoy} de ${stats.asistenciasHoy} pasajeros`
                : "Sin registros todavía"
            }
          />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-6">
          <ContentCard title="Viajes Mensuales" className="h-100">
            <MonthlyTripsChart data={monthlyTrips} />
          </ContentCard>
        </div>
        <div className="col-12 col-lg-6">
          <ContentCard title="Asistencias Mensuales" className="h-100">
            <MonthlyAttendanceChart data={monthlyAttendance} />
          </ContentCard>
        </div>
      </div>

      <ContentCard title="Viajes Recientes">
        <RecentTripsTable viajes={recentTrips} />
      </ContentCard>
    </>
  );
}
