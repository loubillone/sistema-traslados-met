import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleAlert, Lock, Truck, User } from "lucide-react";
import InputField from "../components/common/InputField";
import useAuth from "../hooks/useAuth";
import { showInfo, showToast } from "../utils/alerts";

const CURRENT_YEAR = new Date().getFullYear();

function validate({ usuario, password }) {
  const errors = {};
  if (!usuario.trim()) errors.usuario = "Ingrese su usuario.";
  if (!password) errors.password = "Ingrese su contraseña.";
  return errors;
}

export default function LoginPage() {
  const { login, rememberedUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    usuario: rememberedUser ?? "",
    password: "",
    remember: Boolean(rememberedUser),
  });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    setAuthError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    // Pequeña espera para que se perciba el envío del formulario.
    window.setTimeout(() => {
      const result = login(form.usuario, form.password, form.remember);
      if (!result.ok) {
        setAuthError(result.message);
        setForm((current) => ({ ...current, password: "" }));
        setSubmitting(false);
        return;
      }
      showToast(`Bienvenido, ${result.user.nombre}`);
      navigate(location.state?.from ?? "/dashboard", { replace: true });
    }, 400);
  };

  const handleForgotPassword = () => {
    showInfo({
      title: "Recuperar contraseña",
      html:
        "Esta es una <b>demostración académica</b> y no envía correos.<br/><br/>" +
        "Utilice las credenciales de prueba:<br/>" +
        "Usuario: <b>admin</b> &nbsp;·&nbsp; Contraseña: <b>admin123</b>",
    });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo" aria-hidden="true">
          <Truck size={32} strokeWidth={1.75} />
        </div>
        <h1 className="login-title">Traslados Programados</h1>
        <p className="login-subtitle">Sistema de Gestión de Traslados</p>

        <form onSubmit={handleSubmit} noValidate>
          {authError && (
            <div className="login-alert" role="alert">
              <CircleAlert size={18} strokeWidth={2} aria-hidden="true" />
              <span>{authError}</span>
            </div>
          )}

          <InputField
            id="usuario"
            name="usuario"
            label="Usuario"
            icon={User}
            placeholder="Ingrese su usuario"
            autoComplete="username"
            value={form.usuario}
            onChange={handleChange}
            error={errors.usuario}
            autoFocus={!rememberedUser}
          />

          <InputField
            id="password"
            name="password"
            type="password"
            label="Contraseña"
            icon={Lock}
            placeholder="Ingrese su contraseña"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoFocus={Boolean(rememberedUser)}
          />

          <div className="login-options">
            <label className="checkbox-app">
              <input type="checkbox" name="remember" checked={form.remember} onChange={handleChange} />
              Recordarme
            </label>
            <button type="button" className="link-app" onClick={handleForgotPassword}>
              ¿Olvidó su contraseña?
            </button>
          </div>

          <button type="submit" className="btn-app btn-app-primary btn-app-block" disabled={submitting}>
            {submitting ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <footer className="login-footer">
          © {CURRENT_YEAR} Traslados Programados. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}
