import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, requireSession } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  icon: z.string().min(1).max(8).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.message);
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) return notFound();
  try {
    const updated = await prisma.category.update({
      where: { id: params.id },
      data: parsed.data,
    });
    if (parsed.data.name && parsed.data.name !== existing.name) {
      await prisma.expense.updateMany({
        where: { category: existing.name },
        data: { category: parsed.data.name },
      });
    }
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2002") return badRequest("이미 존재하는 카테고리입니다.");
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) return notFound();
  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
