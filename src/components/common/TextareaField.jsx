/** Área de texto con etiqueta, contador opcional y mensaje de error. */
export default function TextareaField({ id, label, error, hint, maxLength, value = "", className = "", ...textareaProps }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`form-field ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="form-label-app">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`input-app textarea-app${error ? " is-invalid" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        maxLength={maxLength}
        value={value}
        {...textareaProps}
      />
      <div className="field-footer">
        {error ? (
          <div id={`${id}-error`} className="field-error">
            {error}
          </div>
        ) : (
          hint && (
            <div id={`${id}-hint`} className="field-hint">
              {hint}
            </div>
          )
        )}
        {maxLength && (
          <span className="field-counter">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
