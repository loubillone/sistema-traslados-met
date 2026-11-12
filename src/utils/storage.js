// Acceso seguro a localStorage / sessionStorage.
// En modo privado o con el almacenamiento bloqueado, el acceso puede lanzar
// excepciones: en ese caso la app sigue funcionando solo en memoria.

function getStorage(type) {
  try {
    return type === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readJSON(key, type = "local") {
  try {
    const raw = getStorage(type)?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key, value, type = "local") {
  try {
    getStorage(type)?.setItem(key, JSON.stringify(value));
  } catch {
    // Sin persistencia disponible: se ignora.
  }
}

export function removeKey(key, type = "local") {
  try {
    getStorage(type)?.removeItem(key);
  } catch {
    // Sin persistencia disponible: se ignora.
  }
}
