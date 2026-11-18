import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Plus, ReceiptText, SearchX } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ContentCard from "../../components/common/ContentCard";
import DataTable from "../../components/common/DataTable";
import Pagination from "../../components/common/Pagination";
import EmptyState from "../../components/common/EmptyState";
import CategoryLabel from "../../components/gastos/CategoryLabel";
import ExpenseActions from "../../components/gastos/ExpenseActions";
import ExpenseCategoryCards from "../../components/gastos/ExpenseCategoryCards";
import ExpenseFilters from "../../components/gastos/ExpenseFilters";
import ExpensesByCategoryChart from "../../components/gastos/ExpensesByCategoryChart";
import useData from "../../hooks/useData";
import useExpenseActions from "../../hooks/useExpenseActions";
import { formatDate, todayISO } from "../../utils/dates";
import { formatAmount, paginate } from "../../utils/format";
import { buildIndex, fullName } from "../../utils/selectors";
import { ownUrlState, urlBaseKey } from "../../utils/urlState";
import {
  buildMonthOptions,
  categoriaLabel,
  EXPENSE_FILTER_KEYS,
  expenseVehicleId,
  filterExpenses,
  monthKeyOf,
  monthName,
  readExpenseFilters,
  sortExpenses,
  sumAmounts,
  summarizeByCategory,
  TODOS_LOS_MESES,
} from "../../utils/expenses";

const PAGE_SIZE = 10;
const URL_SCOPE = "filtrosGastos";

const readPage = (searchParams) => Math.max(1, Number(searchParams.get("pagina")) || 1);

function buildParams(filters, page, currentMonth) {
  const params = new URLSearchParams();
  EXPENSE_FILTER_KEYS.forEach((key) => {
    if (!filters[key]) return;
    if (key === "mes" && filters.mes === currentMonth) return;
    params.set(key, filters[key]);
  });
  if (page > 1) params.set("pagina", String(page));
  return params;
}

/**
 * Registro de Gastos (CU-13): resumen mensual, gráfico y totales por categoría
 * y tabla de gastos con filtros por mes, categoría y vehículo. Los filtros se
 * guardan en la URL (ver utils/urlState.js).
 */
export default function ExpensesPage() {
  const location = useLocation();
  return <ExpensesView key={urlBaseKey(location, URL_SCOPE)} />;
}

function ExpensesView() {
  const { data } = useData();
  const { remove } = useExpenseActions();
  const [, setSearchParams] = useSearchParams();
  const location = useLocation();
  const currentMonth = monthKeyOf(todayISO());
  const gastos = useMemo(() => data.gastos ?? [], [data.gastos]);

  const [view, setView] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    return { filters: readExpenseFilters(searchParams, currentMonth), page: readPage(searchParams) };
  });
  const { filters } = view;

  const lookups = useMemo(
    () => ({
      viajes: buildIndex(data.viajes),
      vehiculos: buildIndex(data.vehiculos),
      pasajeros: buildIndex(data.pasajeros),
    }),
    [data.viajes, data.vehiculos, data.pasajeros],
  );

  const monthOptions = useMemo(() => buildMonthOptions(gastos, currentMonth), [gastos, currentMonth]);
  // Resumen y gráfico: mes y vehículo. Tabla: además, la categoría.
  const scope = useMemo(() => filterExpenses(gastos, filters, lookups.viajes, { withCategory: false }), [gastos, filters, lookups.viajes]);
  const summary = useMemo(() => summarizeByCategory(scope), [scope]);
  const rows = useMemo(
    () => sortExpenses(filters.categoria ? scope.filter((g) => g.categoria === filters.categoria) : scope),
    [scope, filters.categoria],
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(view.page, pageCount);
  const canClear = filters.mes !== currentMonth || Boolean(filters.vehiculo) || Boolean(filters.categoria);
  const vehiculoFiltrado = filters.vehiculo ? lookups.vehiculos[filters.vehiculo] : null;

  const applyView = (nextFilters, nextPage) => {
    setView({ filters: nextFilters, page: nextPage });
    setSearchParams(buildParams(nextFilters, nextPage, currentMonth), { replace: true, state: ownUrlState(location, URL_SCOPE) });
  };
  const handleFilterChange = (key, value) => applyView({ ...filters, [key]: value }, 1);
  const clearFilters = () => applyView({ mes: currentMonth, categoria: "", vehiculo: "" }, 1);

  const columns = [
    { key: "fecha", header: "Fecha", render: (g) => formatDate(g.fecha), cellClassName: "text-nowrap" },
    { key: "categoria", header: "Categoría", render: (g) => <CategoryLabel categoria={g.categoria} />, cellClassName: "text-nowrap" },
    {
      key: "vehiculo",
      header: "Vehículo",
      render: (g) => lookups.vehiculos[expenseVehicleId(g, lookups.viajes)]?.patente ?? "—",
      cellClassName: "cell-muted text-nowrap",
    },
    {
      key: "viaje",
      header: "Viaje asociado",
      render: (g) => {
        const viaje = lookups.viajes[g.viajeId];
        if (!viaje) return <span className="cell-muted">{g.viajeId} (no existe)</span>;
        return (
          <div className="trip-passenger">
            <Link to={`/viajes/${viaje.id}`} state={{ from: `${location.pathname}${location.search}` }} className="link-app">
              {viaje.id}
            </Link>
            <span className="trip-passenger-dni">{fullName(lookups.pasajeros[viaje.pasajeroId])}</span>
          </div>
        );
      },
      cellClassName: "text-nowrap",
    },
    { key: "descripcion", header: "Descripción", cellClassName: "cell-muted expense-description" },
    { key: "monto", header: "Monto", render: (g) => formatAmount(g.monto), className: "text-end", cellClassName: "text-end text-nowrap" },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-end",
      cellClassName: "text-end",
      render: (g) => <ExpenseActions gasto={g} onDelete={remove} />,
    },
  ];

  const periodo = monthName(filters.mes);
  const criterios = [periodo, vehiculoFiltrado?.patente, filters.categoria && categoriaLabel(filters.categoria)].filter(Boolean).join(" · ");
  const tableSummary = `${rows.length} ${rows.length === 1 ? "gasto" : "gastos"} · ${criterios}`;

  return (
    <>
      <PageHeader
        title="Registro de Gastos"
        subtitle="Control de gastos operativos de la flota"
        actions={
          <Link to="/gastos/nuevo" state={{ from: `${location.pathname}${location.search}` }} className="btn-app btn-app-primary btn-app-lg">
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Registrar Gasto
          </Link>
        }
      />

      <ExpenseFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={clearFilters}
        monthOptions={monthOptions}
        vehiculos={data.vehiculos}
        canClear={canClear}
      />

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-4">
          <section className="content-card expense-total-card h-100" aria-label="Total mensual" data-testid="total-mensual">
            <h2 className="expense-total-title">{filters.mes === TODOS_LOS_MESES ? "Total general" : "Total Mensual"}</h2>
            <div className="expense-total-value">{formatAmount(sumAmounts(scope))}</div>
            <div className="expense-total-period">{periodo}</div>
            <div className="expense-total-meta">
              {scope.length} {scope.length === 1 ? "gasto registrado" : "gastos registrados"}
              {vehiculoFiltrado && (
                <>
                  <br />
                  Vehículo {vehiculoFiltrado.patente}
                </>
              )}
            </div>
          </section>
        </div>
        <div className="col-12 col-lg-8">
          <ContentCard title="Gastos por Categoría" className="h-100">
            <ExpensesByCategoryChart summary={summary} />
          </ContentCard>
        </div>
      </div>

      <div className="mb-4">
        <ExpenseCategoryCards summary={summary} selected={filters.categoria} onSelect={(value) => handleFilterChange("categoria", value)} />
      </div>

      <ContentCard title="Gastos Recientes">
        {rows.length === 0 ? (
          <EmptyState icon={gastos.length ? SearchX : ReceiptText} title={gastos.length ? "No se encontraron gastos" : "No hay gastos registrados"}>
            <p>
              {gastos.length
                ? `No hay gastos para ${criterios}. Pruebe con otro mes, vehículo o categoría.`
                : "Registre el primer gasto asociado a un viaje."}
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
            <p className="list-summary" data-testid="resumen-tabla">{tableSummary}</p>
            <DataTable columns={columns} rows={paginate(rows, page, PAGE_SIZE)} />
            <Pagination page={page} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={(value) => applyView(filters, value)} />
          </>
        )}
      </ContentCard>
    </>
  );
}
