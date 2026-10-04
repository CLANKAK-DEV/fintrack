import type { Database } from "./Database";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type Snapshot,
  type Subscription,
  type Task,
  type Transaction,
} from "./types";

const KEY = "fintrack:db:v1";

function empty(): Snapshot {
  return {
    transactions: [],
    subscriptions: [],
    tasks: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Browser adapter — persists the whole snapshot as JSON in localStorage.
 *  Every accessor is guarded so the app renders even when storage is blocked
 *  (private window, cleared site data, etc.). */
export class LocalDatabase implements Database {
  private cache: Snapshot = empty();

  async init(): Promise<void> {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Snapshot>;
        this.cache = { ...empty(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
      }
    } catch {
      this.cache = empty();
    }
  }

  private flush() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.cache));
    } catch {
      /* ignore quota / disabled storage */
    }
  }

  async getSnapshot(): Promise<Snapshot> {
    return structuredClone(this.cache);
  }

  private upsert<T extends { id: string }>(arr: T[], item: T) {
    const i = arr.findIndex((x) => x.id === item.id);
    if (i === -1) arr.push(item);
    else arr[i] = item;
  }

  async putTransaction(tx: Transaction) {
    this.upsert(this.cache.transactions, tx);
    this.flush();
  }
  async deleteTransaction(id: string) {
    this.cache.transactions = this.cache.transactions.filter((t) => t.id !== id);
    this.flush();
  }

  async putSubscription(s: Subscription) {
    this.upsert(this.cache.subscriptions, s);
    this.flush();
  }
  async deleteSubscription(id: string) {
    this.cache.subscriptions = this.cache.subscriptions.filter((x) => x.id !== id);
    this.flush();
  }

  async putTask(t: Task) {
    this.upsert(this.cache.tasks, t);
    this.flush();
  }
  async deleteTask(id: string) {
    this.cache.tasks = this.cache.tasks.filter((x) => x.id !== id);
    this.flush();
  }

  async putSettings(s: Settings) {
    this.cache.settings = s;
    this.flush();
  }

  async clearAll() {
    this.cache = empty();
    this.flush();
  }
}
