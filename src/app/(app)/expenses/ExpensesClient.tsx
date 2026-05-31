"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { Spinner } from "@/components/Spinner";
import { fetchJSON } from "@/lib/fetcher";
import { formatKRW, formatDate, formatDateShort } from "@/lib/format";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Category = { id: string; name: string; icon: string; color: string };
type Expense = {
  id: string;
  date: string;
  amount: number;
  category: string;
  memo: string | null;
};

type PresetKey = "week" | "month" | "lastMonth" | "quarter" | "year" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "week", label: "이번 주" },
  { key: "month", label: "이번 달" },
  { key: "lastMonth", label: "지난 달" },
  { key: "quarter", label: "분기" },
  { key: "year", label: "연간" },
  { key: "custom", label: "직접" },
];

function rangeFor(preset: PresetKey): { from: string; to: string } {
  const now = new Date();
  if (preset === "week") {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return { from: formatDate(d), to: formatDate(now) };
  }
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: formatDate(from), to: formatDate(now) };
  }
  if (preset === "lastMonth") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: formatDate(from), to: formatDate(to) };
  }
  if (preset === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    return { from: formatDate(from), to: formatDate(now) };
  }
  if (preset === "year") {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: formatDate(from), to: formatDate(now) };
  }
  return { from: formatDate(now), to: formatDate(now) };
}

export function ExpensesClient({ categories }: { categories: Category[] }) {
  const [preset, setPreset] = useState<PresetKey>("month");
  const initial = rangeFor("month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [trend, setTrend] = useState<{ month: string; total: number }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchJSON<Expense[]>(
        `/api/expenses?from=${from}&to=${to}`
      );
      setExpenses(list);

      const trendFrom = new Date();
      trendFrom.setMonth(trendFrom.getMonth() - 5);
      trendFrom.setDate(1);
      const trendList = await fetchJSON<Expense[]>(
        `/api/expenses?from=${formatDate(trendFrom)}&to=${formatDate(new Date())}`
      );
      const buckets = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(k, 0);
      }
      for (const e of trendList) {
        const d = new Date(e.date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(k, (buckets.get(k) ?? 0) + e.amount);
      }
      setTrend(Array.from(buckets, ([month, total]) => ({ month, total })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [from, to]);

  function pickPreset(p: PresetKey) {
    setPreset(p);
    if (p !== "custom") {
      const r = rangeFor(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const catMap = useMemo(() => new Map(categories.map((c) => [c.name, c])), [categories]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return Array.from(m, ([category, amount]) => ({
      category,
      amount,
      color: catMap.get(category)?.color ?? "#6b7280",
      icon: catMap.get(category)?.icon ?? "📦",
    })).sort((a, b) => b.amount - a.amount);
  }, [expenses, catMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">지출</h1>
      </div>

      <QuickEntryForm categories={categories} onAdded={load} />

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => pickPreset(p.key)}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap text-sm ${
              preset === p.key
                ? "bg-surface border-accent text-text"
                : "border-border text-muted hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex gap-2 items-center text-sm">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl bg-bg border border-border px-3 py-2"
          />
          <span className="text-muted">~</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl bg-bg border border-border px-3 py-2"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="md:col-span-1">
          <div className="text-sm text-muted">기간 합계</div>
          <div className="text-2xl font-semibold mt-1">{formatKRW(total)}</div>
          <div className="text-xs text-muted mt-1">
            {from} ~ {to} · {expenses.length}건
          </div>
        </Card>
        <Card className="md:col-span-2">
          <div className="text-sm text-muted mb-2">카테고리별</div>
          {byCat.length === 0 ? (
            <p className="text-muted text-sm">데이터가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCat}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {byCat.map((b, i) => (
                        <Cell key={i} fill={b.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatKRW(v)}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 text-sm max-h-44 overflow-auto">
                {byCat.map((b) => (
                  <li key={b.category} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: b.color }}
                      />
                      {b.icon} {b.category}
                    </span>
                    <span className="text-muted">{formatKRW(b.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="text-sm text-muted mb-2">월별 추이 (최근 6개월)</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="month"
                tickFormatter={(m) => m.slice(5)}
                tick={{ fill: "rgb(var(--muted))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgb(var(--muted))", fontSize: 12 }}
                tickFormatter={(v) => `${Math.round(v / 10000)}만`}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(v: number) => formatKRW(v)}
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(125,125,125,0.1)" }}
              />
              <Bar dataKey="total" fill="rgb(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-medium text-sm">목록</span>
          {loading && <Spinner size={16} />}
        </div>
        {expenses.length === 0 ? (
          <p className="text-muted text-sm p-4">데이터가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border max-h-[60vh] overflow-auto">
            {expenses.map((e) => {
              const cat = catMap.get(e.category);
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-9 h-9 rounded-xl grid place-items-center text-lg shrink-0"
                      style={{ background: (cat?.color ?? "#6b7280") + "20" }}
                    >
                      {cat?.icon ?? "📦"}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{e.category}</div>
                      <div className="text-xs text-muted truncate">
                        {formatDateShort(e.date)}
                        {e.memo ? ` · ${e.memo}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium">{formatKRW(e.amount)}</span>
                    <button
                      onClick={async () => {
                        if (!confirm("삭제할까요?")) return;
                        await fetchJSON(`/api/expenses/${e.id}`, { method: "DELETE" });
                        load();
                      }}
                      className="text-muted hover:text-red-500"
                      aria-label="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

const tooltipStyle = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
  color: "rgb(var(--text))",
};

function QuickEntryForm({
  categories,
  onAdded,
}: {
  categories: Category[];
  onAdded: () => void;
}) {
  const [date, setDate] = useState(formatDate(new Date()));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!category && categories[0]) setCategory(categories[0].name);
  }, [categories, category]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const amt = Number(amount.replace(/,/g, ""));
    if (!(amt > 0) || !category) {
      setErr("금액과 카테고리를 확인해주세요.");
      return;
    }
    setBusy(true);
    try {
      await fetchJSON("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ date, amount: amt, category, memo: memo || null }),
      });
      setAmount("");
      setMemo("");
      onAdded();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="col-span-1 rounded-xl bg-bg border border-border px-3 py-3 text-sm"
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="금액"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            className="col-span-2 rounded-xl bg-bg border border-border px-3 py-3 text-base"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.name)}
              className={`px-2.5 py-1.5 rounded-full text-sm border ${
                category === c.name
                  ? "border-accent text-text bg-surface"
                  : "border-border text-muted"
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="메모 (선택)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full rounded-xl bg-bg border border-border px-3 py-2.5 text-sm"
        />
        {err && <p className="text-red-500 text-sm">{err}</p>}
        <button
          type="submit"
          disabled={busy || categories.length === 0}
          className="w-full rounded-xl bg-accent text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? <Spinner size={16} /> : "지출 추가"}
        </button>
      </form>
    </Card>
  );
}
