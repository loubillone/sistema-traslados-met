import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Swal from "sweetalert2";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import EmptyState from "../../components/common/EmptyState";
import BudgetForm from "../../components/presupuestos/BudgetForm";
import useData from "../../hooks/useData";
import { EMPTY_BUDGET_FORM } from "../../constants/presupuestos";
import { showToast } from "../../utils/alerts";
import { formatDate, nowStamp, todayISO } from "../../utils/dates";
import { escapeHtml, formatAmount } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import {
  budgetToForm,
  describeBudgetChanges,
  formatKm,
  formToBudgetFields,
  suggestedTarifa,
  validateBudgetForm,
} from "../../utils/budgets";

const swalSuccess = (options) =>
  Swal.fire({ icon: "success", confirmButtonText: "Aceptar", confirmButtonColor: "#1c398e", customClass: { popup: "swal-app" }, ...options });

/** Valores del alta: con ?pasajero=ID llega precargado (desde su ficha). */
function buildCreateValues(data, pasajeroParam, today) {
  const pasajero = pasajeroParam ? data.pasajeros.find((p) => p.id === pasajeroParam && p.activo) : null;
  return {
    ...EMPTY_BUDGET_FORM,
    pasajeroId: pasajero?.id ?? "",
    institucionId: pasajero?.institucionId ?? "",
    fecha: today,
    tarifaKm: suggestedTarifa(data.presupuestos ?? []),
  };
}

/** Cálculo (CU-14) y edición de presupuestos. */
export default function BudgetFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, addItem, updateItem } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [today] = useState(todayISO);

  const presupuesto = isEdit ? (data.presupuestos ?? []).find((p) => p.id === id) : null;
  const pasajeroParam = isEdit ? "" : searchParams.get("pasajero") ?? "";
  const pasajeroParamRecord = pasajeroParam ? data.pasajeros.find((p) => p.id === pasajeroParam) : null;

  const validate = useCallback((form) => validateBudgetForm(form, { data, editing: presupuesto, today }), [data, presupuesto, today]);

  // Se vuelve a la pantalla de origen: historial (con filtros), detalle o ficha del pasajero.
  const backTo = location.state?.from ?? (isEdit ? `/presupuestos/${id}` : pasajeroParamRecord ? `/pasajeros/${pasajeroParam}#presupuestos` : "/presupuestos");
  const backState = location.state?.backState;
  const backLabel = backTo.startsWith("/pasajeros")
    ? "Volver a la ficha del pasajero"
    : isEdit && backTo.startsWith(`/presupuestos/${id}`)
      ? "Volver al presupuesto"
      : "Volver a Presupuestos";
  const goBack = () => navigate(backTo, { state: backState });

  if (isEdit && !presupuesto) {
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

  const paramNotice =
    pasajeroParam && !pasajeroParamRecord
      ? `El pasajero ${pasajeroParam} no existe. Seleccione otro pasajero.`
      : pasajeroParamRecord && !pasajeroParamRecord.activo
        ? `${fullName(pasajeroParamRecord)} está inactivo: reactívelo para emitirle presupuestos.`
        : null;

  const handleSubmit = (form) => {
    const fields = formToBudgetFields(form);

    if (isEdit) {
      const cambios = describeBudgetChanges(presupuesto, fields, data.instituciones);
      if (cambios.length === 0) {
        showToast("No se realizaron cambios", "info");
        goBack();
        return true;
      }
      // El pasajero no se modifica: solo se actualizan los datos del cálculo.
      updateItem("presupuestos", id, { ...fields, modificadoEl: nowStamp() });
      goBack();
      swalSuccess({ title: "Presupuesto actualizado", html: `Se guardaron los cambios del presupuesto <b>${id}</b>: ${escapeHtml(cambios.join(" · "))}.` });
      return true;
    }

    const pasajero = data.pasajeros.find((p) => p.id === form.pasajeroId);
    const newId = addItem("presupuestos", { pasajeroId: form.pasajeroId, ...fields, registradoEl: nowStamp() });
    if (backTo.startsWith("/pasajeros")) goBack();
    else navigate(`/presupuestos/${newId}`, { state: { from: backTo, backState } });
    swalSuccess({
      title: "Presupuesto guardado",
      html:
        `Se registró el presupuesto <b>${newId}</b> para <b>${escapeHtml(fullName(pasajero))}</b> del ${formatDate(fields.fecha)}:<br/>` +
        `${formatKm(fields.kilometros)} × ${formatAmount(fields.tarifaKm)} = <b>${formatAmount(fields.total)}</b>.<br/>` +
        "Ya figura en el historial y en la ficha del pasajero.",
    });
    return true;
  };

  return (
    <>
      <Link to={backTo} state={backState} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {backLabel}
      </Link>
      <PageHeader
        title={isEdit ? `Editar presupuesto ${id}` : "Nuevo Presupuesto"}
        subtitle={isEdit ? "Modifique la fecha, el recorrido, la tarifa o las observaciones. El total se recalcula automáticamente." : "Calcule el importe de un traslado: kilómetros × tarifa por kilómetro"}
      />
      {paramNotice && (
        <div className="trip-notice trip-notice--warning" role="alert">
          <span>{paramNotice}</span>
        </div>
      )}
      <BudgetForm
        key={id ?? `nuevo-${pasajeroParam}`}
        data={data}
        editing={presupuesto}
        today={today}
        initialValues={isEdit ? budgetToForm(presupuesto) : buildCreateValues(data, pasajeroParam, today)}
        initialTouched={!isEdit && pasajeroParamRecord?.activo ? ["pasajeroId"] : []}
        validate={validate}
        onSubmit={handleSubmit}
        onCancel={goBack}
      />
    </>
  );
}
