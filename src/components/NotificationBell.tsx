import { useEffect, useRef, useState } from "react";
import { Bell, Check, Repeat, BellOff, BellRing } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  upcomingReminders,
  advancePayment,
  notificationsEnabled,
  setNotificationsEnabled,
  type ReminderLevel,
} from "../lib/reminders";
import { money } from "../lib/format";
import { relativeDue } from "../lib/date";
import { toast } from "../store/useToast";

const LEVEL_COLOR: Record<ReminderLevel, string> = {
  info: "var(--color-info)",
  warning: "var(--color-warning)",
  urgent: "var(--color-negative)",
};

export function NotificationBell() {
  const subscriptions = useStore((s) => s.subscriptions);
  const saveSubscription = useStore((s) => s.saveSubscription);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(notificationsEnabled());
  const ref = useRef<HTMLDivElement>(null);

  const reminders = upcomingReminders(subscriptions);
  const count = reminders.length;
  const hasUrgent = reminders.some((r) => r.level === "urgent");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  async function markPaid(subId: string) {
    const sub = subscriptions.find((s) => s.id === subId);
    if (!sub) return;
    const next = advancePayment(sub);
    await saveSubscription({ ...sub, nextPayment: next });
    toast.success(`${sub.name} marked paid — next on ${next}`);
  }

  function toggleEnabled() {
    const v = !enabled;
    setEnabled(v);
    setNotificationsEnabled(v);
    toast.info(v ? "Desktop reminders on" : "Desktop reminders off");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Payment reminders"
        className="relative grid h-[38px] w-[38px] place-items-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-fg)]"
      >
        <Bell size={17} />
        {count > 0 && (
          <span
            className="num absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: hasUrgent ? "var(--color-negative)" : "var(--color-primary)" }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="panel animate-pop absolute right-0 top-[46px] z-[120] w-[340px] overflow-hidden p-0"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={15} style={{ color: "var(--color-primary)" }} />
              <span className="text-sm font-semibold">Payment reminders</span>
            </div>
            <button
              onClick={toggleEnabled}
              title={enabled ? "Desktop alerts on" : "Desktop alerts off"}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-[var(--color-surface-3)]"
              style={{ color: enabled ? "var(--color-positive)" : "var(--color-faint)" }}
            >
              {enabled ? <BellRing size={13} /> : <BellOff size={13} />}
              {enabled ? "On" : "Off"}
            </button>
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-faint)]">
                <Check size={18} />
              </div>
              <p className="text-sm text-[var(--color-muted)]">You're all caught up</p>
              <p className="text-[11px] text-[var(--color-faint)]">No payments due in the next 7 days</p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto py-1">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-surface-2)]">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold uppercase"
                    style={{ background: `color-mix(in oklab, ${LEVEL_COLOR[r.level]} 16%, transparent)`, color: LEVEL_COLOR[r.level] }}
                  >
                    {r.sub.name.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{r.sub.name}</span>
                      <Repeat size={11} className="shrink-0 text-[var(--color-faint)]" />
                    </div>
                    <div className="num text-[11px]" style={{ color: LEVEL_COLOR[r.level] }}>
                      {money(r.sub.amount)} · {r.days < 0 ? relativeDue(r.sub.nextPayment) : r.days === 0 ? "Due today" : relativeDue(r.sub.nextPayment)}
                    </div>
                  </div>
                  <button
                    onClick={() => markPaid(r.id)}
                    className="num shrink-0 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-muted)] transition-colors hover:border-[var(--color-positive)] hover:text-[var(--color-positive)]"
                  >
                    Mark paid
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
