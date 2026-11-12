/** Campo de formulario con etiqueta, ícono opcional y mensaje de error. */
export default function InputField({ id, label, icon: Icon, error, className = "", ...inputProps }) {
  const errorId = error ? `${id}-error` : undefined;
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
          aria-describedby={errorId}
          {...inputProps}
        />
      </div>
      {error && (
        <div id={errorId} className="field-error">
          {error}
        </div>
      )}
    </div>
  );
}
