// Validaciones de formularios.

export const DNI_MIN_DIGITS = 7;
export const DNI_MAX_DIGITS = 8;

/** Quita puntos y espacios: "12.345.678" → "12345678". */
export function normalizeDni(value) {
  return String(value ?? "").replace(/[.\s]/g, "");
}

/** Devuelve un mensaje de error o null si el DNI es válido. */
export function validateDni(value) {
  const dni = normalizeDni(value);
  if (!dni) return "Ingrese el DNI.";
  if (!/^\d+$/.test(dni)) return "El DNI solo puede contener números.";
  if (dni.length < DNI_MIN_DIGITS || dni.length > DNI_MAX_DIGITS) {
    return `El DNI debe tener ${DNI_MIN_DIGITS} u ${DNI_MAX_DIGITS} dígitos.`;
  }
  if (/^0+$/.test(dni)) return "Ingrese un DNI válido.";
  return null;
}

const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
const PHONE_PATTERN = /^[+\d\s()-]+$/;

function validateName(value, label, required = true) {
  const text = value.trim();
  if (!text) return required ? `Ingrese ${label}.` : null;
  if (text.length < 2) return `${label[0].toUpperCase()}${label.slice(1)} debe tener al menos 2 letras.`;
  if (!NAME_PATTERN.test(text)) return `${label[0].toUpperCase()}${label.slice(1)} solo puede contener letras y espacios.`;
  return null;
}

function validatePhone(value, required = true) {
  const text = value.trim();
  if (!text) return required ? "Ingrese el teléfono." : null;
  const digits = text.replace(/\D/g, "");
  if (!PHONE_PATTERN.test(text) || digits.length < 7 || digits.length > 15) {
    return "Ingrese un teléfono válido (ej.: 381-423-4567).";
  }
  return null;
}

/**
 * Valida el formulario de pasajero.
 * @param form valores del formulario
 * @param options.pasajeros lista actual (para controlar DNI duplicados)
 * @param options.editingId id del pasajero que se edita (el DNI no se valida contra sí mismo)
 */
export function validatePassengerForm(form, { pasajeros, editingId = null }) {
  const errors = {};

  if (!editingId) {
    const dniError = validateDni(form.dni);
    if (dniError) {
      errors.dni = dniError;
    } else {
      const dni = normalizeDni(form.dni);
      const duplicate = pasajeros.find((p) => p.dni === dni);
      if (duplicate) {
        errors.dni = `Ya existe un pasajero con este DNI: ${duplicate.nombre} ${duplicate.apellido}${
          duplicate.activo ? "" : " (inactivo)"
        }.`;
      }
    }
  }

  const nombre = validateName(form.nombre, "el nombre");
  if (nombre) errors.nombre = nombre;
  const apellido = validateName(form.apellido, "el apellido");
  if (apellido) errors.apellido = apellido;

  if (!form.domicilio.trim()) errors.domicilio = "Ingrese la dirección.";
  else if (form.domicilio.trim().length < 5) errors.domicilio = "Ingrese una dirección completa (calle y número).";

  const telefono = validatePhone(form.telefono);
  if (telefono) errors.telefono = telefono;

  const contactoNombre = validateName(form.contactoNombre, "el nombre del contacto", false);
  if (contactoNombre) errors.contactoNombre = contactoNombre;
  const contactoTelefono = validatePhone(form.contactoTelefono, false);
  if (contactoTelefono) errors.contactoTelefono = contactoTelefono;
  if (form.contactoTelefono.trim() && !form.contactoNombre.trim()) {
    errors.contactoNombre = "Ingrese el nombre del contacto de emergencia.";
  }

  if (form.observaciones.length > 500) errors.observaciones = "Máximo 500 caracteres.";
  if (form.condicion.length > 200) errors.condicion = "Máximo 200 caracteres.";

  return errors;
}
