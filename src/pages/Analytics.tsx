import { useMemo, useState } from "react";
import { TrendingUp, BarChart3, PieChart, Award, TrendingDown, Activity, Gauge } from "lucide-react";
import { useStore } from "../store/useStore";
import { Panel, SectionTitle, Segmented, EmptyState } from "../components/ui";
import { StatTile } from "../components/ui/StatTile";
import { ProfitArea, IncomeExpenseBars, CategoryDonut } from "../components/charts";
import {
  byCategory,
  dailySeries,
  inRange,
  monthlySummaries,
  profitStats,
  RANGE_KEYS,
  rangeStart,
  totalsFor,
  type RangeKey,
} from "../lib/finance";
import { money } from "../lib/format";
import { iso, labelDay, todayISO } from "../lib/date";
import { CAT_COLORS } from "../lib/theme";

export function Analytics() {
  const transactions = useStore((s) => s.transactions);
  const [range, setRange] = useState<RangeKey>("30D");

  const data = useMemo(() => {
    const today = todayISO();
    const from = iso(rangeStart(range, transactions));
    const scoped = inRange(transactions, from, today);
    const totals = totalsFor(scoped);
    const series = dailySeries(scoped, from, today);
    const stats = profitStats(series, totals);
    return {
      scoped,
      totals,
      series,
      stats,
      incomeByCat: byCategory(scoped, "income"),
      expenseByCat: byCategory(scoped, "expense"),
      months: monthlySummaries(transactions, 6),
    };
  }, [transactions, range]);

  const hasData = data.scoped.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionTitle title="Analytics" subtitle="Profit, income, expenses & movements over time" icon={<Activity size={16} />} />
        <Segmented options={RANGE_KEYS} value={range} onChange={setRange} />
      </div>

      {/* metrics */}
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Profit" value={money(data.totals.profit, { sign: true })} accent="var(--color-primary)" glow="var(--color-primary)" icon={<TrendingUp size={15} />} footer={`${range} range`} />
        <StatTile label="Avg / day" value={money(data.stats.avgPerDay, { sign: true })} accent="var(--color-fg)" icon={<Gauge size={15} />} />
        <StatTile label="Best day" value={data.stats.bestDay ? money(data.stats.bestDay.profit, { sign: true }) : "—"} accent="var(--color-positive)" icon={<Award size={15} />} footer={data.stats.bestDay ? labelDay(data.stats.bestDay.date) : ""} />
        <StatTile label="Worst day" value={data.stats.worstDay ? money(data.stats.worstDay.profit, { sign: true }) : "—"} accent="var(--color-negative)" icon={<TrendingDown size={15} />} footer={data.stats.worstDay ? labelDay(data.stats.worstDay.date) : ""} />
      </div>

      {/* profit chart */}
      <Panel>
        <SectionTitle title="Profit trend" subtitle="Daily income minus expenses" icon={<TrendingUp size={16} />} />
        {hasData ? <ProfitArea data={data.series} height={280} /> : <EmptyState icon={<TrendingUp size={22} />} title="No data in this range" hint="Add transactions to see your trend." />}
      </Panel>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* monthly bars */}
        <Panel className="xl:col-span-2">
          <SectionTitle title="Income vs Expenses" subtitle="Last 6 months" icon={<BarChart3 size={16} />} />
          <IncomeExpenseBars data={data.months} />
        </Panel>

        {/* movement summary */}
        <Panel>
          <SectionTitle title="Flow summary" subtitle={`${range} range`} icon={<Activity size={16} />} />
          <div className="space-y-2.5">
            <FlowRow label="Income" value={money(data.totals.income)} color="var(--color-positive)" />
            <FlowRow label="Expenses" value={money(data.totals.expenses)} color="var(--color-negative)" />
            <FlowRow label="Profit" value={money(data.totals.profit, { sign: true })} color="var(--color-primary)" bold />
            <div className="border-t border-[var(--color-border)]" />
            <FlowRow label="Withdrawals" value={money(data.totals.withdrawals)} color="var(--color-muted)" />
            <FlowRow label="Transfers" value={money(data.totals.transfers)} color="var(--color-muted)" />
            <FlowRow label="Deposits" value={money(data.totals.deposits)} color="var(--color-muted)" />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CategoryPanel title="Income by category" icon={<PieChart size={16} />} slices={data.incomeByCat} />
        <CategoryPanel title="Expenses by category" icon={<PieChart size={16} />} slices={data.expenseByCat} />
      </div>
    </div>
  );
}

function FlowRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--color-muted)]">{label}</span>
      <span className={`num ${bold ? "text-base font-bold" : "text-sm font-semibold"}`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function CategoryPanel({
  title,
  icon,
  slices,
}: {
  title: string;
  icon: React.ReactNode;
  slices: { category: string; value: number }[];
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <Panel>
      <SectionTitle title={title} icon={icon} />
      {slices.length === 0 ? (
        <EmptyState icon={<PieChart size={22} />} title="No data" />
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-[180px] shrink-0">
            <CategoryDonut data={slices} />
          </div>
          <div className="flex-1 space-y-2">
            {slices.slice(0, 6).map((s, i) => (
              <div key={s.category} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                <span className="flex-1 truncate text-sm">{s.category}</span>
                <span className="num text-sm font-semibold">{money(s.value)}</span>
                <span className="num w-10 text-right text-[11px] text-[var(--color-faint)]">
                  {total ? Math.round((s.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
