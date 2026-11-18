import { useEffect, useState } from "react";
import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORIAS_GASTO, CATEGORIA_KEYS } from "../../constants/gastos";
import { formatAmount } from "../../utils/format";

const NARROW_QUERY = "(max-width: 575.98px)";

function useNarrowScreen() {
  const [narrow, setNarrow] = useState(() => window.matchMedia?.(NARROW_QUERY).matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.(NARROW_QUERY);
    if (!media) return undefined;
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

const percentLabel = (percent) => (percent > 0 && percent < 0.01 ? "<1%" : `${Math.round(percent * 100)}%`);

/**
 * Gráfico de torta de los importes por categoría (Figma: "Gastos por Categoría").
 * En pantallas angostas las etiquetas pasan a una leyenda inferior.
 */
export default function ExpensesByCategoryChart({ summary }) {
  const narrow = useNarrowScreen();
  const data = CATEGORIA_KEYS.filter((key) => summary[key].total > 0).map((key) => ({
    key,
    name: CATEGORIAS_GASTO[key].label,
    value: summary[key].total,
    fill: CATEGORIAS_GASTO[key].color,
  }));
  const total = data.reduce((acc, item) => acc + item.value, 0);

  if (data.length === 0) {
    return <p className="expense-chart-empty">No hay gastos para graficar con los filtros seleccionados.</p>;
  }

  const renderLabel = ({ x, y, textAnchor, name, percent, fill }) => (
    <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill={fill} fontSize={14}>
      {`${name}: ${percentLabel(percent)}`}
    </text>
  );

  return (
    <div className="chart-container expense-chart" role="img" aria-label={`Gastos por categoría: ${data.map((d) => `${d.name} ${formatAmount(d.value)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy={narrow ? "45%" : "50%"}
            outerRadius={narrow ? "75%" : "62%"}
            label={narrow ? false : renderLabel}
            labelLine={false}
            stroke="#fff"
            strokeWidth={1}
            isAnimationActive={false}
          />
          <Tooltip
            formatter={(value, name) => [`${formatAmount(value)} (${percentLabel(value / total)})`, name]}
            contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb", fontSize: 13 }}
          />
          {narrow && <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} formatter={(value, entry) => `${value}: ${percentLabel(entry.payload.value / total)}`} />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
