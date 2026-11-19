import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { resources, savedResources } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureScheduler } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  ensureScheduler();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const items = await db
    .select({
      savedId: savedResources.id,
      savedAt: savedResources.createdAt,
      resource: resources,
    })
    .from(savedResources)
    .innerJoin(resources, eq(savedResources.resourceId, resources.id))
    .where(eq(savedResources.userId, user.id))
    .orderBy(desc(savedResources.createdAt));

  return NextResponse.json({ items, count: items.length });
}
