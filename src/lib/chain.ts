import type { Chain } from "./db/types";
import { isTauri } from "./db/Database";

/* ============================================================
   On-chain balance checking.
   Uses free, keyless public endpoints. In the desktop app the
   requests go through the Tauri HTTP plugin (no CORS); in the
   browser preview they fall back to window.fetch (CORS permitting).
   ============================================================ */

type FetchFn = typeof fetch;
let cachedFetch: FetchFn | null = null;

export async function httpFetch(): Promise<FetchFn> {
  if (cachedFetch) return cachedFetch;
  if (isTauri()) {
    try {
      const mod = await import("@tauri-apps/plugin-http");
      cachedFetch = mod.fetch as unknown as FetchFn;
      return cachedFetch;
    } catch {
      /* fall through to window.fetch */
    }
  }
  cachedFetch = window.fetch.bind(window);
  return cachedFetch;
}

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const f = await httpFetch();
  const res = await f(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------- address validation ---------- */
export function isValidAddress(chain: Chain, address: string): boolean {
  const a = address.trim();
  switch (chain) {
    case "ETH":
      return /^0x[a-fA-F0-9]{40}$/.test(a);
    case "BTC":
      return /^(bc1[a-z0-9]{20,}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(a);
    case "SOL":
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
    default:
      return a.length > 0;
  }
}

/* ---------- per-chain native balance ---------- */

/** Try a JSON-RPC call across several endpoints until one returns a result. */
async function rpcCall(endpoints: string[], method: string, params: unknown[]): Promise<any> {
  let lastErr: unknown;
  for (const url of endpoints) {
    try {
      const data = await getJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (data && data.result !== undefined && data.result !== null && !data.error) return data.result;
      lastErr = new Error(data?.error?.message ?? "empty result");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("rpc failed");
}

// ETH via public JSON-RPC (eth_getBalance → wei)
async function ethBalance(address: string): Promise<number> {
  const result = await rpcCall(
    ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    "eth_getBalance",
    [address, "latest"],
  );
  return parseInt(result, 16) / 1e18;
}

// BTC via Blockstream, falling back to mempool.space (both return sats)
async function btcBalance(address: string): Promise<number> {
  const hosts = ["https://blockstream.info/api", "https://mempool.space/api"];
  let lastErr: unknown;
  for (const host of hosts) {
    try {
      const data = await getJson(`${host}/address/${address}`);
      const c = data?.chain_stats;
      if (!c) throw new Error("no stats");
      return ((c.funded_txo_sum ?? 0) - (c.spent_txo_sum ?? 0)) / 1e8;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("BTC lookup failed");
}

// SOL via public RPC (lamports)
async function solBalance(address: string): Promise<number> {
  const result = await rpcCall(
    ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"],
    "getBalance",
    [address],
  );
  const lamports = result?.value;
  if (typeof lamports !== "number") throw new Error("no balance");
  return lamports / 1e9;
}

export async function nativeBalance(chain: Chain, address: string): Promise<number> {
  switch (chain) {
    case "ETH":
      return ethBalance(address);
    case "BTC":
      return btcBalance(address);
    case "SOL":
      return solBalance(address);
    default:
      throw new Error(`On-chain sync isn't supported for ${chain} yet`);
  }
}

/* ---------- prices (USD) ---------- */
const COINGECKO_ID: Record<Chain, string | null> = {
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  OTHER: null,
};

export type PriceMap = Partial<Record<Chain, number>>;

export async function getPrices(): Promise<PriceMap> {
  const ids = Object.values(COINGECKO_ID).filter(Boolean).join(",");
  const data = await getJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
  );
  const out: PriceMap = {};
  (Object.keys(COINGECKO_ID) as Chain[]).forEach((chain) => {
    const id = COINGECKO_ID[chain];
    if (id && data?.[id]?.usd) out[chain] = data[id].usd;
  });
  return out;
}

export const NATIVE_SYMBOL: Record<Chain, string> = {
  ETH: "ETH",
  BTC: "BTC",
  SOL: "SOL",
  OTHER: "",
};
