import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserX } from "lucide-react";
import Swal from "sweetalert2";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import EmptyState from "../../components/common/EmptyState";
import DriverForm from "../../components/recursos/DriverForm";
import useData from "../../hooks/useData";
import { affectedTripsHtml } from "../../hooks/useResourceActions";
import { EMPTY_DRIVER_FORM } from "../../constants/recursos";
import { todayISO } from "../../utils/dates";
import { escapeHtml } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { normalizeDni } from "../../utils/validation";
import { driverToForm, formToDriverFields, getAffectedDriverTrips, validateDriverForm } from "../../utils/resources";

const swalBase = { confirmButtonColor: "#1c398e", cancelButtonColor: "#6a7282", reverseButtons: true, customClass: { popup: "swal-app" } };

/** Alta y edición de choferes (CU-11). */
export default function DriverFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, addItem, updateItem } = useData();
  const navigate = useNavigate();
  const [today] = useState(todayISO);
  const chofer = isEdit ? data.choferes.find((c) => c.id === id) : null;

  const validate = useCallback(
    (form) => validateDriverForm(form, { choferes: data.choferes, editingId: isEdit ? id : null, today }),
    [data.choferes, isEdit, id, today],
  );

  if (isEdit && !chofer) {
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

  const handleSubmit = async (form) => {
    const fields = formToDriverFields(form);

    if (isEdit) {
      // Si los cambios dejan viajes futuros sin cumplir las reglas, se avisa antes de guardar.
      const antes = new Set(getAffectedDriverTrips(data.viajes, chofer, today).map((v) => v.id));
      const nuevos = getAffectedDriverTrips(data.viajes, { ...chofer, ...fields }, today).filter((v) => !antes.has(v.id));
      if (nuevos.length) {
        const result = await Swal.fire({
          ...swalBase,
          title: "¿Guardar los cambios?",
          html: affectedTripsHtml(nuevos, data.pasajeros),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Guardar igualmente",
          cancelButtonText: "Revisar",
        });
        if (!result.isConfirmed) return false;
      }
      // El identificador y el DNI no cambian: se conservan las relaciones con los viajes.
      updateItem("choferes", id, fields);
      navigate(`/choferes/${id}`);
      Swal.fire({ ...swalBase, icon: "success", title: "Ficha actualizada", text: `Los datos de ${fields.nombre} ${fields.apellido} se guardaron correctamente.`, confirmButtonText: "Aceptar" });
      return true;
    }

    const record = { dni: normalizeDni(form.dni), ...fields, activo: true, fechaBaja: null, fechaAlta: today };
    const newId = addItem("choferes", record);
    navigate(`/choferes/${newId}`);
    Swal.fire({
      ...swalBase,
      icon: "success",
      title: "Chofer registrado",
      html: `<b>${escapeHtml(`${record.nombre} ${record.apellido}`)}</b> (DNI ${record.dni}) ya puede asignarse a viajes${
        record.disponibilidad === "no_disponible" ? " cuando esté disponible" : ""
      }.`,
      confirmButtonText: "Aceptar",
    });
    return true;
  };

  const backTo = isEdit ? `/choferes/${id}` : "/choferes";

  return (
    <>
      <Link to={backTo} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {isEdit ? "Volver a la ficha" : "Volver a Choferes"}
      </Link>
      <PageHeader
        title={isEdit ? `Editar ficha de ${fullName(chofer)}` : "Nuevo Chofer"}
        subtitle={isEdit ? `DNI ${chofer.dni} · Actualice los datos, la licencia y la disponibilidad` : "Complete los datos para registrar un chofer"}
      />
      <DriverForm
        key={id ?? "nuevo"}
        mode={isEdit ? "edit" : "create"}
        initialValues={isEdit ? driverToForm(chofer) : EMPTY_DRIVER_FORM}
        validate={validate}
        onSubmit={handleSubmit}
        onCancel={() => navigate(backTo)}
        today={today}
      />
    </>
  );
}
