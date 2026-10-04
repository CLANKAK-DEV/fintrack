let symbol = "$";

export function setCurrencySymbol(s: string) {
  symbol = s || "$";
}

/** "$1,234.56" — always 2 decimals unless whole & large */
export function money(n: number, opts?: { sign?: boolean; decimals?: number }): string {
  const decimals = opts?.decimals ?? 2;
  const abs = Math.abs(n);
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const neg = n < 0 ? "-" : opts?.sign ? "+" : "";
  return `${neg}${symbol}${body}`;
}

/** compact money for axis labels: $1.2k, $3.4M */
export function moneyCompact(n: number): string {
  const abs = Math.abs(n);
  const neg = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${neg}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${neg}${symbol}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${neg}${symbol}${abs.toFixed(0)}`;
}

export function pct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function shortAddress(addr: string, n = 4): string {
  if (!addr) return "";
  if (addr.length <= n * 2 + 3) return addr;
  return `${addr.slice(0, n + 2)}…${addr.slice(-n)}`;
}
