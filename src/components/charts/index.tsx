import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CatSlice, DayPoint, MonthSummary } from "../../lib/finance";
import { money, moneyCompact } from "../../lib/format";
import { labelDay } from "../../lib/date";
import { C, CAT_COLORS } from "../../lib/theme";

const axis = { stroke: C.faint, fontSize: 11, fontFamily: "JetBrains Mono" };

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="glass rounded-lg px-3 py-2 text-xs"
      style={{ boxShadow: "var(--shadow-pop)" }}
    >
      {children}
    </div>
  );
}

/* ---------- Profit area ---------- */
export function ProfitArea({ data, height = 240 }: { data: DayPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.primary} stopOpacity={0.45} />
            <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d) => labelDay(d)}
          tick={axis}
          axisLine={false}
          tickLine={false}
          minTickGap={28}
        />
        <YAxis tickFormatter={moneyCompact} tick={axis} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          cursor={{ stroke: C.border }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="mb-1 text-[var(--color-faint)]">{labelDay(payload[0].payload.date)}</div>
                <div className="num font-semibold" style={{ color: C.primary }}>
                  {money(payload[0].payload.profit, { sign: true })}
                </div>
              </TipBox>
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="profit"
          stroke={C.primary}
          strokeWidth={2}
          fill="url(#gProfit)"
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- Income vs Expense monthly bars ---------- */
export function IncomeExpenseBars({ data, height = 260 }: { data: MonthSummary[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={4}>
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={moneyCompact} tick={axis} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="mb-1 text-[var(--color-faint)]">{payload[0].payload.label}</div>
                <div className="num" style={{ color: C.positive }}>Income {money(payload[0].payload.income)}</div>
                <div className="num" style={{ color: C.negative }}>Expenses {money(payload[0].payload.expenses)}</div>
                <div className="num mt-1 font-semibold">Net {money(payload[0].payload.profit, { sign: true })}</div>
              </TipBox>
            ) : null
          }
        />
        <Bar dataKey="income" fill={C.positive} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={500} />
        <Bar dataKey="expenses" fill={C.negative} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Category donut ---------- */
export function CategoryDonut({ data, height = 200 }: { data: CatSlice[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="category"
          innerRadius="58%"
          outerRadius="86%"
          paddingAngle={2}
          stroke="none"
          animationDuration={500}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="text-[var(--color-faint)]">{payload[0].name}</div>
                <div className="num font-semibold">
                  {money(payload[0].value as number)}
                  <span className="ml-1 text-[var(--color-faint)]">
                    {total ? `${Math.round(((payload[0].value as number) / total) * 100)}%` : ""}
                  </span>
                </div>
              </TipBox>
            ) : null
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ---------- Mini sparkline (inline, no axes) ---------- */
export function Sparkline({
  data,
  color = C.primary,
  height = 40,
}: {
  data: DayPoint[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="profit" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
