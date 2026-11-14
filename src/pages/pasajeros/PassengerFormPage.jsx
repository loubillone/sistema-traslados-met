import { useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, UserX } from "lucide-react";
import Swal from "sweetalert2";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import EmptyState from "../../components/common/EmptyState";
import PassengerForm from "../../components/pasajeros/PassengerForm";
import useData from "../../hooks/useData";
import { EMPTY_PASSENGER_FORM } from "../../constants/pasajeros";
import { todayISO } from "../../utils/dates";
import { createPassengerRecord, formToPassengerFields, passengerToForm } from "../../utils/passengers";
import { fullName } from "../../utils/selectors";
import { normalizeDni, validatePassengerForm } from "../../utils/validation";

const swalSuccess = (options) =>
  Swal.fire({
    icon: "success",
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#1c398e",
    customClass: { popup: "swal-app" },
    ...options,
  });

/** Alta (CU-02) y edición (CU-03) de pasajeros. */
export default function PassengerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, addItem, updateItem } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pasajero = isEdit ? data.pasajeros.find((p) => p.id === id) : null;

  const validate = useCallback(
    (form) => validatePassengerForm(form, { pasajeros: data.pasajeros, editingId: isEdit ? id : null }),
    [data.pasajeros, isEdit, id],
  );

  if (isEdit && !pasajero) {
    return (
      <ContentCard>
        <EmptyState icon={UserX} title="Pasajero no encontrado">
          <p>El pasajero solicitado no existe o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/pasajeros" className="btn-app btn-app-primary">
              Volver a Pasajeros
            </Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const initialValues = isEdit
    ? passengerToForm(pasajero)
    : { ...EMPTY_PASSENGER_FORM, dni: normalizeDni(searchParams.get("dni") ?? "").replace(/\D/g, "").slice(0, 8) };

  const handleSubmit = (form) => {
    if (isEdit) {
      // El id y el DNI no cambian: se preservan las relaciones con viajes, asistencias y presupuestos.
      updateItem("pasajeros", id, formToPassengerFields(form));
      navigate(`/pasajeros/${id}`);
      swalSuccess({ title: "Ficha actualizada", text: `Los datos de ${form.nombre.trim()} ${form.apellido.trim()} se guardaron correctamente.` });
      return;
    }

    const record = createPassengerRecord(form, todayISO());
    const newId = addItem("pasajeros", record);
    navigate(`/pasajeros/${newId}`);
    swalSuccess({
      title: "Pasajero registrado",
      html: `<b>${record.nombre} ${record.apellido}</b> (DNI ${record.dni}) fue incorporado al sistema.<br/>Ya puede consultarse por su DNI.`,
    });
  };

  const backTo = isEdit ? `/pasajeros/${id}` : "/pasajeros";

  return (
    <>
      <Link to={backTo} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {isEdit ? "Volver a la ficha" : "Volver a Pasajeros"}
      </Link>
      <PageHeader
        title={isEdit ? `Editar ficha de ${fullName(pasajero)}` : "Nuevo Pasajero"}
        subtitle={
          isEdit
            ? `DNI ${pasajero.dni} · Actualice los datos personales, de contacto y de traslado`
            : "Complete los datos para registrar un nuevo pasajero"
        }
      />
      <PassengerForm
        key={id ?? "nuevo"}
        mode={isEdit ? "edit" : "create"}
        initialValues={initialValues}
        instituciones={data.instituciones}
        validate={validate}
        onSubmit={handleSubmit}
        onCancel={() => navigate(backTo)}
      />
    </>
  );
}
