import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, requireSession } from "@/lib/api";

const createSchema = z.object({
  ticker: z.string().min(1).max(20),
  name: z.string().min(1).max(80),
  quantity: z.number().positive(),
  avgPrice: z.number().nonnegative(),
  currency: z.enum(["KRW", "USD"]),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const portfolio = await prisma.portfolio.findUnique({ where: { id: params.id } });
  if (!portfolio) return notFound();
  const holdings = await prisma.holding.findMany({
    where: { portfolioId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(holdings);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const portfolio = await prisma.portfolio.findUnique({ where: { id: params.id } });
  if (!portfolio) return notFound();
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.message);
  const created = await prisma.holding.create({
    data: { ...parsed.data, ticker: parsed.data.ticker.toUpperCase(), portfolioId: params.id },
  });
  return NextResponse.json(created, { status: 201 });
}
