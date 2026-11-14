import { useRef, useState } from "react";
import { FileImage, FileText, Info, Paperclip, Trash2 } from "lucide-react";
import useData from "../../hooks/useData";
import { CATEGORIAS_DOCUMENTO, TIPOS_DOCUMENTO_ACEPTADOS } from "../../constants/pasajeros";
import { confirmAction, showToast } from "../../utils/alerts";
import { formatDate, todayISO } from "../../utils/dates";
import { formatFileSize } from "../../utils/format";

const isAcceptedType = (file) => file.type === "application/pdf" || file.type.startsWith("image/");

/**
 * Documentación del pasajero (CU-03) — SIMULADA.
 * Solo se registran los metadatos del archivo (nombre, tipo, tamaño y fecha).
 * El contenido del archivo no se lee ni se guarda en localStorage.
 */
export default function PassengerDocuments({ pasajero }) {
  const { updateItem } = useData();
  const inputRef = useRef(null);
  const [categoria, setCategoria] = useState("certificado");
  const [error, setError] = useState("");

  const documentos = pasajero.documentos ?? [];

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isAcceptedType(file)) {
      setError(`"${file.name}" no es un PDF ni una imagen. Seleccione un archivo PDF, JPG o PNG.`);
      return;
    }
    setError("");

    const nextNumber =
      documentos.reduce((max, d) => Math.max(max, Number(String(d.id).split("-").pop()) || 0), 0) + 1;
    const documento = {
      id: `${pasajero.id}-DOC-${nextNumber}`,
      categoria,
      nombre: file.name,
      tipo: file.type,
      tamano: file.size,
      fechaIncorporacion: todayISO(),
      simulado: true,
    };
    updateItem("pasajeros", pasajero.id, { documentos: [...documentos, documento] });
    showToast(`${CATEGORIAS_DOCUMENTO[categoria]} registrado`);
  };

  const handleRemove = async (documento) => {
    const confirmed = await confirmAction({
      title: "¿Quitar documento?",
      text: `Se quitará "${documento.nombre}" de la documentación del pasajero.`,
      confirmText: "Quitar",
      icon: "warning",
    });
    if (!confirmed) return;
    updateItem("pasajeros", pasajero.id, { documentos: documentos.filter((d) => d.id !== documento.id) });
    showToast("Documento quitado");
  };

  return (
    <>
      <div className="simulation-notice">
        <Info size={18} strokeWidth={2} aria-hidden="true" />
        <span>
          <strong>Documentación simulada.</strong> Esta demostración registra únicamente el nombre, tipo, tamaño y
          fecha de incorporación del archivo. Los archivos no se almacenan y no pueden volver a abrirse.
        </span>
      </div>

      <div className="document-upload">
        <label htmlFor="documento-categoria" className="visually-hidden">
          Categoría del documento
        </label>
        <select
          id="documento-categoria"
          className="input-app select-app document-category"
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
        >
          {Object.entries(CATEGORIAS_DOCUMENTO).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_DOCUMENTO_ACEPTADOS}
          className="visually-hidden"
          onChange={handleFile}
          aria-label="Seleccionar archivo PDF o imagen"
          data-testid="documento-input"
        />
        <button type="button" className="btn-app btn-app-outline" onClick={() => inputRef.current?.click()}>
          <Paperclip size={16} strokeWidth={2} aria-hidden="true" />
          Adjuntar PDF o imagen
        </button>
      </div>
      {error && <div className="field-error mb-3">{error}</div>}

      {documentos.length === 0 ? (
        <p className="section-empty">No hay documentos registrados.</p>
      ) : (
        <ul className="document-list">
          {documentos.map((documento) => {
            const Icon = documento.tipo?.startsWith("image/") ? FileImage : FileText;
            return (
              <li key={documento.id} className="document-item">
                <span className="document-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="document-info">
                  <span className="document-name">{documento.nombre}</span>
                  <span className="document-meta">
                    {CATEGORIAS_DOCUMENTO[documento.categoria] ?? "Documento"} ·{" "}
                    {documento.tipo === "application/pdf" ? "PDF" : "Imagen"}
                    {documento.tamano ? ` · ${formatFileSize(documento.tamano)}` : ""} · Incorporado el{" "}
                    {formatDate(documento.fechaIncorporacion)}
                  </span>
                </span>
                <span className="status-badge status-badge--neutral">Simulado</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => handleRemove(documento)}
                  aria-label={`Quitar ${documento.nombre}`}
                  title="Quitar documento"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
