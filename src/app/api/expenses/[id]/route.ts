import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, requireSession } from "@/lib/api";

const updateSchema = z.object({
  date: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  memo: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.message);
  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) return notFound();
  const data: any = { ...parsed.data };
  if (data.date) data.date = new Date(data.date);
  const updated = await prisma.expense.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) return notFound();
  await prisma.expense.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
