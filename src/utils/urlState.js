// Estado de pantalla guardado en la URL (filtros, fecha, vista).
//
// React Router aplica los cambios de URL dentro de una transición, por eso las
// pantallas guardan sus filtros en el estado local y los copian a la URL. Cada
// pantalla se monta con la clave de la navegación que la abrió: los cambios
// propios la conservan (viaja en el estado del historial) y una navegación
// externa (buscador, notificaciones, enlaces, Atrás / Adelante) trae otra clave
// y vuelve a leer la URL.

/** Clave de la navegación que abrió la pantalla `scope`. */
export function urlBaseKey(location, scope) {
  return location.state?.[scope] ? location.state.baseKey : location.key;
}

/** Estado del historial para un cambio de URL hecho por la propia pantalla. */
export function ownUrlState(location, scope) {
  return { [scope]: true, baseKey: urlBaseKey(location, scope) };
}
