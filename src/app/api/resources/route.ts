import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { buildFilters, ensureScheduler } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  ensureScheduler();
  const url = new URL(req.url);
  const sp = url.searchParams;

  const q = sp.get("q") ?? "";
  const lang = sp.get("lang") ?? "";
  const type = sp.get("type") ?? "";
  const topic = sp.get("topic") ?? "";
  const status = sp.get("status") ?? "";
  const verified = sp.get("verified") === "1";
  const savedOnly = sp.get("saved") === "1";
  const sort = sp.get("sort") ?? "recent";
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 24) || 24, 1), 60);
  const offset = Math.max(Number(sp.get("offset") ?? 0) || 0, 0);

  const user = savedOnly ? await getCurrentUser() : null;
  if (savedOnly && !user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const where = buildFilters({
    q, lang, type, topic, status, verified, savedOnly, userId: user?.id ?? null,
  });

  const orderBy =
    sort === "saves"
      ? desc(resources.saves)
      : sort === "title"
        ? sql`${resources.title} asc`
        : desc(resources.addedAt);

  const [items, totalRow] = await Promise.all([
    db
      .select()
      .from(resources)
      .where(where)
      .orderBy(orderBy, desc(resources.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<string>`count(*)` })
      .from(resources)
      .where(where),
  ]);

  return NextResponse.json({
    items,
    total: Number(totalRow[0]?.count ?? 0),
    offset,
    limit,
  });
}
