import { CATEGORIAS_GASTO } from "../../constants/gastos";

/** Categoría con su ícono y color de Figma. */
export default function CategoryLabel({ categoria }) {
  const config = CATEGORIAS_GASTO[categoria];
  if (!config) return <span>{categoria}</span>;
  const Icon = config.icon;
  return (
    <span className="expense-category">
      <Icon size={16} strokeWidth={1.75} style={{ color: config.color }} aria-hidden="true" />
      {config.label}
    </span>
  );
}
