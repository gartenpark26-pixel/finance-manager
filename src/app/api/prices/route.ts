import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getQuotes } from "@/lib/prices";
import { getUsdKrw } from "@/lib/fx";

export async function GET(req: NextRequest) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const tickersParam = req.nextUrl.searchParams.get("tickers") || "";
  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const [quotes, usdKrw] = await Promise.all([getQuotes(tickers), getUsdKrw()]);
  return NextResponse.json({ quotes, usdKrw });
}
