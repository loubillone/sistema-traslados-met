import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Construction, Search } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import ContentCard from "../components/common/ContentCard";
import useData from "../hooks/useData";

/** Vista provisional para los módulos que se desarrollarán en próximas etapas. */
export default function ModulePlaceholder({ module }) {
  const { data } = useData();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");
  const resumen = module.resumen?.(data);

  return (
    <>
      <PageHeader title={module.title} subtitle={module.subtitle} />

      <ContentCard>
        <div className="module-placeholder">
          <div className="module-placeholder-icon" aria-hidden="true">
            <Construction size={32} strokeWidth={1.75} />
          </div>
          <h2 className="module-placeholder-title">Módulo {module.label}: pendiente de desarrollo</h2>
          <p className="module-placeholder-text">
            Esta pantalla se incorporará en una próxima etapa del proyecto.
          </p>

          {resumen && (
            <p className="module-placeholder-data">
              Datos de demostración disponibles: <strong>{resumen}</strong>
            </p>
          )}

          {query && (
            <p className="module-placeholder-query">
              <Search size={16} strokeWidth={2} aria-hidden="true" />
              Búsqueda recibida: <strong>{query}</strong>
            </p>
          )}

          <Link to="/dashboard" className="btn-app btn-app-primary">
            <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
            Volver al Panel Principal
          </Link>
        </div>
      </ContentCard>
    </>
  );
}
