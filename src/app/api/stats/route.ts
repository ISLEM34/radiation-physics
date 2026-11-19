import { NextResponse } from "next/server";
import { ensureScheduler, getStats } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  ensureScheduler();
  const user = await getCurrentUser();
  const stats = await getStats(user?.id ?? null);
  return NextResponse.json({ stats });
}
