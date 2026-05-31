import yahooFinance from "yahoo-finance2";
import { prisma } from "./prisma";

type QuoteResult = {
  ticker: string;
  price: number | null;
  currency: string;
  stale: boolean;
  fetchedAt: Date | null;
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function getQuotes(tickers: string[]): Promise<QuoteResult[]> {
  const uniq = Array.from(new Set(tickers.filter(Boolean)));
  if (uniq.length === 0) return [];

  const cached = await prisma.priceCache.findMany({
    where: { ticker: { in: uniq } },
  });
  const cacheMap = new Map(cached.map((c) => [c.ticker, c]));

  const now = new Date();
  const needFetch: string[] = [];
  for (const t of uniq) {
    const c = cacheMap.get(t);
    if (!c) needFetch.push(t);
    else if (!sameDay(c.fetchedAt, now)) needFetch.push(t);
  }

  if (needFetch.length > 0) {
    try {
      yahooFinance.suppressNotices(["yahooSurvey"]);
      const quotes = await yahooFinance.quote(needFetch);
      const arr = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of arr) {
        const ticker = q.symbol;
        const price = q.regularMarketPrice;
        const currency = q.currency || "USD";
        if (ticker && typeof price === "number") {
          const fetched = new Date();
          await prisma.priceCache.upsert({
            where: { ticker },
            update: { price, currency, fetchedAt: fetched },
            create: { ticker, price, currency, fetchedAt: fetched },
          });
          cacheMap.set(ticker, { ticker, price, currency, fetchedAt: fetched });
        }
      }
    } catch (e) {
      console.error("Quote fetch failed", e);
    }
  }

  return uniq.map((t) => {
    const c = cacheMap.get(t);
    if (!c) return { ticker: t, price: null, currency: "USD", stale: true, fetchedAt: null };
    return {
      ticker: t,
      price: c.price,
      currency: c.currency,
      stale: !sameDay(c.fetchedAt, now),
      fetchedAt: c.fetchedAt,
    };
  });
}

export async function searchSymbols(query: string) {
  try {
    yahooFinance.suppressNotices(["yahooSurvey"]);
    const res = await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 });
    return (res.quotes || [])
      .filter((q: any) => q.symbol && (q.shortname || q.longname))
      .map((q: any) => ({
        symbol: q.symbol as string,
        name: (q.shortname || q.longname) as string,
        exchange: q.exchDisp as string | undefined,
        type: q.quoteType as string | undefined,
      }));
  } catch (e) {
    console.error("Symbol search failed", e);
    return [];
  }
}
