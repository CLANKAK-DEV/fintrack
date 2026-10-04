/* ============================================================
   Domain types
   ============================================================ */

/** The five accounting-grade transaction types.
 *  income / expense  → affect Profit & Loss
 *  transfer / withdrawal / deposit → movements only (NEVER counted as profit) */
export type TxType = "income" | "expense" | "transfer" | "withdrawal" | "deposit";

export const TX_TYPES: TxType[] = [
  "income",
  "expense",
  "transfer",
  "withdrawal",
  "deposit",
];

/** Whether a type affects profit. The core accounting rule. */
export const PNL_TYPES: TxType[] = ["income", "expense"];
export const MOVEMENT_TYPES: TxType[] = ["transfer", "withdrawal", "deposit"];

export interface Transaction {
  id: string;
  /** ISO date yyyy-MM-dd */
  date: string;
  type: TxType;
  category: string;
  amount: number; // always stored positive; sign is derived from `type`
  note: string;
  /** source account/wallet label, e.g. "Wallet A", for transfers/withdrawals */
  fromAccount: string;
  /** destination, e.g. "Binance" */
  toAccount: string;
  walletId: string | null;
  createdAt: number;
}

export type Chain = "ETH" | "BTC" | "SOL" | "OTHER";

export interface Wallet {
  id: string;
  label: string;
  chain: Chain;
  address: string;
  /** balance in USD — entered manually, or set by an on-chain sync */
  balance: number;
  /** native-coin balance from the last on-chain sync (e.g. 0.42 ETH) */
  nativeBalance?: number;
  /** epoch ms of the last successful on-chain sync */
  syncedAt?: number;
  createdAt: number;
}

export type Frequency = "weekly" | "monthly" | "yearly";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  /** ISO date of next payment */
  nextPayment: string;
  category: string;
  createdAt: number;
}

export type Recurrence = "once" | "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  recurrence: Recurrence;
  /** HH:mm or "" */
  time: string;
  done: boolean;
  /** ISO date the task belongs to (for one-off / planner) */
  date: string;
  createdAt: number;
}

export interface Settings {
  displayName: string;
  currency: string; // ISO code e.g. "USD"
  currencySymbol: string;
  /** Alchemy API key for multi-chain EVM portfolio scans (stored locally) */
  alchemyKey: string;
}

export interface Snapshot {
  transactions: Transaction[];
  wallets: Wallet[];
  subscriptions: Subscription[];
  tasks: Task[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  displayName: "Clank",
  currency: "USD",
  currencySymbol: "$",
  alchemyKey: "",
};

export const INCOME_CATEGORIES = [
  "Trading",
  "NFT / Art",
  "Freelance",
  "Salary",
  "Staking",
  "Other",
];
export const EXPENSE_CATEGORIES = [
  "Subscription",
  "Food",
  "Server",
  "Software",
  "Rent",
  "Fees",
  "Other",
];
export const ALL_CATEGORIES = Array.from(
  new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, "Transfer", "Withdrawal", "Deposit"]),
);
