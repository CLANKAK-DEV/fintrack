import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Repeat, CalendarClock, Coins } from "lucide-react";
import { useStore } from "../store/useStore";
import { Panel, SectionTitle, EmptyState, Badge } from "../components/ui";
import { StatTile } from "../components/ui/StatTile";
import { Modal } from "../components/ui/Modal";
import { Field, MoneyInput, Select, TextInput } from "../components/ui/Field";
import { subMonthly, subsMonthlyTotal, subsYearlyTotal } from "../lib/finance";
import { money } from "../lib/format";
import { relativeDue, todayISO, daysUntil } from "../lib/date";
import { toast } from "../store/useToast";
import type { Frequency, Subscription } from "../lib/db/types";
import { uid } from "../lib/id";
import { C } from "../lib/theme";

const FREQS: Frequency[] = ["weekly", "monthly", "yearly"];
const FREQ_LABEL: Record<Frequency, string> = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

export function Subscriptions() {
  const { subscriptions, saveSubscription, removeSubscription } = useStore();
  const [modal, setModal] = useState<{ open: boolean; editing: Subscription | null }>({ open: false, editing: null });

  const deleteSub = (s: Subscription) => {
    removeSubscription(s.id);
    toast.undo(`"${s.name}" removed`, () => saveSubscription(s));
  };

  const monthly = useMemo(() => subsMonthlyTotal(subscriptions), [subscriptions]);
  const yearly = useMemo(() => subsYearlyTotal(subscriptions), [subscriptions]);
  const sorted = useMemo(
    () => [...subscriptions].sort((a, b) => a.nextPayment.localeCompare(b.nextPayment)),
    [subscriptions],
  );
  const next30 = useMemo(
    () => sorted.filter((s) => daysUntil(s.nextPayment) >= 0 && daysUntil(s.nextPayment) <= 30),
    [sorted],
  );
  const next30Total = next30.reduce((s, x) => s + x.amount, 0);

  return (
    <div className="space-y-5">
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Monthly cost" value={money(monthly)} icon={<Repeat size={15} />} accent="var(--color-primary)" glow="var(--color-primary)" footer={`${subscriptions.length} active`} />
        <StatTile label="Estimated yearly" value={money(yearly)} icon={<Coins size={15} />} accent="var(--color-fg)" />
        <StatTile label="Due in 30 days" value={money(next30Total)} icon={<CalendarClock size={15} />} accent="var(--color-warning)" footer={`${next30.length} payments`} />
      </div>

      <Panel padded={false}>
        <div className="flex items-center justify-between px-5 py-4">
          <SectionTitle title="All Subscriptions" subtitle="Recurring payments & renewals" icon={<Repeat size={16} />} />
          <button className="btn btn-primary h-9" onClick={() => setModal({ open: true, editing: null })}>
            <Plus size={15} strokeWidth={2.5} /> Add
          </button>
        </div>

        <div className="px-3 pb-4">
          {sorted.length === 0 ? (
            <EmptyState
              icon={<Repeat size={22} />}
              title="No subscriptions"
              hint="Track Spotify, servers, software and more."
              action={
                <button className="btn btn-ghost" onClick={() => setModal({ open: true, editing: null })}>
                  <Plus size={15} /> Add subscription
                </button>
              }
            />
          ) : (
            <div className="space-y-1.5">
              {sorted.map((s) => {
                const due = daysUntil(s.nextPayment);
                const urgent = due >= 0 && due <= 5;
                return (
                  <div key={s.id} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--color-surface-2)]">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold uppercase"
                      style={{ background: "var(--color-surface-3)", color: "var(--color-primary)" }}
                    >
                      {s.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{s.name}</span>
                        <Badge>{FREQ_LABEL[s.frequency]}</Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-faint)]">
                        <span
                          className="num"
                          style={{ color: urgent ? "var(--color-warning)" : "var(--color-faint)" }}
                        >
                          {relativeDue(s.nextPayment)}
                        </span>
                        {s.category && <span>· {s.category}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-sm font-bold">{money(s.amount)}</div>
                      <div className="num text-[11px] text-[var(--color-faint)]">{money(subMonthly(s))}/mo</div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => setModal({ open: true, editing: s })} aria-label="Edit" className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteSub(s)} aria-label="Delete" className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-faint)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-negative)]">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>

      <SubscriptionModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSave={saveSubscription}
      />
    </div>
  );
}

function SubscriptionModal({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Subscription | null;
  onClose: () => void;
  onSave: (s: Subscription) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextPayment, setNextPayment] = useState(todayISO());
  const [category, setCategory] = useState("Software");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setFrequency(editing?.frequency ?? "monthly");
    setNextPayment(editing?.nextPayment ?? todayISO());
    setCategory(editing?.category ?? "Software");
  }, [open, editing]);

  const num = parseFloat(amount);
  const valid = name.trim().length > 0 && !isNaN(num) && num > 0;

  async function submit() {
    if (!valid) return;
    await onSave({
      id: editing?.id ?? uid(),
      name: name.trim(),
      amount: Math.abs(num),
      frequency,
      nextPayment,
      category: category.trim(),
      createdAt: editing?.createdAt ?? Date.now(),
    });
    onClose();
  }

  const preview = valid
    ? frequency === "monthly"
      ? `${money(num)}/mo · ${money(num * 12)}/yr`
      : frequency === "yearly"
        ? `${money(num / 12)}/mo · ${money(num)}/yr`
        : `${money((num * 52) / 12)}/mo`
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit subscription" : "Add subscription"}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!valid}>
            {editing ? "Save" : "Add"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Spotify" autoFocus />
        </Field>
        <Field label="Amount">
          <MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Field label="Frequency">
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {FREQS.map((f) => (
              <option key={f} value={f}>
                {FREQ_LABEL[f]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Next payment">
          <TextInput type="date" value={nextPayment} onChange={(e) => setNextPayment(e.target.value)} className="num" />
        </Field>
        <Field label="Category">
          <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Software" />
        </Field>
      </div>
      {preview && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-overlay)] px-3.5 py-2.5 text-xs" style={{ color: C.muted }}>
          Normalized cost: <b className="num" style={{ color: C.fg }}>{preview}</b>
        </div>
      )}
    </Modal>
  );
}
