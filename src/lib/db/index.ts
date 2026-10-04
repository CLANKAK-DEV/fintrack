import { isTauri, type Database } from "./Database";
import { LocalDatabase } from "./local";
import { SqliteDatabase } from "./sqlite";
import type { Snapshot, Transaction } from "./types";
import { uid } from "../id";

let instance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (instance) return instance;
  instance = isTauri() ? new SqliteDatabase() : new LocalDatabase();
  await instance.init();
  return instance;
}

/** Writes a set of realistic sample records so the user can explore the app.
 *  Triggered only on demand from Settings → "Load sample data" — never
 *  automatically, so a fresh app (or one that's been reset) stays empty and
 *  ready for the user's own data. */
export async function seedDemo(db: Database): Promise<Snapshot> {
  await db.clearAll();

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  const txs: Transaction[] = [];
  const addTx = (t: Partial<Transaction> & { date: string; type: Transaction["type"]; amount: number }) =>
    txs.push({
      id: uid(),
      category: "Other",
      note: "",
      fromAccount: "",
      toAccount: "",
      walletId: null,
      createdAt: Date.now() - txs.length * 1000,
      ...t,
    });

  // ~45 days of pseudo-random but plausible income + expenses
  const incomeSources: [string, number][] = [
    ["NFT / Art", 120],
    ["Trading", 80],
    ["Freelance", 50],
  ];
  for (let i = 44; i >= 0; i--) {
    const d = iso(daysAgo(i));
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const r = seed - Math.floor(seed); // 0..1 deterministic
    // most days have income
    if (r > 0.12) {
      const [cat, base] = incomeSources[i % incomeSources.length];
      const amt = Math.round(base * (0.5 + r * 1.6));
      addTx({ date: d, type: "income", category: cat, amount: amt, note: `${cat} earnings` });
    }
    if (r > 0.75) {
      addTx({ date: d, type: "income", category: "Trading", amount: Math.round(60 + r * 140), note: "Trade profit" });
    }
    // occasional expense
    if (r < 0.3) {
      addTx({ date: d, type: "expense", category: "Food", amount: Math.round(12 + r * 60), note: "Food & misc" });
    }
  }

  // explicit recent entries that mirror the spec examples
  addTx({ date: iso(today), type: "income", category: "NFT / Art", amount: 120, note: "Drop sale" });
  addTx({ date: iso(today), type: "income", category: "Trading", amount: 80, note: "Scalp" });
  addTx({ date: iso(today), type: "expense", category: "Subscription", amount: 20, note: "ChatGPT" });

  // THE accounting-rule demo: a trading profit, then a withdrawal of the same
  // amount to Binance. Profit counts once; the withdrawal is a movement, not income.
  addTx({ date: iso(daysAgo(2)), type: "income", category: "Trading", amount: 300, note: "Position closed" });
  addTx({
    date: iso(daysAgo(1)),
    type: "withdrawal",
    category: "Withdrawal",
    amount: 300,
    fromAccount: "Wallet A",
    toAccount: "Binance",
    note: "Secured profit",
  });
  addTx({
    date: iso(daysAgo(6)),
    type: "withdrawal",
    category: "Withdrawal",
    amount: 500,
    fromAccount: "Wallet A",
    toAccount: "Binance",
    note: "Cash out",
  });
  addTx({
    date: iso(daysAgo(10)),
    type: "transfer",
    category: "Transfer",
    amount: 1100,
    fromAccount: "Wallet B",
    toAccount: "Wallet A",
    note: "Consolidate",
  });

  for (const t of txs) await db.putTransaction(t);

  const wallets = [
    { id: uid(), label: "Main ETH", chain: "ETH" as const, address: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12", balance: 4281, createdAt: Date.now() },
    { id: uid(), label: "Cold BTC", chain: "BTC" as const, address: "bc1q9xyz0a1b2c3d4e5f6g7h8i9j0klmno", balance: 1920, createdAt: Date.now() + 1 },
    { id: uid(), label: "Sol Trading", chain: "SOL" as const, address: "7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2", balance: 860, createdAt: Date.now() + 2 },
  ];
  for (const w of wallets) await db.putWallet(w);

  const subs = [
    { name: "Spotify", amount: 10.99, frequency: "monthly" as const, category: "Music", offset: 14 },
    { name: "ChatGPT Plus", amount: 20, frequency: "monthly" as const, category: "Software", offset: 6 },
    { name: "VPS Server", amount: 15, frequency: "monthly" as const, category: "Server", offset: 21 },
    { name: "Domain", amount: 12, frequency: "yearly" as const, category: "Server", offset: 232 },
  ];
  for (const s of subs) {
    const np = new Date(today);
    np.setDate(np.getDate() + s.offset);
    await db.putSubscription({
      id: uid(),
      name: s.name,
      amount: s.amount,
      frequency: s.frequency,
      nextPayment: iso(np),
      category: s.category,
      createdAt: Date.now(),
    });
  }

  const tasks = [
    { title: "Check wallet activity", recurrence: "daily" as const, time: "09:00", done: true },
    { title: "Update today's profit", recurrence: "daily" as const, time: "10:00", done: true },
    { title: "Review open positions", recurrence: "daily" as const, time: "12:00", done: false },
    { title: "Pay pending bills", recurrence: "weekly" as const, time: "", done: false },
    { title: "Deep work — 3 hours", recurrence: "daily" as const, time: "14:00", done: false },
    { title: "Close the day & journal", recurrence: "daily" as const, time: "22:00", done: false },
  ];
  for (const t of tasks) {
    await db.putTask({
      id: uid(),
      title: t.title,
      recurrence: t.recurrence,
      time: t.time,
      done: t.done,
      date: iso(today),
      createdAt: Date.now(),
    });
  }

  return db.getSnapshot();
}
