import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Hit by a Vercel Cron daily. Runs a trivial query so the Supabase free-tier
// project registers activity and does not auto-pause after 7 idle days.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    console.error("keepalive failed", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
