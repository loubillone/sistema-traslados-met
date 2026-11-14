import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Car, ClipboardCheck, DollarSign, SquarePen, UserCheck, UserX } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import DetailItem from "../../components/common/DetailItem";
import EmptyState from "../../components/common/EmptyState";
import PassengerAgenda from "../../components/pasajeros/PassengerAgenda";
import PassengerTripsHistory from "../../components/pasajeros/PassengerTripsHistory";
import PassengerAttendanceHistory from "../../components/pasajeros/PassengerAttendanceHistory";
import PassengerBudgets from "../../components/pasajeros/PassengerBudgets";
import PassengerDocuments from "../../components/pasajeros/PassengerDocuments";
import useData from "../../hooks/useData";
import usePassengerActions from "../../hooks/usePassengerActions";
import { formatDate, todayISO } from "../../utils/dates";
import { formatCurrency } from "../../utils/format";
import { buildIndex, fullName } from "../../utils/selectors";
import { summarizeAttendance } from "../../utils/passengers";

/** Ficha completa del pasajero. Todos los datos provienen del DataProvider. */
export default function PassengerDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { data } = useData();
  const { deactivate, reactivate } = usePassengerActions();
  const today = todayISO();

  const pasajero = data.pasajeros.find((p) => p.id === id);

  const lookups = useMemo(
    () => ({
      instituciones: buildIndex(data.instituciones),
      choferes: buildIndex(data.choferes),
      vehiculos: buildIndex(data.vehiculos),
    }),
    [data.instituciones, data.choferes, data.vehiculos],
  );

  // Relación por identificador interno del pasajero (asociado a su DNI).
  const viajes = useMemo(() => data.viajes.filter((v) => v.pasajeroId === id), [data.viajes, id]);
  const viajesById = useMemo(() => buildIndex(viajes), [viajes]);
  const asistencias = useMemo(
    () =>
      data.asistencias
        .filter((a) => a.pasajeroId === id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)),
    [data.asistencias, id],
  );
  const presupuestos = useMemo(
    () => (data.presupuestos ?? []).filter((p) => p.pasajeroId === id).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [data.presupuestos, id],
  );
  const resumen = useMemo(() => summarizeAttendance(asistencias), [asistencias]);

  // Al llegar con #viajes, #asistencias, etc. se desplaza a la sección.
  useEffect(() => {
    if (!location.hash) return;
    const element = document.getElementById(location.hash.slice(1));
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, id]);

  if (!pasajero) {
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

  const institucion = lookups.instituciones[pasajero.institucionId];
  const realizados = viajes.filter((v) => v.estado === "finalizado").length;
  const programados = viajes.filter((v) => v.fecha >= today && (v.estado === "programado" || v.estado === "en_curso"));
  const proximoViaje = [...programados].sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))[0];
  const totalPresupuestado = presupuestos.reduce((sum, p) => sum + p.total, 0);
  const contacto = pasajero.contactoEmergencia ?? {};

  return (
    <>
      <Link to="/pasajeros" className="back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Volver a Pasajeros
      </Link>

      <PageHeader
        title={fullName(pasajero)}
        subtitle={
          <span className="detail-subtitle">
            DNI {pasajero.dni}
            <StatusBadge type="pasajero" estado={pasajero.activo ? "activo" : "inactivo"} />
          </span>
        }
        actions={
          <>
            <Link to={`/pasajeros/${pasajero.id}/editar`} className="btn-app btn-app-outline btn-app-lg">
              <SquarePen size={18} strokeWidth={2} aria-hidden="true" />
              Editar ficha
            </Link>
            {pasajero.activo ? (
              <button type="button" className="btn-app btn-app-danger-outline btn-app-lg" onClick={() => deactivate(pasajero)}>
                <UserX size={18} strokeWidth={2} aria-hidden="true" />
                Desactivar
              </button>
            ) : (
              <button type="button" className="btn-app btn-app-primary btn-app-lg" onClick={() => reactivate(pasajero)}>
                <UserCheck size={18} strokeWidth={2} aria-hidden="true" />
                Reactivar
              </button>
            )}
          </>
        }
      />

      {!pasajero.activo && (
        <div className="inactive-notice" role="status">
          <UserX size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            Pasajero inactivo{pasajero.fechaBaja ? ` desde el ${formatDate(pasajero.fechaBaja)}` : ""}. No puede
            seleccionarse para nuevos viajes; su historial se conserva.
          </span>
        </div>
      )}

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <StatCard
            layout="horizontal"
            icon={Car}
            color="navy"
            value={viajes.length}
            label="Viajes registrados"
            detail={`${realizados} realizados · ${programados.length} programados`}
          />
        </div>
        <div className="col-12 col-md-4">
          <StatCard
            layout="horizontal"
            icon={ClipboardCheck}
            color="green"
            value={resumen.porcentaje === null ? "—" : `${resumen.porcentaje}%`}
            label="Asistencia"
            detail={resumen.total ? `${resumen.presentes} presentes de ${resumen.total} registradas` : "Sin asistencias registradas"}
          />
        </div>
        <div className="col-12 col-md-4">
          <StatCard
            layout="horizontal"
            icon={DollarSign}
            color="yellow"
            value={presupuestos.length}
            label="Presupuestos"
            detail={presupuestos.length ? `Total ${formatCurrency(totalPresupuestado)}` : "Sin presupuestos"}
          />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-7">
          <ContentCard title="Datos personales" className="h-100">
            <dl className="detail-grid detail-grid--2">
              <DetailItem label="Nombre">{pasajero.nombre}</DetailItem>
              <DetailItem label="Apellido">{pasajero.apellido}</DetailItem>
              <DetailItem label="DNI">{pasajero.dni}</DetailItem>
              <DetailItem label="Teléfono">{pasajero.telefono}</DetailItem>
              <DetailItem label="Dirección" className="detail-span-2">{pasajero.domicilio}</DetailItem>
              <DetailItem label="Obra social">{pasajero.obraSocial}</DetailItem>
              <DetailItem label="Fecha de alta">{formatDate(pasajero.fechaAlta)}</DetailItem>
              <DetailItem label="Contacto de emergencia" className="detail-span-2">
                {contacto.nombre
                  ? `${contacto.nombre}${contacto.vinculo ? ` (${contacto.vinculo})` : ""}${contacto.telefono ? ` · ${contacto.telefono}` : ""}`
                  : ""}
              </DetailItem>
              <DetailItem label="Condición o necesidad particular" className="detail-span-2">
                {pasajero.condicion}
              </DetailItem>
              <DetailItem label="Observaciones" className="detail-span-2">
                {pasajero.observaciones}
              </DetailItem>
            </dl>
          </ContentCard>
        </div>

        <div className="col-12 col-xl-5 d-flex flex-column gap-4">
          <ContentCard title="Destino habitual">
            {institucion ? (
              <dl className="detail-grid">
                <DetailItem label="Institución">{institucion.nombre}</DetailItem>
                <DetailItem label="Dirección">
                  {[institucion.direccion, institucion.localidad].filter(Boolean).join(", ")}
                </DetailItem>
              </dl>
            ) : (
              <p className="section-empty">Sin institución de destino habitual asignada.</p>
            )}
          </ContentCard>

          <ContentCard title="Agenda" className="flex-grow-1">
            <PassengerAgenda
              pasajero={pasajero}
              chofer={lookups.choferes[pasajero.choferId]}
              vehiculo={lookups.vehiculos[pasajero.vehiculoId]}
              proximoViaje={proximoViaje}
            />
          </ContentCard>
        </div>
      </div>

      <section id="documentacion" className="detail-section mb-4">
        <ContentCard title="Documentación">
          <PassengerDocuments pasajero={pasajero} />
        </ContentCard>
      </section>

      <section id="viajes" className="detail-section mb-4">
        <ContentCard title="Historial de viajes">
          <PassengerTripsHistory viajes={viajes} todayIso={today} lookups={lookups} />
        </ContentCard>
      </section>

      <section id="asistencias" className="detail-section mb-4">
        <ContentCard title="Historial de asistencias">
          <PassengerAttendanceHistory
            asistencias={asistencias}
            resumen={resumen}
            viajesById={viajesById}
            lookups={lookups}
          />
        </ContentCard>
      </section>

      <section id="presupuestos" className="detail-section">
        <ContentCard title="Presupuestos">
          <PassengerBudgets presupuestos={presupuestos} instituciones={lookups.instituciones} />
        </ContentCard>
      </section>
    </>
  );
}
