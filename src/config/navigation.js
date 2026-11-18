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

export const NAV_ITEMS = [
  {
    path: "/dashboard",
    label: "Panel Principal",
    icon: LayoutDashboard,
    title: "Panel Principal",
    subtitle: "Bienvenido al sistema de gestión de traslados",
  },
  {
    path: "/pasajeros",
    label: "Pasajeros",
    icon: Users,
    title: "Gestión de Pasajeros",
    subtitle: "Administración y consulta de pasajeros registrados",
  },
  {
    path: "/viajes",
    label: "Viajes",
    icon: Car,
    title: "Gestión de Viajes",
    subtitle: "Administre y planifique los traslados programados",
  },
  {
    path: "/asistencias",
    label: "Asistencias",
    icon: ClipboardList,
    title: "Planilla de Asistencias",
    subtitle: "Control de asistencias de pasajeros",
  },
  {
    path: "/agenda",
    label: "Agenda de Turnos",
    icon: Calendar,
    title: "Agenda de Turnos",
    subtitle: "Organización de horarios y traslados recurrentes",
  },
  {
    path: "/choferes",
    label: "Choferes",
    icon: UserCog,
    title: "Gestión de Choferes",
    subtitle: "Administre el personal de conducción y su disponibilidad",
  },
  {
    path: "/vehiculos",
    label: "Vehículos",
    icon: Truck,
    title: "Gestión de Vehículos",
    subtitle: "Control de flota y documentación vehicular",
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
    title: "Gestión de Presupuestos",
    subtitle: "Cálculo y consulta de presupuestos de traslados",
  },
];

