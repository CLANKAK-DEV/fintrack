import { useMemo } from "react";
import {
  TrendingUp,
  CalendarClock,
  ArrowDownRight,
  ArrowUpRight,
  ListChecks,
  Repeat,
  ArrowRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { Panel, SectionTitle, EmptyState, ProgressRing } from "../components/ui";
import { StatTile } from "../components/ui/StatTile";
import { ProfitArea } from "../components/charts";
import {
  dailySeries,
  inRange,
  onDay,
  subsMonthlyTotal,
  totalsFor,
} from "../lib/finance";
import { money } from "../lib/format";
import { addDays, endOfMonth, iso, relativeDue, startOfMonth, todayISO } from "../lib/date";
import { TYPE_STYLES } from "../lib/theme";

function deltaPct(current: number, prev: number): number {
  if (prev === 0) return current === 0 ? 0 : 100;
  return ((current - prev) / Math.abs(prev)) * 100;
}

export function Dashboard() {
  const { transactions, subscriptions, tasks, setView, toggleTask, openQuickAdd, loadSample } = useStore();

  const isEmpty =
    transactions.length === 0 && subscriptions.length === 0 && tasks.length === 0;

  const d = useMemo(() => {
    const today = todayISO();
    const monthStart = iso(startOfMonth(new Date()));
    const monthEnd = iso(endOfMonth(new Date()));
    const lastMonthStart = iso(startOfMonth(addDays(startOfMonth(new Date()), -1)));
    const lastMonthEnd = iso(endOfMonth(addDays(startOfMonth(new Date()), -1)));
    const yesterday = iso(addDays(new Date(), -1));

    const all = totalsFor(transactions);
    const month = totalsFor(inRange(transactions, monthStart, monthEnd));
    const lastMonth = totalsFor(inRange(transactions, lastMonthStart, lastMonthEnd));
    const todayT = totalsFor(onDay(transactions, today));
    const yesterdayT = totalsFor(onDay(transactions, yesterday));

    const series = dailySeries(transactions, iso(addDays(new Date(), -29)), today);

    return {
      all,
      month,
      todayT,
      monthDelta: deltaPct(month.profit, lastMonth.profit),
      todayDelta: deltaPct(todayT.profit, yesterdayT.profit),
      series,
      subsMonthly: subsMonthlyTotal(subscriptions),
    };
  }, [transactions, subscriptions]);

  const todayTasks = tasks.filter((t) => t.recurrence === "daily" || t.date === todayISO());
  const doneCount = todayTasks.filter((t) => t.done).length;
  const upcomingSubs = [...subscriptions].sort((a, b) => a.nextPayment.localeCompare(b.nextPayment)).slice(0, 4);
  const recentTx = transactions.slice(0, 6);

  if (isEmpty) {
    return (
      <div className="animate-rise grid min-h-[60vh] place-items-center">
        <div className="panel relative max-w-lg overflow-hidden p-10 text-center">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
            style={{ background: "var(--color-primary)", opacity: 0.16 }}
          />
          <div
            className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), #ff9f1c)",
              boxShadow: "0 16px 40px -14px rgba(245,181,68,0.6)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M8 6 L4 12 L8 18 M16 6 L20 12 L16 18" stroke="#1a1206" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome to FinTrack</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
            Your command center is empty and ready. Add your first entry to start tracking income, expenses,
            profit, subscriptions and tasks — or load sample data to explore first.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <button className="btn btn-primary" onClick={() => openQuickAdd()}>
              <Plus size={16} strokeWidth={2.5} /> Add first transaction
            </button>
            <button className="btn btn-ghost" onClick={loadSample}>
              <Sparkles size={15} /> Load sample data
            </button>
          </div>
          <p className="mt-5 text-[11px] text-[var(--color-faint)]">
            Tip: press <kbd className="num rounded bg-[var(--color-surface-3)] px-1.5 py-0.5">N</kbd> anytime to add ·{" "}
            <kbd className="num rounded bg-[var(--color-surface-3)] px-1.5 py-0.5">Ctrl</kbd>+
            <kbd className="num rounded bg-[var(--color-surface-3)] px-1.5 py-0.5">1–8</kbd> to navigate
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* hero */}
      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile
          label="Net Profit · All time"
          value={money(d.all.profit)}
          icon={<TrendingUp size={15} />}
          accent="var(--color-primary)"
          glow="var(--color-primary)"
          footer={`${d.all.count} transactions`}
        />
        <StatTile
          label="This Month"
          value={money(d.month.profit, { sign: true })}
          delta={d.monthDelta}
          icon={<CalendarClock size={15} />}
          footer="vs last month"
        />
        <StatTile
          label="Today"
          value={money(d.todayT.profit, { sign: true })}
          delta={d.todayDelta}
          icon={<ArrowUpRight size={15} />}
          footer="vs yesterday"
        />
      </div>

      {/* profit chart + money breakdown */}
      <Panel>
          <SectionTitle
            title="Profit — last 30 days"
            subtitle="Income minus expenses. Transfers & withdrawals excluded."
            icon={<TrendingUp size={16} />}
            action={
              <button className="btn btn-ghost h-8 px-3 text-xs" onClick={() => setView("analytics")}>
                Analytics <ArrowRight size={13} />
              </button>
            }
          />
          <ProfitArea data={d.series} />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--color-border)] pt-4">
            <MiniStat label="Income" value={money(d.month.income)} color="var(--color-positive)" icon={<ArrowDownRight size={14} />} />
            <MiniStat label="Expenses" value={money(d.month.expenses)} color="var(--color-negative)" icon={<ArrowUpRight size={14} />} />
            <MiniStat label="Profit" value={money(d.month.profit, { sign: true })} color="var(--color-primary)" icon={<TrendingUp size={14} />} />
          </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* tasks */}
        <Panel>
          <SectionTitle
            title="Today's Tasks"
            icon={<ListChecks size={16} />}
            action={
              <div className="flex items-center gap-2">
                <ProgressRing
                  value={todayTasks.length ? doneCount / todayTasks.length : 0}
                  size={34}
                  stroke={4}
                  label={<span className="text-[10px]">{doneCount}/{todayTasks.length}</span>}
                  color="var(--color-positive)"
                />
              </div>
            }
          />
          {todayTasks.length === 0 ? (
            <EmptyState icon={<ListChecks size={22} />} title="No tasks for today" />
          ) : (
            <div className="space-y-1">
              {todayTasks.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all"
                    style={{
                      borderColor: t.done ? "var(--color-positive)" : "var(--color-border)",
                      background: t.done ? "var(--color-positive)" : "transparent",
                    }}
                  >
                    {t.done && (
                      <svg width="11" height="11" viewBox="0 0 12 12">
                        <path d="M2.5 6 L5 8.5 L9.5 3.5" stroke="#06231a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={`flex-1 text-sm ${t.done ? "text-[var(--color-faint)] line-through" : ""}`}>
                    {t.title}
                  </span>
                  {t.time && <span className="num text-[11px] text-[var(--color-faint)]">{t.time}</span>}
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* subscriptions */}
        <Panel>
          <SectionTitle
            title="Subscriptions"
            subtitle={`${money(d.subsMonthly)}/mo`}
            icon={<Repeat size={16} />}
            action={
              <button className="btn btn-ghost h-8 px-3 text-xs" onClick={() => setView("subscriptions")}>
                All
              </button>
            }
          />
          {upcomingSubs.length === 0 ? (
            <EmptyState icon={<Repeat size={22} />} title="No subscriptions" />
          ) : (
            <div className="space-y-2">
              {upcomingSubs.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg px-1 py-1.5">
                  <div className="leading-tight">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-[var(--color-faint)]">{relativeDue(s.nextPayment)}</div>
                  </div>
                  <span className="num text-sm font-semibold">{money(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* recent activity */}
        <Panel>
          <SectionTitle
            title="Recent Activity"
            icon={<TrendingUp size={16} />}
            action={
              <button className="btn btn-ghost h-8 px-2.5 text-xs" onClick={() => openQuickAdd()}>
                <Plus size={13} /> Add
              </button>
            }
          />
          {recentTx.length === 0 ? (
            <EmptyState icon={<Plus size={22} />} title="No activity yet" />
          ) : (
            <div className="space-y-1">
              {recentTx.map((t) => {
                const st = TYPE_STYLES[t.type];
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg px-1 py-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
                      <div className="leading-tight">
                        <div className="text-sm font-medium">{t.note || t.category}</div>
                        <div className="text-[11px] text-[var(--color-faint)]">{t.category}</div>
                      </div>
                    </div>
                    <span className="num text-sm font-semibold" style={{ color: st.affectsProfit ? st.color : "var(--color-muted)" }}>
                      {st.sign === "~" ? "" : st.sign}
                      {money(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-overlay)] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[var(--color-faint)]">
        <span style={{ color }}>{icon}</span>
        <span className="label mb-0">{label}</span>
      </div>
      <div className="num text-base font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
