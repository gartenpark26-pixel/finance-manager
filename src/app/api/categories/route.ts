import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requireSession } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1).max(20),
  icon: z.string().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function GET() {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const list = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.message);
  try {
    const created = await prisma.category.create({ data: parsed.data });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return badRequest("이미 존재하는 카테고리입니다.");
    throw e;
  }
}
