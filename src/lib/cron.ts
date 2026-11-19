import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteMeta } from "@/db/schema";

/**
 * حماية مسارات cron: Vercel يرسل رأس CRON_SECRET تلقائيًا عند ضبط المتغير.
 * إن لم يُضبط المتغير نسمح بالنداء (للتطوير المحلي) — يُنصح ضبطه في الإنتاج.
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  const query = new URL(req.url).searchParams.get("secret");
  return header === `Bearer ${secret}` || query === secret;
}

export async function touchHeartbeat(): Promise<void> {
  await db
    .insert(siteMeta)
    .values({ key: "last_ping_at", value: new Date().toISOString() })
    .onConflictDoUpdate({
      target: siteMeta.key,
      set: { value: new Date().toISOString(), updatedAt: new Date() },
    });
}

export async function pingCount(): Promise<number> {
  const rows = await db
    .select()
    .from(siteMeta)
    .where(eq(siteMeta.key, "last_ping_at"))
    .limit(1);
  return rows.length;
}
