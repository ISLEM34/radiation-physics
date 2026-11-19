import { NextResponse } from "next/server";
import { runDropIfDue } from "@/lib/catalog";
import { verifyStale } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * مهمة مجدولة (Vercel Cron) — تعمل كل ساعة:
 * 1) تُسقط ~3 مراجع جديدة إن اكتملت الساعة (runDropIfDue)
 * 2) تفحص دفعة من الروابط (verifyStale)
 * لا تعتمد على مؤقّت الخادم الداخلي، لذا تعمل على serverless بشكل صحيح.
 */
export async function GET() {
  const [dropped, verification] = await Promise.all([
    runDropIfDue(),
    verifyStale(10),
  ]);
  return NextResponse.json({ ok: true, dropped, verification });
}
