import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";

export async function GET(req: NextRequest) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const where: any = {};
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }
  const grouped = await prisma.expense.groupBy({
    by: ["category"],
    where,
    _sum: { amount: true },
    _count: { _all: true },
  });
  const total = grouped.reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  return NextResponse.json({
    total,
    byCategory: grouped
      .map((g) => ({
        category: g.category,
        amount: g._sum.amount ?? 0,
        count: g._count._all,
      }))
      .sort((a, b) => b.amount - a.amount),
  });
}
