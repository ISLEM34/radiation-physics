import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureScheduler } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  ensureScheduler();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  });
}
