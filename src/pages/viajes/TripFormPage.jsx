import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Ban, CalendarClock, CarFront } from "lucide-react";
import Swal from "sweetalert2";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import EmptyState from "../../components/common/EmptyState";
import TripForm from "../../components/viajes/TripForm";
import useData from "../../hooks/useData";
import { currentTime, formatDate, nowStamp, todayISO } from "../../utils/dates";
import { escapeHtml } from "../../utils/format";
import { fullName } from "../../utils/selectors";
import { showToast } from "../../utils/alerts";
import { TRAMOS } from "../../constants/agenda";
import { checkTurnoTrip, describeDias, findOccurrenceTrip, turnoLegs, turnoTripValues } from "../../utils/schedules";
import {
  appendTripEvent,
  describeTripChanges,
  EMPTY_TRIP_FORM,
  formToTripFields,
  getEditBlockReason,
  isLegacyReturnTrip,
  routeFields,
  tripRoute,
  tripToForm,
  validateTripForm,
} from "../../utils/trips";

const swalSuccess = (options) =>
  Swal.fire({
    icon: "success",
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#1c398e",
    customClass: { popup: "swal-app" },
    ...options,
  });

/** Valores iniciales del alta: si llega ?pasajero=ID se ofrecen sus datos habituales. */
function buildCreateValues(data, pasajeroId) {
  if (!pasajeroId) return EMPTY_TRIP_FORM;
  const pasajero = data.pasajeros.find((p) => p.id === pasajeroId);
  const tipo = pasajero?.tipoViaje ?? EMPTY_TRIP_FORM.tipo;
  return {
    ...EMPTY_TRIP_FORM,
    pasajeroId,
    ...routeFields(tipo, pasajero?.domicilio ?? ""),
    institucionId: pasajero?.institucionId ?? "",
    tipo,
  };
}

/** Registro (CU-04) y edición de viajes programados. */
export default function TripFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data, addItem, updateItem } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // La fecha de referencia se fija al abrir el formulario.
  const [today] = useState(todayISO);

  const viaje = isEdit ? data.viajes.find((v) => v.id === id) : null;
  const pasajeroParam = searchParams.get("pasajero") ?? "";
  const turnoParam = isEdit ? "" : searchParams.get("turno") ?? "";
  const turno = turnoParam ? (data.turnos ?? []).find((t) => t.id === turnoParam) : null;
  const tramo = turno ? (turnoLegs(turno).some((l) => l.tramo === searchParams.get("tramo")) ? searchParams.get("tramo") : turnoLegs(turno)[0]?.tramo) : null;

  const validate = useCallback(
    (form) => {
      const errors = validateTripForm(form, { data, editing: viaje, today, now: currentTime() });
      if (!turno) return errors;
      // Desde un turno: el día debe ser uno de los configurados y no se duplican viajes.
      const chequeo = checkTurnoTrip(data, turno, { fecha: form.fecha, tramo }, today);
      if (chequeo.error && !errors.fecha) errors.fecha = chequeo.error;
      const existente = form.fecha ? findOccurrenceTrip(data.viajes, turno, form.fecha, tramo, form.hora || chequeo.hora) : null;
      if (existente && !errors.fecha) errors.fecha = `Ya existe el viaje ${existente.id} (${existente.hora}) para este pasajero en esa fecha: no se creará un duplicado.`;
      return errors;
    },
    [data, viaje, today, turno, tramo],
  );

  const backTo = isEdit ? `/viajes/${id}` : location.state?.from ?? (turno ? `/agenda/${turno.id}` : "/viajes");

  if (turnoParam && !turno) {
    return (
      <ContentCard>
        <EmptyState icon={CarFront} title="Turno no encontrado">
          <p>El turno {turnoParam} no existe o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/agenda" className="btn-app btn-app-primary">Volver a la Agenda</Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  if (isEdit && !viaje) {
    return (
      <ContentCard>
        <EmptyState icon={CarFront} title="Viaje no encontrado">
          <p>El viaje solicitado no existe o los datos de demostración fueron restaurados.</p>
          <div className="empty-state-actions">
            <Link to="/viajes" className="btn-app btn-app-primary">
              Volver a Viajes
            </Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const blockReason = isEdit ? getEditBlockReason(viaje, data.asistencias) : null;
  if (blockReason) {
    return (
      <ContentCard>
        <EmptyState icon={Ban} title="Este viaje no puede editarse">
          <p>{blockReason}</p>
          <p>Los viajes finalizados y cancelados se conservan sin cambios como registro histórico.</p>
          <div className="empty-state-actions">
            <Link to={`/viajes/${id}`} className="btn-app btn-app-primary">
              Ver detalle del viaje
            </Link>
          </div>
        </EmptyState>
      </ContentCard>
    );
  }

  const pasajeroViaje = isEdit ? data.pasajeros.find((p) => p.id === viaje.pasajeroId) : null;

  // Viaje de vuelta guardado antes de la corrección del recorrido: se avisa al
  // operador; el registro solo cambia si confirma la edición.
  const rutaGuardada = isEdit && isLegacyReturnTrip(viaje) ? tripRoute(viaje, data.instituciones.find((i) => i.id === viaje.institucionId)) : null;
  const legacyNotice = rutaGuardada
    ? "Este viaje de vuelta se registró antes de la corrección del recorrido (" + rutaGuardada.origen + " → " + rutaGuardada.destino +
      "). Se muestra con el sentido de una vuelta: institución → domicilio. El registro guardado solo cambia si confirma la edición."
    : null;

  const handleSubmit = (form) => {
    const fields = formToTripFields(form);

    if (isEdit) {
      const cambios = describeTripChanges(viaje, fields, data);
      if (cambios.length === 0) {
        showToast("No se realizaron cambios", "info");
        navigate(`/viajes/${id}`);
        return;
      }
      updateItem("viajes", id, {
        ...fields,
        eventos: appendTripEvent(viaje, { fecha: nowStamp(), tipo: "edicion", detalle: cambios.join(" · ") }),
      });
      navigate(`/viajes/${id}`, { state: location.state });
      swalSuccess({ title: "Viaje actualizado", text: `Los cambios del viaje ${id} se guardaron correctamente.` });
      return;
    }

    const pasajero = data.pasajeros.find((p) => p.id === form.pasajeroId);
    const record = {
      ...fields,
      pasajeroId: form.pasajeroId,
      estado: "programado",
      creadoEl: nowStamp(),
      // Vínculo con el turno recurrente del que se programó (Etapa 5B).
      ...(turno ? { turnoId: turno.id, tramo } : {}),
      eventos: [
        {
          fecha: nowStamp(),
          tipo: "creacion",
          detalle: turno
            ? `Viaje registrado con estado Programado desde el turno ${turno.id} (${TRAMOS[tramo].toLowerCase()})`
            : "Viaje registrado con estado Programado",
        },
      ],
    };
    const newId = addItem("viajes", record);
    navigate(`/viajes/${newId}`);
    swalSuccess({
      title: "Viaje registrado",
      html:
        `El viaje <b>${newId}</b> de <b>${escapeHtml(fullName(pasajero))}</b> quedó programado para el ` +
        `<b>${formatDate(record.fecha)}</b> a las <b>${record.hora}</b>.<br/>Ya figura en el listado de viajes y en el historial del pasajero.`,
    });
  };

  return (
    <>
      <Link to={backTo} state={isEdit ? location.state : undefined} className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {isEdit ? "Volver al viaje" : backTo.startsWith("/agenda") ? "Volver al turno" : backTo.startsWith("/pasajeros") ? "Volver a la ficha del pasajero" : "Volver a Viajes"}
      </Link>
      <PageHeader
        title={isEdit ? `Editar viaje ${id}` : "Nuevo Viaje"}
        subtitle={
          isEdit
            ? `${fullName(pasajeroViaje)} · ${formatDate(viaje.fecha)} a las ${viaje.hora}. Se vuelven a validar la disponibilidad y los conflictos.`
            : turno
              ? "Viaje concreto a partir de un turno recurrente: asigne chofer y vehículo y confirme"
              : "Registre un traslado programado para un pasajero existente"
        }
      />
      {turno && (
        <div className="trip-notice trip-notice--info" role="status" data-testid="viaje-desde-turno">
          <CalendarClock size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            Desde el turno <Link to={`/agenda/${turno.id}`} className="link-app">{turno.id}</Link> ·{" "}
            {TRAMOS[tramo]} {turnoLegs(turno).find((l) => l.tramo === tramo)?.hora} · {describeDias(turno.dias)} ·{" "}
            {tramo === "vuelta" ? "de la institución al domicilio" : "del domicilio a la institución"}. El viaje se crea solo al
            confirmar el formulario.
          </span>
        </div>
      )}
      <TripForm
        key={id ?? `nuevo-${pasajeroParam}-${turnoParam}-${tramo ?? ""}`}
        lockPassenger={Boolean(turno)}
        legacyNotice={legacyNotice}
        data={data}
        editing={viaje}
        today={today}
        initialValues={isEdit ? tripToForm(viaje) : turno ? turnoTripValues(data, turno, searchParams.get("fecha"), tramo) : buildCreateValues(data, pasajeroParam)}
        initialTouched={turno ? ["pasajeroId", "fecha"] : !isEdit && pasajeroParam ? ["pasajeroId"] : []}
        validate={validate}
        onSubmit={handleSubmit}
        onCancel={() => navigate(backTo, { state: isEdit ? location.state : undefined })}
      />
    </>
  );
}
