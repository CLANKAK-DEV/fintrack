import { create } from "zustand";
import { getDb, seedDemo } from "../lib/db";
import type { Database } from "../lib/db/Database";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type Subscription,
  type Task,
  type Transaction,
} from "../lib/db/types";
import type { TxType } from "../lib/db/types";
import { setCurrencySymbol } from "../lib/format";

export type View =
  | "dashboard"
  | "finance"
  | "subscriptions"
  | "tasks"
  | "calendar"
  | "analytics"
  | "settings";

interface State {
  ready: boolean;
  usingSqlite: boolean;
  view: View;
  transactions: Transaction[];
  subscriptions: Subscription[];
  tasks: Task[];
  settings: Settings;

  /** global Quick-Add modal (opened from the top bar or keyboard) */
  quickAdd: { open: boolean; type: TxType };
  openQuickAdd: (type?: TxType) => void;
  closeQuickAdd: () => void;

  init: () => Promise<void>;
  setView: (v: View) => void;

  saveTransaction: (t: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  saveSubscription: (s: Subscription) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;

  saveTask: (t: Task) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;

  saveSettings: (s: Settings) => Promise<void>;
  resetAll: () => Promise<void>;
  loadSample: () => Promise<void>;
}

let db: Database;
/** Guards against React StrictMode's double-mount seeding the demo data twice. */
let initPromise: Promise<void> | null = null;

function sortTx(a: Transaction, b: Transaction) {
  return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  usingSqlite: false,
  view: "dashboard",
  transactions: [],
  subscriptions: [],
  tasks: [],
  settings: { ...DEFAULT_SETTINGS },
  quickAdd: { open: false, type: "income" },
  openQuickAdd: (type = "income") => set({ quickAdd: { open: true, type } }),
  closeQuickAdd: () => set((s) => ({ quickAdd: { ...s.quickAdd, open: false } })),

  init: async () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      db = await getDb();
      const snap = await db.getSnapshot();
      setCurrencySymbol(snap.settings.currencySymbol);
      set({
        ready: true,
        usingSqlite: "__TAURI_INTERNALS__" in window,
        transactions: [...snap.transactions].sort(sortTx),
        subscriptions: snap.subscriptions,
        tasks: snap.tasks,
        settings: snap.settings,
      });
    })();
    return initPromise;
  },

  setView: (view) => set({ view }),

  saveTransaction: async (t) => {
    await db.putTransaction(t);
    const rest = get().transactions.filter((x) => x.id !== t.id);
    set({ transactions: [t, ...rest].sort(sortTx) });
  },
  removeTransaction: async (id) => {
    await db.deleteTransaction(id);
    set({ transactions: get().transactions.filter((x) => x.id !== id) });
  },

  saveSubscription: async (s) => {
    await db.putSubscription(s);
    const rest = get().subscriptions.filter((x) => x.id !== s.id);
    set({ subscriptions: [...rest, s].sort((a, b) => a.nextPayment.localeCompare(b.nextPayment)) });
  },
  removeSubscription: async (id) => {
    await db.deleteSubscription(id);
    set({ subscriptions: get().subscriptions.filter((x) => x.id !== id) });
  },

  saveTask: async (t) => {
    await db.putTask(t);
    const rest = get().tasks.filter((x) => x.id !== t.id);
    set({ tasks: [...rest, t].sort((a, b) => a.createdAt - b.createdAt) });
  },
  toggleTask: async (id) => {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    const updated = { ...t, done: !t.done };
    await db.putTask(updated);
    set({ tasks: get().tasks.map((x) => (x.id === id ? updated : x)) });
  },
  removeTask: async (id) => {
    await db.deleteTask(id);
    set({ tasks: get().tasks.filter((x) => x.id !== id) });
  },

  saveSettings: async (s) => {
    await db.putSettings(s);
    setCurrencySymbol(s.currencySymbol);
    set({ settings: s });
  },

  resetAll: async () => {
    // Wipe all records but keep the user's profile (name & currency), and
    // leave the app empty — do NOT re-seed demo data.
    const settings = get().settings;
    await db.clearAll();
    await db.putSettings(settings);
    set({ transactions: [], subscriptions: [], tasks: [], settings });
  },

  loadSample: async () => {
    const settings = get().settings;
    const snap = await seedDemo(db);
    await db.putSettings(settings);
    set({
      transactions: [...snap.transactions].sort(sortTx),
      subscriptions: snap.subscriptions,
      tasks: snap.tasks,
    });
  },
}));
