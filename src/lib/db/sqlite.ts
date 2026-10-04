import SQL from "@tauri-apps/plugin-sql";
import type { Database } from "./Database";
import {
  DEFAULT_SETTINGS,
  type Chain,
  type Frequency,
  type Recurrence,
  type Settings,
  type Snapshot,
  type Subscription,
  type Task,
  type Transaction,
  type TxType,
  type Wallet,
} from "./types";

/** SQLite adapter backed by @tauri-apps/plugin-sql — the real store in the
 *  packaged desktop app. Schema is created idempotently on init. */
export class SqliteDatabase implements Database {
  private db!: Awaited<ReturnType<typeof SQL.load>>;

  async init(): Promise<void> {
    this.db = await SQL.load("sqlite:clankos.db");
    // Durability: write every commit straight to the main DB file (no separate
    // write-ahead file that could be lost if the app is closed abruptly).
    try {
      await this.db.execute("PRAGMA journal_mode = DELETE;");
      await this.db.execute("PRAGMA synchronous = FULL;");
    } catch {
      /* best effort */
    }
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        from_account TEXT NOT NULL DEFAULT '',
        to_account TEXT NOT NULL DEFAULT '',
        wallet_id TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);

      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        chain TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        balance REAL NOT NULL DEFAULT 0,
        native_balance REAL,
        synced_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        next_payment TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        recurrence TEXT NOT NULL,
        time TEXT NOT NULL DEFAULT '',
        done INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await this.fixWalletsSchema();
  }

  /** Older DBs added native_balance/synced_at via ALTER TABLE, which appended
   *  them AFTER created_at. Because values bind by physical column position,
   *  that shifted the sync fields into the wrong columns. Rebuild the table to
   *  the canonical column order and un-shift the data (INSERT...SELECT is
   *  positional, so the remap is exact). Idempotent: no-op once canonical. */
  private async fixWalletsSchema() {
    const info = await this.db.select<{ name: string }[]>("PRAGMA table_info(wallets)");
    if (!info.length) return;
    const order = info.map((c) => c.name).join(",");
    const canonical = "id,label,chain,address,balance,native_balance,synced_at,created_at";
    if (order === canonical) return;

    const hasNative = info.some((c) => c.name === "native_balance");
    // When native columns were ALTER-appended, legacy created_at holds the real
    // native balance, legacy native_balance holds synced_at, legacy synced_at
    // holds created_at — so remap those three; otherwise just carry safe columns.
    const selectCols = hasNative
      ? "id,label,chain,address,balance,created_at,native_balance,synced_at"
      : "id,label,chain,address,balance,NULL,NULL,created_at";
    await this.db.execute(`
      CREATE TABLE wallets_fixed (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        chain TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        balance REAL NOT NULL DEFAULT 0,
        native_balance REAL,
        synced_at INTEGER,
        created_at INTEGER NOT NULL
      );
      INSERT INTO wallets_fixed (id,label,chain,address,balance,native_balance,synced_at,created_at)
        SELECT ${selectCols} FROM wallets;
      DROP TABLE wallets;
      ALTER TABLE wallets_fixed RENAME TO wallets;
    `);
  }

  async getSnapshot(): Promise<Snapshot> {
    const [txs, wallets, subs, tasks, settingRows] = await Promise.all([
      this.db.select<any[]>("SELECT * FROM transactions ORDER BY date DESC, created_at DESC"),
      this.db.select<any[]>("SELECT * FROM wallets ORDER BY created_at ASC"),
      this.db.select<any[]>("SELECT * FROM subscriptions ORDER BY next_payment ASC"),
      this.db.select<any[]>("SELECT * FROM tasks ORDER BY created_at ASC"),
      this.db.select<any[]>("SELECT * FROM settings"),
    ]);

    const settings: Settings = { ...DEFAULT_SETTINGS };
    for (const r of settingRows) {
      if (r.key === "displayName") settings.displayName = r.value;
      if (r.key === "currency") settings.currency = r.value;
      if (r.key === "currencySymbol") settings.currencySymbol = r.value;
      if (r.key === "alchemyKey") settings.alchemyKey = r.value;
    }

    return {
      transactions: txs.map(
        (r): Transaction => ({
          id: r.id,
          date: r.date,
          type: r.type as TxType,
          category: r.category,
          amount: r.amount,
          note: r.note ?? "",
          fromAccount: r.from_account ?? "",
          toAccount: r.to_account ?? "",
          walletId: r.wallet_id ?? null,
          createdAt: r.created_at,
        }),
      ),
      wallets: wallets.map(
        (r): Wallet => ({
          id: r.id,
          label: r.label,
          chain: r.chain as Chain,
          address: r.address ?? "",
          balance: r.balance ?? 0,
          nativeBalance: r.native_balance ?? undefined,
          syncedAt: r.synced_at ?? undefined,
          createdAt: r.created_at,
        }),
      ),
      subscriptions: subs.map(
        (r): Subscription => ({
          id: r.id,
          name: r.name,
          amount: r.amount,
          frequency: r.frequency as Frequency,
          nextPayment: r.next_payment,
          category: r.category ?? "",
          createdAt: r.created_at,
        }),
      ),
      tasks: tasks.map(
        (r): Task => ({
          id: r.id,
          title: r.title,
          recurrence: r.recurrence as Recurrence,
          time: r.time ?? "",
          done: !!r.done,
          date: r.date,
          createdAt: r.created_at,
        }),
      ),
      settings,
    };
  }

  async putTransaction(t: Transaction) {
    await this.db.execute(
      `INSERT INTO transactions (id,date,type,category,amount,note,from_account,to_account,wallet_id,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT(id) DO UPDATE SET
         date=$2,type=$3,category=$4,amount=$5,note=$6,from_account=$7,to_account=$8,wallet_id=$9`,
      [t.id, t.date, t.type, t.category, t.amount, t.note, t.fromAccount, t.toAccount, t.walletId, t.createdAt],
    );
  }
  async deleteTransaction(id: string) {
    await this.db.execute("DELETE FROM transactions WHERE id=$1", [id]);
  }

  async putWallet(w: Wallet) {
    await this.db.execute(
      `INSERT INTO wallets (id,label,chain,address,balance,native_balance,synced_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET label=$2,chain=$3,address=$4,balance=$5,native_balance=$6,synced_at=$7`,
      [w.id, w.label, w.chain, w.address, w.balance, w.nativeBalance ?? null, w.syncedAt ?? null, w.createdAt],
    );
  }
  async deleteWallet(id: string) {
    await this.db.execute("DELETE FROM wallets WHERE id=$1", [id]);
  }

  async putSubscription(s: Subscription) {
    await this.db.execute(
      `INSERT INTO subscriptions (id,name,amount,frequency,next_payment,category,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(id) DO UPDATE SET name=$2,amount=$3,frequency=$4,next_payment=$5,category=$6`,
      [s.id, s.name, s.amount, s.frequency, s.nextPayment, s.category, s.createdAt],
    );
  }
  async deleteSubscription(id: string) {
    await this.db.execute("DELETE FROM subscriptions WHERE id=$1", [id]);
  }

  async putTask(t: Task) {
    await this.db.execute(
      `INSERT INTO tasks (id,title,recurrence,time,done,date,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(id) DO UPDATE SET title=$2,recurrence=$3,time=$4,done=$5,date=$6`,
      [t.id, t.title, t.recurrence, t.time, t.done ? 1 : 0, t.date, t.createdAt],
    );
  }
  async deleteTask(id: string) {
    await this.db.execute("DELETE FROM tasks WHERE id=$1", [id]);
  }

  async putSettings(s: Settings) {
    const entries: [string, string][] = [
      ["displayName", s.displayName],
      ["currency", s.currency],
      ["currencySymbol", s.currencySymbol],
      ["alchemyKey", s.alchemyKey],
    ];
    for (const [key, value] of entries) {
      await this.db.execute(
        `INSERT INTO settings (key,value) VALUES ($1,$2)
         ON CONFLICT(key) DO UPDATE SET value=$2`,
        [key, value],
      );
    }
  }

  async clearAll() {
    await this.db.execute(
      "DELETE FROM transactions; DELETE FROM wallets; DELETE FROM subscriptions; DELETE FROM tasks; DELETE FROM settings;",
    );
  }
}
