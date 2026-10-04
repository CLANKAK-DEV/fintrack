import type {
  Settings,
  Snapshot,
  Subscription,
  Task,
  Transaction,
  Wallet,
} from "./types";

/** Storage-agnostic persistence contract. Implemented by the SQLite adapter
 *  (desktop / Tauri) and the localStorage adapter (browser preview). */
export interface Database {
  init(): Promise<void>;
  getSnapshot(): Promise<Snapshot>;

  putTransaction(tx: Transaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;

  putWallet(w: Wallet): Promise<void>;
  deleteWallet(id: string): Promise<void>;

  putSubscription(s: Subscription): Promise<void>;
  deleteSubscription(id: string): Promise<void>;

  putTask(t: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;

  putSettings(s: Settings): Promise<void>;

  /** wipe everything (used by "reset data" in Settings) */
  clearAll(): Promise<void>;
}

/** running inside the Tauri desktop runtime? */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
