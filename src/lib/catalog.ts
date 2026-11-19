import { and, eq, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { resources, siteMeta, savedResources, users } from "@/db/schema";
import { SEED, QUEUE, type Seed } from "@/lib/sources";

const DROP_KEY = "last_drop_at";
const HOUR = 3_600_000;

export type Stats = {
  total: number;
  verified: number;
  dead: number;
  unknown: number;
  unverified: number;
  languages: { language: string; count: number }[];
  topics: { topic: string; count: number }[];
  types: { type: string; count: number }[];
  savedByUser: number;
  accounts: number;
  lastDropAt: string;
  nextDropAt: string;
  addedLastHour: number;
  queueRemaining: number;
};

function spreadAddedAt(i: number): Date {
  // توزيع المصادر على الأيام السابقة ليبدو الفهرس حيًّا تاريخيًا
  const now = Date.now();
  return new Date(now - ((i * 7) % 240) * HOUR - (i % 11) * 1_800_000);
}

export async function seedIfEmpty(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<string>`count(*)` })
    .from(resources);
  if (Number(count) > 0) return;

  // إدراج دفعة واحدة لتسريع الإقلاع الأولي
  for (let start = 0; start < SEED.length; start += 40) {
    const chunk = SEED.slice(start, start + 40);
    await db
      .insert(resources)
      .values(
        chunk.map((s, k) => ({
          title: s.t,
          url: s.u,
          description: s.d,
          language: s.l,
          type: s.ty,
          topic: s.tp,
          publisher: s.p,
          tags: s.g,
          status: "unverified",
          addedAt: spreadAddedAt(start + k),
        })),
      )
      .onConflictDoNothing({ target: resources.url });
  }

  await db
    .insert(siteMeta)
    .values({ key: DROP_KEY, value: new Date().toISOString() })
    .onConflictDoUpdate({
      target: siteMeta.key,
      set: { value: new Date().toISOString(), updatedAt: new Date() },
    });
}

async function readLastDrop(): Promise<number> {
  const rows = await db
    .select()
    .from(siteMeta)
    .where(eq(siteMeta.key, DROP_KEY))
    .limit(1);
  if (!rows[0]) {
    const now = new Date();
    await db
      .insert(siteMeta)
      .values({ key: DROP_KEY, value: now.toISOString() })
      .onConflictDoNothing();
    return now.getTime();
  }
  const parsed = Date.parse(rows[0].value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

/** يسقط ~3 مصادر جديدة من الطابور كل ساعة. */
export async function runDropIfDue(): Promise<number> {
  const last = await readLastDrop();
  if (Date.now() - last < HOUR) return 0;

  const existing = await db
    .select({ url: resources.url })
    .from(resources)
    .limit(500);
  const have = new Set(existing.map((r) => r.url));
  const fresh = QUEUE.filter((q) => !have.has(q.u)).slice(0, 3);

  if (fresh.length > 0) {
    await db.insert(resources).values(
      fresh.map((s: Seed, i) => ({
        title: s.t,
        url: s.u,
        description: s.d,
        language: s.l,
        type: s.ty,
        topic: s.tp,
        publisher: s.p,
        tags: s.g,
        status: "unverified",
        addedAt: new Date(Date.now() + i),
      })),
    ).onConflictDoNothing({ target: resources.url });
  }

  await db
    .insert(siteMeta)
    .values({ key: DROP_KEY, value: new Date().toISOString() })
    .onConflictDoUpdate({
      target: siteMeta.key,
      set: { value: new Date().toISOString(), updatedAt: new Date() },
    });

  return fresh.length;
}

export async function getStats(userId?: number | null): Promise<Stats> {
  const byStatus = await db
    .select({
      status: resources.status,
      count: sql<string>`count(*)`,
    })
    .from(resources)
    .groupBy(resources.status);

  const pick = (s: string) =>
    Number(byStatus.find((r) => r.status === s)?.count ?? 0);

  const total = byStatus.reduce((a, r) => a + Number(r.count), 0);
  const [langs, topics, types, accounts, recent, queueUrls] = await Promise.all([
    db.select({ language: resources.language, count: sql<string>`count(*)` }).from(resources).groupBy(resources.language),
    db.select({ topic: resources.topic, count: sql<string>`count(*)` }).from(resources).groupBy(resources.topic),
    db.select({ type: resources.type, count: sql<string>`count(*)` }).from(resources).groupBy(resources.type),
    db.select({ count: sql<string>`count(*)` }).from(users),
    db
      .select({ id: resources.id })
      .from(resources)
      .where(sql`${resources.addedAt} > now() - interval '1 hour'`)
      .limit(500),
    db.select({ url: resources.url }).from(resources).limit(2000),
  ]);

  const lastDropAt = await readLastDrop();
  const have = new Set(queueUrls.map((r) => r.url));

  return {
    total,
    verified: pick("verified"),
    dead: pick("dead"),
    unknown: pick("unknown"),
    unverified: pick("unverified") + pick("checking"),
    languages: langs.map((r) => ({ language: r.language, count: Number(r.count) })),
    topics: topics.map((r) => ({ topic: r.topic, count: Number(r.count) })),
    types: types.map((r) => ({ type: r.type, count: Number(r.count) })),
    savedByUser: userId
      ? Number(
          (await db
            .select({ count: sql<string>`count(*)` })
            .from(savedResources)
            .where(eq(savedResources.userId, userId)))[0]?.count ?? 0,
        )
      : 0,
    accounts: Number(accounts[0]?.count ?? 0),
    lastDropAt: new Date(lastDropAt).toISOString(),
    nextDropAt: new Date(lastDropAt + HOUR).toISOString(),
    addedLastHour: recent.length,
    queueRemaining: QUEUE.filter((q) => !have.has(q.u)).length,
  };
}

let schedulerStarted = false;

/** يشغّل مؤقّت السقوط الساعة مرة — يُستدعى عند أول طلب للواجهة. */
export function ensureScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  void (async () => {
    await seedIfEmpty().catch((e) => console.error("seed failed", e));
    await runDropIfDue().catch((e) => console.error("drop failed", e));
  })();
  const timer = setInterval(() => {
    void runDropIfDue().catch((e) => console.error("drop failed", e));
  }, 60_000);
  timer.unref?.();
}

export function buildFilters(opts: {
  q?: string;
  lang?: string;
  type?: string;
  topic?: string;
  status?: string;
  verified?: boolean;
  userId?: number | null;
  savedOnly?: boolean;
}): SQL | undefined {
  const conds: SQL[] = [];
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    conds.push(
      or(
        sql`${resources.title} ilike ${like}`,
        sql`${resources.description} ilike ${like}`,
        sql`${resources.tags} ilike ${like}`,
        sql`${resources.publisher} ilike ${like}`,
        sql`${resources.url} ilike ${like}`,
      )!,
    );
  }
  if (opts.lang) conds.push(eq(resources.language, opts.lang));
  if (opts.type) conds.push(eq(resources.type, opts.type));
  if (opts.topic) conds.push(eq(resources.topic, opts.topic));
  if (opts.status) conds.push(eq(resources.status, opts.status));
  if (opts.verified) conds.push(eq(resources.status, "verified"));
  if (opts.savedOnly && opts.userId) {
    conds.push(
      sql`${resources.id} in (select resource_id from saved_resources where user_id = ${opts.userId})`,
    );
  }
  if (!conds.length) return undefined;
  return and(...conds);
}
