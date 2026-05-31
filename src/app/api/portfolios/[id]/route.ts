import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, requireSession } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.message);
  const existing = await prisma.portfolio.findUnique({ where: { id: params.id } });
  if (!existing) return notFound();
  const updated = await prisma.portfolio.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const existing = await prisma.portfolio.findUnique({ where: { id: params.id } });
  if (!existing) return notFound();
  await prisma.portfolio.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
