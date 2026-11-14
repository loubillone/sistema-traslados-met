export const OBRAS_SOCIALES = [
  "IOSFA",
  "OSDE",
  "OSECAC",
  "PAMI",
  "Subsidio de Salud",
  "Swiss Medical",
  "Particular / Sin obra social",
];

export const CATEGORIAS_DOCUMENTO = {
  certificado: "Certificado",
  autorizacion: "Autorización",
  otro: "Otro documento",
};

/** Tipos de archivo aceptados en la documentación simulada. */
export const TIPOS_DOCUMENTO_ACEPTADOS = "application/pdf,image/*";

export const DIAS_SEMANA = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "X", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
];

/** Formulario vacío de pasajero. */
export const EMPTY_PASSENGER_FORM = {
  dni: "",
  nombre: "",
  apellido: "",
  domicilio: "",
  telefono: "",
  contactoNombre: "",
  contactoVinculo: "",
  contactoTelefono: "",
  condicion: "",
  obraSocial: "",
  institucionId: "",
  observaciones: "",
};
