import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ReceiptText } from "lucide-react";
import Swal from "sweetalert2";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import EmptyState from "../../components/common/EmptyState";
import ExpenseForm from "../../components/gastos/ExpenseForm";
import useData from "../../hooks/useData";
import { EMPTY_EXPENSE_FORM } from "../../constants/gastos";
import { showToast } from "../../utils/alerts";
import { formatDate, nowStamp, todayISO } from "../../utils/dates";
import { escapeHtml, formatAmount } from "../../utils/format";
import {
  categoriaLabel,
  describeExpenseChanges,
  expenseToForm,
  formToExpenseFields,
  getTripExpenses,
  latestEligibleDate,
  sumAmounts,
  tripAcceptsExpenses,
  validateExpenseForm,
} from "../../utils/expenses";

const swalSuccess = (options) =>
  Swal.fire({ icon: "success", confirmButtonText: "Aceptar", confirmButtonColor: "#1c398e", customClass: { popup: "swal-app" }, ...options });

/** Valores del alta: con ?viaje=ID el viaje llega precargado (desde su detalle). */
function buildCreateValues(data, viajeParam, today) {
  const viaje = viajeParam ? data.viajes.find((v) => v.id === viajeParam) : null;
  if (viaje && tripAcceptsExpenses(viaje)) {
    return { ...EMPTY_EXPENSE_FORM, diaViaje: viaje.fecha, viajeId: viaje.id, fecha: viaje.fecha };
  }
  const dia = latestEligibleDate(data.viajes, today);
  return { ...EMPTY_EXPENSE_FORM, diaViaje: dia, fecha: dia };
}

/** Registro (CU-13) y edición de gastos por viaje. */
export default function ExpenseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, addItem, updateItem } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [today] = useState(todayISO);

  const gasto = isEdit ? (data.gastos ?? []).find((g) => g.id === id) : null;
  const viajeParam = isEdit ? "" : searchParams.get("viaje") ?? "";
  const viajeParamRecord = viajeParam ? data.viajes.find((v) => v.id === viajeParam) : null;

  const validate = useCallback((form) => validateExpenseForm(form, { data, editing: gasto, today }), [data, gasto, today]);

  // Se vuelve a la pantalla de origen: listado (con filtros), detalle del gasto o del viaje.
  const backTo = location.state?.from ?? (isEdit ? `/gastos/${id}` : viajeParamRecord ? `/viajes/${viajeParam}` : "/gastos");
  const backState = location.state?.backState;
  const backLabel = backTo.startsWith("/viajes") ? "Volver al viaje" : backTo.startsWith(`/gastos/${id}`) ? "Volver al gasto" : "Volver a Gastos";
  const goBack = () => navigate(backTo, { state: backState });

  if (isEdit && !gasto) {
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

  const paramNotice =
    viajeParam && !viajeParamRecord
      ? `El viaje ${viajeParam} no existe. Seleccione otro viaje.`
      : viajeParamRecord && !tripAcceptsExpenses(viajeParamRecord)
        ? `El viaje ${viajeParam} no admite gastos: solo se registran para viajes en curso o finalizados.`
        : null;

  const handleSubmit = (form) => {
    const fields = formToExpenseFields(form);

    if (isEdit) {
      const cambios = describeExpenseChanges(gasto, fields);
      if (cambios.length === 0) {
        showToast("No se realizaron cambios", "info");
        goBack();
        return true;
      }
      updateItem("gastos", id, { ...fields, modificadoEl: nowStamp() });
      goBack();
      swalSuccess({ title: "Gasto actualizado", html: `Se guardaron los cambios del gasto <b>${id}</b>: ${escapeHtml(cambios.join(" · "))}.` });
      return true;
    }

    const newId = addItem("gastos", { ...fields, registradoEl: nowStamp() });
    const delViaje = [...getTripExpenses(data.gastos, fields.viajeId), fields];
    if (backTo.startsWith("/viajes")) goBack();
    else navigate(`/gastos/${newId}`, { state: { from: backTo, backState } });
    swalSuccess({
      title: "Gasto registrado",
      html:
        `Se registró el gasto <b>${newId}</b> de <b>${escapeHtml(categoriaLabel(fields.categoria))}</b> por <b>${formatAmount(fields.monto)}</b> ` +
        `del ${formatDate(fields.fecha)}, asociado al viaje <b>${fields.viajeId}</b>.<br/>` +
        `Total de gastos del viaje: <b>${formatAmount(sumAmounts(delViaje))}</b> (${delViaje.length} ${delViaje.length === 1 ? "gasto" : "gastos"}).`,
    });
    return true;
  };

  const initialValues = isEdit ? expenseToForm(gasto, data.viajes.find((v) => v.id === gasto.viajeId)) : buildCreateValues(data, viajeParam, today);

  return (
    <>
      <Link to={backTo} state={backState} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {backLabel}
      </Link>
      <PageHeader
        title={isEdit ? `Editar gasto ${id}` : "Registrar Gasto"}
        subtitle={isEdit ? "Modifique los datos del gasto. El viaje asociado no se modifica." : "Registre un gasto operativo asociado a un viaje en curso o finalizado"}
      />
      {paramNotice && (
        <div className="trip-notice trip-notice--warning" role="alert">
          <span>{paramNotice}</span>
        </div>
      )}
      <ExpenseForm
        key={id ?? `nuevo-${viajeParam}`}
        data={data}
        editing={gasto}
        today={today}
        initialValues={initialValues}
        initialTouched={!isEdit && viajeParamRecord && tripAcceptsExpenses(viajeParamRecord) ? ["viajeId"] : []}
        validate={validate}
        onSubmit={handleSubmit}
        onCancel={goBack}
      />
    </>
  );
}
