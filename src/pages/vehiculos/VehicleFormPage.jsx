import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Truck } from "lucide-react";
import Swal from "sweetalert2";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import EmptyState from "../../components/common/EmptyState";
import VehicleForm from "../../components/recursos/VehicleForm";
import useData from "../../hooks/useData";
import { affectedTripsHtml } from "../../hooks/useResourceActions";
import { EMPTY_VEHICLE_FORM } from "../../constants/recursos";
import { todayISO } from "../../utils/dates";
import { escapeHtml } from "../../utils/format";
import { formToVehicleFields, getAffectedVehicleTrips, validateVehicleForm, vehicleToForm } from "../../utils/resources";

const swalBase = { confirmButtonColor: "#1c398e", cancelButtonColor: "#6a7282", reverseButtons: true, customClass: { popup: "swal-app" } };

/** Alta y edición de vehículos (CU-12). */
export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, addItem, updateItem } = useData();
  const navigate = useNavigate();
  const [today] = useState(todayISO);
  const vehiculo = isEdit ? data.vehiculos.find((v) => v.id === id) : null;

  const validate = useCallback(
    (form) => validateVehicleForm(form, { vehiculos: data.vehiculos, editingId: isEdit ? id : null, today }),
    [data.vehiculos, isEdit, id, today],
  );

  if (isEdit && !vehiculo) {
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

  const handleSubmit = async (form) => {
    const fields = formToVehicleFields(form);

    if (isEdit) {
      const antes = new Set(getAffectedVehicleTrips(data.viajes, vehiculo, today).map((v) => v.id));
      const nuevos = getAffectedVehicleTrips(data.viajes, { ...vehiculo, ...fields }, today).filter((v) => !antes.has(v.id));
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
      updateItem("vehiculos", id, fields);
      navigate(`/vehiculos/${id}`);
      Swal.fire({ ...swalBase, icon: "success", title: "Vehículo actualizado", text: `Los datos de ${vehiculo.patente} se guardaron correctamente.`, confirmButtonText: "Aceptar" });
      return true;
    }

    const record = { patente: form.patente, ...fields, activo: true, fechaBaja: null, fechaAlta: today };
    const newId = addItem("vehiculos", record);
    navigate(`/vehiculos/${newId}`);
    Swal.fire({
      ...swalBase,
      icon: "success",
      title: "Vehículo registrado",
      html: `<b>${escapeHtml(record.patente)}</b> (${escapeHtml(record.tipo)}, ${record.capacidad} pasajeros) se incorporó a la flota${
        record.estado === "mantenimiento" ? " en mantenimiento" : " y ya puede asignarse a viajes"
      }.`,
      confirmButtonText: "Aceptar",
    });
    return true;
  };

  const backTo = isEdit ? `/vehiculos/${id}` : "/vehiculos";

  return (
    <>
      <Link to={backTo} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {isEdit ? "Volver a la ficha" : "Volver a Vehículos"}
      </Link>
      <PageHeader
        title={isEdit ? `Editar vehículo ${vehiculo.patente}` : "Nuevo Vehículo"}
        subtitle={isEdit ? "Actualice los datos, la documentación y el estado" : "Complete los datos para incorporar un vehículo a la flota"}
      />
      <VehicleForm
        key={id ?? "nuevo"}
        mode={isEdit ? "edit" : "create"}
        initialValues={isEdit ? vehicleToForm(vehiculo) : EMPTY_VEHICLE_FORM}
        validate={validate}
        onSubmit={handleSubmit}
        onCancel={() => navigate(backTo)}
        today={today}
      />
    </>
  );
}
