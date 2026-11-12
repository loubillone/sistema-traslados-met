import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS_COLOR = "#6a7282";

export default function MonthlyTripsChart({ data }) {
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke={AXIS_COLOR} tick={{ fontSize: 13 }} tickMargin={6} />
          <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 13 }} allowDecimals={false} />
          <Tooltip
            labelFormatter={(_, payload) => payload?.[0]?.payload?.nombre ?? ""}
            formatter={(value) => [value, "Viajes"]}
            contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb", fontSize: 13 }}
          />
          <Line
            type="monotone"
            dataKey="viajes"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 6, fill: "#3b82f6", strokeWidth: 0 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
