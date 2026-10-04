import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, ListChecks } from "lucide-react";
import { useStore } from "../store/useStore";
import { Panel, SectionTitle, EmptyState, Badge } from "../components/ui";
import {
  addDays,
  endOfMonth,
  format,
  iso,
  labelFull,
  startOfMonth,
  startOfWeek,
  todayISO,
} from "../lib/date";
import { onDay, totalsFor } from "../lib/finance";
import { money } from "../lib/format";
import { TYPE_STYLES } from "../lib/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function Calendar() {
  const { transactions, tasks } = useStore();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string>(todayISO());

  const cells = useMemo(() => {
    const first = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    return Array.from({ length: 42 }, (_, i) => iso(addDays(first, i)));
  }, [cursor]);

  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === "income") m.set(t.date, (m.get(t.date) ?? 0) + t.amount);
      else if (t.type === "expense") m.set(t.date, (m.get(t.date) ?? 0) - t.amount);
    }
    return m;
  }, [transactions]);

  const monthKey = iso(cursor).slice(0, 7);
  const selTx = useMemo(() => onDay(transactions, selected), [transactions, selected]);
  const selTot = totalsFor(selTx);
  const selTasks = tasks.filter((t) => t.recurrence === "daily" || t.date === selected);
  const selTasksDone = selTasks.filter((t) => t.done).length;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Panel className="xl:col-span-2" padded={false}>
        <div className="flex items-center justify-between px-5 py-4">
          <SectionTitle title={format(cursor, "MMMM yyyy")} icon={<CalendarDays size={16} />} />
          <div className="flex items-center gap-1">
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-3)]"
              onClick={() => setCursor(startOfMonth(addDays(startOfMonth(cursor), -1)))}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-ghost h-8 px-3 text-xs" onClick={() => { setCursor(startOfMonth(new Date())); setSelected(todayISO()); }}>
              Today
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-3)]"
              onClick={() => setCursor(startOfMonth(addDays(endOfMonth(cursor), 1)))}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 px-4 pb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-4 pb-4">
          {cells.map((d) => {
            const inMonth = d.slice(0, 7) === monthKey;
            const isToday = d === todayISO();
            const isSel = d === selected;
            const net = dayTotals.get(d) ?? 0;
            const hasData = dayTotals.has(d);
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className="relative flex aspect-square flex-col items-center justify-start rounded-lg border p-1.5 transition-all"
                style={{
                  borderColor: isSel ? "var(--color-primary)" : "transparent",
                  background: isSel ? "rgba(245,181,68,0.08)" : inMonth ? "var(--color-overlay)" : "transparent",
                  opacity: inMonth ? 1 : 0.35,
                }}
              >
                <span
                  className="num text-[11px] font-semibold"
                  style={{
                    color: isToday ? "var(--color-primary)" : "var(--color-muted)",
                  }}
                >
                  {Number(d.slice(8, 10))}
                </span>
                {hasData && (
                  <span
                    className="num mt-auto w-full truncate text-center text-[9px] font-semibold"
                    style={{ color: net >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}
                  >
                    {net >= 0 ? "+" : ""}
                    {Math.abs(net) >= 1000 ? `${(net / 1000).toFixed(1)}k` : net.toFixed(0)}
                  </span>
                )}
                {isToday && (
                  <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full" style={{ background: "var(--color-primary)" }} />
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* day detail */}
      <Panel>
        <SectionTitle title={labelFull(selected).split(",").slice(0, 2).join(",")} subtitle="Day summary" icon={<CalendarDays size={16} />} />

        <div className="grid grid-cols-3 gap-2">
          <DayStat label="Income" value={money(selTot.income)} color="var(--color-positive)" />
          <DayStat label="Expenses" value={money(selTot.expenses)} color="var(--color-negative)" />
          <DayStat label="Net" value={money(selTot.profit, { sign: true })} color="var(--color-primary)" />
        </div>

        {(selTot.withdrawals > 0 || selTot.transfers > 0 || selTot.deposits > 0) && (
          <div className="mt-2 rounded-lg bg-[var(--color-overlay)] px-3 py-2 text-[11px] text-[var(--color-faint)]">
            Movements: {money(selTot.transfers + selTot.withdrawals + selTot.deposits)} (not in profit)
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Transactions</span>
            <span className="num text-[11px] text-[var(--color-faint)]">{selTx.length}</span>
          </div>
          {selTx.length === 0 ? (
            <EmptyState icon={<CalendarDays size={20} />} title="No transactions" />
          ) : (
            <div className="max-h-[220px] space-y-1 overflow-y-auto">
              {selTx.map((t) => {
                const st = TYPE_STYLES[t.type];
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg px-1 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
                      <span className="text-sm">{t.note || t.category}</span>
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
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
          <span className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <ListChecks size={15} /> Tasks
          </span>
          <Badge>
            {selTasksDone} / {selTasks.length} done
          </Badge>
        </div>
      </Panel>
    </div>
  );
}

function DayStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-overlay)] px-2.5 py-2">
      <div className="label mb-1">{label}</div>
      <div className="num text-sm font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
