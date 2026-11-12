// Sesión SIMULADA para la demostración académica.
// No es un mecanismo de autenticación real: las credenciales son ficticias y
// se validan en el navegador.

import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./contexts";
import { readJSON, removeKey, writeJSON } from "../utils/storage";

const SESSION_KEY = "traslados-demo:sesion";
const REMEMBERED_USER_KEY = "traslados-demo:usuario-recordado";

const DEMO_ACCOUNT = {
  usuario: "admin",
  password: "admin123",
  nombre: "Administrador",
  email: "admin@traslados.com",
};

function readSession() {
  return readJSON(SESSION_KEY, "local") ?? readJSON(SESSION_KEY, "session");
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);
  const [rememberedUser, setRememberedUser] = useState(() => readJSON(REMEMBERED_USER_KEY));

  const login = useCallback((usuario, password, remember) => {
    const valid = usuario.trim().toLowerCase() === DEMO_ACCOUNT.usuario && password === DEMO_ACCOUNT.password;
    if (!valid) return { ok: false, message: "Usuario o contraseña incorrectos." };

    const sessionUser = {
      usuario: DEMO_ACCOUNT.usuario,
      nombre: DEMO_ACCOUNT.nombre,
      email: DEMO_ACCOUNT.email,
      inicio: new Date().toISOString(),
    };

    // "Recordarme": la sesión sobrevive al cierre del navegador (localStorage).
    // Sin marcar: dura solo mientras la pestaña esté abierta (sessionStorage).
    removeKey(SESSION_KEY, "local");
    removeKey(SESSION_KEY, "session");
    writeJSON(SESSION_KEY, sessionUser, remember ? "local" : "session");

    if (remember) writeJSON(REMEMBERED_USER_KEY, DEMO_ACCOUNT.usuario);
    else removeKey(REMEMBERED_USER_KEY);
    setRememberedUser(remember ? DEMO_ACCOUNT.usuario : null);

    setUser(sessionUser);
    return { ok: true, user: sessionUser };
  }, []);

  const logout = useCallback(() => {
    removeKey(SESSION_KEY, "local");
    removeKey(SESSION_KEY, "session");
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, rememberedUser, login, logout }), [user, rememberedUser, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
