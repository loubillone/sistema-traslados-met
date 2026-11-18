// Catálogo de categorías de gastos (Etapa 5C.1, CU-13).
// Colores e íconos tomados de la pantalla "Registro de Gastos" de Figma.

import { CreditCard, Ellipsis, Fuel, Sparkles, Wrench } from "lucide-react";

export const CATEGORIAS_GASTO = {
  combustible: { label: "Combustible", color: "#3b82f6", soft: "#eff6ff", icon: Fuel },
  mantenimiento: { label: "Mantenimiento", color: "#f59e0b", soft: "#fffbeb", icon: Wrench },
  peajes: { label: "Peajes", color: "#10b981", soft: "#ecfdf5", icon: CreditCard },
  limpieza: { label: "Limpieza", color: "#6366f1", soft: "#eef2ff", icon: Sparkles },
  extras: { label: "Extras", color: "#ec4899", soft: "#fdf2f8", icon: Ellipsis },
};

export const CATEGORIA_KEYS = Object.keys(CATEGORIAS_GASTO);

/** Estados de viaje que admiten gastos: viajes realizados o en curso. */
export const ESTADOS_VIAJE_CON_GASTOS = ["en_curso", "finalizado"];

export const MONTO_MAXIMO = 10_000_000;
export const DESCRIPCION_MIN = 3;
export const DESCRIPCION_MAX = 150;

export const EMPTY_EXPENSE_FORM = {
  diaViaje: "",
  viajeId: "",
  fecha: "",
  categoria: "",
  monto: "",
  descripcion: "",
};
