import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { searchSymbols } from "@/lib/prices";

export async function GET(req: NextRequest) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length === 0) return NextResponse.json({ results: [] });
  const data = await searchSymbols(q);
  return NextResponse.json(data);
}
