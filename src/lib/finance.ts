import {
  type Frequency,
  type Subscription,
  type Transaction,
} from "./db/types";
import { addDays, dateRange, iso, startOfMonth } from "./date";

/* ============================================================
   CORE ACCOUNTING RULE
   Profit = income − expenses.
   transfer / withdrawal / deposit are MOVEMENTS between the
   user's own accounts and are deliberately excluded from profit.
   ============================================================ */

export interface Totals {
  income: number;
  expenses: number;
  profit: number; // income - expenses
  withdrawals: number; // money moved out (e.g. Wallet → Binance)
  deposits: number;
  transfers: number; // internal movements
  count: number;
}

export function emptyTotals(): Totals {
  return { income: 0, expenses: 0, profit: 0, withdrawals: 0, deposits: 0, transfers: 0, count: 0 };
}

export function totalsFor(txs: Transaction[]): Totals {
  const t = emptyTotals();
  for (const tx of txs) {
    t.count++;
    switch (tx.type) {
      case "income":
        t.income += tx.amount;
        break;
      case "expense":
        t.expenses += tx.amount;
        break;
      case "withdrawal":
        t.withdrawals += tx.amount;
        break;
      case "deposit":
        t.deposits += tx.amount;
        break;
      case "transfer":
        t.transfers += tx.amount;
        break;
    }
  }
  t.profit = t.income - t.expenses;
  return t;
}

export function inRange(txs: Transaction[], fromISO: string, toISO: string): Transaction[] {
  return txs.filter((t) => t.date >= fromISO && t.date <= toISO);
}

export function onDay(txs: Transaction[], dayISO: string): Transaction[] {
  return txs.filter((t) => t.date === dayISO);
}

/* ---------- period helpers ---------- */
export type RangeKey = "7D" | "30D" | "3M" | "1Y" | "ALL";
export const RANGE_KEYS: RangeKey[] = ["7D", "30D", "3M", "1Y", "ALL"];

export function rangeStart(key: RangeKey, txs: Transaction[]): Date {
  const now = new Date();
  switch (key) {
    case "7D":
      return addDays(now, -6);
    case "30D":
      return addDays(now, -29);
    case "3M":
      return addDays(now, -89);
    case "1Y":
      return addDays(now, -364);
    case "ALL": {
      if (!txs.length) return addDays(now, -29);
      const earliest = txs.reduce((m, t) => (t.date < m ? t.date : m), txs[0].date);
      return new Date(earliest + "T00:00:00");
    }
  }
}

/* ---------- daily series for charts ---------- */
export interface DayPoint {
  date: string;
  income: number;
  expenses: number;
  profit: number;
  withdrawals: number;
}

export function dailySeries(txs: Transaction[], fromISO: string, toISO: string): DayPoint[] {
  const map = new Map<string, DayPoint>();
  for (const d of dateRange(new Date(fromISO + "T00:00:00"), new Date(toISO + "T00:00:00"))) {
    map.set(d, { date: d, income: 0, expenses: 0, profit: 0, withdrawals: 0 });
  }
  for (const tx of txs) {
    const p = map.get(tx.date);
    if (!p) continue;
    if (tx.type === "income") p.income += tx.amount;
    else if (tx.type === "expense") p.expenses += tx.amount;
    else if (tx.type === "withdrawal") p.withdrawals += tx.amount;
  }
  for (const p of map.values()) p.profit = p.income - p.expenses;
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- derived metrics ---------- */
export interface ProfitStats {
  totals: Totals;
  avgPerDay: number;
  bestDay: DayPoint | null;
  worstDay: DayPoint | null;
  activeDays: number;
}

export function profitStats(series: DayPoint[], totals: Totals): ProfitStats {
  let best: DayPoint | null = null;
  let worst: DayPoint | null = null;
  let active = 0;
  for (const p of series) {
    if (p.income || p.expenses) active++;
    if (!best || p.profit > best.profit) best = p;
    if (!worst || p.profit < worst.profit) worst = p;
  }
  const avgPerDay = series.length ? totals.profit / series.length : 0;
  return { totals, avgPerDay, bestDay: best, worstDay: worst, activeDays: active };
}

/* ---------- category breakdown ---------- */
export interface CatSlice {
  category: string;
  value: number;
}
export function byCategory(txs: Transaction[], type: "income" | "expense"): CatSlice[] {
  const m = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type) continue;
    m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
  }
  return [...m.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

/* ---------- monthly summary ---------- */
export interface MonthSummary {
  label: string;
  monthKey: string; // yyyy-MM
  income: number;
  expenses: number;
  profit: number;
}
export function monthlySummaries(txs: Transaction[], months = 6): MonthSummary[] {
  const out: MonthSummary[] = [];
  const base = startOfMonth(new Date());
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = iso(d).slice(0, 7);
    const monthTx = txs.filter((t) => t.date.slice(0, 7) === key);
    const tot = totalsFor(monthTx);
    out.push({
      label: d.toLocaleDateString("en-US", { month: "short" }),
      monthKey: key,
      income: tot.income,
      expenses: tot.expenses,
      profit: tot.profit,
    });
  }
  return out;
}

/* ---------- subscriptions ---------- */
const PER_MONTH: Record<Frequency, number> = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };

export function subMonthly(s: Subscription): number {
  return s.amount * PER_MONTH[s.frequency];
}
export function subsMonthlyTotal(subs: Subscription[]): number {
  return subs.reduce((sum, s) => sum + subMonthly(s), 0);
}
export function subsYearlyTotal(subs: Subscription[]): number {
  return subsMonthlyTotal(subs) * 12;
}

/* ---------- withdrawals ledger ---------- */
export interface WithdrawLedger {
  totalProfit: number;
  totalWithdrawn: number;
  remaining: number;
}
export function withdrawLedger(txs: Transaction[]): WithdrawLedger {
  const t = totalsFor(txs);
  return {
    totalProfit: t.profit,
    totalWithdrawn: t.withdrawals,
    remaining: t.profit - t.withdrawals,
  };
}
