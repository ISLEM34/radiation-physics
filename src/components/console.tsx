"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { LANGS, TOPICS, TYPES, type SourceType } from "@/lib/sources";

type Resource = {
  id: number;
  title: string;
  url: string;
  description: string;
  language: string;
  type: string;
  topic: string;
  publisher: string;
  tags: string;
  status: string;
  httpStatus: number | null;
  saves: number;
  addedAt: string;
  lastCheckedAt: string | null;
};

type Stats = {
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

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  verified: { label: "مُتحقَّق", dot: "bg-phos", text: "text-phos" },
  dead: { label: "معطّل", dot: "bg-hazard", text: "text-hazard" },
  unknown: { label: "غير مؤكد", dot: "bg-muted", text: "text-muted" },
  checking: { label: "قيد الفحص", dot: "bg-phos blip", text: "text-phos" },
  unverified: {
    label: "بانتظار الفحص",
    dot: "bg-transparent border border-muted",
    text: "text-muted",
  },
};

const ROW_GRID =
  "lg:grid-cols-[2.5rem_minmax(0,1fr)_4rem_5.5rem_7.5rem_4.5rem]";

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json" },
  });
  const data = await res.json().catch(() => ({} as T));
  if (!res.ok) {
    const msg = (data as { error?: string }).error;
    const err = new Error(msg ?? "خطأ غير متوقع");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

function hostOf(u: string) {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
}

export default function Console({
  initialQuery,
  initialStats,
}: {
  initialQuery: string;
  initialStats: Stats;
}) {
  const { user, requireAuth, openAuth } = useAuth();

  const [q, setQ] = useState(initialQuery);
  const [lang, setLang] = useState("");
  const [type, setType] = useState("");
  const [topic, setTopic] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("recent");
  const [tab, setTab] = useState<"index" | "saved">("index");

  const [items, setItems] = useState<Resource[]>([]);
  const [total, setTotal] = useState(initialStats.total);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [verifyInfo, setVerifyInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const autoRan = useRef(false);

  const refreshStats = useCallback(async () => {
    try {
      const d = await j<{ stats: Stats }>("/api/stats");
      setStats(d.stats);
    } catch {
      /* تجاهل */
    }
  }, []);

  const buildQuery = useCallback(
    (offset: number) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (lang) p.set("lang", lang);
      if (type) p.set("type", type);
      if (topic) p.set("topic", topic);
      if (verifiedOnly) p.set("verified", "1");
      p.set("sort", sort);
      p.set("offset", String(offset));
      p.set("limit", "24");
      if (tab === "saved") p.set("saved", "1");
      return p.toString();
    },
    [q, lang, type, topic, verifiedOnly, sort, tab],
  );

  const load = useCallback(
    async (offset: number) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      try {
        const d = await j<{ items: Resource[]; total: number }>(
          `/api/resources?${buildQuery(offset)}`,
        );
        offsetRef.current = offset + d.items.length;
        setTotal(d.total);
        setItems((prev) => (offset === 0 ? d.items : [...prev, ...d.items]));
      } catch (err) {
        if ((err as Error & { status?: number }).status === 401 && tab === "saved") {
          setTab("index");
          requireAuth("login");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQuery, requireAuth, tab],
  );

  // إعادة البحث عند تغيير أي مُرشِّح (تأخير قصير لكتابة المستخدم)
  useEffect(() => {
    const t = setTimeout(() => void load(0), q === initialQuery ? 0 : 320);
    return () => clearTimeout(t);
  }, [load, q, initialQuery]);

  const loadSaved = useCallback(async () => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    try {
      const d = await j<{ items: { resource: Resource }[] }>("/api/saved");
      setSavedIds(new Set(d.items.map((i) => i.resource.id)));
    } catch {
      /* تجاهل */
    }
  }, [user]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    const h = () => {
      void refreshStats();
      void loadSaved();
    };
    window.addEventListener("rp:user", h);
    return () => window.removeEventListener("rp:user", h);
  }, [refreshStats, loadSaved]);

  const runVerify = useCallback(
    async (auto = false) => {
      if (verifying) return;
      setVerifying(true);
      setVerifyInfo(auto ? "جارٍ التحقق من الروابط تلقائيًا…" : "جارٍ الفحص…");
      try {
        let rounds = 0;
        let remaining = 999;
        while (rounds < (auto ? 5 : 1) && remaining > 0) {
          const d = await j<{
            checked: number;
            verified: number;
            dead: number;
            unknown: number;
            remaining: number;
          }>("/api/verify", { method: "POST" });
          remaining = d.remaining;
          rounds += 1;
          await refreshStats();
          setVerifyInfo(
            `فحص ${d.checked} رابط — ${d.verified} سليم، ${d.dead} معطّل، ${d.unknown} محجوب/غير مؤكد${remaining > 0 ? ` · متبقٍ ${remaining}` : " · اكتمل"}`,
          );
          if (remaining > 0) await load(0);
        }
        await load(0);
      } catch {
        setVerifyInfo("تعذّر الوصول إلى خدمة الفحص.");
      } finally {
        setVerifying(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshStats, load],
  );

  // فحص تلقائي عند أول تحميل إن وُجدت روابط غير مفحوصة
  useEffect(() => {
    if (autoRan.current || stats.unverified === 0 || verifying) return;
    autoRan.current = true;
    const t = setTimeout(() => void runVerify(true), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.unverified]);

  // تمرير لانهائي
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && items.length < total) {
          void load(offsetRef.current);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, total, loading, loadingMore, load]);

  async function toggleSave(r: Resource) {
    if (!requireAuth("login")) return;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(r.id)) next.delete(r.id);
      else next.add(r.id);
      return next;
    });
    try {
      const d = await j<{ saved: boolean; saves: number }>(`/api/resources/${r.id}/save`, {
        method: "POST",
      });
      setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, saves: d.saves } : x)));
      void refreshStats();
    } catch (err) {
      if ((err as Error & { status?: number }).status === 401) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(r.id);
          return next;
        });
        openAuth("login");
      }
    }
  }

  async function reportDead(r: Resource) {
    if (!requireAuth("login")) return;
    if (!confirm("هل الرابط معطّل فعلًا؟ سيُعلَّم في الفهرس بعد إبلاغك.")) return;
    try {
      await j(`/api/resources/${r.id}/report`, { method: "POST" });
      setItems((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, status: "dead", httpStatus: 404 } : x)),
      );
      void refreshStats();
    } catch {
      /* تجاهل */
    }
  }

  const facetCounts = useMemo(
    () => ({
      language: Object.fromEntries(stats.languages.map((r) => [r.language, r.count])),
      topic: Object.fromEntries(stats.topics.map((r) => [r.topic, r.count])),
      type: Object.fromEntries(stats.types.map((r) => [r.type, r.count])),
    }),
    [stats],
  );

  const resetAll = () => {
    setQ("");
    setLang("");
    setType("");
    setTopic("");
    setVerifiedOnly(false);
  };

  return (
    <section id="index" className="scroll-mt-24 border-t border-hair bg-carbon">
      {/* شريط أدوات الفهرس — يعلو تحت الشريط العلوي */}
      <div className="sticky top-[4.3rem] z-30 border-b border-hair bg-carbon/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-1 border border-hair bg-carbon-2 p-1">
            {(["index", "saved"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-sm transition ${
                  tab === t ? "bg-phos text-[#06110f]" : "text-muted hover:text-ink"
                }`}
              >
                {t === "index" ? "الفهرس" : `مراجعاتي (${stats.savedByUser})`}
              </button>
            ))}
          </div>

          <label className="relative flex min-w-[240px] flex-1 items-center border border-hair bg-carbon-2 focus-within:border-phos">
            <span className="mono-label px-3">بحث</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في العناوين والوصف والوسوم… مثال: جرعة، dosimétrie, IAEA"
              className="w-full bg-transparent py-2 pl-3 text-sm text-ink outline-none placeholder:text-muted/70"
            />
            {q ? (
              <button
                onClick={() => setQ("")}
                className="px-3 text-muted transition hover:text-hazard"
                aria-label="مسح البحث"
              >
                ✕
              </button>
            ) : null}
          </label>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-hair bg-carbon-2 px-2 py-2 text-sm text-muted outline-none focus:border-phos"
          >
            <option value="recent">الأحدث إضافة</option>
            <option value="saves">الأكثر حفظًا</option>
            <option value="title">أبجديًا</option>
          </select>

          <button
            onClick={() => void runVerify(false)}
            disabled={verifying}
            className="border border-phos/60 px-3 py-2 text-sm text-phos transition hover:bg-phos hover:text-[#06110f] disabled:opacity-50"
          >
            {verifying ? "جارٍ الفحص…" : "فحص الروابط الآن"}
          </button>
        </div>

        {verifyInfo ? (
          <div className="mx-auto max-w-[1500px] px-4 pb-2 text-xs text-phos/90 md:px-8">
            <span className="num">●</span> {verifyInfo}
          </div>
        ) : null}
      </div>

      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[16.5rem_1fr]">
        {/* الرَّف الجانبي — المُرشِّحات */}
        <aside className="lg:sticky lg:top-[8.1rem] lg:h-fit">
          <details open className="border border-hair bg-panel/60">
            <summary className="mono-label cursor-pointer list-none px-4 py-3 hover:text-phos">
              §01 — المُرشِّحات
            </summary>
            <div className="space-y-6 border-t border-hair p-4">
              <Facet
                title="اللغة"
                active={lang}
                onPick={(v) => setLang(v === lang ? "" : v)}
                rows={[
                  { key: "", label: "الكل", count: stats.total },
                  ...(["ar", "fr", "en"] as const).map((k) => ({
                    key: k,
                    label: LANGS[k],
                    count: facetCounts.language[k] ?? 0,
                  })),
                ]}
              />
              <Facet
                title="النوع"
                active={type}
                onPick={(v) => setType(v === type ? "" : v)}
                rows={[
                  { key: "", label: "الكل", count: stats.total },
                  ...(Object.keys(TYPES) as SourceType[]).map((k) => ({
                    key: k,
                    label: TYPES[k],
                    count: facetCounts.type[k] ?? 0,
                  })),
                ]}
              />
              <Facet
                title="الموضوع"
                active={topic}
                onPick={(v) => setTopic(v === topic ? "" : v)}
                rows={[
                  { key: "", label: "الكل", count: stats.total },
                  ...Object.entries(TOPICS).map(([k, label]) => ({
                    key: k,
                    label,
                    count: facetCounts.topic[k] ?? 0,
                  })),
                ]}
              />

              <div>
                <p className="mono-label mb-2">§ الحالة</p>
                <button
                  onClick={() => setVerifiedOnly((v) => !v)}
                  className={`flex w-full items-center justify-between border px-3 py-2 text-sm transition ${
                    verifiedOnly
                      ? "border-phos bg-phos/10 text-phos"
                      : "border-hair text-muted hover:border-hair-2 hover:text-ink"
                  }`}
                >
                  <span>الروابط المُتحقَّق منها فقط</span>
                  <span className="num">{stats.verified}</span>
                </button>
              </div>

              <div className="border-t border-hair pt-4">
                <p className="mono-label mb-2">§ حالة الفهرس</p>
                <Readout label="سليم" value={stats.verified} tone="text-phos" />
                <Readout label="معطّل" value={stats.dead} tone="text-hazard" />
                <Readout label="محجوب/غير مؤكد" value={stats.unknown} tone="text-muted" />
                <Readout label="بانتظار الفحص" value={stats.unverified} tone="text-muted" />
              </div>

              <div className="border-t border-hair pt-4">
                <p className="mono-label mb-2">§ الإضافة التالية بعد</p>
                <Countdown to={stats.nextDropAt} />
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  يُسقط الفهرس <span className="num text-ink">3</span> مصادر جديدة كل ساعة من طابور
                  المراجع المُنتقاة. متبقٍ في الطابور:{" "}
                  <span className="num text-phos">{stats.queueRemaining}</span>.
                </p>
              </div>

              <button
                onClick={resetAll}
                className="w-full border border-hair px-3 py-2 text-sm text-muted transition hover:border-hazard hover:text-hazard"
              >
                إعادة ضبط المُرشِّحات
              </button>
            </div>
          </details>
        </aside>

        {/* السجل — الجدول */}
        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-hair pb-3">
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <h2 className="font-display text-2xl text-ink">
                {tab === "index" ? "سجل المصادر" : "مراجعاتي المحفوظة"}
              </h2>
              <span className="mono-label">{loading ? "…" : `${total} نتيجة`}</span>
              <span className="mono-label">
                أُضيفت آخر ساعة: <span className="text-phos">{stats.addedLastHour}</span>
              </span>
            </div>
            <span className="mono-label">
              lang={lang || "all"} · verified={verifiedOnly ? "1" : "0"}
            </span>
          </div>

          <div
            className={`hidden items-center gap-3 border-b border-hair pb-2 lg:grid ${ROW_GRID}`}
          >
            <span className="mono-label">#</span>
            <span className="mono-label">المصدر / الناشر</span>
            <span className="mono-label">اللغة</span>
            <span className="mono-label">النوع</span>
            <span className="mono-label">الحالة</span>
            <span className="mono-label text-left">حفظ</span>
          </div>

          {loading && items.length === 0 ? (
            <div className="space-y-2 py-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse border-b border-hair bg-panel/50"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState onReset={resetAll} />
          ) : (
            <ul>
              {items.map((r, i) => (
                <Row
                  key={r.id}
                  r={r}
                  i={i}
                  saved={savedIds.has(r.id)}
                  onSave={() => void toggleSave(r)}
                  onReport={() => void reportDead(r)}
                />
              ))}
            </ul>
          )}

          <div ref={sentinelRef} className="h-10" />

          {items.length < total ? (
            <div className="flex justify-center pb-10">
              <button
                onClick={() => void load(offsetRef.current)}
                disabled={loadingMore}
                className="border border-hair px-6 py-3 text-sm text-muted transition hover:border-phos hover:text-phos disabled:opacity-50"
              >
                {loadingMore ? "جارٍ التحميل…" : `تحميل المزيد (${total - items.length} متبقٍ)`}
              </button>
            </div>
          ) : items.length > 0 ? (
            <p className="mono-label py-6 text-center">— نهاية النتائج · {items.length}/{total} —</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Facet({
  title,
  rows,
  active,
  onPick,
}: {
  title: string;
  rows: { key: string; label: string; count: number }[];
  active: string;
  onPick: (key: string) => void;
}) {
  return (
    <div>
      <p className="mono-label mb-2">§ {title}</p>
      <div className="space-y-px">
        {rows.map((row) => {
          const on = row.key === active;
          if (row.count === 0 && row.key !== "") return null;
          return (
            <button
              key={row.key || "all"}
              onClick={() => onPick(row.key)}
              className={`flex w-full items-center justify-between px-2.5 py-1.5 text-right text-sm transition ${
                on ? "bg-phos/10 text-phos" : "text-muted hover:bg-carbon-2 hover:text-ink"
              }`}
            >
              <span className="truncate">{row.label}</span>
              <span className="num shrink-0 pl-2 text-xs opacity-70">{row.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Readout({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline justify-between py-0.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`num ${tone}`}>{value}</span>
    </div>
  );
}

function Countdown({ to }: { to: string }) {
  const [left, setLeft] = useState(() => Math.max(0, Date.parse(to) - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Date.parse(to) - Date.now())), 1000);
    return () => clearInterval(t);
  }, [to]);
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-baseline gap-2">
      <span className="num text-3xl text-phos">
        {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
      </span>
      <span className="mono-label">hh:mm:ss</span>
    </div>
  );
}

function Row({
  r,
  i,
  saved,
  onSave,
  onReport,
}: {
  r: Resource;
  i: number;
  saved: boolean;
  onSave: () => void;
  onReport: () => void;
}) {
  const st = STATUS[r.status] ?? STATUS.unverified;
  return (
    <li
      className="row-in group border-b border-hair transition hover:bg-panel/70 hover:shadow-[inset_-2px_0_0_0_var(--color-phos)]"
      style={{ animationDelay: `${(i % 24) * 18}ms` }}
    >
      <div
        className={`grid grid-cols-1 gap-x-3 gap-y-2 px-1 py-4 lg:items-start ${ROW_GRID}`}
      >
        <span className="num hidden pt-1 text-xs text-muted/70 lg:block">
          {String(i + 1).padStart(3, "0")}
        </span>

        <div className="min-w-0">
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[15px] font-medium leading-snug text-ink decoration-phos/60 underline-offset-4 hover:text-phos hover:underline"
          >
            {r.title}
          </a>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{r.description}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted/80">
            <span className="text-muted">{r.publisher}</span>
            <span className="num text-phos/70" dir="ltr">
              {hostOf(r.url)}
            </span>
            <span className="mono-label">
              added {new Date(r.addedAt).toISOString().slice(0, 10)}
            </span>
            <span className="mono-label lg:hidden">
              {LANGS[r.language as keyof typeof LANGS]}
            </span>
            <span className="mono-label lg:hidden">
              {TYPES[r.type as SourceType] ?? r.type}
            </span>
          </p>
        </div>

        <span className="hidden lg:block">
          <LangChip lang={r.language} />
        </span>

        <span className="hidden border border-hair px-2 py-1 text-center text-xs text-muted lg:block">
          {TYPES[r.type as SourceType] ?? r.type}
        </span>

        <span className="flex items-center gap-2 text-sm">
          <span className={`inline-block h-2 w-2 rounded-full ${st.dot}`} />
          <span className={st.text}>{st.label}</span>
          {r.httpStatus ? <span className="num text-[11px] text-muted/70">{r.httpStatus}</span> : null}
        </span>

        <div className="flex items-center gap-3 lg:justify-end">
          <button
            onClick={onSave}
            title={saved ? "إزالة من المحفوظات" : "حفظ في مراجعاتي"}
            className={`flex items-center gap-1.5 border px-2 py-1 text-xs transition ${
              saved
                ? "border-phos bg-phos/10 text-phos"
                : "border-hair text-muted hover:border-phos hover:text-phos"
            }`}
          >
            <svg width="11" height="13" viewBox="0 0 11 13" aria-hidden="true">
              <path
                d="M1 1h9v11l-4.5-3.2L1 12V1z"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            <span className="num">{r.saves}</span>
          </button>
          {r.status === "dead" ? null : (
            <button
              onClick={onReport}
              title="الإبلاغ عن رابط معطّل"
              className="text-[11px] text-muted/0 transition group-hover:text-muted hover:text-hazard!"
            >
              إبلاغ
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function LangChip({ lang }: { lang: string }) {
  const label = lang === "ar" ? "ع" : lang === "fr" ? "FR" : "EN";
  const tone =
    lang === "ar"
      ? "border-phos/70 text-phos"
      : lang === "fr"
        ? "border-hair-2 text-ink"
        : "border-hair-2 text-muted";
  return (
    <span
      className={`num inline-block border px-2 py-0.5 text-center text-[11px] ${tone}`}
      title={LANGS[lang as keyof typeof LANGS]}
    >
      {label}
    </span>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="film-grain relative my-6 overflow-hidden border border-hair bg-panel px-6 py-14 text-center">
      <div className="relative z-10 mx-auto max-w-md">
        <p className="mono-label mb-3">§ نتائج = 0</p>
        <p className="font-display text-2xl text-ink">لا يوجد مصدر مطابق لهذا الاستعلام</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          جرّب كلمة أقصر أو أعد ضبط المُرشِّحات — الفهرس يتجدد كل ساعة بمراجع جديدة.
        </p>
        <button
          onClick={onReset}
          className="mt-5 border border-phos px-5 py-2.5 text-sm text-phos transition hover:bg-phos hover:text-[#06110f]"
        >
          إعادة ضبط البحث
        </button>
      </div>
    </div>
  );
}
