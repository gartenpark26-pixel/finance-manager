import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, requireSession } from "@/lib/api";
import { setPassword, verifyPassword } from "@/lib/auth";

const schema = z.object({
  current: z.string().min(1),
  next: z.string().min(4).max(100),
});

export async function POST(req: NextRequest) {
  const unauth = await requireSession();
  if (unauth) return unauth;
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return badRequest("입력 값을 확인해주세요. (새 비밀번호는 4자 이상)");
  const ok = await verifyPassword(parsed.data.current);
  if (!ok) return badRequest("현재 비밀번호가 올바르지 않습니다.");
  await setPassword(parsed.data.next);
  return NextResponse.json({ ok: true });
}
