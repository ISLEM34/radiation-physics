import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** إبلاغ عن رابط معطّل — يُعلَّم المصدر ميتًا بعد تأكيد المستخدم. */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const { id } = await ctx.params;
  const resourceId = Number(id);
  if (!Number.isInteger(resourceId))
    return NextResponse.json({ error: "معرّف غير صالح." }, { status: 400 });

  const [row] = await db
    .update(resources)
    .set({
      reports: sql`${resources.reports} + 1`,
      status: "dead",
      httpStatus: 404,
      lastCheckedAt: new Date(),
    })
    .where(eq(resources.id, resourceId))
    .returning({ id: resources.id, status: resources.status });

  if (!row) return NextResponse.json({ error: "المصدر غير موجود." }, { status: 404 });
  return NextResponse.json({ ok: true, status: row.status });
}
