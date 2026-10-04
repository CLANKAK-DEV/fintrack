import { httpFetch } from "./chain";
import type { Chain, Wallet } from "./db/types";

/* ============================================================
   Daily value & P&L history for crypto wallets.
   Values each day = current native balance × that day's price
   (keyless CoinGecko daily history). This is a mark-to-market
   of current holdings — it reflects price movement, not past
   deposits/withdrawals.
   ============================================================ */

const COIN_ID: Record<Chain, string | null> = {
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  OTHER: null,
};

export interface DayValue {
  date: string; // yyyy-MM-dd
  price: number;
  value: number;
  pnl: number; // vs previous day
  pnlPct: number | null;
}

async function getJson(url: string): Promise<any> {
  const f = await httpFetch();
  const res = await f(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const seriesCache = new Map<string, Map<string, number>>();

/** daily end-of-day price map {yyyy-MM-dd: price} for a coin, cached per session */
async function dailyPrices(coinId: string, days: number): Promise<Map<string, number>> {
  const key = `${coinId}:${days}`;
  const cached = seriesCache.get(key);
  if (cached) return cached;
  const data = await getJson(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
  );
  const byDate = new Map<string, number>();
  for (const [ms, price] of data?.prices ?? []) {
    byDate.set(new Date(ms).toISOString().slice(0, 10), price); // last price of each day wins
  }
  seriesCache.set(key, byDate);
  return byDate;
}

export function clearHistoryCache() {
  seriesCache.clear();
}

/** last `days` days of value + daily P&L for one wallet */
export async function walletDailyHistory(wallet: Wallet, days = 7): Promise<DayValue[]> {
  const coinId = COIN_ID[wallet.chain];
  if (!coinId || wallet.nativeBalance == null) return [];
  const byDate = await dailyPrices(coinId, days + 1);
  const dates = [...byDate.keys()].sort();
  const bal = wallet.nativeBalance;
  const out: DayValue[] = [];
  let prev: number | null = null;
  for (const d of dates) {
    const price = byDate.get(d)!;
    const value = bal * price;
    const pnl = prev == null ? 0 : value - prev;
    const pnlPct = prev ? (pnl / prev) * 100 : null;
    out.push({ date: d, price, value, pnl, pnlPct });
    prev = value;
  }
  return out.slice(-days);
}

export interface WalletToday {
  wallet: Wallet;
  todayPnl: number;
  todayPct: number | null;
  value: number;
  series: DayValue[];
}

export interface DailyPnlReport {
  perWallet: WalletToday[];
  /** combined daily series across all wallets */
  combined: DayValue[];
  todayPnl: number;
  todayPct: number | null;
  totalValue: number;
}

/** Build a full daily-P&L report across the given wallets. */
export async function buildDailyReport(wallets: Wallet[], days = 7): Promise<DailyPnlReport> {
  const eligible = wallets.filter((w) => COIN_ID[w.chain] && w.nativeBalance != null);
  const perWallet: WalletToday[] = [];

  await Promise.all(
    eligible.map(async (w) => {
      try {
        const series = await walletDailyHistory(w, days);
        if (!series.length) return;
        const last = series[series.length - 1];
        perWallet.push({
          wallet: w,
          series,
          todayPnl: last.pnl,
          todayPct: last.pnlPct,
          value: last.value,
        });
      } catch {
        /* skip wallet on error */
      }
    }),
  );

  // combine by date
  const dateMap = new Map<string, number>();
  for (const pw of perWallet) {
    for (const d of pw.series) {
      dateMap.set(d.date, (dateMap.get(d.date) ?? 0) + d.value);
    }
  }
  const combined: DayValue[] = [];
  let prev: number | null = null;
  for (const date of [...dateMap.keys()].sort()) {
    const value = dateMap.get(date)!;
    const pnl = prev == null ? 0 : value - prev;
    combined.push({ date, value, price: 0, pnl, pnlPct: prev ? (pnl / prev) * 100 : null });
    prev = value;
  }

  const lastC = combined[combined.length - 1];
  const totalValue = lastC?.value ?? 0;
  return {
    perWallet: perWallet.sort((a, b) => b.value - a.value),
    combined,
    todayPnl: lastC?.pnl ?? 0,
    todayPct: lastC?.pnlPct ?? null,
    totalValue,
  };
}
