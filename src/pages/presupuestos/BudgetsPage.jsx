import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { FileText, Info, Plus, Route, SearchX, Wallet } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import StatCard from "../../components/common/StatCard";
import Pagination from "../../components/common/Pagination";
import EmptyState from "../../components/common/EmptyState";
import BudgetActions from "../../components/presupuestos/BudgetActions";
import BudgetFilters from "../../components/presupuestos/BudgetFilters";
import useData from "../../hooks/useData";
import { formatDate } from "../../utils/dates";
import { formatAmount, formatDni, paginate } from "../../utils/format";
import { buildIndex, fullName } from "../../utils/selectors";
import { ownUrlState, urlBaseKey } from "../../utils/urlState";
import {
  BUDGET_FILTER_KEYS,
  filterBudgets,
  formatKm,
  getBudgetDateRangeError,
  readBudgetFilters,
  sortBudgets,
  sumarImportes,
} from "../../utils/budgets";

const PAGE_SIZE = 10;
const URL_SCOPE = "filtrosPresupuestos";
const readPage = (searchParams) => Math.max(1, Number(searchParams.get("pagina")) || 1);

function buildParams(filters, page) {
  const params = new URLSearchParams();
  BUDGET_FILTER_KEYS.forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  if (page > 1) params.set("pagina", String(page));
  return params;
}

/**
 * Gestión de Presupuestos (CU-14): historial con filtros por pasajero y período,
 * totales de lo filtrado y acciones de consulta e impresión. Los filtros se
 * guardan en la URL (ver utils/urlState.js).
 */
export default function BudgetsPage() {
  const location = useLocation();
  return <BudgetsView key={urlBaseKey(location, URL_SCOPE)} />;
}

function BudgetsView() {
  const { data } = useData();
  const [, setSearchParams] = useSearchParams();
  const location = useLocation();
  const presupuestos = useMemo(() => data.presupuestos ?? [], [data.presupuestos]);
  const pasajeros = useMemo(() => buildIndex(data.pasajeros), [data.pasajeros]);

  const [view, setView] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    return { filters: readBudgetFilters(searchParams), page: readPage(searchParams) };
  });
  const { filters } = view;
  const dateError = getBudgetDateRangeError(filters);
  const canClear = BUDGET_FILTER_KEYS.some((key) => filters[key]);

  const rows = useMemo(() => (dateError ? [] : sortBudgets(filterBudgets(presupuestos, filters))), [presupuestos, filters, dateError]);
  const totalImporte = sumarImportes(rows, "total");
  const totalKm = sumarImportes(rows, "kilometros");
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(view.page, pageCount);
  const from = `${location.pathname}${location.search}`;

  const applyView = (nextFilters, nextPage) => {
    setView({ filters: nextFilters, page: nextPage });
    setSearchParams(buildParams(nextFilters, nextPage), { replace: true, state: ownUrlState(location, URL_SCOPE) });
  };
  const handleFilterChange = (key, value) => applyView({ ...filters, [key]: value }, 1);
  const clearFilters = () => applyView({ pasajero: "", desde: "", hasta: "" }, 1);

  const pasajeroFiltrado = filters.pasajero ? pasajeros[filters.pasajero] : null;
  const alcance = canClear ? "de los presupuestos filtrados" : "de todos los presupuestos";

  return (
    <>
      <PageHeader
        title="Gestión de Presupuestos"
        subtitle="Cálculo y consulta de presupuestos de traslados"
        actions={
          <Link
            to={`/presupuestos/nuevo${filters.pasajero ? `?pasajero=${filters.pasajero}` : ""}`}
            state={{ from }}
            className="btn-app btn-app-primary btn-app-lg"
          >
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nuevo Presupuesto
          </Link>
        }
      />

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={FileText} color="navy" value={rows.length} label="Presupuestos" detail={canClear ? "Con los filtros aplicados" : "Emitidos en total"} />
        </div>
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={Wallet} color="blue" value={formatAmount(totalImporte)} label="Total presupuestado" detail="Importes estimados, no cobrados" />
        </div>
        <div className="col-12 col-md-4">
          <StatCard layout="horizontal" icon={Route} color="green" value={formatKm(totalKm)} label="Kilómetros presupuestados" detail={pasajeroFiltrado ? fullName(pasajeroFiltrado) : "Todos los pasajeros"} />
        </div>
      </div>

      <ContentCard title="Historial de Presupuestos">
        <BudgetFilters
          filters={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
          pasajeros={data.pasajeros}
          dateError={dateError}
          canClear={canClear}
        />

        {rows.length === 0 ? (
          <EmptyState icon={canClear ? SearchX : FileText} title={canClear ? "No se encontraron presupuestos" : "No hay presupuestos registrados"}>
            <p>
              {dateError ?? (canClear ? "Ningún presupuesto cumple con los filtros aplicados." : "Calcule el primer presupuesto de traslado.")}
            </p>
            <div className="empty-state-actions">
              {canClear && (
                <button type="button" className="btn-app btn-app-outline" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </EmptyState>
        ) : (
          <>
            <p className="list-summary" data-testid="resumen-presupuestos">
              {rows.length} {rows.length === 1 ? "presupuesto" : "presupuestos"}
              {pasajeroFiltrado ? ` de ${fullName(pasajeroFiltrado)}` : ""}
              {filters.desde ? ` desde el ${formatDate(filters.desde)}` : ""}
              {filters.hasta ? ` hasta el ${formatDate(filters.hasta)}` : ""}
            </p>
            <div className="table-responsive">
              <table className="app-table budget-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Pasajero</th>
                    <th className="text-end">Kilómetros</th>
                    <th className="text-end">Tarifa por km</th>
                    <th className="text-end">Total</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginate(rows, page, PAGE_SIZE).map((p) => {
                    const pasajero = pasajeros[p.pasajeroId];
                    return (
                      <tr key={p.id}>
                        <td className="text-nowrap">{formatDate(p.fecha)}</td>
                        <td>
                          <div className="trip-passenger">
                            {pasajero ? (
                              <Link to={`/pasajeros/${pasajero.id}#presupuestos`} className="link-app budget-passenger-link">
                                {fullName(pasajero)}
                              </Link>
                            ) : (
                              <span>{p.pasajeroId} (no existe)</span>
                            )}
                            {pasajero && <span className="trip-passenger-dni">{p.id} · DNI {formatDni(pasajero.dni)}</span>}
                          </div>
                        </td>
                        <td className="text-end text-nowrap cell-muted">{formatKm(p.kilometros)}</td>
                        <td className="text-end text-nowrap cell-accent">{formatAmount(p.tarifaKm)}</td>
                        <td className="text-end text-nowrap">{formatAmount(p.total)}</td>
                        <td className="text-center">
                          <BudgetActions presupuesto={p} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="table-total-row" data-testid="totales-presupuestos">
                    <td colSpan={2}>Totales ({rows.length} {rows.length === 1 ? "presupuesto" : "presupuestos"})</td>
                    <td className="text-end text-nowrap">{formatKm(totalKm)}</td>
                    <td />
                    <td className="text-end text-nowrap" data-testid="total-presupuestado">
                      {formatAmount(totalImporte)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="criteria-note mt-3 mb-0">
              <Info size={16} strokeWidth={2} aria-hidden="true" />
              <span>
                Los totales corresponden a la suma {alcance} (todas las páginas). Son importes <strong>presupuestados</strong>, no ingresos
                cobrados. Valores ficticios de demostración.
              </span>
            </p>
            <Pagination page={page} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={(value) => applyView(filters, value)} />
          </>
        )}
      </ContentCard>
    </>
  );
}
