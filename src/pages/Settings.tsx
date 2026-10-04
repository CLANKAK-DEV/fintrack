import { useState } from "react";
import { User, Download, Trash2, Database, ShieldCheck, Info, Sparkles } from "lucide-react";
import { useStore } from "../store/useStore";
import { Panel, SectionTitle } from "../components/ui";
import { Field, Select, TextInput } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";

const CURRENCIES: { code: string; symbol: string }[] = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
];

export function Settings() {
  const { settings, saveSettings, resetAll, loadSample, transactions, subscriptions, tasks, usingSqlite } =
    useStore();
  const [name, setName] = useState(settings.displayName);
  const [currency, setCurrency] = useState(settings.currency);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const isEmpty = transactions.length === 0 && subscriptions.length === 0 && tasks.length === 0;

  async function save() {
    const cur = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
    await saveSettings({
      displayName: name.trim(),
      currency: cur.code,
      currencySymbol: cur.symbol,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function exportData() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), transactions, subscriptions, tasks, settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fintrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Panel>
        <SectionTitle title="Profile" subtitle="How the app greets you" icon={<User size={16} />} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Clank" />
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="btn btn-primary" onClick={save}>
            Save changes
          </button>
          {saved && <span className="text-sm" style={{ color: "var(--color-positive)" }}>Saved ✓</span>}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Data" subtitle="Everything is stored locally on this device" icon={<Database size={16} />} />
        <div className="grid grid-cols-3 gap-3">
          <Stat n={transactions.length} label="Transactions" />
          <Stat n={subscriptions.length} label="Subscriptions" />
          <Stat n={tasks.length} label="Tasks" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={exportData}>
            <Download size={15} /> Export backup (JSON)
          </button>
          {isEmpty && (
            <button className="btn btn-ghost" onClick={loadSample}>
              <Sparkles size={15} /> Load sample data
            </button>
          )}
          <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            <Trash2 size={15} /> Reset all data
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-overlay)] px-3.5 py-3 text-xs text-[var(--color-muted)]">
          <ShieldCheck size={15} style={{ color: "var(--color-positive)" }} />
          {usingSqlite
            ? "Stored in a local SQLite database — fully offline, never leaves your machine."
            : "Stored in your browser's local storage — fully offline. The packaged desktop app uses SQLite."}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="How accounting works" subtitle="Why your profit stays accurate" icon={<Info size={16} />} />
        <div className="space-y-2 text-sm text-[var(--color-muted)]">
          <p>
            <b className="text-[var(--color-fg)]">Profit = income − expenses.</b> Only these two types change your
            profit & loss.
          </p>
          <p>
            <b style={{ color: "var(--color-info)" }}>Transfers, withdrawals and deposits</b> move money between your
            own accounts (e.g. Checking → Savings). They are tracked as movements and never counted as new profit — so
            earnings are never double-counted.
          </p>
        </div>
      </Panel>

      <div className="flex items-center justify-center gap-2 pb-4 text-xs text-[var(--color-faint)]">
        <span className="font-display font-bold">FinTrack</span> · v1.0 · local-first & offline
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all data?"
        subtitle="This permanently deletes every transaction, wallet, subscription and task, leaving the app empty for your own data. Your profile is kept."
        width={440}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                await resetAll();
                setConfirmReset(false);
              }}
            >
              <Trash2 size={15} /> Reset everything
            </button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-muted)]">
          Consider exporting a backup first. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-overlay)] px-3 py-3 text-center">
      <div className="num text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
        {n}
      </div>
      <div className="label mb-0 mt-1">{label}</div>
    </div>
  );
}
