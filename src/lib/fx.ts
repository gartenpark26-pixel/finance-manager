import { prisma } from "./prisma";
import { yahooFinance, yahooModuleOptions } from "./yahoo";

const FX_TICKER = "KRW=X";
const FX_CACHE_KEY = "USDKRW";

export async function getUsdKrw(): Promise<number> {
  const cached = await prisma.priceCache.findUnique({ where: { ticker: FX_CACHE_KEY } });
  if (cached && isFresh(cached.fetchedAt)) return cached.price;

  try {
    // `chart` (not `quote`) avoids the crumb/cookie handshake that fails on
    // serverless. meta.regularMarketPrice carries the latest USD/KRW rate.
    const period1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const res: any = await yahooFinance.chart(
      FX_TICKER,
      { period1, interval: "1d" },
      yahooModuleOptions
    );
    const price = res?.meta?.regularMarketPrice ?? cached?.price;
    if (typeof price === "number") {
      await prisma.priceCache.upsert({
        where: { ticker: FX_CACHE_KEY },
        update: { price, currency: "KRW", fetchedAt: new Date() },
        create: { ticker: FX_CACHE_KEY, price, currency: "KRW", fetchedAt: new Date() },
      });
      return price;
    }
  } catch (e) {
    console.error("FX fetch failed", e);
  }
  return cached?.price ?? 1400;
}

function isFresh(t: Date) {
  const diff = Date.now() - t.getTime();
  return diff < 1000 * 60 * 60 * 6;
}
