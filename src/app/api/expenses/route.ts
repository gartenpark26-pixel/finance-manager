import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requireSession } from "@/lib/api";

const createSchema = z.object({
  date: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  memo: z.string().optional().nullable(),
});

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
  const list = await prisma.expense.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.message);
  const created = await prisma.expense.create({
    data: {
      date: new Date(parsed.data.date),
      amount: parsed.data.amount,
      category: parsed.data.category,
      memo: parsed.data.memo ?? null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
