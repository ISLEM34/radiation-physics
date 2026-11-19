import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { resources, type Resource } from "@/db/schema";

const ALIVE = new Set([
  200, 201, 204, 301, 302, 303, 307, 308, 400, 401, 403, 405, 406, 429, 451, 503, 999,
]);

export type CheckResult = {
  id: number;
  status: "verified" | "dead" | "unknown";
  httpStatus: number | null;
};

/** يتحقق من رابط واحد: HEAD ثم GET احتياطيًا، بمهلة 7 ثوانٍ. */
export async function checkUrl(url: string): Promise<{ status: CheckResult["status"]; httpStatus: number | null }> {
  const attempt = async (method: "HEAD" | "GET") => {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; ResourceIndexBot/1.0; +https://example.org/bot) AppleWebKit/537.36",
        accept: "*/*",
      },
      cache: "no-store",
    });
    return res.status;
  };

  let status: number | null = null;
  try {
    status = await attempt("HEAD");
  } catch {
    status = null; // بعض الخوادم ترفض HEAD تمامًا
  }
  if (status === null || status === 405 || status === 403 || status === 400 || status === 406) {
    try {
      status = await attempt("GET");
    } catch {
      if (status === null) return { status: "unknown", httpStatus: null };
    }
  }

  if (status === null) return { status: "unknown", httpStatus: null };
  if (ALIVE.has(status) || (status >= 200 && status < 400)) {
    return { status: "verified", httpStatus: status };
  }
  if (status === 404 || status === 410) {
    return { status: "dead", httpStatus: status };
  }
  // مهلة أو حجب شبكة: الرابط قد يكون محجوبًا للمتزنا — لا نعلّمه ميتًا
  return { status: "unknown", httpStatus: status };
}

/** يتحقق من حتى `limit` رابط قديم/غير مُتحقَّق منه، ويعيد الملخّص. */
export async function verifyStale(limit = 10): Promise<{ checked: number; verified: number; dead: number; unknown: number; remaining: number }> {
  const candidates: Resource[] = await db
    .select()
    .from(resources)
    .where(
      sql`(((${resources.status} in ('unverified','checking') or ${resources.lastCheckedAt} is null or ${resources.lastCheckedAt} < now() - interval '6 hours') and ${resources.status} <> 'dead') or (${resources.status} = 'dead' and ${resources.lastCheckedAt} < now() - interval '24 hours'))`,
    )
    .orderBy(desc(sql`coalesce(${resources.lastCheckedAt}, 'epoch')`))
    .limit(limit);

  let verified = 0;
  let dead = 0;
  let unknown = 0;

  await Promise.all(
    candidates.map(async (r) => {
      const result = await checkUrl(r.url);
      await db
        .update(resources)
        .set({
          status: result.status,
          httpStatus: result.httpStatus,
          lastCheckedAt: new Date(),
        })
        .where(eq(resources.id, r.id));
      if (result.status === "verified") verified += 1;
      else if (result.status === "dead") dead += 1;
      else unknown += 1;
    }),
  );

  const remaining = await db
    .select({ count: sql<string>`count(*)` })
    .from(resources)
    .where(
      sql`(((${resources.status} in ('unverified','checking') or ${resources.lastCheckedAt} is null or ${resources.lastCheckedAt} < now() - interval '6 hours') and ${resources.status} <> 'dead') or (${resources.status} = 'dead' and ${resources.lastCheckedAt} < now() - interval '24 hours'))`,
    );

  return {
    checked: candidates.length,
    verified,
    dead,
    unknown,
    remaining: Number(remaining[0]?.count ?? 0),
  };
}

export async function markDead(id: number): Promise<void> {
  await db
    .update(resources)
    .set({ status: "dead", httpStatus: 404, lastCheckedAt: new Date() })
    .where(eq(resources.id, id));
}
