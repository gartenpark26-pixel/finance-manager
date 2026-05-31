import { prisma } from "@/lib/prisma";
import { getQuotes } from "@/lib/prices";
import { getUsdKrw } from "@/lib/fx";
import { PortfolioClient } from "./PortfolioClient";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const portfolios = await prisma.portfolio.findMany({
    orderBy: { createdAt: "asc" },
    include: { holdings: { orderBy: { createdAt: "asc" } } },
  });
  const tickers = Array.from(
    new Set(portfolios.flatMap((p) => p.holdings.map((h) => h.ticker)))
  );
  const [quotes, usdKrw] = await Promise.all([getQuotes(tickers), getUsdKrw()]);

  const serialized = portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    holdings: p.holdings.map((h) => ({
      id: h.id,
      ticker: h.ticker,
      name: h.name,
      quantity: h.quantity,
      avgPrice: h.avgPrice,
      currency: h.currency,
    })),
  }));

  return (
    <PortfolioClient
      initialPortfolios={serialized}
      initialQuotes={quotes.map((q) => ({
        ticker: q.ticker,
        price: q.price,
        currency: q.currency,
        stale: q.stale,
      }))}
      initialUsdKrw={usdKrw}
    />
  );
}
