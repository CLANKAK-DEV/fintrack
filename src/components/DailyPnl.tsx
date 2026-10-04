import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CalendarRange, RefreshCw, TrendingUp } from "lucide-react";
import { Panel, SectionTitle, EmptyState } from "./ui";
import { buildDailyReport, clearHistoryCache, type DailyPnlReport } from "../lib/history";
import { money } from "../lib/format";
import { labelDay } from "../lib/date";
import { CHAIN_COLORS } from "../lib/theme";
import type { Wallet } from "../lib/db/types";

export function DailyPnl({ wallets }: { wallets: Wallet[] }) {
  const [report, setReport] = useState<DailyPnlReport | null>(null);
  const [loading, setLoading] = useState(false);

  const syncedKey = wallets
    .filter((w) => w.nativeBalance != null && w.chain !== "OTHER")
    .map((w) => `${w.id}:${w.nativeBalance}`)
    .join("|");

  async function load(force = false) {
    if (force) clearHistoryCache();
    setLoading(true);
    try {
      setReport(await buildDailyReport(wallets, 7));
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (syncedKey) load();
    else setReport(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedKey]);

  const hasData = report && report.combined.length > 0;

  return (
    <Panel>
      <SectionTitle
        title="Daily P&L · last 7 days"
        subtitle="Mark-to-market of current holdings by day"
        icon={<CalendarRange size={16} />}
        action={
          <button className="btn btn-ghost h-8 px-3 text-xs" onClick={() => load(true)} disabled={loading || !syncedKey}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {!syncedKey ? (
        <EmptyState
          icon={<TrendingUp size={22} />}
          title="Sync wallets first"
          hint="Run “Sync on-chain” so daily values can be calculated from your balances."
        />
      ) : loading && !report ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <RefreshCw size={22} className="animate-spin" style={{ color: "var(--color-primary)" }} />
          <span className="text-sm text-[var(--color-muted)]">Loading price history…</span>
        </div>
      ) : !hasData ? (
        <EmptyState icon={<TrendingUp size={22} />} title="No history available" />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* today + chart */}
          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="label mb-1">Today's P&L</div>
                <div
                  className="num text-3xl font-bold leading-none"
                  style={{ color: report!.todayPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}
                >
                  {money(report!.todayPnl, { sign: true })}
                </div>
                {report!.todayPct != null && (
                  <div
                    className="num mt-1 text-sm font-semibold"
                    style={{ color: report!.todayPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}
                  >
                    {report!.todayPct >= 0 ? "+" : ""}
                    {report!.todayPct.toFixed(2)}%
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="label mb-1">Total value</div>
                <div className="num text-lg font-bold">{money(report!.totalValue)}</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={report!.combined} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => labelDay(d)}
                  tick={{ fill: "var(--color-faint)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="glass rounded-lg px-3 py-2 text-xs" style={{ boxShadow: "var(--shadow-pop)" }}>
                        <div className="mb-1 text-[var(--color-faint)]">{labelDay(payload[0].payload.date)}</div>
                        <div
                          className="num font-semibold"
                          style={{ color: payload[0].payload.pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}
                        >
                          {money(payload[0].payload.pnl, { sign: true })}
                        </div>
                        <div className="num text-[var(--color-faint)]">value {money(payload[0].payload.value)}</div>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={30}>
                  {report!.combined.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* per wallet today + per day */}
          <div className="space-y-4">
            <div>
              <div className="label mb-2">Today · by wallet</div>
              <div className="space-y-1.5">
                {report!.perWallet.map((pw) => (
                  <div key={pw.wallet.id} className="flex items-center justify-between rounded-lg bg-[var(--color-overlay)] px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold"
                        style={{ background: `${CHAIN_COLORS[pw.wallet.chain]}22`, color: CHAIN_COLORS[pw.wallet.chain] }}
                      >
                        {pw.wallet.chain}
                      </span>
                      <div className="leading-tight">
                        <div className="text-sm font-medium">{pw.wallet.label}</div>
                        <div className="num text-[11px] text-[var(--color-faint)]">{money(pw.value)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="num text-sm font-bold"
                        style={{ color: pw.todayPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}
                      >
                        {money(pw.todayPnl, { sign: true })}
                      </div>
                      {pw.todayPct != null && (
                        <div
                          className="num text-[11px]"
                          style={{ color: pw.todayPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}
                        >
                          {pw.todayPct >= 0 ? "+" : ""}
                          {pw.todayPct.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
