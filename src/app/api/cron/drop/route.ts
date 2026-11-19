import { NextResponse } from "next/server";
import { ensureScheduler, runDropIfDue, seedIfEmpty } from "@/lib/catalog";
import { isCronAuthorized, touchHeartbeat } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** كل ساعة: يُسقط ٣ مراجع جديدة من الطابور (مجدول Vercel Cron). */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await seedIfEmpty();
    await ensureSchedulerSafe();
    const added = await runDropIfDue();
    await touchHeartbeat();
    return NextResponse.json({ ok: true, added, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "cron failed" },
      { status: 500 },
    );
  }
}

async function ensureSchedulerSafe() {
  ensureScheduler();
}
