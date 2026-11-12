import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS_COLOR = "#6a7282";
const LEGEND_ORDER = ["presentes", "ausentes", "justificados"];

export default function MonthlyAttendanceChart({ data }) {
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke={AXIS_COLOR} tick={{ fontSize: 13 }} tickMargin={6} />
          <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 13 }} allowDecimals={false} />
          <Tooltip
            labelFormatter={(_, payload) => payload?.[0]?.payload?.nombre ?? ""}
            contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb", fontSize: 13 }}
            cursor={{ fill: "rgba(59, 130, 246, 0.06)" }}
          />
          <Legend
            iconType="square"
            wrapperStyle={{ fontSize: 14 }}
            itemSorter={(item) => LEGEND_ORDER.indexOf(item.dataKey)}
          />
          <Bar dataKey="presentes" name="Presentes" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="ausentes" name="Ausentes" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          <Bar dataKey="justificados" name="Justificados" fill="#10b981" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
