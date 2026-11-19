import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { resources, savedResources } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const { id } = await ctx.params;
  const resourceId = Number(id);
  if (!Number.isInteger(resourceId))
    return NextResponse.json({ error: "معرّف غير صالح." }, { status: 400 });

  const [res] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);
  if (!res) return NextResponse.json({ error: "المصدر غير موجود." }, { status: 404 });

  const existing = await db
    .select({ id: savedResources.id })
    .from(savedResources)
    .where(and(eq(savedResources.userId, user.id), eq(savedResources.resourceId, resourceId)))
    .limit(1);

  let saved: boolean;
  if (existing.length) {
    await db.delete(savedResources).where(eq(savedResources.id, existing[0].id));
    await db
      .update(resources)
      .set({ saves: sql`greatest(${resources.saves} - 1, 0)` })
      .where(eq(resources.id, resourceId));
    saved = false;
  } else {
    await db.insert(savedResources).values({ userId: user.id, resourceId }).onConflictDoNothing();
    await db
      .update(resources)
      .set({ saves: sql`${resources.saves} + 1` })
      .where(eq(resources.id, resourceId));
    saved = true;
  }

  const [countRow] = await db
    .select({ saves: resources.saves })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  return NextResponse.json({ saved, saves: countRow?.saves ?? 0 });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const { id } = await ctx.params;
  await db
    .delete(savedResources)
    .where(and(eq(savedResources.userId, user.id), eq(savedResources.resourceId, Number(id))));
  return NextResponse.json({ saved: false });
}
