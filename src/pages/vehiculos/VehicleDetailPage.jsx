import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Car, CircleCheck, RotateCcw, SquarePen, Truck, Trash2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import DetailItem from "../../components/common/DetailItem";
import EmptyState from "../../components/common/EmptyState";
import SegmentedControl from "../../components/common/SegmentedControl";
import ExpiryNotice from "../../components/recursos/ExpiryNotice";
import AffectedTripsNotice from "../../components/recursos/AffectedTripsNotice";
import ResourceTripsHistory from "../../components/recursos/ResourceTripsHistory";
import useData from "../../hooks/useData";
import useResourceActions from "../../hooks/useResourceActions";
import { formatDate, todayISO } from "../../utils/dates";
import { buildIndex } from "../../utils/selectors";
import { getAffectedVehicleTrips, getUpcomingTrips } from "../../utils/resources";

/** Ficha del vehículo (CU-12). */
export default function VehicleDetailPage() {
  const { id } = useParams();
  const { data } = useData();
  const actions = useResourceActions();
  const today = todayISO();
  const vehiculo = data.vehiculos.find((v) => v.id === id);

  const lookups = useMemo(
    () => ({
      pasajeros: buildIndex(data.pasajeros),
      choferes: buildIndex(data.choferes),
      vehiculos: buildIndex(data.vehiculos),
      instituciones: buildIndex(data.instituciones),
    }),
    [data.pasajeros, data.choferes, data.vehiculos, data.instituciones],
  );
  const viajes = useMemo(() => data.viajes.filter((v) => v.vehiculoId === id), [data.viajes, id]);

  if (!vehiculo) {
    return (
      <ContentCard>
        <EmptyState icon={Truck} title="Vehículo no encontrado">
          <p>El vehículo solicitado no existe o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/vehiculos" className="btn-app btn-app-primary">Volver a Vehículos</Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const deBaja = vehiculo.activo === false;
  const proximos = getUpcomingTrips(data.viajes, "vehiculoId", vehiculo.id, today);
  const affected = getAffectedVehicleTrips(data.viajes, vehiculo, today);
  const reason = deBaja
    ? "El vehículo está dado de baja."
    : vehiculo.estado !== "activo"
      ? "El vehículo está en mantenimiento."
      : "La VTV o el seguro vencen antes de la fecha de esos viajes.";

  return (
    <>
      <Link to="/vehiculos" className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Volver a Vehículos
      </Link>

      <PageHeader
        title={`Vehículo ${vehiculo.patente}`}
        subtitle={
          <span className="detail-subtitle">
            {vehiculo.tipo}
            {vehiculo.modelo ? ` · ${vehiculo.modelo}` : ""}
            <StatusBadge type="vehiculo" estado={deBaja ? "inactivo" : vehiculo.estado} />
          </span>
        }
        actions={
          <>
            <Link to={`/vehiculos/${vehiculo.id}/editar`} className="btn-app btn-app-outline btn-app-lg">
              <SquarePen size={18} strokeWidth={2} aria-hidden="true" />
              Editar
            </Link>
            {deBaja ? (
              <button type="button" className="btn-app btn-app-primary btn-app-lg" onClick={() => actions.reactivateVehicle(vehiculo)}>
                <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
                Reactivar
              </button>
            ) : (
              <button type="button" className="btn-app btn-app-danger-outline btn-app-lg" onClick={() => actions.deactivateVehicle(vehiculo)}>
                <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
                Dar de baja
              </button>
            )}
          </>
        }
      />

      {deBaja && (
        <div className="inactive-notice" role="status">
          <Truck size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            Vehículo dado de baja{vehiculo.fechaBaja ? ` el ${formatDate(vehiculo.fechaBaja)}` : ""}. No puede asignarse a viajes nuevos; sus viajes históricos se conservan.
          </span>
        </div>
      )}

      <AffectedTripsNotice viajes={affected} filterParam="vehiculo" resourceId={vehiculo.id} today={today} reason={reason} />

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={Car} color="navy" value={viajes.length} label="Viajes asociados" detail="Historial completo" />
        </div>
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={CalendarClock} color="blue" value={proximos.length} label="Viajes próximos" detail="Programados desde hoy" />
        </div>
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={CircleCheck} color="green" value={viajes.filter((v) => v.estado === "finalizado").length} label="Viajes realizados" detail="Finalizados" />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-6">
          <ContentCard title="Datos del vehículo" className="h-100">
            <dl className="detail-grid detail-grid--2">
              <DetailItem label="Patente">{vehiculo.patente}</DetailItem>
              <DetailItem label="Tipo">{vehiculo.tipo}</DetailItem>
              <DetailItem label="Marca y modelo">{vehiculo.modelo}</DetailItem>
              <DetailItem label="Capacidad">{`${vehiculo.capacidad} pasajeros`}</DetailItem>
              <DetailItem label="Alta">{vehiculo.fechaAlta ? formatDate(vehiculo.fechaAlta) : ""}</DetailItem>
              <DetailItem label="Observaciones" className="detail-span-2">{vehiculo.observaciones}</DetailItem>
            </dl>
            <div className="mt-4">
              <div className="form-label-app">Estado</div>
              {deBaja ? (
                <p className="section-empty">Reactive el vehículo para cambiar su estado.</p>
              ) : (
                <SegmentedControl
                  ariaLabel="Cambiar estado del vehículo"
                  value={vehiculo.estado}
                  onChange={(value) => actions.setVehicleStatus(vehiculo, value)}
                  options={[
                    { value: "activo", label: "Activo" },
                    { value: "mantenimiento", label: "En mantenimiento" },
                  ]}
                />
              )}
            </div>
          </ContentCard>
        </div>
        <div className="col-12 col-xl-6">
          <ContentCard title="Documentación" className="h-100">
            <div className="d-flex flex-column gap-3">
              <ExpiryNotice label="VTV vence" fecha={vehiculo.vencimientoVTV} today={today} />
              <dl className="detail-grid detail-grid--2">
                <DetailItem label="Aseguradora">{vehiculo.aseguradora}</DetailItem>
                <DetailItem label="Nº de póliza">{vehiculo.poliza}</DetailItem>
              </dl>
              <ExpiryNotice label="Seguro vence" fecha={vehiculo.vencimientoSeguro} today={today} />
            </div>
          </ContentCard>
        </div>
      </div>

      <ContentCard
        title="Viajes asociados"
        actions={
          <Link to={`/viajes?vehiculo=${vehiculo.id}`} className="link-app">
            Ver en Gestión de Viajes
          </Link>
        }
      >
        <ResourceTripsHistory viajes={viajes} mode="vehiculo" lookups={lookups} today={today} backTo={`/vehiculos/${vehiculo.id}`} />
      </ContentCard>
    </>
  );
}
