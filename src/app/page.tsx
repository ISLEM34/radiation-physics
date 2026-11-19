import { getCurrentUser } from "@/lib/auth";
import { ensureScheduler, getStats } from "@/lib/catalog";
import { AuthProvider } from "@/components/auth-provider";
import TopBar, { RadiationMark } from "@/components/top-bar";
import Console from "@/components/console";
import { Counter, Countdown } from "@/components/readouts";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  ensureScheduler();
  const user = await getCurrentUser();
  const stats = await getStats(user?.id ?? null);
  const { q = "" } = await searchParams;

  return (
    <AuthProvider>
      <TopBar nextDropAt={stats.nextDropAt} />

      {/* ── §00 الواجهة: بئر المفاعل والتوهّج ── */}
      <section className="relative isolate overflow-hidden">
        <img
          src="images/cherenkov.jpg"
          alt="توهّج تشيرينكوف الأزرق في بئر مفاعل أبحاث نووي"
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
        <div className="absolute inset-0 bg-linear-to-l from-carbon via-carbon/90 to-carbon/30" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-carbon via-carbon/85 to-transparent" />
        <div className="scanlines pointer-events-none absolute inset-0" />

        <div className="relative mx-auto flex min-h-[86vh] max-w-[1500px] flex-col justify-end px-4 pt-32 pb-8 md:px-8">
          {/* سطر قسم بعلامات جهاز قياس */}
          <div className="mb-6 flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 border-t border-r border-phos" />
            <span className="mono-label shrink-0">
              §00 — علوم المادة SM · ar / fr / en
            </span>
            <span className="hidden h-px flex-1 bg-hair sm:block" />
            <span className="mono-label hidden shrink-0 text-phos/80 sm:block">
              cherenkov · reactor pool · λ&nbsp;~&nbsp;450nm
            </span>
          </div>

          <h1 className="font-display text-[clamp(2.6rem,8vw,6.5rem)] leading-[0.95] text-film">
            الفهرس الإشعاعي
          </h1>
          <p className="mt-3 font-display text-[clamp(1.05rem,2.6vw,1.9rem)] text-phos">
            فيزياء الإشعاع في علوم المادة
          </p>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            فهرس حيّ لمصادر أضرار الإشعاع، زرع الأيونات، توصيل النيوترونات والأشعة، وقواعد بيانات
            المواد — دروس، أوراق، كتب، محاكاة ومؤسسات بالعربية والفرنسية والإنجليزية. كل رابط يُفحص
            من الخادم، والمصادر المعطّلة تُعلَّم، ويُسقط{" "}
            <span className="text-phos">٣ مراجع جديدة كل ساعة</span>.
          </p>

          {/* شريط البحث */}
          <form
            action="/"
            method="get"
            className="group mt-8 flex w-full max-w-3xl items-stretch border border-hair-2 bg-carbon/85 backdrop-blur transition focus-within:border-phos"
          >
            <span className="mono-label hidden items-center border-l border-hair px-4 sm:flex">
              /بحث
            </span>
            <input
              name="q"
              defaultValue={q}
              placeholder="ضرر إشعاعي · ion implantation · SRIM · علوم المادة"
              aria-label="ابحث في الفهرس"
              className="w-full bg-transparent px-4 py-4 text-base text-ink caret-phos outline-none placeholder:text-muted/70 md:text-lg"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-2 bg-phos px-5 text-sm font-medium text-[#06110f] transition hover:bg-film md:px-8"
            >
              بحث
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M9 2l5 5-5 5M14 7H1" stroke="currentColor" strokeWidth="1.6" fill="none" />
              </svg>
            </button>
          </form>

          {/* قراءات اللوحة */}
          <div className="mt-10 grid grid-cols-2 gap-px border border-hair bg-hair md:grid-cols-4">
            <Readout
              label="المصادر في الفهرس"
              value={<Counter value={stats.total} />}
              sub="مصدر مفحوص"
            />
            <Readout
              label="روابط مُتحقَّق منها"
              value={<Counter value={stats.verified} />}
              sub="سليم"
              tone="text-phos"
              tick
            />
            <Readout
              label="حسابات مسجّلة"
              value={<Counter value={stats.accounts} />}
              sub="مستخدم"
            />
            <div className="bg-carbon px-4 py-4">
              <p className="mono-label">الإضافة التالية بعد</p>
              <div className="mt-1.5">
                <Countdown to={stats.nextDropAt} big />
              </div>
              <p className="mt-1 text-xs text-muted">
                <span className="num text-ink">{stats.queueRemaining}</span> مرجع في الطابور
              </p>
            </div>
          </div>
        </div>
      </section>

      <Console initialQuery={q} initialStats={stats} />

      {/* ── §02 المنهجية والحساب ── */}
      <footer id="method" className="relative isolate scroll-mt-24 overflow-hidden border-t border-hair bg-carbon-2">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-screen"
          style={{
            backgroundImage: "url(/images/rings.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "radial-gradient(120% 80% at 85% 20%, #000 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(120% 80% at 85% 20%, #000 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[1500px] px-4 py-14 md:px-8">
          <div className="mb-10 flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 border-t border-r border-phos" />
            <span className="mono-label">§02 — المنهجية · تحقق · إضافة · حساب</span>
            <span className="hidden h-px flex-1 bg-hair md:block" />
          </div>

          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <p className="mono-label mb-3">§02 — كيف نتحقق</p>
              <h3 className="font-display text-2xl text-ink">فحص الروابط من الخادم</h3>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted">
                <li>
                  <Dot c="bg-phos" /> <span className="text-phos">مُتحقَّق:</span> يستجيب الخادم
                  بنجاح (2xx/3xx، أو 403/429 من مواقع تحمي نفسها من الروبوتات).
                </li>
                <li>
                  <Dot c="bg-hazard" /> <span className="text-hazard">معطّل:</span> 404/410، أو
                  إبلاغ مستخدم مسجّل بالانقطاع.
                </li>
                <li>
                  <Dot c="bg-muted" /> <span className="text-muted">غير مؤكد:</span> مهلة أو حجب
                  شبكة — لا نُسقط الرابط لنفس السبب.
                </li>
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-muted/80">
                تُعاد مراجعة كل رابط كل ٦ ساعات، ويمكن تشغيل الفحص يدويًا من زر «فحص الروابط الآن».
              </p>
            </div>

            <div>
              <p className="mono-label mb-3">§03 — الإضافة كل ساعة</p>
              <h3 className="font-display text-2xl text-ink">سقوط مراجع جديدة</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                يستدعي الفهرس مؤقّتًا يعمل مع كل تشغيل للخادم، ويُسقط ٣ مصادر مُنتقاة يدويًا من طابور
                المراجع عند اكتمال كل ساعة. المصادر الأصلية موزّعة على الأيام السابقة حتى يظهر السجل
                حيًّا.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-px border border-hair bg-hair">
                <div className="bg-carbon p-3">
                  <p className="mono-label">أُضيفت آخر ساعة</p>
                  <p className="num mt-1 text-2xl text-phos">{stats.addedLastHour}</p>
                </div>
                <div className="bg-carbon p-3">
                  <p className="mono-label">متبقٍ في الطابور</p>
                  <p className="num mt-1 text-2xl text-ink">{stats.queueRemaining}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="mono-label mb-3">§04 — الحساب والحفظ</p>
              <h3 className="font-display text-2xl text-ink">مراجعاتي</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                أنشئ حسابًا بالبريد وكلمة المرور (٨ أحرف فأكثر) لحفظ أي مصدر بنقرة واحدة، وعرض
                مراجعاتك المحفوظة في تبويب مستقل. كلمة المرور تُجزَّأ بـ scrypt وملف الجلسة موقَّع
                بـ HMAC في كوكيز httpOnly.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted">
                <li>
                  <span className="num text-phos">01</span> — إنشاء حساب فوري دون بريد تأكيد.
                </li>
                <li>
                  <span className="num text-phos">02</span> — حفظ/إلغاء حفظ أي مصدر مع عدّاد.
                </li>
                <li>
                  <span className="num text-phos">03</span> — إبلاغ عن رابط معطّل يُعلِّمه فورًا.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-6">
            <div className="flex items-center gap-3">
              <RadiationMark className="h-6 w-6 text-hazard" />
              <span className="mono-label">
                radiation physics · materials science · {new Date().getFullYear()}
              </span>
            </div>
            <p className="text-xs text-muted">
              الروابط ملك لأصحابها؛ الفهرس فهرس توجيهي لأغراض الدراسة.
            </p>
          </div>
        </div>
      </footer>
    </AuthProvider>
  );
}

function Readout({
  label,
  value,
  sub,
  tone = "text-ink",
  tick = false,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  tone?: string;
  tick?: boolean;
}) {
  return (
    <div className="relative bg-carbon px-4 py-4">
      {tick ? (
        <span className="absolute top-0 right-0 h-2.5 w-2.5 border-t border-r border-phos" />
      ) : null}
      <p className="mono-label">{label}</p>
      <p className={`mt-1 text-3xl ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full align-middle ${c}`} />;
}
