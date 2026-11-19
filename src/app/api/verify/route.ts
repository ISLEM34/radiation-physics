import { NextResponse } from "next/server";
import { ensureScheduler } from "@/lib/catalog";
import { verifyStale } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

/** يعيد فحص الروابط القديمة/غير المُتحقَّق منها (حتى ١٠ في الدعوة). */
export async function POST() {
  ensureScheduler();
  const body = await verifyStale(10);
  return NextResponse.json(body);
}
