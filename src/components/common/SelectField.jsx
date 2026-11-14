/**
 * Lista desplegable con etiqueta y mensaje de error.
 * options: [{ value, label }]
 */
export default function SelectField({ id, label, options, placeholder, error, hint, className = "", ...selectProps }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`form-field ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="form-label-app">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`input-app select-app${error ? " is-invalid" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...selectProps}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
