/** Campo de formulario con etiqueta, ícono opcional, ayuda y mensaje de error. */
export default function InputField({ id, label, icon: Icon, error, hint, className = "", ...inputProps }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`form-field ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="form-label-app">
          {label}
        </label>
      )}
      <div className={Icon ? "input-icon-wrapper" : undefined}>
        {Icon && <Icon className="input-icon" size={18} strokeWidth={1.75} aria-hidden="true" />}
        <input
          id={id}
          className={`input-app${Icon ? " has-icon" : ""}${error ? " is-invalid" : ""}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
      </div>
      {hint && !error && (
        <div id={`${id}-hint`} className="field-hint">
          {hint}
        </div>
      )}
      {error && (
        <div id={`${id}-error`} className="field-error">
          {error}
        </div>
      )}
    </div>
  );
}
