import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ReceiptText, SquarePen, Trash2, TriangleAlert } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import DetailItem from "../../components/common/DetailItem";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import CategoryLabel from "../../components/gastos/CategoryLabel";
import TripExpenses from "../../components/gastos/TripExpenses";
import useData from "../../hooks/useData";
import useExpenseActions from "../../hooks/useExpenseActions";
import { formatDate, formatDateTime } from "../../utils/dates";
import { formatAmount } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { tripRoute } from "../../utils/trips";
import { tripAcceptsExpenses } from "../../utils/expenses";

/** Detalle de un gasto (CU-13). Viaje y vehículo se obtienen por identificador. */
export default function ExpenseDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useData();
  const { remove } = useExpenseActions();

  const gasto = (data.gastos ?? []).find((g) => g.id === id);
  const backTo = location.state?.from ?? "/gastos";
  const backState = location.state?.backState;
  const backLabel = backTo.startsWith("/viajes") ? "Volver al viaje" : "Volver a Gastos";

  if (!gasto) {
    return (
      <ContentCard>
        <EmptyState icon={ReceiptText} title="Gasto no encontrado">
          <p>El gasto solicitado no existe, fue eliminado o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/gastos" className="btn-app btn-app-primary">Volver a Gastos</Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const viaje = data.viajes.find((v) => v.id === gasto.viajeId);
  const vehiculo = viaje ? data.vehiculos.find((v) => v.id === viaje.vehiculoId) : null;
  const pasajero = viaje ? data.pasajeros.find((p) => p.id === viaje.pasajeroId) : null;
  const chofer = viaje ? data.choferes.find((c) => c.id === viaje.choferId) : null;
  const ruta = viaje ? tripRoute(viaje, data.instituciones.find((i) => i.id === viaje.institucionId)) : null;

  const handleDelete = async () => {
    if (await remove(gasto)) navigate(backTo, { state: backState, replace: true });
  };

  return (
    <>
      <Link to={backTo} state={backState} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {backLabel}
      </Link>

      <PageHeader
        title={`Gasto ${gasto.id}`}
        subtitle={
          <span className="detail-subtitle">
            {formatDate(gasto.fecha)} · <CategoryLabel categoria={gasto.categoria} /> · {formatAmount(gasto.monto)}
          </span>
        }
        actions={
          <>
            <Link
              to={`/gastos/${gasto.id}/editar`}
              state={{ from: `/gastos/${gasto.id}`, backState: location.state }}
              className="btn-app btn-app-outline btn-app-lg"
            >
              <SquarePen size={18} strokeWidth={2} aria-hidden="true" />
              Editar
            </Link>
            <button type="button" className="btn-app btn-app-danger-outline btn-app-lg" onClick={handleDelete}>
              <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
              Eliminar
            </button>
          </>
        }
      />

      {viaje && !tripAcceptsExpenses(viaje) && (
        <div className="trip-notice trip-notice--warning" role="status">
          <TriangleAlert size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            El viaje asociado está {viaje.estado === "cancelado" ? "cancelado" : "programado"}. El gasto se conserva, pero no se pueden asociar gastos
            nuevos a ese viaje.
          </span>
        </div>
      )}

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-6">
          <ContentCard title="Datos del gasto" className="h-100">
            <dl className="detail-grid detail-grid--2">
              <DetailItem label="Fecha">{formatDate(gasto.fecha)}</DetailItem>
              <DetailItem label="Categoría">
                <CategoryLabel categoria={gasto.categoria} />
              </DetailItem>
              <DetailItem label="Monto">
                <span className="expense-detail-amount">{formatAmount(gasto.monto)}</span>
              </DetailItem>
              <DetailItem label="Vehículo">
                {vehiculo ? (
                  <Link to={`/vehiculos/${vehiculo.id}`} className="link-app">
                    {vehiculo.patente}
                  </Link>
                ) : (
                  ""
                )}
                {vehiculo ? ` · ${vehiculo.tipo}` : ""}
              </DetailItem>
              <DetailItem label="Descripción" className="detail-span-2">{gasto.descripcion}</DetailItem>
              {gasto.registradoEl && <DetailItem label="Registrado el">{formatDateTime(gasto.registradoEl)}</DetailItem>}
              {gasto.modificadoEl && <DetailItem label="Última modificación">{formatDateTime(gasto.modificadoEl)}</DetailItem>}
            </dl>
          </ContentCard>
        </div>
        <div className="col-12 col-lg-6">
          <ContentCard title="Viaje asociado" className="h-100">
            {viaje ? (
              <dl className="detail-grid detail-grid--2">
                <DetailItem label="Viaje">
                  <Link to={`/viajes/${viaje.id}`} state={{ from: `/gastos/${gasto.id}` }} className="link-app">
                    {viaje.id}
                  </Link>{" "}
                  <StatusBadge estado={viaje.estado} />
                </DetailItem>
                <DetailItem label="Fecha y hora">{`${formatDate(viaje.fecha)} · ${viaje.hora} hs`}</DetailItem>
                <DetailItem label="Pasajero">{fullName(pasajero)}</DetailItem>
                <DetailItem label="Chofer">{fullName(chofer)}</DetailItem>
                <DetailItem label="Recorrido" className="detail-span-2">{`${ruta.origen} → ${ruta.destino}`}</DetailItem>
              </dl>
            ) : (
              <p className="section-empty">El viaje asociado ({gasto.viajeId}) no existe.</p>
            )}
          </ContentCard>
        </div>
      </div>

      {viaje && <TripExpenses viaje={viaje} gastos={data.gastos} title={`Todos los gastos del viaje ${viaje.id}`} currentId={gasto.id} onDeleteCurrent={handleDelete} showRegister={false} />}
    </>
  );
}
