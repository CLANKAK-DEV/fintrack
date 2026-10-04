import type { TxType } from "./db/types";

/** Raw palette values (kept in sync with index.css @theme) for use in
 *  canvas/SVG contexts like Recharts that can't read Tailwind classes. */
export const C = {
  bg: "#080b11",
  surface: "#0f1420",
  surface2: "#141a28",
  surface3: "#1a2233",
  border: "#222b3d",
  fg: "#eef2f9",
  muted: "#96a0b5",
  faint: "#5f6a80",
  primary: "#f5b544",
  accent: "#8b7cf6",
  positive: "#34d399",
  negative: "#fb7185",
  info: "#38bdf8",
  warning: "#fbbf24",
} as const;

export interface TypeStyle {
  label: string;
  color: string;
  /** background tint class via inline style */
  tint: string;
  /** does the amount read as a + inflow for the user? */
  sign: "+" | "-" | "~";
  affectsProfit: boolean;
}

export const TYPE_STYLES: Record<TxType, TypeStyle> = {
  income: { label: "Income", color: C.positive, tint: "rgba(52,211,153,0.14)", sign: "+", affectsProfit: true },
  expense: { label: "Expense", color: C.negative, tint: "rgba(251,113,133,0.14)", sign: "-", affectsProfit: true },
  transfer: { label: "Transfer", color: C.info, tint: "rgba(56,189,248,0.14)", sign: "~", affectsProfit: false },
  withdrawal: { label: "Withdrawal", color: C.primary, tint: "rgba(245,181,68,0.14)", sign: "~", affectsProfit: false },
  deposit: { label: "Deposit", color: C.accent, tint: "rgba(139,124,246,0.14)", sign: "~", affectsProfit: false },
};

/** categorical palette for donut slices */
export const CAT_COLORS = [
  C.primary,
  C.accent,
  C.info,
  C.positive,
  "#f472b6",
  "#22d3ee",
  "#a3e635",
  C.warning,
  "#fb923c",
];
