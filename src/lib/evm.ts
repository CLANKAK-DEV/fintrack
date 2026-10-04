import { httpFetch, getPrices } from "./chain";

/* ============================================================
   Multi-chain EVM portfolio scan via Alchemy.
   Scans one address across several EVM chains for:
   - token holdings (native + ERC-20) with live USD value
   - recent transactions (in / out)
   - per-token P&L (added vs current value, average-cost)
   ============================================================ */

export interface EvmNetwork {
  key: string;
  label: string;
  slug: string; // Alchemy network slug (or own id)
  explorer: string;
  nativeSymbol: string;
  nativeDecimals: number;
  color: string;
  kind: "evm" | "svm" | "blockscout"; // svm = Solana; blockscout = non-Alchemy chain via Blockscout API
  apiBase?: string; // Blockscout API base for kind "blockscout"
}

// ETH + Base + the EVM chains Robinhood Wallet uses (Arbitrum / Optimism / Polygon)
export const EVM_NETWORKS: EvmNetwork[] = [
  { key: "eth", label: "Ethereum", slug: "eth-mainnet", explorer: "https://etherscan.io", nativeSymbol: "ETH", nativeDecimals: 18, color: "#8b7cf6", kind: "evm" },
  { key: "base", label: "Base", slug: "base-mainnet", explorer: "https://basescan.org", nativeSymbol: "ETH", nativeDecimals: 18, color: "#2b6fff", kind: "evm" },
  { key: "arbitrum", label: "Arbitrum", slug: "arb-mainnet", explorer: "https://arbiscan.io", nativeSymbol: "ETH", nativeDecimals: 18, color: "#28a0f0", kind: "evm" },
  { key: "optimism", label: "Optimism", slug: "opt-mainnet", explorer: "https://optimistic.etherscan.io", nativeSymbol: "ETH", nativeDecimals: 18, color: "#ff5a63", kind: "evm" },
  { key: "polygon", label: "Polygon", slug: "polygon-mainnet", explorer: "https://polygonscan.com", nativeSymbol: "POL", nativeDecimals: 18, color: "#a06bf5", kind: "evm" },
];

export const SOLANA_NETWORK: EvmNetwork = {
  key: "solana",
  label: "Solana",
  slug: "solana-mainnet",
  explorer: "https://solscan.io",
  nativeSymbol: "SOL",
  nativeDecimals: 9,
  color: "#22d3ee",
  kind: "svm",
};

// Robinhood Chain (Arbitrum Orbit, chainId 4663) — on Alchemy as "robinhood-mainnet".
// Alchemy returns balances + transfers but NO prices for this chain, so prices are
// filled in locally (ETH/WETH at ETH price, stablecoins at $1).
export const ROBINHOOD_NETWORK: EvmNetwork = {
  key: "robinhood",
  label: "Robinhood",
  slug: "robinhood-mainnet",
  explorer: "https://robinhoodchain.blockscout.com",
  nativeSymbol: "ETH",
  nativeDecimals: 18,
  color: "#00c805",
  kind: "evm",
};

const STABLES = new Set(["USDC", "USDT", "USDG", "DAI", "PYUSD", "USDBC", "USDB", "GUSD", "FRAX", "USDE"]);

/** Price fallback for chains Alchemy doesn't price (Robinhood). */
function fallbackPrice(symbol: string, ethPrice: number): number {
  const s = symbol.toUpperCase();
  if (s === "ETH" || s === "WETH") return ethPrice;
  if (STABLES.has(s)) return 1;
  return 0;
}

export const ALL_NETWORKS: EvmNetwork[] = [...EVM_NETWORKS, ROBINHOOD_NETWORK, SOLANA_NETWORK];

/** network keys to scan for a given wallet chain */
export function networksForChain(chain: string): string[] {
  if (chain === "SOL") return [SOLANA_NETWORK.key];
  // ETH-type address → all EVM chains + Robinhood Chain
  return [...EVM_NETWORKS.map((n) => n.key), ROBINHOOD_NETWORK.key];
}

const SLUG_TO_NET = new Map(ALL_NETWORKS.map((n) => [n.slug, n]));

export interface Transfer {
  network: string; // network key
  hash: string;
  direction: "in" | "out";
  asset: string;
  amount: number;
  valueUsd: number | null;
  timestamp: number; // epoch ms
  counterparty: string;
  explorerUrl: string;
}

export interface TokenPnl {
  id: string;
  network: string; // network key
  symbol: string;
  name: string;
  contract: string | null; // null = native
  logo: string | null;
  balance: number;
  price: number;
  value: number;
  /** total units received on-chain */
  addedUnits: number;
  /** USD invested (sum of incoming units × historical price) */
  invested: number;
  avgCost: number;
  /** cost basis of the currently-held balance */
  costBasis: number;
  pnl: number; // value - costBasis
  pnlPct: number | null;
  hasCost: boolean;
}

export interface ScanResult {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  tokens: TokenPnl[];
  transfers: Transfer[];
  networksScanned: string[];
  errors: string[];
}

async function postJson(url: string, body: unknown): Promise<any> {
  const f = await httpFetch();
  const res = await f(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function makeToken(
  net: EvmNetwork,
  contract: string | null,
  symbol: string,
  name: string,
  balance: number,
  price: number,
): TokenPnl {
  return {
    id: `${net.key}:${contract ?? "native"}`,
    network: net.key,
    symbol,
    name,
    contract,
    logo: null,
    balance,
    price,
    value: balance * price,
    addedUnits: 0,
    invested: 0,
    avgCost: 0,
    costBasis: 0,
    pnl: 0,
    pnlPct: null,
    hasCost: false,
  };
}

function hexToNumber(hex: string, decimals: number): number {
  if (!hex || hex === "0x") return 0;
  try {
    const raw = BigInt(hex);
    if (raw === 0n) return 0;
    // keep precision: divide via string
    const divisor = 10 ** decimals;
    return Number(raw) / divisor;
  } catch {
    return 0;
  }
}

/* ---------- 1. token holdings (all networks, one call) ---------- */
async function fetchHoldings(
  apiKey: string,
  address: string,
  slugs: string[],
): Promise<Map<string, TokenPnl>> {
  const data = await postJson(`https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`, {
    addresses: [{ address, networks: slugs }],
    withMetadata: true,
    withPrices: true,
    includeNativeTokens: true,
  });

  // pass 1 — parse raw entries
  interface Raw {
    net: EvmNetwork;
    isNative: boolean;
    symbol: string;
    name: string;
    contract: string | null;
    logo: string | null;
    balance: number;
    price: number;
  }
  const raw: Raw[] = [];
  for (const t of data?.data?.tokens ?? []) {
    const net = SLUG_TO_NET.get(t.network);
    if (!net) continue;
    const isNative = t.tokenAddress == null;
    const decimals = isNative ? net.nativeDecimals : (t.tokenMetadata?.decimals ?? 18);
    const balance = hexToNumber(t.tokenBalance, decimals);
    if (balance <= 0) continue;
    const priceStr = t.tokenPrices?.find((p: any) => p.currency === "usd")?.value;
    const symbol = isNative ? net.nativeSymbol : t.tokenMetadata?.symbol ?? "?";
    raw.push({
      net,
      isNative,
      symbol,
      name: isNative ? net.label : t.tokenMetadata?.name ?? symbol,
      contract: t.tokenAddress ?? null,
      logo: t.tokenMetadata?.logo ?? null,
      balance,
      price: priceStr ? parseFloat(priceStr) : 0,
    });
  }

  // reference ETH price (from any chain Alchemy prices natively) for fallbacks
  const ethPrice =
    raw.find((r) => r.isNative && r.price > 0 && r.net.nativeSymbol === "ETH")?.price ??
    raw.find((r) => r.symbol.toUpperCase() === "WETH" && r.price > 0)?.price ??
    0;

  // pass 2 — apply price fallbacks (Robinhood), filter dust, build map
  const tokens = new Map<string, TokenPnl>();
  for (const r of raw) {
    let price = r.price;
    if (price <= 0 && r.net.key === "robinhood") price = fallbackPrice(r.symbol, ethPrice);
    if (!r.isNative && price <= 0) continue; // drop unpriced / spam tokens
    const value = r.balance * price;
    if (!r.isNative && value < 0.01) continue;
    const t = makeToken(r.net, r.contract, r.symbol, r.name, r.balance, price);
    t.logo = r.logo;
    tokens.set(t.id, t);
  }
  return tokens;
}

/* ---------- 2. transfers per network ---------- */
async function fetchTransfers(apiKey: string, net: EvmNetwork, address: string): Promise<Transfer[]> {
  const base = `https://${net.slug}.g.alchemy.com/v2/${apiKey}`;
  const mk = (dir: "toAddress" | "fromAddress") => ({
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getAssetTransfers",
    params: [
      {
        fromBlock: "0x0",
        toBlock: "latest",
        [dir]: address,
        category: ["external", "erc20"],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: "0x32", // 50
        order: "desc",
      },
    ],
  });

  const [inc, out] = await Promise.all([postJson(base, mk("toAddress")), postJson(base, mk("fromAddress"))]);
  const map = (list: any[], direction: "in" | "out"): Transfer[] =>
    (list ?? []).map((t) => ({
      network: net.key,
      hash: t.hash,
      direction,
      asset: t.asset ?? net.nativeSymbol,
      amount: typeof t.value === "number" ? t.value : 0,
      valueUsd: null,
      timestamp: t.metadata?.blockTimestamp ? Date.parse(t.metadata.blockTimestamp) : 0,
      counterparty: direction === "in" ? t.from : t.to,
      explorerUrl: `${net.explorer}/tx/${t.hash}`,
    }));

  return [...map(inc?.result?.transfers, "in"), ...map(out?.result?.transfers, "out")];
}

/* ---------- 3. historical price series (by symbol) ---------- */
async function priceSeries(apiKey: string, symbol: string, startMs: number): Promise<{ t: number; v: number }[]> {
  const start = new Date(Math.min(startMs, Date.now() - 86400000)).toISOString();
  const end = new Date().toISOString();
  const data = await postJson(`https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/historical`, {
    symbol,
    startTime: start,
    endTime: end,
    interval: "1d",
  });
  return (data?.data ?? [])
    .map((p: any) => ({ t: Date.parse(p.timestamp), v: parseFloat(p.value) }))
    .filter((p: { t: number; v: number }) => !isNaN(p.v));
}

function priceAt(series: { t: number; v: number }[], ts: number): number | null {
  if (!series.length) return null;
  let best = series[0];
  let bestDiff = Math.abs(series[0].t - ts);
  for (const p of series) {
    const d = Math.abs(p.t - ts);
    if (d < bestDiff) {
      bestDiff = d;
      best = p;
    }
  }
  return best.v;
}

/* ---------- orchestration ---------- */
export async function scanPortfolio(
  apiKey: string,
  address: string,
  networkKeys: string[],
): Promise<ScanResult> {
  const nets = ALL_NETWORKS.filter((n) => networkKeys.includes(n.key));
  const errors: string[] = [];

  // holdings — single Alchemy Data API call across all requested chains
  const tokens = new Map<string, TokenPnl>();
  try {
    tokens.clear();
    const m = await fetchHoldings(apiKey, address, nets.map((n) => n.slug));
    for (const [id, t] of m) tokens.set(id, t);
  } catch (e) {
    errors.push(`Holdings lookup failed: ${String(e)}`);
  }

  // transfers via Alchemy getAssetTransfers — EVM chains incl. Robinhood
  // (robinhood-mainnet). Solana (svm) uses a different tx model → skipped.
  const txNets = nets.filter((n) => n.kind === "evm");
  const transferResults = await Promise.all(
    txNets.map((n) =>
      fetchTransfers(apiKey, n, address).catch(() => {
        errors.push(`${n.label} transactions failed`);
        return [] as Transfer[];
      }),
    ),
  );
  const allTransfers = transferResults.flat().sort((a, b) => b.timestamp - a.timestamp);

  // P&L for the top holdings (limit historical calls)
  const held = [...tokens.values()].sort((a, b) => b.value - a.value);
  const topForPnl = held.filter((t) => t.value >= 1).slice(0, 12);

  await Promise.all(
    topForPnl.map(async (tok) => {
      const incoming = allTransfers.filter(
        (tr) => tr.direction === "in" && tr.network === tok.network && tr.asset === tok.symbol && tr.amount > 0,
      );
      if (!incoming.length) return;
      try {
        const earliest = incoming.reduce((m, t) => Math.min(m, t.timestamp || Date.now()), Date.now());
        const series = await priceSeries(apiKey, tok.symbol, earliest);
        let units = 0;
        let invested = 0;
        for (const tr of incoming) {
          const p = priceAt(series, tr.timestamp) ?? tok.price;
          units += tr.amount;
          invested += tr.amount * p;
          tr.valueUsd = tr.amount * p;
        }
        if (units > 0) {
          tok.addedUnits = units;
          tok.invested = invested;
          tok.avgCost = invested / units;
          tok.costBasis = tok.balance * tok.avgCost;
          tok.pnl = tok.value - tok.costBasis;
          tok.pnlPct = tok.costBasis > 0 ? (tok.pnl / tok.costBasis) * 100 : null;
          tok.hasCost = true;
        }
      } catch {
        /* leave token without P&L */
      }
    }),
  );

  const totalValue = held.reduce((s, t) => s + t.value, 0);
  const totalInvested = held.reduce((s, t) => s + (t.hasCost ? t.costBasis : 0), 0);
  const totalPnl = held.reduce((s, t) => s + (t.hasCost ? t.pnl : 0), 0);

  return {
    totalValue,
    totalInvested,
    totalPnl,
    tokens: held,
    transfers: allTransfers.slice(0, 25),
    networksScanned: nets.map((n) => n.key),
    errors,
  };
}

export function networkMeta(key: string): EvmNetwork | undefined {
  return ALL_NETWORKS.find((n) => n.key === key);
}

// EVM chains whose native coin is ETH (18 decimals) — Polygon (POL) excluded
const ETH_NATIVE_SLUGS = ["eth-mainnet", "base-mainnet", "arb-mainnet", "opt-mainnet", "robinhood-mainnet"];

export interface EthTotal {
  eth: number;
  usd: number;
  perChain: { network: string; eth: number }[];
}

/** Sum a wallet's native ETH across Ethereum, Base, Arbitrum, Optimism & Robinhood. */
export async function evmNativeEthTotal(apiKey: string, address: string): Promise<EthTotal> {
  const data = await postJson(`https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`, {
    addresses: [{ address, networks: ETH_NATIVE_SLUGS }],
    withPrices: true,
    includeNativeTokens: true,
  });
  let eth = 0;
  let ethPrice = 0;
  const perChain: { network: string; eth: number }[] = [];
  for (const t of data?.data?.tokens ?? []) {
    if (t.tokenAddress != null) continue; // native only
    const bal = hexToNumber(t.tokenBalance, 18);
    eth += bal;
    const net = SLUG_TO_NET.get(t.network);
    if (bal > 0) perChain.push({ network: net?.key ?? t.network, eth: bal });
    const p = parseFloat(t.tokenPrices?.find((x: any) => x.currency === "usd")?.value ?? "0");
    if (p > ethPrice) ethPrice = p;
  }
  if (ethPrice <= 0) {
    try {
      ethPrice = (await getPrices()).ETH ?? 0;
    } catch {
      /* leave 0 */
    }
  }
  return { eth, usd: eth * ethPrice, perChain };
}
