import { NextResponse } from "next/server";
import { verifyStale } from "@/lib/verify";
import { isCronAuthorized, touchHeartbeat } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // حد الخطة المجانية: ٣٠٠ ثانية

/** مرتان يوميًا: فحص الروابط القديمة/غير المؤكدة (٤٠ رابطًا في الدعوة). */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await verifyStale(40);
    await touchHeartbeat();
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "cron failed" },
      { status: 500 },
    );
  }
}
