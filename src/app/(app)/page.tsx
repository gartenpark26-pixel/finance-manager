import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getQuotes } from "@/lib/prices";
import { getUsdKrw } from "@/lib/fx";
import { Card, StatCard } from "@/components/Card";
import { formatKRW, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default async function DashboardPage() {
  const [portfolios, monthExpenses, recentExpenses] = await Promise.all([
    prisma.portfolio.findMany({
      orderBy: { createdAt: "asc" },
      include: { holdings: true },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: startOfMonth(), lte: endOfMonth() } },
    }),
    prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  const tickers = Array.from(
    new Set(portfolios.flatMap((p) => p.holdings.map((h) => h.ticker)))
  );
  const [quotes, usdKrw] = await Promise.all([getQuotes(tickers), getUsdKrw()]);
  const priceMap = new Map(quotes.map((q) => [q.ticker, q]));

  let grandTotalKrw = 0;
  const cards = portfolios.map((p) => {
    let valueKrw = 0;
    let costKrw = 0;
    for (const h of p.holdings) {
      const q = priceMap.get(h.ticker);
      const price = q?.price ?? h.avgPrice;
      const v = price * h.quantity;
      const c = h.avgPrice * h.quantity;
      if (h.currency === "USD") {
        valueKrw += v * usdKrw;
        costKrw += c * usdKrw;
      } else {
        valueKrw += v;
        costKrw += c;
      }
    }
    grandTotalKrw += valueKrw;
    const pl = valueKrw - costKrw;
    const plPct = costKrw > 0 ? (pl / costKrw) * 100 : 0;
    return { portfolio: p, valueKrw, costKrw, pl, plPct };
  });

  const monthTotal = monthExpenses._sum.amount ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label="전체 평가금액 (KRW 환산)"
          value={formatKRW(grandTotalKrw)}
          hint={`USD/KRW ${usdKrw.toFixed(2)}`}
        />
        <StatCard label="이번 달 지출" value={formatKRW(monthTotal)} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">포트폴리오</h2>
          <Link href="/portfolio" className="text-sm text-accent">
            전체 보기
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.length === 0 && (
            <Card>
              <p className="text-muted text-sm">아직 포트폴리오가 없습니다.</p>
              <Link href="/settings" className="text-accent text-sm">
                설정에서 추가하기 →
              </Link>
            </Card>
          )}
          {cards.map((c) => (
            <Card key={c.portfolio.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: c.portfolio.color }}
                  />
                  <span className="font-medium">{c.portfolio.name}</span>
                </div>
                <span className="text-xs text-muted">{c.portfolio.holdings.length}개 종목</span>
              </div>
              <div className="mt-2 text-xl font-semibold">{formatKRW(c.valueKrw)}</div>
              <div
                className={`text-sm mt-0.5 ${
                  c.pl >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {c.pl >= 0 ? "+" : ""}
                {formatKRW(c.pl)} ({c.plPct.toFixed(2)}%)
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">최근 지출</h2>
          <Link href="/expenses" className="text-sm text-accent">
            전체 보기
          </Link>
        </div>
        <Card className="p-0 overflow-hidden">
          {recentExpenses.length === 0 ? (
            <p className="text-muted text-sm p-4">아직 지출 내역이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentExpenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm">{e.category}</div>
                    <div className="text-xs text-muted truncate">
                      {formatDateShort(e.date)} · {e.memo || "-"}
                    </div>
                  </div>
                  <div className="font-medium">{formatKRW(e.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
