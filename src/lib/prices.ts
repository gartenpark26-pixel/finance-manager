import { prisma } from "./prisma";
import { yahooFinance, yahooModuleOptions } from "./yahoo";

export type SymbolSearchResponse = {
  results: {
    symbol: string;
    name: string;
    exchange?: string;
    type?: string;
  }[];
  error?: string;
};

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
    // Use the `chart` endpoint instead of `quote`: `quote` requires a Yahoo
    // crumb+cookie handshake that fails on serverless (Vercel) with
    // "No set-cookie header present in Yahoo's response", whereas `chart`
    // needs only a browser User-Agent. chart() takes one symbol at a time.
    const period1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fetched = new Date();
    const settled = await Promise.allSettled(
      needFetch.map((ticker) =>
        yahooFinance
          .chart(ticker, { period1, interval: "1d" }, yahooModuleOptions)
          .then((res: any) => ({ ticker, meta: res?.meta }))
      )
    );
    for (const r of settled) {
      if (r.status !== "fulfilled") {
        console.error("Chart fetch failed", (r as PromiseRejectedResult).reason);
        continue;
      }
      const { ticker, meta } = r.value;
      const price = meta?.regularMarketPrice;
      const currency = meta?.currency || "USD";
      if (ticker && typeof price === "number") {
        await prisma.priceCache.upsert({
          where: { ticker },
          update: { price, currency, fetchedAt: fetched },
          create: { ticker, price, currency, fetchedAt: fetched },
        });
        cacheMap.set(ticker, { ticker, price, currency, fetchedAt: fetched });
      }
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

const HAS_HANGUL = /[ㄱ-힝]/;

export async function searchSymbols(query: string): Promise<SymbolSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [] };

  try {
    const res = await yahooFinance.search(
      trimmed,
      { quotesCount: 10, newsCount: 0 },
      yahooModuleOptions
    );
    const results = (res.quotes || [])
      .filter((q: any) => q.symbol && (q.shortname || q.longname))
      .map((q: any) => ({
        symbol: q.symbol as string,
        name: (q.shortname || q.longname) as string,
        exchange: q.exchDisp as string | undefined,
        type: q.quoteType as string | undefined,
      }));

    if (results.length === 0 && HAS_HANGUL.test(trimmed)) {
      return {
        results: [],
        error: "한글 검색은 지원되지 않습니다. 영문 종목명이나 티커(예: 005930.KS, AAPL)로 검색해 주세요.",
      };
    }
    return { results };
  } catch (e) {
    console.error("Symbol search failed", e);
    // Yahoo rejects most non-Latin queries with an error response.
    if (HAS_HANGUL.test(trimmed)) {
      return {
        results: [],
        error: "한글 검색은 지원되지 않습니다. 영문 종목명이나 티커(예: 005930.KS, AAPL)로 검색해 주세요.",
      };
    }
    return { results: [], error: "검색에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
