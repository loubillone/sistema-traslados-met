// Menú lateral y metadatos de cada módulo. Los títulos y subtítulos
// provienen de las pantallas de Figma (con "Pacientes" reemplazado por "Pasajeros").

import {
  Calendar,
  Car,
  ClipboardList,
  DollarSign,
  FileText,
  LayoutDashboard,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { todayISO } from "../utils/dates";

const plural = (n, singular, pluralText) => `${n} ${n === 1 ? singular : pluralText}`;

export const NAV_ITEMS = [
  {
    path: "/dashboard",
    label: "Panel Principal",
    icon: LayoutDashboard,
    title: "Panel Principal",
    subtitle: "Bienvenido al sistema de gestión de traslados",
    implemented: true,
  },
  {
    path: "/pasajeros",
    label: "Pasajeros",
    icon: Users,
    title: "Gestión de Pasajeros",
    subtitle: "Administración y consulta de pasajeros registrados",
    implemented: true,
  },
  {
    path: "/viajes",
    label: "Viajes",
    icon: Car,
    title: "Gestión de Viajes",
    subtitle: "Administre y planifique los traslados programados",
    resumen: (data) => plural(data.viajes.length, "viaje registrado", "viajes registrados"),
  },
  {
    path: "/asistencias",
    label: "Asistencias",
    icon: ClipboardList,
    title: "Planilla de Asistencias",
    subtitle: "Control de asistencias de pasajeros",
    resumen: (data) => plural(data.asistencias.length, "asistencia registrada", "asistencias registradas"),
  },
  {
    path: "/agenda",
    label: "Agenda de Turnos",
    icon: Calendar,
    title: "Agenda de Turnos",
    subtitle: "Calendario semanal de traslados programados",
    resumen: (data) => {
      const today = todayISO();
      const proximos = data.viajes.filter((v) => v.fecha >= today && v.estado === "programado").length;
      return plural(proximos, "traslado próximo programado", "traslados próximos programados");
    },
  },
  {
    path: "/choferes",
    label: "Choferes",
    icon: UserCog,
    title: "Gestión de Choferes",
    subtitle: "Administre el personal de conducción",
    resumen: (data) => plural(data.choferes.filter((c) => c.activo).length, "chofer activo", "choferes activos"),
  },
  {
    path: "/vehiculos",
    label: "Vehículos",
    icon: Truck,
    title: "Gestión de Vehículos",
    subtitle: "Control de flota y documentación vehicular",
    resumen: (data) => plural(data.vehiculos.length, "vehículo en la flota", "vehículos en la flota"),
  },
  {
    path: "/gastos",
    label: "Gastos",
    icon: DollarSign,
    title: "Registro de Gastos",
    subtitle: "Control de gastos operativos de la flota",
  },
  {
    path: "/presupuestos",
    label: "Presupuestos",
    icon: FileText,
    title: "Presupuestos",
    subtitle: "Historial y emisión de presupuestos de traslados",
  },
];

/** Módulos que en esta etapa se muestran como vista provisional. */
export const PENDING_MODULES = NAV_ITEMS.filter((item) => !item.implemented);
