import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileDown, FileText, Printer, SquarePen, Trash2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import DetailItem from "../../components/common/DetailItem";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import BudgetDocument from "../../components/presupuestos/BudgetDocument";
import useData from "../../hooks/useData";
import useBudgetActions from "../../hooks/useBudgetActions";
import { formatDateTime } from "../../utils/dates";
import { formatAmount, formatDni } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { sumarImportes } from "../../utils/budgets";

/**
 * Detalle de un presupuesto (CU-14) con su vista imprimible. Con ?accion=imprimir
 * o ?accion=pdf (desde el historial) abre directamente el diálogo de impresión.
 */
export default function BudgetDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useData();
  const actions = useBudgetActions();
  const handled = useRef(false);

  const presupuesto = (data.presupuestos ?? []).find((p) => p.id === id);
  const pasajero = presupuesto ? data.pasajeros.find((p) => p.id === presupuesto.pasajeroId) : null;
  const institucion = presupuesto?.institucionId ? data.instituciones.find((i) => i.id === presupuesto.institucionId) : null;
  const backTo = location.state?.from ?? "/presupuestos";
  const backState = location.state?.backState;
  const backLabel = backTo.startsWith("/pasajeros") ? "Volver a la ficha del pasajero" : "Volver a Presupuestos";
  const accion = searchParams.get("accion");

  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!presupuesto || !accion || handled.current) return;
    handled.current = true;
    // Se quita el parámetro para que recargar la página no vuelva a imprimir.
    // El temporizador no se cancela con ese cambio de URL: solo si se sale de la pantalla.
    setSearchParams({}, { replace: true, state: location.state });
    setTimeout(() => {
      if (!mounted.current) return;
      if (accion === "imprimir") actions.print(presupuesto, pasajero);
      if (accion === "pdf") actions.savePdf(presupuesto, pasajero);
    }, 300);
  }, [accion, presupuesto, pasajero, actions, setSearchParams, location.state]);

  if (!presupuesto) {
    return (
      <ContentCard>
        <EmptyState icon={FileText} title="Presupuesto no encontrado">
          <p>El presupuesto solicitado no existe, fue eliminado o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/presupuestos" className="btn-app btn-app-primary">Volver a Presupuestos</Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const delPasajero = (data.presupuestos ?? []).filter((p) => p.pasajeroId === presupuesto.pasajeroId);

  const handleDelete = async () => {
    if (await actions.remove(presupuesto)) navigate(backTo, { state: backState, replace: true });
  };

  return (
    <>
      <Link to={backTo} state={backState} className="back-link no-print">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {backLabel}
      </Link>

      <PageHeader
        title={`Presupuesto ${presupuesto.id}`}
        subtitle={`${fullName(pasajero)} · Total ${formatAmount(presupuesto.total)}`}
        actions={
          <>
            <button type="button" className="btn-app btn-app-primary btn-app-lg" onClick={() => actions.print(presupuesto, pasajero)}>
              <Printer size={18} strokeWidth={2} aria-hidden="true" />
              Imprimir
            </button>
            <button type="button" className="btn-app btn-app-outline btn-app-lg" onClick={() => actions.savePdf(presupuesto, pasajero)}>
              <FileDown size={18} strokeWidth={2} aria-hidden="true" />
              Guardar PDF
            </button>
            <Link
              to={`/presupuestos/${presupuesto.id}/editar`}
              state={{ from: `/presupuestos/${presupuesto.id}`, backState: location.state }}
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

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <BudgetDocument presupuesto={presupuesto} pasajero={pasajero} institucion={institucion} />
        </div>
        <div className="col-12 col-xl-4 no-print">
          <ContentCard title="Pasajero" className="mb-4">
            {pasajero ? (
              <dl className="detail-grid">
                <DetailItem label="Nombre">
                  <Link to={`/pasajeros/${pasajero.id}#presupuestos`} className="link-app">
                    {fullName(pasajero)}
                  </Link>{" "}
                  {!pasajero.activo && <StatusBadge type="pasajero" estado="inactivo" />}
                </DetailItem>
                <DetailItem label="DNI">{formatDni(pasajero.dni)}</DetailItem>
                <DetailItem label="Presupuestos del pasajero">
                  {`${delPasajero.length} · total ${formatAmount(sumarImportes(delPasajero))}`}
                </DetailItem>
              </dl>
            ) : (
              <p className="section-empty">El pasajero asociado ({presupuesto.pasajeroId}) no existe.</p>
            )}
          </ContentCard>
          <ContentCard title="Registro">
            <dl className="detail-grid">
              <DetailItem label="Identificador">{presupuesto.id}</DetailItem>
              <DetailItem label="Registrado el">{presupuesto.registradoEl ? formatDateTime(presupuesto.registradoEl) : "Datos de demostración"}</DetailItem>
              {presupuesto.modificadoEl && <DetailItem label="Última modificación">{formatDateTime(presupuesto.modificadoEl)}</DetailItem>}
            </dl>
            <p className="field-hint mb-0 mt-3">
              Importe presupuestado: no es un ingreso cobrado. Para guardarlo como PDF use “Guardar PDF” y elija “Guardar como PDF” en el
              diálogo de impresión del navegador.
            </p>
          </ContentCard>
        </div>
      </div>
    </>
  );
}
