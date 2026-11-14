import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Car, CircleCheck, SquarePen, UserCheck, UserX } from "lucide-react";
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
import { DISPONIBILIDAD_CHOFER } from "../../constants/estados";
import { CATEGORIAS_LICENCIA } from "../../constants/recursos";
import { formatDate, todayISO } from "../../utils/dates";
import { formatDni } from "../../utils/format";
import { buildIndex, fullName } from "../../utils/selectors";
import { getAffectedDriverTrips, getDriversOnTrip, getDriverStatus, getUpcomingTrips } from "../../utils/resources";

/** Ficha del chofer (CU-11). Los viajes se obtienen por su identificador. */
export default function DriverDetailPage() {
  const { id } = useParams();
  const { data } = useData();
  const actions = useResourceActions();
  const today = todayISO();
  const chofer = data.choferes.find((c) => c.id === id);

  const lookups = useMemo(
    () => ({
      pasajeros: buildIndex(data.pasajeros),
      choferes: buildIndex(data.choferes),
      vehiculos: buildIndex(data.vehiculos),
      instituciones: buildIndex(data.instituciones),
    }),
    [data.pasajeros, data.choferes, data.vehiculos, data.instituciones],
  );
  const viajes = useMemo(() => data.viajes.filter((v) => v.choferId === id), [data.viajes, id]);

  if (!chofer) {
    return (
      <ContentCard>
        <EmptyState icon={UserX} title="Chofer no encontrado">
          <p>El chofer solicitado no existe o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/choferes" className="btn-app btn-app-primary">Volver a Choferes</Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const status = getDriverStatus(chofer, getDriversOnTrip(data.viajes, today).has(chofer.id));
  const proximos = getUpcomingTrips(data.viajes, "choferId", chofer.id, today);
  const affected = getAffectedDriverTrips(data.viajes, chofer, today);
  const realizados = viajes.filter((v) => v.estado === "finalizado").length;
  const reason = !chofer.activo
    ? "El chofer está inactivo."
    : chofer.disponibilidad === "no_disponible"
      ? "El chofer figura como No disponible."
      : "La licencia vence antes de la fecha de esos viajes.";

  return (
    <>
      <Link to="/choferes" className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Volver a Choferes
      </Link>

      <PageHeader
        title={fullName(chofer)}
        subtitle={
          <span className="detail-subtitle">
            DNI {formatDni(chofer.dni)}
            <StatusBadge type="chofer" estado={status} />
          </span>
        }
        actions={
          <>
            <Link to={`/choferes/${chofer.id}/editar`} className="btn-app btn-app-outline btn-app-lg">
              <SquarePen size={18} strokeWidth={2} aria-hidden="true" />
              Editar ficha
            </Link>
            {chofer.activo ? (
              <button type="button" className="btn-app btn-app-danger-outline btn-app-lg" onClick={() => actions.deactivateDriver(chofer)}>
                <UserX size={18} strokeWidth={2} aria-hidden="true" />
                Desactivar
              </button>
            ) : (
              <button type="button" className="btn-app btn-app-primary btn-app-lg" onClick={() => actions.reactivateDriver(chofer)}>
                <UserCheck size={18} strokeWidth={2} aria-hidden="true" />
                Reactivar
              </button>
            )}
          </>
        }
      />

      {!chofer.activo && (
        <div className="inactive-notice" role="status">
          <UserX size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            Chofer inactivo{chofer.fechaBaja ? ` desde el ${formatDate(chofer.fechaBaja)}` : ""}. No puede asignarse a viajes nuevos; su historial se conserva.
          </span>
        </div>
      )}

      <AffectedTripsNotice viajes={affected} filterParam="chofer" resourceId={chofer.id} today={today} reason={reason} />

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={Car} color="navy" value={viajes.length} label="Viajes asignados" detail="Historial completo" />
        </div>
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={CalendarClock} color="blue" value={proximos.length} label="Viajes próximos" detail="Programados desde hoy" />
        </div>
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={CircleCheck} color="green" value={realizados} label="Viajes realizados" detail="Finalizados" />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-7">
          <ContentCard title="Datos del chofer" className="h-100">
            <dl className="detail-grid detail-grid--2">
              <DetailItem label="Nombre">{chofer.nombre}</DetailItem>
              <DetailItem label="Apellido">{chofer.apellido}</DetailItem>
              <DetailItem label="DNI">{formatDni(chofer.dni)}</DetailItem>
              <DetailItem label="Teléfono">{chofer.telefono}</DetailItem>
              <DetailItem label="Turno habitual">{chofer.turno}</DetailItem>
              <DetailItem label="Alta">{chofer.fechaAlta ? formatDate(chofer.fechaAlta) : ""}</DetailItem>
              <DetailItem label="Observaciones" className="detail-span-2">{chofer.observaciones}</DetailItem>
            </dl>
          </ContentCard>
        </div>
        <div className="col-12 col-xl-5 d-flex flex-column gap-4">
          <ContentCard title="Licencia de conducir">
            <dl className="detail-grid detail-grid--2 mb-3">
              <DetailItem label="Número">{chofer.licencia}</DetailItem>
              <DetailItem label="Categoría">{CATEGORIAS_LICENCIA[chofer.categoriaLicencia] ?? chofer.categoriaLicencia}</DetailItem>
            </dl>
            <ExpiryNotice label="Licencia vence" fecha={chofer.vencimientoLicencia} today={today} />
          </ContentCard>
          <ContentCard title="Disponibilidad" className="flex-grow-1">
            {chofer.activo ? (
              <>
                <SegmentedControl
                  ariaLabel="Cambiar disponibilidad"
                  value={chofer.disponibilidad}
                  onChange={(value) => actions.setDriverAvailability(chofer, value)}
                  options={["disponible", "guardia", "no_disponible"].map((value) => ({ value, label: DISPONIBILIDAD_CHOFER[value].label }))}
                />
                <p className="field-hint mb-0 mt-2">
                  Disponible y De guardia pueden asignarse a viajes nuevos. "En viaje" se calcula con los viajes en curso de hoy.
                </p>
              </>
            ) : (
              <p className="section-empty">Reactive al chofer para cambiar su disponibilidad.</p>
            )}
          </ContentCard>
        </div>
      </div>

      <ContentCard
        title="Viajes asignados"
        actions={
          <Link to={`/viajes?chofer=${chofer.id}`} className="link-app">
            Ver en Gestión de Viajes
          </Link>
        }
      >
        <ResourceTripsHistory viajes={viajes} mode="chofer" lookups={lookups} today={today} backTo={`/choferes/${chofer.id}`} />
      </ContentCard>
    </>
  );
}
