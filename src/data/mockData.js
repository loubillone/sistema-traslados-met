// Datos de demostración del Sistema de Gestión de Traslados Programados.
//
// TODOS LOS DATOS SON FICTICIOS: nombres, DNI, teléfonos y domicilios fueron
// inventados para la demostración académica y no corresponden a personas reales.
//
// Las fechas se calculan en forma relativa al día actual, de modo que siempre
// existan viajes de hoy, historial de los últimos meses y traslados próximos.
// El generador es determinístico: para una misma fecha produce siempre los
// mismos datos.

import { addDays, parseISODate, toISODate } from "../utils/dates";

/**
 * Versión de la estructura de datos.
 * v1: Etapa 1. v2: Etapa 2 (ficha ampliada del pasajero y presupuestos).
 * Los datos guardados con una versión anterior se migran en data/migrations.js.
 */
export const DATA_VERSION = 2;

/** Prefijos de los identificadores de cada colección. */
export const ID_PREFIXES = {
  instituciones: { prefix: "INS", digits: 2 },
  pasajeros: { prefix: "PAS", digits: 3 },
  choferes: { prefix: "CHO", digits: 2 },
  vehiculos: { prefix: "VEH", digits: 2 },
  viajes: { prefix: "VIA", digits: 5 },
  asistencias: { prefix: "ASI", digits: 5 },
  presupuestos: { prefix: "PRE", digits: 3 },
};

// ---------------------------------------------------------------------------
// Catálogos base
// ---------------------------------------------------------------------------

const INSTITUCIONES = [
  { id: "INS-01", nombre: "Centro de Rehabilitación Norte", nombreCorto: "Centro Norte", direccion: "Av. Juan B. Justo 1450", localidad: "San Miguel de Tucumán" },
  { id: "INS-02", nombre: "Escuela Especial San Martín", nombreCorto: "Escuela San Martín", direccion: "Lamadrid 870", localidad: "San Miguel de Tucumán" },
  { id: "INS-03", nombre: "Centro de Día Los Tilos", nombreCorto: "Centro de Día", direccion: "Av. Aconquija 2100", localidad: "Yerba Buena" },
  { id: "INS-04", nombre: "Hospital Central", nombreCorto: "Hospital Central", direccion: "Av. Sarmiento 1200", localidad: "San Miguel de Tucumán" },
  { id: "INS-05", nombre: "Centro de Rehabilitación Sur", nombreCorto: "Centro Sur", direccion: "Av. Roca 2350", localidad: "San Miguel de Tucumán" },
];

// venceEn: días que faltan para el vencimiento de la licencia.
const CHOFERES = [
  { id: "CHO-01", nombre: "Carlos", apellido: "Ruiz", dni: "20123456", telefono: "381-423-6789", licencia: "B-12345678", turno: "Mañana", venceEn: 87 },
  { id: "CHO-02", nombre: "Ana", apellido: "Martínez", dni: "22234567", telefono: "381-434-7890", licencia: "B-23456789", turno: "Mañana", venceEn: 38 },
  { id: "CHO-03", nombre: "Roberto", apellido: "López", dni: "24345678", telefono: "381-445-8901", licencia: "B-34567890", turno: "Mañana", venceEn: 210 },
  { id: "CHO-04", nombre: "Patricia", apellido: "González", dni: "26456789", telefono: "381-456-9012", licencia: "B-45678901", turno: "Tarde", venceEn: 25 },
  { id: "CHO-05", nombre: "Miguel", apellido: "Fernández", dni: "28567890", telefono: "381-467-0123", licencia: "B-56789012", turno: "Tarde", venceEn: 400 },
];

// vtvEn / seguroEn: días que faltan para cada vencimiento.
const VEHICULOS = [
  { id: "VEH-01", patente: "AB-123-CD", tipo: "Minibús", modelo: "Mercedes-Benz Sprinter", capacidad: 8, estado: "activo", vtvEn: 56, seguroEn: 20 },
  { id: "VEH-02", patente: "EF-456-GH", tipo: "Camioneta", modelo: "Renault Kangoo", capacidad: 5, estado: "activo", vtvEn: 153, seguroEn: 117 },
  { id: "VEH-03", patente: "IJ-789-KL", tipo: "Minibús", modelo: "Iveco Daily", capacidad: 10, estado: "activo", vtvEn: 15, seguroEn: 8 },
  { id: "VEH-04", patente: "MN-012-OP", tipo: "Combi", modelo: "Renault Master", capacidad: 12, estado: "mantenimiento", vtvEn: 95, seguroEn: 140 },
];

// Recorridos habituales: cada uno combina un chofer con un vehículo.
// Los choferes de la tarde reutilizan vehículos de la mañana.
const RECORRIDOS = {
  R1: { choferId: "CHO-01", vehiculoId: "VEH-01" },
  R2: { choferId: "CHO-02", vehiculoId: "VEH-02" },
  R3: { choferId: "CHO-03", vehiculoId: "VEH-03" },
  R4: { choferId: "CHO-04", vehiculoId: "VEH-01" },
  R5: { choferId: "CHO-05", vehiculoId: "VEH-02" },
};

// dias: 1 = lunes ... 5 = viernes. alta/baja: meses hacia atrás desde hoy.
const PASAJEROS = [
  { id: "PAS-001", nombre: "María", apellido: "González", dni: "12345678", telefono: "381-556-8901", obraSocial: "OSDE", institucionId: "INS-01", domicilio: "Av. Libertador 1234", dias: [1, 3, 5], hora: "08:30", tipo: "ida_vuelta", recorrido: "R1", alta: 9 },
  { id: "PAS-002", nombre: "Juan", apellido: "Pérez", dni: "43456789", telefono: "381-567-9012", obraSocial: "Swiss Medical", institucionId: "INS-02", domicilio: "Calle San Martín 567", dias: [1, 2, 3, 4, 5], hora: "09:00", tipo: "ida_vuelta", recorrido: "R2", alta: 9 },
  { id: "PAS-003", nombre: "Laura", apellido: "Sánchez", dni: "8765432", telefono: "381-578-0123", obraSocial: "PAMI", institucionId: "INS-03", domicilio: "Belgrano 890", dias: [1, 2, 4], hora: "10:15", tipo: "ida", recorrido: "R3", alta: 8 },
  { id: "PAS-004", nombre: "Pedro", apellido: "Ramírez", dni: "29876543", telefono: "381-589-1234", obraSocial: "Subsidio de Salud", institucionId: "INS-04", domicilio: "Crisóstomo Álvarez 455", dias: [2, 4], hora: "11:00", tipo: "ida_vuelta", recorrido: "R1", alta: 7 },
  { id: "PAS-005", nombre: "Sofía", apellido: "Torres", dni: "35678901", telefono: "381-590-2345", obraSocial: "OSDE", institucionId: "INS-05", domicilio: "Mitre 345", dias: [1, 3, 5], hora: "14:30", tipo: "ida_vuelta", recorrido: "R5", alta: 8 },
  { id: "PAS-006", nombre: "Lucas", apellido: "Herrera", dni: "47890123", telefono: "381-601-3456", obraSocial: "IOSFA", institucionId: "INS-02", domicilio: "Av. Mate de Luna 2780", dias: [1, 2, 3, 4, 5], hora: "08:00", tipo: "ida", recorrido: "R2", alta: 6 },
  { id: "PAS-007", nombre: "Valentina", apellido: "Romero", dni: "6543210", telefono: "381-612-4567", obraSocial: "PAMI", institucionId: "INS-01", domicilio: "24 de Septiembre 1120", dias: [2, 4], hora: "08:00", tipo: "ida_vuelta", recorrido: "R1", alta: 6 },
  { id: "PAS-008", nombre: "Martín", apellido: "Díaz", dni: "31234567", telefono: "381-623-5678", obraSocial: "Subsidio de Salud", institucionId: "INS-03", domicilio: "Av. Perón 1650", dias: [1, 3, 5], hora: "09:30", tipo: "ida_vuelta", recorrido: "R3", alta: 5 },
  { id: "PAS-009", nombre: "Camila", apellido: "Medina", dni: "40345678", telefono: "381-634-6789", obraSocial: "Swiss Medical", institucionId: "INS-05", domicilio: "Laprida 980", dias: [2, 4], hora: "15:00", tipo: "vuelta", recorrido: "R4", alta: 5 },
  { id: "PAS-010", nombre: "Diego", apellido: "Castro", dni: "7456789", telefono: "381-645-7890", obraSocial: "PAMI", institucionId: "INS-04", domicilio: "Av. Sarmiento 760", dias: [1, 3], hora: "10:30", tipo: "ida", recorrido: "R3", alta: 4 },
  { id: "PAS-011", nombre: "Florencia", apellido: "Ríos", dni: "48567890", telefono: "381-656-8901", obraSocial: "OSECAC", institucionId: "INS-02", domicilio: "Junín 1340", dias: [1, 2, 3, 4, 5], hora: "13:30", tipo: "ida_vuelta", recorrido: "R4", alta: 4 },
  { id: "PAS-012", nombre: "Tomás", apellido: "Acuña", dni: "38678901", telefono: "381-667-9012", obraSocial: "OSDE", institucionId: "INS-01", domicilio: "Santiago del Estero 2210", dias: [2, 4, 5], hora: "14:00", tipo: "ida", recorrido: "R5", alta: 3 },
  { id: "PAS-013", nombre: "Agustina", apellido: "Molina", dni: "46789012", telefono: "381-678-0123", obraSocial: "Subsidio de Salud", institucionId: "INS-03", domicilio: "Av. Aconquija 1580", dias: [1, 2, 3, 4, 5], hora: "08:30", tipo: "ida_vuelta", recorrido: "R3", alta: 3 },
  { id: "PAS-014", nombre: "Joaquín", apellido: "Paz", dni: "44890123", telefono: "381-689-1234", obraSocial: "IOSFA", institucionId: "INS-05", domicilio: "Córdoba 1875", dias: [1, 3, 5], hora: "15:30", tipo: "ida_vuelta", recorrido: "R4", alta: 2 },
  { id: "PAS-015", nombre: "Micaela", apellido: "Luna", dni: "9012345", telefono: "381-690-2345", obraSocial: "PAMI", institucionId: "INS-01", domicilio: "Marcos Paz 640", dias: [2, 4], hora: "09:30", tipo: "ida", recorrido: "R2", alta: 1 },
  { id: "PAS-016", nombre: "Ramiro", apellido: "Vega", dni: "33901234", telefono: "381-701-3456", obraSocial: "Swiss Medical", institucionId: "INS-04", domicilio: "General Paz 1025", dias: [2], hora: "10:00", tipo: "ida", recorrido: "R1", alta: 9, baja: 3 },
];

// Datos ampliados de la ficha (Etapa 2): contacto de emergencia, condición
// particular y documentación simulada. docs: [categoría, nombre, tipo, días desde el alta].
const PASAJERO_EXTRAS = {
  "PAS-001": {
    contacto: ["Roberto González", "Esposo", "381-556-8902"],
    condicion: "Movilidad reducida. Utiliza bastón.",
    docs: [
      ["certificado", "Certificado_Unico_Discapacidad.pdf", "application/pdf", 2],
      ["autorizacion", "Autorizacion_OSDE_traslados.pdf", "application/pdf", 5],
    ],
  },
  "PAS-002": {
    contacto: ["Claudia Pérez", "Madre", "381-567-9013"],
    condicion: "Requiere acompañante adulto durante el traslado.",
    docs: [["autorizacion", "Autorizacion_padres_traslado.pdf", "application/pdf", 1]],
  },
  "PAS-003": {
    contacto: ["Hernán Sánchez", "Hijo", "381-578-0124"],
    condicion: "Movilidad reducida. Utiliza andador.",
    docs: [["certificado", "Orden_medica_PAMI.jpg", "image/jpeg", 3]],
  },
  "PAS-004": {
    contacto: ["Silvia Ramírez", "Esposa", "381-589-1235"],
    condicion: "Tratamiento de hemodiálisis. Traslado sin demoras.",
    docs: [["certificado", "Indicacion_medica_tratamiento.pdf", "application/pdf", 4]],
  },
  "PAS-005": {
    contacto: ["Gustavo Torres", "Padre", "381-590-2346"],
    condicion: "Usuaria de silla de ruedas. Requiere vehículo con rampa.",
    docs: [["certificado", "Certificado_Unico_Discapacidad.pdf", "application/pdf", 2]],
  },
  "PAS-006": { contacto: ["Mariela Herrera", "Madre", "381-601-3457"], condicion: "Prefiere viajar siempre con el mismo chofer." },
  "PAS-007": { contacto: ["Jorge Romero", "Hijo", "381-612-4568"], condicion: "Hipoacusia. Comunicarse por mensaje de texto." },
  "PAS-008": { contacto: ["Natalia Díaz", "Hermana", "381-623-5679"], condicion: "" },
  "PAS-009": { contacto: ["Fernando Medina", "Padre", "381-634-6790"], condicion: "Requiere acompañante adulto." },
  "PAS-010": { contacto: ["Liliana Castro", "Hija", "381-645-7891"], condicion: "Movilidad reducida. Necesita asistencia para subir al vehículo." },
  "PAS-011": {
    contacto: ["Verónica Ríos", "Madre", "381-656-8902"],
    condicion: "Usuaria de silla de ruedas.",
    docs: [["autorizacion", "Autorizacion_escuela_retiro.pdf", "application/pdf", 3]],
  },
  "PAS-012": { contacto: ["Andrea Acuña", "Madre", "381-667-9013"], condicion: "" },
  "PAS-013": { contacto: ["Raúl Molina", "Padre", "381-678-0124"], condicion: "Epilepsia controlada. Informar cualquier novedad al contacto." },
  "PAS-014": { contacto: ["Paola Paz", "Madre", "381-689-1235"], condicion: "Requiere acompañante adulto." },
  "PAS-015": { contacto: ["Oscar Luna", "Esposo", "381-690-2346"], condicion: "Movilidad reducida. Utiliza andador." },
  "PAS-016": { contacto: ["Carina Vega", "Hermana", "381-701-3457"], condicion: "" },
};

// Presupuestos de ejemplo: [días atrás, pasajero, kilómetros]. Tarifa por km según Figma.
const TARIFA_KM = 250;
const PRESUPUESTOS = [
  [5, "PAS-001", 45],
  [8, "PAS-002", 32],
  [12, "PAS-003", 28],
  [15, "PAS-004", 52],
  [18, "PAS-005", 38],
  [30, "PAS-001", 45],
  [36, "PAS-008", 30],
  [44, "PAS-011", 26],
  [51, "PAS-002", 32],
  [60, "PAS-013", 40],
  [72, "PAS-006", 24],
  [95, "PAS-001", 44],
  [120, "PAS-016", 36],
];

const MOTIVOS_AUSENCIA =["No respondió llamadas", "Ausente sin aviso"];
const MOTIVOS_JUSTIFICADOS = ["Aviso previo de la familia", "Turno médico", "Cuadro febril"];

// Estado de los viajes de hoy: los choferes de la mañana ya realizaron parte
// de sus viajes y dos de ellos están en viaje en este momento.
const CHOFERES_MANANA = ["CHO-01", "CHO-02", "CHO-03"];
const CHOFERES_EN_VIAJE_HOY = ["CHO-01", "CHO-02"];

// ---------------------------------------------------------------------------
// Generador
// ---------------------------------------------------------------------------

/** Generador pseudoaleatorio con semilla (mulberry32): resultados reproducibles. */
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const formatId = (collection, number) => {
  const { prefix, digits } = ID_PREFIXES[collection];
  return `${prefix}-${String(number).padStart(digits, "0")}`;
};

/**
 * Completa un pasajero con los campos de la ficha ampliada.
 * Respeta siempre los valores existentes: sirve tanto para los datos iniciales
 * como para migrar pasajeros guardados con una versión anterior.
 */
export function withPassengerDefaults(pasajero) {
  const extra = PASAJERO_EXTRAS[pasajero.id];
  const documentos = (extra?.docs ?? []).map(([categoria, nombre, tipo, dias], index) => ({
    id: `${pasajero.id}-DOC-${index + 1}`,
    categoria,
    nombre,
    tipo,
    fechaIncorporacion: pasajero.fechaAlta ? toISODate(addDays(parseISODate(pasajero.fechaAlta), dias)) : null,
    simulado: true,
  }));

  return {
    domicilio: "",
    telefono: "",
    obraSocial: "",
    institucionId: "",
    observaciones: "",
    diasSemana: [],
    horaHabitual: "",
    tipoViaje: "ida_vuelta",
    choferId: null,
    vehiculoId: null,
    fechaBaja: null,
    activo: true,
    contactoEmergencia: extra
      ? { nombre: extra.contacto[0], vinculo: extra.contacto[1], telefono: extra.contacto[2] }
      : { nombre: "", vinculo: "", telefono: "" },
    condicion: extra?.condicion ?? "",
    documentos,
    ...pasajero,
  };
}

/** Presupuestos de ejemplo relacionados con pasajeros existentes. */
export function createSeedPresupuestos(pasajeros, referenceDate = new Date()) {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const byId = Object.fromEntries(pasajeros.map((p) => [p.id, p]));

  return PRESUPUESTOS.filter(([, pasajeroId]) => byId[pasajeroId])
    .sort((a, b) => b[0] - a[0])
    .map(([diasAtras, pasajeroId, kilometros], index) => ({
      id: formatId("presupuestos", index + 1),
      fecha: toISODate(addDays(today, -diasAtras)),
      pasajeroId,
      institucionId: byId[pasajeroId].institucionId,
      kilometros,
      tarifaKm: TARIFA_KM,
      total: kilometros * TARIFA_KM,
    }));
}

/**
 * Crea el estado inicial completo de la demostración.
 * @param {Date} referenceDate fecha que se toma como "hoy".
 */
export function createSeedData(referenceDate = new Date()) {
  const random = createRandom(20260621);
  const pick = (list) => list[Math.floor(random() * list.length)];

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const todayIso = toISODate(today);
  const inDays = (days) => toISODate(addDays(today, days));
  const monthsAgo = (months, day) => toISODate(new Date(today.getFullYear(), today.getMonth() - months, day));

  const instituciones = INSTITUCIONES.map((item) => ({ ...item }));

  const choferes = CHOFERES.map(({ venceEn, ...chofer }) => ({
    ...chofer,
    vencimientoLicencia: inDays(venceEn),
    activo: true,
  }));

  const vehiculos = VEHICULOS.map(({ vtvEn, seguroEn, ...vehiculo }) => ({
    ...vehiculo,
    vencimientoVTV: inDays(vtvEn),
    vencimientoSeguro: inDays(seguroEn),
  }));

  const pasajeros = PASAJEROS.map(({ dias, hora, tipo, recorrido, alta, baja, ...pasajero }, index) =>
    withPassengerDefaults({
      ...pasajero,
      diasSemana: dias,
      horaHabitual: hora,
      tipoViaje: tipo,
      choferId: RECORRIDOS[recorrido].choferId,
      vehiculoId: RECORRIDOS[recorrido].vehiculoId,
      fechaAlta: monthsAgo(alta, 3 + ((index * 5) % 20)),
      fechaBaja: baja ? monthsAgo(baja, 10) : null,
      activo: !baja,
      observaciones: "",
    }),
  );

  // 1) Viajes según la agenda habitual de cada pasajero.
  //    Rango: desde el inicio de hace 5 meses hasta fin de mes (mínimo 14 días adelante).
  const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const minEnd = addDays(today, 14);
  const end = endOfMonth > minEnd ? endOfMonth : minEnd;

  const drafts = [];
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    const iso = toISODate(date);
    const weekday = date.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const isToday = iso === todayIso;
    // Se trabaja de lunes a viernes. Si la demo se presenta un fin de semana,
    // hoy se toma con la agenda de un lunes para que haya viajes del día.
    if (isWeekend && !isToday) continue;
    const scheduleDay = isWeekend ? 1 : weekday;

    for (const pasajero of pasajeros) {
      if (iso < pasajero.fechaAlta) continue;
      if (pasajero.fechaBaja && iso >= pasajero.fechaBaja) continue;
      if (!pasajero.diasSemana.includes(scheduleDay)) continue;
      drafts.push({
        fecha: iso,
        hora: pasajero.horaHabitual,
        pasajeroId: pasajero.id,
        choferId: pasajero.choferId,
        vehiculoId: pasajero.vehiculoId,
        origen: pasajero.domicilio,
        institucionId: pasajero.institucionId,
        tipo: pasajero.tipoViaje,
      });
    }
  }
  drafts.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`) || a.pasajeroId.localeCompare(b.pasajeroId));

  // 2) Estado de los viajes de hoy, por chofer.
  const todayStatus = new Map();
  const todayByChofer = {};
  drafts
    .filter((draft) => draft.fecha === todayIso)
    .forEach((draft) => {
      (todayByChofer[draft.choferId] ??= []).push(draft);
    });
  Object.entries(todayByChofer).forEach(([choferId, list]) => {
    const done = CHOFERES_MANANA.includes(choferId) ? Math.floor(list.length / 2) : 0;
    list.forEach((draft, index) => {
      if (index < done) todayStatus.set(draft, "finalizado");
      else if (index === done && CHOFERES_EN_VIAJE_HOY.includes(choferId)) todayStatus.set(draft, "en_curso");
      else todayStatus.set(draft, "programado");
    });
  });
  // Un viaje cancelado con aviso hoy, para mostrar todos los estados.
  const cancelledToday = todayByChofer["CHO-03"]?.[0];

  // 3) Viajes definitivos y asistencias relacionadas.
  const viajes = [];
  const asistencias = [];

  drafts.forEach((draft, index) => {
    const id = formatId("viajes", index + 1);
    let estado = "programado";
    let asistencia = null;
    let observaciones = "";

    if (draft.fecha < todayIso) {
      const r = random();
      if (r < 0.9) {
        estado = "finalizado";
        asistencia = { estado: "presente", observaciones: "" };
      } else if (r < 0.95) {
        estado = "cancelado";
        asistencia = { estado: "ausente", observaciones: pick(MOTIVOS_AUSENCIA) };
        observaciones = "Cancelado por ausencia del pasajero";
      } else {
        estado = "cancelado";
        asistencia = { estado: "justificado", observaciones: pick(MOTIVOS_JUSTIFICADOS) };
        observaciones = "Cancelado con aviso previo";
      }
    } else if (draft.fecha === todayIso) {
      if (draft === cancelledToday) {
        estado = "cancelado";
        asistencia = { estado: "justificado", observaciones: "Aviso previo de la familia" };
        observaciones = "Cancelado con aviso previo";
      } else {
        estado = todayStatus.get(draft) ?? "programado";
        if (estado !== "programado") asistencia = { estado: "presente", observaciones: "" };
      }
    }

    viajes.push({ id, ...draft, estado, observaciones });

    if (asistencia) {
      asistencias.push({
        id: formatId("asistencias", asistencias.length + 1),
        fecha: draft.fecha,
        pasajeroId: draft.pasajeroId,
        viajeId: id,
        ...asistencia,
      });
    }
  });

  return {
    version: DATA_VERSION,
    generadoEl: todayIso,
    instituciones,
    pasajeros,
    choferes,
    vehiculos,
    viajes,
    asistencias,
    presupuestos: createSeedPresupuestos(pasajeros, today),
    notificacionesLeidas: [],
  };
}
