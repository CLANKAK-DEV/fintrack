import { isTauri } from "./db/Database";
import { daysUntil } from "./date";
import { money } from "./format";
import type { Subscription } from "./db/types";

/* ============================================================
   Subscription payment reminders.
   - in-app bell list (subs due within a window)
   - native OS notifications when a payment crosses 7/3/1/0 days
   ============================================================ */

export type ReminderLevel = "info" | "warning" | "urgent";

export interface Reminder {
  id: string;
  sub: Subscription;
  days: number; // days until payment (negative = overdue)
  level: ReminderLevel;
}

export const REMINDER_WINDOW = 7;
const THRESHOLDS = [7, 3, 1, 0];

export function reminderLevel(days: number): ReminderLevel {
  if (days <= 1) return "urgent";
  if (days <= 3) return "warning";
  return "info";
}

/** subscriptions due within the window (or overdue), most urgent first */
export function upcomingReminders(subs: Subscription[], within = REMINDER_WINDOW): Reminder[] {
  const out: Reminder[] = [];
  for (const s of subs) {
    const d = daysUntil(s.nextPayment);
    if (d > within) continue;
    out.push({ id: s.id, sub: s, days: d, level: reminderLevel(d) });
  }
  return out.sort((a, b) => a.days - b.days);
}

/* ---------- desktop notification preferences & dedup ---------- */
const ENABLED_KEY = "clankos:notify:enabled";
const SENT_KEY = "clankos:notify:sent";

export function notificationsEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}
export function setNotificationsEnabled(on: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function loadSent(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveSent(s: Set<string>) {
  try {
    // keep it from growing forever
    const arr = [...s].slice(-200);
    localStorage.setItem(SENT_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

async function sendNative(title: string, body: string): Promise<boolean> {
  if (!isTauri()) {
    // browser fallback (dev preview)
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    const n = await import("@tauri-apps/plugin-notification");
    let granted = await n.isPermissionGranted();
    if (!granted) granted = (await n.requestPermission()) === "granted";
    if (!granted) return false;
    n.sendNotification({ title, body });
    return true;
  } catch {
    return false;
  }
}

/** Fire native reminders for subscriptions crossing a threshold. Fire-once per
 *  (subscription, payment date, threshold). Returns how many were sent. */
export async function runPaymentReminders(subs: Subscription[]): Promise<number> {
  if (!notificationsEnabled()) return 0;
  const sent = loadSent();
  const pending: { sub: Subscription; days: number }[] = [];

  for (const s of subs) {
    const d = daysUntil(s.nextPayment);
    if (d < 0 || d > THRESHOLDS[0]) continue;
    for (const th of THRESHOLDS) {
      if (d <= th) {
        const key = `${s.id}:${s.nextPayment}:${th}`;
        if (!sent.has(key)) {
          sent.add(key);
          pending.push({ sub: s, days: d });
          break; // one notification per sub per run
        }
      }
    }
  }

  let count = 0;
  for (const p of pending) {
    const body =
      p.days === 0
        ? `${money(p.sub.amount)} due today`
        : `${money(p.sub.amount)} due in ${p.days} day${p.days > 1 ? "s" : ""}`;
    if (await sendNative(`Payment reminder · ${p.sub.name}`, body)) count++;
  }
  if (pending.length) saveSent(sent);
  return count;
}

/** Advance a subscription's next payment to the following cycle (Mark paid). */
export function advancePayment(sub: Subscription): string {
  const d = new Date(sub.nextPayment + "T00:00:00");
  if (sub.frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (sub.frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
