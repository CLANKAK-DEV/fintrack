import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { Field, MoneyInput, Select, TextInput } from "./ui/Field";
import { useStore } from "../store/useStore";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TX_TYPES,
  type Transaction,
  type TxType,
} from "../lib/db/types";
import { TYPE_STYLES } from "../lib/theme";
import { todayISO } from "../lib/date";
import { uid } from "../lib/id";
import { toast } from "../store/useToast";
import { money } from "../lib/format";
import { Info } from "lucide-react";

const MOVEMENT: TxType[] = ["transfer", "withdrawal", "deposit"];

export function TransactionModal({
  open,
  onClose,
  editing,
  defaultType = "income",
}: {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
  defaultType?: TxType;
}) {
  const saveTransaction = useStore((s) => s.saveTransaction);

  const [type, setType] = useState<TxType>(defaultType);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDate(editing.date);
      setNote(editing.note);
      setFromAccount(editing.fromAccount);
      setToAccount(editing.toAccount);
    } else {
      setType(defaultType);
      setAmount("");
      setCategory(defaultType === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
      setDate(todayISO());
      setNote("");
      setFromAccount(defaultType === "withdrawal" ? "Wallet A" : "");
      setToAccount(defaultType === "withdrawal" ? "Binance" : "");
    }
  }, [open, editing, defaultType]);

  const isMovement = MOVEMENT.includes(type);
  const style = TYPE_STYLES[type];
  const num = parseFloat(amount);
  const valid = !isNaN(num) && num > 0;

  const categoryOptions =
    type === "income"
      ? INCOME_CATEGORIES
      : type === "expense"
        ? EXPENSE_CATEGORIES
        : [style.label];

  function switchType(t: TxType) {
    setType(t);
    if (t === "income") setCategory(INCOME_CATEGORIES[0]);
    else if (t === "expense") setCategory(EXPENSE_CATEGORIES[0]);
    else setCategory(TYPE_STYLES[t].label);
    if (MOVEMENT.includes(t) && !fromAccount) {
      setFromAccount(t === "withdrawal" ? "Wallet A" : "");
      setToAccount(t === "withdrawal" ? "Binance" : "");
    }
  }

  async function submit() {
    if (!valid) return;
    const tx: Transaction = {
      id: editing?.id ?? uid(),
      date,
      type,
      category: isMovement ? style.label : category,
      amount: Math.abs(num),
      note: note.trim(),
      fromAccount: isMovement ? fromAccount.trim() : "",
      toAccount: isMovement ? toAccount.trim() : "",
      walletId: editing?.walletId ?? null,
      createdAt: editing?.createdAt ?? Date.now(),
    };
    await saveTransaction(tx);
    toast.success(editing ? "Transaction updated" : `${style.label} of ${money(tx.amount)} added`);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit transaction" : "New transaction"}
      subtitle="Classify correctly — movements never count as profit."
      width={560}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!valid}>
            {editing ? "Save changes" : "Add transaction"}
          </button>
        </>
      }
    >
      {/* type selector */}
      <div className="mb-5">
        <span className="label">Type</span>
        <div className="grid grid-cols-5 gap-1.5">
          {TX_TYPES.map((t) => {
            const s = TYPE_STYLES[t];
            const active = t === type;
            return (
              <button
                key={t}
                onClick={() => switchType(t)}
                className="rounded-lg border px-1 py-2 text-[11px] font-semibold capitalize transition-all"
                style={{
                  borderColor: active ? s.color : "var(--color-border)",
                  background: active ? s.tint : "var(--color-overlay)",
                  color: active ? s.color : "var(--color-muted)",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount">
          <MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="num" />
        </Field>
      </div>

      {!isMovement ? (
        <Field label="Category" className="mt-4">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="From">
            <TextInput value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} placeholder="Wallet A" />
          </Field>
          <Field label="To">
            <TextInput value={toAccount} onChange={(e) => setToAccount(e.target.value)} placeholder="Binance" />
          </Field>
        </div>
      )}

      <Field label="Note" className="mt-4">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
      </Field>

      {/* accounting hint */}
      <div
        className="mt-5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs"
        style={{
          borderColor: style.affectsProfit ? "var(--color-border)" : "rgba(56,189,248,0.3)",
          background: style.affectsProfit ? "var(--color-overlay)" : "rgba(56,189,248,0.06)",
        }}
      >
        <Info size={15} className="mt-0.5 shrink-0" style={{ color: style.affectsProfit ? "var(--color-faint)" : "var(--color-info)" }} />
        <p className="text-[var(--color-muted)]">
          {style.affectsProfit ? (
            <>
              This <b className="text-[var(--color-fg)]">{type}</b> changes your{" "}
              <b style={{ color: type === "income" ? "var(--color-positive)" : "var(--color-negative)" }}>
                profit & loss
              </b>
              .
            </>
          ) : (
            <>
              A <b className="text-[var(--color-fg)]">{type}</b> only moves money between your own accounts. It is
              recorded as a <b style={{ color: "var(--color-info)" }}>movement</b> and{" "}
              <b className="text-[var(--color-fg)]">never added to profit</b> — so earnings aren't double-counted.
            </>
          )}
        </p>
      </div>
    </Modal>
  );
}
