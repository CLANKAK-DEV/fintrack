import { useEffect, useState } from "react";
import {
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Link2,
  AlertTriangle,
  TrendingUp,
  Layers,
} from "lucide-react";
import { Modal } from "./ui/Modal";
import { EmptyState } from "./ui";
import { money, shortAddress } from "../lib/format";
import { scanPortfolio, networkMeta, networksForChain, type ScanResult, type Transfer } from "../lib/evm";
import { toast } from "../store/useToast";
import type { Wallet } from "../lib/db/types";

function fmtAmount(n: number): string {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  if (n < 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function timeAgo(ms: number): string {
  if (!ms) return "";
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  const h = Math.round(s / 3600);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.round(d / 30)}mo ago`;
}

function ChainBadge({ networkKey }: { networkKey: string }) {
  const net = networkMeta(networkKey);
  if (!net) return null;
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: `${net.color}22`, color: net.color }}
    >
      {net.label}
    </span>
  );
}

export function PortfolioModal({
  open,
  wallet,
  apiKey,
  onClose,
}: {
  open: boolean;
  wallet: Wallet | null;
  apiKey: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [tab, setTab] = useState<"tokens" | "activity">("tokens");

  async function run() {
    if (!wallet) return;
    setLoading(true);
    setResult(null);
    try {
      const keys = networksForChain(wallet.chain);
      const r = await scanPortfolio(apiKey, wallet.address.trim(), keys);
      setResult(r);
      if (!r.tokens.length && r.errors.length) toast.danger("Scan failed — check the address & API key");
    } catch (e) {
      toast.danger("Portfolio scan failed");
      void e;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && wallet) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wallet?.id]);

  function copyLink(url: string) {
    navigator.clipboard?.writeText(url);
    toast.info("Explorer link copied");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={wallet ? `Portfolio · ${wallet.label}` : "Portfolio"}
      subtitle={
        wallet
          ? `${shortAddress(wallet.address, 8)} · ${wallet.chain === "SOL" ? "Solana (SPL tokens incl. USDC/USDT)" : "ETH · Base · Arbitrum · Optimism · Polygon · Robinhood"}`
          : ""
      }
      width={760}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={run} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> {loading ? "Scanning…" : "Rescan"}
          </button>
        </>
      }
    >
      {loading && !result ? (
        <Scanning />
      ) : !result ? (
        <EmptyState icon={<Layers size={22} />} title="Ready to scan" />
      ) : (
        <div className="space-y-4">
          {/* summary */}
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Total value" value={money(result.totalValue)} accent="var(--color-accent)" />
            <Summary label="Cost basis" value={result.totalInvested > 0 ? money(result.totalInvested) : "—"} accent="var(--color-fg)" />
            <Summary
              label="Unrealized P&L"
              value={result.totalInvested > 0 ? money(result.totalPnl, { sign: true }) : "—"}
              accent={result.totalPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)"}
            />
          </div>

          {/* tabs */}
          <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
            <Tab active={tab === "tokens"} onClick={() => setTab("tokens")}>
              Tokens ({result.tokens.length})
            </Tab>
            <Tab active={tab === "activity"} onClick={() => setTab("activity")}>
              Recent activity ({result.transfers.length})
            </Tab>
          </div>

          {tab === "tokens" ? (
            result.tokens.length === 0 ? (
              <EmptyState icon={<TrendingUp size={22} />} title="No priced tokens found" hint="This address holds no tokens with a known USD price on the scanned chains." />
            ) : (
              <div className="max-h-[340px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--color-surface)]">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-faint)]">
                      <th className="px-2 py-2 font-semibold">Token</th>
                      <th className="px-2 py-2 text-right font-semibold">Balance</th>
                      <th className="px-2 py-2 text-right font-semibold">Value</th>
                      <th className="px-2 py-2 text-right font-semibold">Avg cost</th>
                      <th className="px-2 py-2 text-right font-semibold">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.tokens.map((t) => (
                      <tr key={t.id} className="border-t border-[var(--color-border-soft)] hover:bg-[var(--color-surface-2)]">
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <TokenIcon symbol={t.symbol} logo={t.logo} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold">{t.symbol}</span>
                                <ChainBadge networkKey={t.network} />
                              </div>
                              <div className="num text-[11px] text-[var(--color-faint)]">{money(t.price, { decimals: t.price < 1 ? 4 : 2 })}</div>
                            </div>
                          </div>
                        </td>
                        <td className="num px-2 py-2.5 text-right">{fmtAmount(t.balance)}</td>
                        <td className="num px-2 py-2.5 text-right font-semibold">{money(t.value)}</td>
                        <td className="num px-2 py-2.5 text-right text-[var(--color-muted)]">
                          {t.hasCost ? money(t.avgCost, { decimals: t.avgCost < 1 ? 4 : 2 }) : "—"}
                        </td>
                        <td className="num px-2 py-2.5 text-right">
                          {t.hasCost && t.pnlPct != null ? (
                            <div style={{ color: t.pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                              <div className="font-semibold">{money(t.pnl, { sign: true })}</div>
                              <div className="text-[11px]">
                                {t.pnlPct >= 0 ? "+" : ""}
                                {t.pnlPct.toFixed(1)}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-[var(--color-faint)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <ActivityList transfers={result.transfers} onCopy={copyLink} />
          )}

          {result.errors.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-overlay)] px-3 py-2 text-[11px] text-[var(--color-faint)]">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "var(--color-warning)" }} />
              <span>{result.errors.join(" · ")}</span>
            </div>
          )}
          <p className="text-[11px] text-[var(--color-faint)]">
            P&L is average-cost from on-chain transfers (doesn't include off-chain / exchange buys). Prices via Alchemy.
          </p>
        </div>
      )}
    </Modal>
  );
}

function ActivityList({ transfers, onCopy }: { transfers: Transfer[]; onCopy: (u: string) => void }) {
  if (!transfers.length) return <EmptyState icon={<ArrowUpRight size={22} />} title="No recent transactions" />;
  return (
    <div className="max-h-[340px] space-y-1 overflow-y-auto">
      {transfers.map((t, i) => {
        const inc = t.direction === "in";
        return (
          <div key={t.hash + i} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-surface-2)]">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
              style={{
                background: inc ? "rgba(52,211,153,0.14)" : "rgba(251,113,133,0.14)",
                color: inc ? "var(--color-positive)" : "var(--color-negative)",
              }}
            >
              {inc ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="num text-sm font-semibold">
                  {inc ? "+" : "−"}
                  {fmtAmount(t.amount)} {t.asset}
                </span>
                <ChainBadge networkKey={t.network} />
              </div>
              <div className="num text-[11px] text-[var(--color-faint)]">
                {inc ? "from" : "to"} {shortAddress(t.counterparty, 5)} · {timeAgo(t.timestamp)}
              </div>
            </div>
            {t.valueUsd != null && <span className="num text-xs text-[var(--color-muted)]">{money(t.valueUsd)}</span>}
            <button
              onClick={() => onCopy(t.explorerUrl)}
              aria-label="Copy explorer link"
              className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
            >
              <Link2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-overlay)] px-3 py-2.5">
      <div className="label mb-1">{label}</div>
      <div className="num text-lg font-bold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="relative px-3 py-2 text-sm font-medium transition-colors"
      style={{ color: active ? "var(--color-fg)" : "var(--color-faint)" }}
    >
      {children}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--color-primary)" }} />}
    </button>
  );
}

function TokenIcon({ symbol, logo }: { symbol: string; logo: string | null }) {
  const [err, setErr] = useState(false);
  if (logo && !err) {
    return <img src={logo} alt={symbol} className="h-7 w-7 rounded-full" onError={() => setErr(true)} />;
  }
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-surface-3)] text-[10px] font-bold text-[var(--color-muted)]">
      {symbol.slice(0, 3)}
    </span>
  );
}

function Scanning() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <RefreshCw size={26} className="animate-spin" style={{ color: "var(--color-accent)" }} />
      <p className="text-sm text-[var(--color-muted)]">Scanning chains, tokens, transactions & prices…</p>
      <p className="text-[11px] text-[var(--color-faint)]">This can take a few seconds</p>
    </div>
  );
}
