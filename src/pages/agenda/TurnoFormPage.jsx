import { useCallback } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarX } from "lucide-react";
import Swal from "sweetalert2";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import EmptyState from "../../components/common/EmptyState";
import TurnoForm from "../../components/agenda/TurnoForm";
import useData from "../../hooks/useData";
import { EMPTY_TURNO_FORM } from "../../constants/agenda";
import { todayISO } from "../../utils/dates";
import { escapeHtml } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { describeDias, describeHorario, formToTurnoFields, turnoToForm, validateTurnoForm } from "../../utils/schedules";

const swalBase = { confirmButtonColor: "#1c398e", customClass: { popup: "swal-app" }, confirmButtonText: "Aceptar" };

/** Alta (CU-10) y edición de turnos recurrentes. */
export default function TurnoFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, addItem, updateItem } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const turno = isEdit ? (data.turnos ?? []).find((t) => t.id === id) : null;

  const validate = useCallback((form) => validateTurnoForm(form, { data, editingId: isEdit ? id : null }), [data, isEdit, id]);

  if (isEdit && !turno) {
    return (
      <ContentCard>
        <EmptyState icon={CalendarX} title="Turno no encontrado">
          <p>El turno solicitado no existe o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/agenda" className="btn-app btn-app-primary">Volver a la Agenda</Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  if (isEdit && !turno.activo) {
    return (
      <ContentCard>
        <EmptyState icon={CalendarX} title="Turno desactivado">
          <p>Reactive el turno {turno.id} para poder editarlo. Sus datos se conservan.</p>
          <div className="empty-state-actions">
            <Link to={`/agenda/${turno.id}`} className="btn-app btn-app-primary">Ver turno</Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  // Desde la ficha del pasajero se precarga el pasajero y su institución habitual.
  const pasajeroParam = searchParams.get("pasajero") ?? "";
  const pasajeroInicial = data.pasajeros.find((p) => p.id === pasajeroParam);
  const initialValues = isEdit
    ? turnoToForm(turno)
    : { ...EMPTY_TURNO_FORM, pasajeroId: pasajeroParam, institucionId: pasajeroInicial?.institucionId ?? "" };

  const backTo = location.state?.from ?? (isEdit ? `/agenda/${id}` : "/agenda");

  const handleSubmit = (form) => {
    const fields = formToTurnoFields(form);
    const pasajero = data.pasajeros.find((p) => p.id === form.pasajeroId);
    if (isEdit) {
      // Los viajes ya registrados desde el turno no se modifican.
      updateItem("turnos", id, fields);
      navigate(`/agenda/${id}`);
      Swal.fire({ ...swalBase, icon: "success", title: "Turno actualizado", html: `Los cambios se aplican a la agenda desde ahora.<br/>Los viajes ya registrados no se modificaron.` });
      return;
    }
    const newId = addItem("turnos", { pasajeroId: form.pasajeroId, ...fields, activo: true, fechaAlta: todayISO(), fechaBaja: null });
    navigate(`/agenda/${newId}`);
    Swal.fire({
      ...swalBase,
      icon: "success",
      title: "Turno registrado",
      html: `<b>${escapeHtml(fullName(pasajero))}</b>: ${escapeHtml(describeDias(fields.dias))} · ${escapeHtml(describeHorario(fields))}.<br/>No se crearon viajes: prográmelos desde el turno cuando corresponda.`,
    });
  };

  return (
    <>
      <Link to={backTo} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {isEdit ? "Volver al turno" : backTo.startsWith("/pasajeros") ? "Volver a la ficha del pasajero" : "Volver a la Agenda"}
      </Link>
      <PageHeader
        title={isEdit ? `Editar turno ${id}` : "Nuevo Turno"}
        subtitle={isEdit ? `${fullName(data.pasajeros.find((p) => p.id === turno.pasajeroId))} · Los viajes ya registrados no se modifican` : "Registre el horario habitual de traslado de un pasajero"}
      />
      <TurnoForm
        key={id ?? `nuevo-${pasajeroParam}`}
        data={data}
        mode={isEdit ? "edit" : "create"}
        initialValues={initialValues}
        validate={validate}
        onSubmit={handleSubmit}
        onCancel={() => navigate(backTo)}
      />
    </>
  );
}
