"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { formatKRW, formatMoney, formatPercent } from "@/lib/format";
import { fetchJSON } from "@/lib/fetcher";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Holding = {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currency: string;
};
type Portfolio = { id: string; name: string; color: string; holdings: Holding[] };
type Quote = { ticker: string; price: number | null; currency: string; stale: boolean };

const ALL = "__all__";

export function PortfolioClient({
  initialPortfolios,
  initialQuotes,
  initialUsdKrw,
}: {
  initialPortfolios: Portfolio[];
  initialQuotes: Quote[];
  initialUsdKrw: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<string>(initialPortfolios[0]?.id ?? ALL);
  const [editing, setEditing] = useState<{ portfolioId: string; holding?: Holding } | null>(
    null
  );
  const quotes = initialQuotes;
  const usdKrw = initialUsdKrw;

  const priceMap = useMemo(() => new Map(quotes.map((q) => [q.ticker, q])), [quotes]);

  const computedAll = useMemo(() => {
    return initialPortfolios.map((p) => {
      const rows = p.holdings.map((h) => {
        const q = priceMap.get(h.ticker);
        const price = q?.price ?? null;
        const effectivePrice = price ?? h.avgPrice;
        const valueLocal = effectivePrice * h.quantity;
        const costLocal = h.avgPrice * h.quantity;
        const valueKrw = h.currency === "USD" ? valueLocal * usdKrw : valueLocal;
        const costKrw = h.currency === "USD" ? costLocal * usdKrw : costLocal;
        const pl = valueKrw - costKrw;
        const plPct = costKrw > 0 ? (pl / costKrw) * 100 : 0;
        return { holding: h, price, valueLocal, valueKrw, pl, plPct, stale: q?.stale ?? true };
      });
      const valueKrw = rows.reduce((s, r) => s + r.valueKrw, 0);
      const costKrw = rows.reduce((s, r) => s + r.holding.avgPrice * r.holding.quantity *
        (r.holding.currency === "USD" ? usdKrw : 1), 0);
      return { portfolio: p, rows, valueKrw, costKrw, pl: valueKrw - costKrw };
    });
  }, [initialPortfolios, priceMap, usdKrw]);

  const currentRows = useMemo(() => {
    if (tab === ALL) return computedAll.flatMap((c) => c.rows);
    return computedAll.find((c) => c.portfolio.id === tab)?.rows ?? [];
  }, [tab, computedAll]);

  const currentTotal = currentRows.reduce((s, r) => s + r.valueKrw, 0);
  const currentCost = currentRows.reduce(
    (s, r) =>
      s +
      r.holding.avgPrice * r.holding.quantity *
        (r.holding.currency === "USD" ? usdKrw : 1),
    0
  );
  const currentPl = currentTotal - currentCost;
  const currentPlPct = currentCost > 0 ? (currentPl / currentCost) * 100 : 0;

  const donutData = currentRows
    .filter((r) => r.valueKrw > 0)
    .map((r) => ({
      name: r.holding.name,
      value: r.valueKrw,
      ticker: r.holding.ticker,
    }));

  async function deleteHolding(id: string) {
    if (!confirm("이 종목을 삭제할까요?")) return;
    await fetchJSON(`/api/holdings/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">포트폴리오</h1>
        <button
          onClick={() =>
            setEditing({
              portfolioId: tab === ALL ? initialPortfolios[0]?.id ?? "" : tab,
            })
          }
          disabled={initialPortfolios.length === 0}
          className="rounded-xl bg-accent text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          종목 추가
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
        <TabBtn active={tab === ALL} onClick={() => setTab(ALL)} label="전체" color="#6b7280" />
        {initialPortfolios.map((p) => (
          <TabBtn
            key={p.id}
            active={tab === p.id}
            onClick={() => setTab(p.id)}
            label={p.name}
            color={p.color}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="md:col-span-2">
          <div className="text-sm text-muted">평가금액</div>
          <div className="text-2xl font-semibold mt-1">{formatKRW(currentTotal)}</div>
          <div className={`text-sm mt-0.5 ${currentPl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {currentPl >= 0 ? "+" : ""}
            {formatKRW(currentPl)} ({formatPercent(currentPlPct)})
          </div>
          <div className="text-xs text-muted mt-2">USD/KRW {usdKrw.toFixed(2)}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted mb-1">종목 비중</div>
          {donutData.length === 0 ? (
            <p className="text-muted text-sm">데이터가 없습니다.</p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatKRW(v)}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted text-xs">
              <tr className="border-b border-border">
                <th className="text-left p-3">종목</th>
                <th className="text-right p-3">수량</th>
                <th className="text-right p-3">평균가</th>
                <th className="text-right p-3">현재가</th>
                <th className="text-right p-3">평가금액</th>
                <th className="text-right p-3">수익률</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted p-6">
                    종목이 없습니다.
                  </td>
                </tr>
              ) : (
                currentRows.map((r) => (
                  <tr key={r.holding.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <div className="font-medium">{r.holding.name}</div>
                      <div className="text-xs text-muted">{r.holding.ticker}</div>
                    </td>
                    <td className="p-3 text-right">{r.holding.quantity}</td>
                    <td className="p-3 text-right">
                      {formatMoney(r.holding.avgPrice, r.holding.currency)}
                    </td>
                    <td className="p-3 text-right">
                      {r.price === null ? (
                        <span className="text-muted">-</span>
                      ) : (
                        <span className={r.stale ? "text-amber-500" : ""}>
                          {formatMoney(r.price, r.holding.currency)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">{formatKRW(r.valueKrw)}</td>
                    <td
                      className={`p-3 text-right ${
                        r.pl >= 0 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {formatPercent(r.plPct)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() =>
                          setEditing({
                            portfolioId:
                              tab === ALL
                                ? findPortfolioIdByHolding(initialPortfolios, r.holding.id) ?? ""
                                : tab,
                            holding: r.holding,
                          })
                        }
                        className="text-muted hover:text-accent px-2"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteHolding(r.holding.id)}
                        className="text-muted hover:text-red-500 px-2"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <HoldingFormModal
          portfolios={initialPortfolios}
          portfolioId={editing.portfolioId}
          holding={editing.holding}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function findPortfolioIdByHolding(portfolios: Portfolio[], holdingId: string) {
  for (const p of portfolios) {
    if (p.holdings.some((h) => h.id === holdingId)) return p.id;
  }
  return null;
}

function TabBtn({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border whitespace-nowrap text-sm ${
        active
          ? "bg-surface border-accent text-text"
          : "bg-transparent border-border text-muted hover:text-text"
      }`}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

const PIE_COLORS = [
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#0ea5e9",
];

const tooltipStyle = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
  color: "rgb(var(--text))",
};

function HoldingFormModal({
  portfolios,
  portfolioId,
  holding,
  onClose,
  onSaved,
}: {
  portfolios: Portfolio[];
  portfolioId: string;
  holding?: Holding;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!holding;
  const [pid, setPid] = useState(portfolioId);
  const [ticker, setTicker] = useState(holding?.ticker ?? "");
  const [name, setName] = useState(holding?.name ?? "");
  const [quantity, setQuantity] = useState<string>(
    holding ? String(holding.quantity) : ""
  );
  const [avgPrice, setAvgPrice] = useState<string>(
    holding ? String(holding.avgPrice) : ""
  );
  const [currency, setCurrency] = useState<"KRW" | "USD">(
    (holding?.currency as "KRW" | "USD") ?? "KRW"
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    { symbol: string; name: string; exchange?: string }[]
  >([]);
  const [searching, setSearching] = useState(false);

  async function runSearch() {
    if (!ticker.trim()) return;
    setSearching(true);
    try {
      const res = await fetchJSON<any[]>(
        `/api/symbols/search?q=${encodeURIComponent(ticker.trim())}`
      );
      setSearchResults(res);
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const payload = {
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        quantity: Number(quantity),
        avgPrice: Number(avgPrice),
        currency,
      };
      if (!payload.ticker || !payload.name || !(payload.quantity > 0) || payload.avgPrice < 0) {
        setErr("입력 값을 확인해주세요.");
        return;
      }
      if (editing && holding) {
        await fetchJSON(`/api/holdings/${holding.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJSON(`/api/portfolios/${pid}/holdings`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (e: any) {
      setErr(e.message || "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={editing ? "종목 수정" : "종목 추가"}>
      <div className="space-y-3">
        {!editing && (
          <Field label="포트폴리오">
            <select
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              className="input"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="티커 (예: 005930.KS, AAPL)">
          <div className="flex gap-2">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="input flex-1"
              placeholder="AAPL"
            />
            <button
              type="button"
              onClick={runSearch}
              className="rounded-xl border border-border px-3 text-sm"
            >
              {searching ? <Spinner size={14} /> : "검색"}
            </button>
          </div>
        </Field>
        {searchResults.length > 0 && (
          <div className="rounded-xl border border-border max-h-40 overflow-auto text-sm">
            {searchResults.map((r) => (
              <button
                type="button"
                key={r.symbol}
                onClick={() => {
                  setTicker(r.symbol);
                  setName(r.name);
                  setSearchResults([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-bg flex items-center justify-between"
              >
                <span className="truncate">{r.name}</span>
                <span className="text-xs text-muted ml-2">{r.symbol}</span>
              </button>
            ))}
          </div>
        )}
        <Field label="종목명">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Apple Inc."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="수량">
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input"
              inputMode="decimal"
            />
          </Field>
          <Field label="평균 매수가">
            <input
              type="number"
              step="any"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              className="input"
              inputMode="decimal"
            />
          </Field>
        </div>
        <Field label="통화">
          <div className="flex gap-2">
            {(["KRW", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                  currency === c ? "border-accent text-accent" : "border-border text-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        {err && <p className="text-red-500 text-sm">{err}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-3">
            취소
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-xl bg-accent text-white py-3 disabled:opacity-50"
          >
            {busy ? <Spinner size={16} /> : "저장"}
          </button>
        </div>
      </div>
      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgb(var(--bg));
          border: 1px solid rgb(var(--border));
          border-radius: 0.75rem;
          padding: 0.625rem 0.75rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: rgb(var(--accent));
        }
      `}</style>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
