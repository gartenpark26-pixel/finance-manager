import { prisma } from "./prisma";
import { yahooFinance, yahooModuleOptions } from "./yahoo";

const FX_TICKER = "KRW=X";
const FX_CACHE_KEY = "USDKRW";

export async function getUsdKrw(): Promise<number> {
  const cached = await prisma.priceCache.findUnique({ where: { ticker: FX_CACHE_KEY } });
  if (cached && isFresh(cached.fetchedAt)) return cached.price;

  try {
    const q = await yahooFinance.quote(FX_TICKER, {}, yahooModuleOptions);
    const price = q.regularMarketPrice ?? cached?.price;
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
