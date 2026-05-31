export function formatKRW(value: number, opts: { showSymbol?: boolean } = {}) {
  const { showSymbol = true } = opts;
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("ko-KR").format(rounded);
  return showSymbol ? `${formatted}원` : formatted;
}

export function formatMoney(value: number, currency: string) {
  if (currency === "KRW") return formatKRW(value);
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return `${new Intl.NumberFormat("ko-KR").format(value)} ${currency}`;
}

export function formatPercent(value: number, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateShort(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${m}/${day}`;
}
