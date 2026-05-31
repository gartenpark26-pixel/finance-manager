import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requireSession } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function GET() {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const list = await prisma.portfolio.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { holdings: true } } },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.message);
  const created = await prisma.portfolio.create({ data: parsed.data });
  return NextResponse.json(created, { status: 201 });
}
