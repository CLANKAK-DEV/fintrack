import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Copy, Check, Coins, ArrowLeftRight, Wallet2, RefreshCw, LineChart } from "lucide-react";
import { useStore } from "../store/useStore";
import { Panel, SectionTitle, EmptyState, Badge } from "../components/ui";
import { StatTile } from "../components/ui/StatTile";
import { Modal } from "../components/ui/Modal";
import { Field, MoneyInput, Select, TextInput } from "../components/ui/Field";
import { PortfolioModal } from "../components/PortfolioModal";
import { DailyPnl } from "../components/DailyPnl";
import { money, shortAddress } from "../lib/format";
import { labelDay } from "../lib/date";
import { CHAIN_COLORS, TYPE_STYLES } from "../lib/theme";
import { toast } from "../store/useToast";
import { NATIVE_SYMBOL, isValidAddress } from "../lib/chain";
import type { Chain, Wallet } from "../lib/db/types";
import { uid } from "../lib/id";

function timeAgo(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const CHAINS: Chain[] = ["ETH", "BTC", "SOL", "OTHER"];

export function Crypto() {
  const { wallets, transactions, saveWallet, removeWallet, syncing, syncWallets } = useStore();
  const alchemyKey = useStore((s) => s.settings.alchemyKey);
  const [modal, setModal] = useState<{ open: boolean; editing: Wallet | null }>({ open: false, editing: null });
  const [scan, setScan] = useState<{ open: boolean; wallet: Wallet | null }>({ open: false, wallet: null });
  const [copied, setCopied] = useState<string | null>(null);

  function openScan(w: Wallet) {
    if (!alchemyKey.trim()) {
      toast.danger("Add your Alchemy API key in Settings first");
      return;
    }
    setScan({ open: true, wallet: w });
  }

  const deleteWallet = (w: Wallet) => {
    removeWallet(w.id);
    toast.undo(`Wallet "${w.label}" deleted`, () => saveWallet(w));
  };

  async function handleSync() {
    const r = await syncWallets();
    if (r.synced) toast.success(`Synced ${r.synced} wallet${r.synced > 1 ? "s" : ""} on-chain`);
    if (r.failed) toast.danger(`${r.failed} wallet${r.failed > 1 ? "s" : ""} couldn't be reached`);
    if (!r.synced && !r.failed && r.skipped) toast.info("No wallets with a valid address to sync");
  }

  const syncable = wallets.some((w) => w.chain !== "OTHER" && isValidAddress(w.chain, w.address));

  const total = useMemo(() => wallets.reduce((s, w) => s + w.balance, 0), [wallets]);
  const byChain = useMemo(() => {
    const m = new Map<Chain, { usd: number; native: number; count: number }>();
    for (const w of wallets) {
      const e = m.get(w.chain) ?? { usd: 0, native: 0, count: 0 };
      e.usd += w.balance;
      e.native += w.nativeBalance ?? 0;
      e.count++;
      m.set(w.chain, e);
    }
    // ETH first, then by value
    return [...m.entries()].sort((a, b) => (a[0] === "ETH" ? -1 : b[0] === "ETH" ? 1 : b[1].usd - a[1].usd));
  }, [wallets]);

  const movements = useMemo(
    () => transactions.filter((t) => t.type === "transfer" || t.type === "withdrawal" || t.type === "deposit").slice(0, 8),
    [transactions],
  );

  function copy(addr: string) {
    navigator.clipboard?.writeText(addr).then(() => {
      setCopied(addr);
      setTimeout(() => setCopied(null), 1400);
    });
  }

  return (
    <div className="space-y-5">
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total value"
          value={money(total)}
          icon={<Coins size={15} />}
          accent="var(--color-accent)"
          glow="var(--color-accent)"
          footer={`${wallets.length} wallet${wallets.length === 1 ? "" : "s"}`}
        />
        {byChain.map(([chain, e]) => (
          <StatTile
            key={chain}
            label={`${chain} total`}
            value={money(e.usd)}
            accent={CHAIN_COLORS[chain]}
            icon={<span className="num text-[10px] font-bold">{chain}</span>}
            footer={`${e.native.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${NATIVE_SYMBOL[chain]}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-5 py-4">
            <SectionTitle title="Wallets" subtitle="ETH summed across Ethereum, Base, Arbitrum, Optimism & Robinhood" icon={<Wallet2 size={16} />} />
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost h-9"
                onClick={handleSync}
                disabled={syncing || !syncable}
                title={syncable ? "Fetch live balances from the blockchain" : "Add a wallet with a valid address first"}
              >
                <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync on-chain"}
              </button>
              <button className="btn btn-primary h-9" onClick={() => setModal({ open: true, editing: null })}>
                <Plus size={15} strokeWidth={2.5} /> Add wallet
              </button>
            </div>
          </div>
          <div className="px-3 pb-4">
            {wallets.length === 0 ? (
              <EmptyState
                icon={<Wallet2 size={22} />}
                title="No wallets tracked"
                hint="Add your ETH, BTC or SOL wallets to monitor balances."
                action={
                  <button className="btn btn-ghost" onClick={() => setModal({ open: true, editing: null })}>
                    <Plus size={15} /> Add wallet
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {wallets.map((w) => (
                  <div key={w.id} className="group panel-flat p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <span
                        className="grid h-9 w-9 place-items-center rounded-xl text-xs font-bold"
                        style={{ background: `${CHAIN_COLORS[w.chain]}22`, color: CHAIN_COLORS[w.chain] }}
                      >
                        {w.chain}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setModal({ open: true, editing: w })} aria-label="Edit" className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteWallet(w)} aria-label="Delete" className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-negative)]">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{w.label}</div>
                    <button
                      onClick={() => copy(w.address)}
                      className="num mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--color-faint)] hover:text-[var(--color-fg)]"
                      title="Copy address"
                    >
                      {shortAddress(w.address, 6)}
                      {copied === w.address ? <Check size={11} style={{ color: "var(--color-positive)" }} /> : <Copy size={11} />}
                    </button>
                    <div className="num mt-3 text-xl font-bold" style={{ color: CHAIN_COLORS[w.chain] }}>
                      {money(w.balance)}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-faint)]">
                      {w.nativeBalance != null ? (
                        <span className="num">
                          {w.nativeBalance.toLocaleString("en-US", { maximumFractionDigits: 4 })} {NATIVE_SYMBOL[w.chain]}
                        </span>
                      ) : (
                        <span>no on-chain data</span>
                      )}
                      {w.syncedAt && <span>· synced {timeAgo(w.syncedAt)}</span>}
                    </div>
                    {(w.chain === "ETH" || w.chain === "SOL") && (
                      <button className="btn btn-ghost mt-3 h-8 w-full text-xs" onClick={() => openScan(w)}>
                        <LineChart size={13} /> {w.chain === "SOL" ? "Scan tokens (USDC, USDT…)" : "Scan portfolio & P&L"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="On-chain Movements" subtitle="Transfers, withdrawals & deposits" icon={<ArrowLeftRight size={16} />} />
          {movements.length === 0 ? (
            <EmptyState icon={<ArrowLeftRight size={22} />} title="No movements" hint="Record a transfer or withdrawal in Finance." />
          ) : (
            <div className="space-y-1">
              {movements.map((t) => {
                const st = TYPE_STYLES[t.type];
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg px-1 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge color={st.color} tint={st.tint}>
                          {st.label}
                        </Badge>
                        <span className="num truncate text-[11px] text-[var(--color-faint)]">
                          {t.fromAccount} → {t.toAccount}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--color-faint)]">{labelDay(t.date)}</div>
                    </div>
                    <span className="num text-sm font-semibold">{money(t.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <DailyPnl wallets={wallets} />

      <WalletModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSave={saveWallet}
      />

      <PortfolioModal
        open={scan.open}
        wallet={scan.wallet}
        apiKey={alchemyKey}
        onClose={() => setScan((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}

function WalletModal({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Wallet | null;
  onClose: () => void;
  onSave: (w: Wallet) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [chain, setChain] = useState<Chain>("ETH");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");

  useEffect(() => {
    if (open) {
      setLabel(editing?.label ?? "");
      setChain(editing?.chain ?? "ETH");
      setAddress(editing?.address ?? "");
      setBalance(editing ? String(editing.balance) : "");
    }
  }, [open, editing]);

  const valid = label.trim().length > 0;

  async function submit() {
    if (!valid) return;
    await onSave({
      id: editing?.id ?? uid(),
      label: label.trim(),
      chain,
      address: address.trim(),
      balance: parseFloat(balance) || 0,
      createdAt: editing?.createdAt ?? Date.now(),
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit wallet" : "Add wallet"}
      width={480}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!valid}>
            {editing ? "Save" : "Add wallet"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Label">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Main ETH" autoFocus />
        </Field>
        <Field label="Chain">
          <Select value={chain} onChange={(e) => setChain(e.target.value as Chain)}>
            {CHAINS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Address" className="mt-4">
        <TextInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… / bc1…" className="num" />
      </Field>
      <Field
        label="Balance (USD)"
        className="mt-4"
        hint="Optional. With a valid ETH / BTC / SOL address, use “Sync on-chain” to fetch the live balance automatically."
      >
        <MoneyInput value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" />
      </Field>
    </Modal>
  );
}
