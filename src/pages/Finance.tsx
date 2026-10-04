import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  ArrowLeftRight,
  Banknote,
  Search,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { Panel, SectionTitle, EmptyState, Segmented } from "../components/ui";
import { StatTile } from "../components/ui/StatTile";
import { TransactionModal } from "../components/TransactionModal";
import { TextInput } from "../components/ui/Field";
import { totalsFor, withdrawLedger } from "../lib/finance";
import { money } from "../lib/format";
import { labelDay } from "../lib/date";
import { TYPE_STYLES } from "../lib/theme";
import { toast } from "../store/useToast";
import type { Transaction, TxType } from "../lib/db/types";

const FILTERS = ["All", "Income", "Expense", "Transfer", "Withdrawal", "Deposit"] as const;
type Filter = (typeof FILTERS)[number];

export function Finance() {
  const { transactions, removeTransaction, saveTransaction } = useStore();
  const [filter, setFilter] = useState<Filter>("All");

  const deleteTx = (t: Transaction) => {
    removeTransaction(t.id);
    toast.undo("Transaction deleted", () => saveTransaction(t));
  };
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: Transaction | null; type: TxType }>({
    open: false,
    editing: null,
    type: "income",
  });

  const totals = useMemo(() => totalsFor(transactions), [transactions]);
  const ledger = useMemo(() => withdrawLedger(transactions), [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter !== "All" && t.type !== filter.toLowerCase()) return false;
      if (q && !(`${t.note} ${t.category} ${t.fromAccount} ${t.toAccount}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [transactions, filter, query]);

  // group by date
  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of filtered) {
      if (!m.has(t.date)) m.set(t.date, []);
      m.get(t.date)!.push(t);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const openAdd = (type: TxType) => setModal({ open: true, editing: null, type });
  const openEdit = (t: Transaction) => setModal({ open: true, editing: t, type: t.type });

  return (
    <div className="space-y-5">
      {/* summary */}
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Income" value={money(totals.income)} icon={<ArrowDownRight size={15} />} accent="var(--color-positive)" glow="var(--color-positive)" />
        <StatTile label="Total Expenses" value={money(totals.expenses)} icon={<ArrowUpRight size={15} />} accent="var(--color-negative)" />
        <StatTile label="Net Profit" value={money(totals.profit, { sign: true })} icon={<TrendingUp size={15} />} accent="var(--color-primary)" glow="var(--color-primary)" />
        <StatTile label="Transfers + Moves" value={money(totals.transfers + totals.withdrawals + totals.deposits)} icon={<ArrowLeftRight size={15} />} accent="var(--color-info)" footer="not profit" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* ledger */}
        <Panel className="xl:col-span-1">
          <SectionTitle title="Withdrawals Ledger" subtitle="Profit you've moved out" icon={<Banknote size={16} />} />
          <div className="space-y-3">
            <LedgerRow label="Total profit" value={money(ledger.totalProfit, { sign: true })} color="var(--color-primary)" />
            <LedgerRow label="Total withdrawn" value={money(ledger.totalWithdrawn)} color="var(--color-fg)" />
            <div className="border-t border-[var(--color-border)]" />
            <LedgerRow label="Remaining profit" value={money(ledger.remaining, { sign: true })} color={ledger.remaining >= 0 ? "var(--color-positive)" : "var(--color-negative)"} big />
          </div>
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-overlay)] px-3.5 py-3 text-xs text-[var(--color-muted)]">
            A <b className="text-[var(--color-fg)]">withdrawal</b> (e.g. Checking → Savings) moves earnings you already
            counted. It reduces remaining profit but is <b className="text-[var(--color-fg)]">never</b> added as new income.
          </div>
        </Panel>

        {/* ledger of transactions */}
        <Panel className="xl:col-span-2" padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <Segmented options={FILTERS} value={filter} onChange={setFilter} />
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-9 w-40 pl-9 text-sm"
                />
              </div>
              <button className="btn btn-primary h-9" onClick={() => openAdd("income")}>
                <Plus size={15} strokeWidth={2.5} /> Add
              </button>
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto px-2 pb-2">
            {groups.length === 0 ? (
              <EmptyState
                icon={<Plus size={22} />}
                title="No transactions"
                hint="Add income, expenses, transfers or withdrawals."
                action={
                  <button className="btn btn-ghost" onClick={() => openAdd("income")}>
                    <Plus size={15} /> New transaction
                  </button>
                }
              />
            ) : (
              groups.map(([date, items]) => {
                const dayTot = totalsFor(items);
                return (
                  <div key={date} className="mb-1">
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-[var(--color-surface)] px-3 py-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
                        {labelDay(date)}
                      </span>
                      <span className="num text-[11px] font-semibold" style={{ color: dayTot.profit >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                        {money(dayTot.profit, { sign: true })}
                      </span>
                    </div>
                    {items.map((t) => (
                      <TxRow key={t.id} tx={t} onEdit={() => openEdit(t)} onDelete={() => deleteTx(t)} />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <TransactionModal
        open={modal.open}
        editing={modal.editing}
        defaultType={modal.type}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}

function LedgerRow({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${big ? "text-sm font-medium" : "text-sm"} text-[var(--color-muted)]`}>{label}</span>
      <span className={`num font-bold ${big ? "text-xl" : "text-base"}`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function TxRow({ tx, onEdit, onDelete }: { tx: Transaction; onEdit: () => void; onDelete: () => void }) {
  const st = TYPE_STYLES[tx.type];
  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-2)]">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        style={{ background: st.tint, color: st.color }}
      >
        {tx.type === "income" ? (
          <ArrowDownRight size={16} />
        ) : tx.type === "expense" ? (
          <ArrowUpRight size={16} />
        ) : (
          <ArrowLeftRight size={16} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{tx.note || tx.category}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-faint)]">
          <span style={{ color: st.color }}>{st.label}</span>
          {!st.affectsProfit && tx.fromAccount && (
            <span className="num">
              · {tx.fromAccount} → {tx.toAccount}
            </span>
          )}
          {st.affectsProfit && <span>· {tx.category}</span>}
        </div>
      </div>
      <span
        className="num text-sm font-semibold"
        style={{ color: st.affectsProfit ? st.color : "var(--color-muted)" }}
      >
        {st.sign === "~" ? "" : st.sign}
        {money(tx.amount)}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onEdit} aria-label="Edit" className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} aria-label="Delete" className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-negative)]">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
