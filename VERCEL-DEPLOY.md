# النشر المجاني: Vercel + Neon

>يعمل التطبيق **كاملًا** على الخطة المجانية: البحث، الحسابات، الحفظ، الفحص،
>والإضافة الساعية (عبر Vercel Cron بدل المؤقّت الداخلي الذي يتجمّد في serverless).

## ١) قاعدة Neon (مجانية دائمة)

1. افتح **neon.tech** → سجّل بـ GitHub → **New Project**.
2. الاسم مثلاً `radiation-index`، المنطقة `eu-central-1` (أقرب لأوروبا/المغرب).
3. انسخ **Connection string** من الصفحة الرئيسية (الذي يبدأ بـ `postgresql://…`).
4. احفظه — هو المتغير `DATABASE_URL`.

> Neon المجاني: 0.5 GB تخزين، حجم compute مصغّر، يتوقف تلقائيًا عند الخمول ويستيقظ
> عند أول طلب (عدّاد squarespace milliseconds مجاني كافٍ لمشروع تعليمي صغير).

## ٢) Vercel

1. افتح **vercel.com/new** → **Import** لمستودعك:
   `https://github.com/ISLEM34/radiation-physics`.
2. في صفحة **Configure Project** أضف المتغيرات:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط Neon من الخطوة ١ |
| `SESSION_SECRET` | أي سلسلة عشوائية طويلة (مثال: `openssl rand -hex 32`) |
| `CRON_SECRET` | سلسلة عشوائية أخرى لحماية مسارات cron |

3. **Build Command** (يُنشئ الجداول قبل البناء):
   ```
   npx drizzle-kit push --force && next build
   ```
   > `--force` يسمح لـ drizzle-kit بالعمل خارج بيئة تفاعلية على Vercel.
   > بديل إن أردت الاحتفاظ بالأمر الافتراضي: `next build` ثم نفّذ الـpush مرة يدويًا
   > عبر `npx drizzle-kit push` من جهازك مع نفس `DATABASE_URL`.

4. **Deploy**. أول زيارة للموقع تُزرع 167 مصدرًا تلقائيًا ويبدأ فحص الروابط.

## ٣) Cron (مُعدّ مسبقًا في `vercel.json`)

| المسار | الجدول | المهمة |
|---|---|---|
| `/api/cron/drop` | كل ساعة (`0 * * * *`) | إسقاط ٣ مراجع جديدة + ضبط عدّاد |
| `/api/cron/verify` | الساعة والدقيقة ٣٥ (`5,35 * * * *`) | فحص حتى ٤٠ رابطًا قديمًا/غير مؤكد |

Vercel يضيف تلقائيًا ترويسة `Authorization: Bearer $CRON_SECRET` — المسارات تتحقق منها
(إن تركت `CRON_SECRET` فارغًا تعمل بدون حماية، لا يُنصح).

> **تنبيه الخطة المجانية:** Cron على Hobby = **مرة واحدة يوميًا لكل مسار** في الوضع القديم؛
> إن لم تظهر الوظائف في تبويب Crons، استخدم **GitHub Actions** بديلًا (مجاني، كل ساعة)
> باستدعاء `https://<project>.vercel.app/api/cron/drop?secret=$CRON_SECRET` عبر `curl`.

## ٤) التحقق بعد Deploy

```bash
curl https://<project>.vercel.app/api/health      # {"ok":true}
curl https://<project>.vercel.app/api/stats       # total = 167
curl -X POST https://<project>.vercel.app/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"تجربة","email":"test@example.com","password":"testpass123"}'
```

## حدود مجانية Vercel Hobby (2026)

- 1,000,000 استدعاء دالة / شهر · 4 ساعات CPU نشط / شهر · 360 GB-hour ذاكرة.
- أقصى مدة دالة 300 ثانية (ضبطناها في `/api/cron/verify`).
- 100 GB نقل بيانات / شهر · 100 نشر/يوم · حد بناء ٤٥ دقيقة.
- **للاستخدام الشخصي غير التجاري فقط** (سياسة Hobby).

## ملفات المشروع ذات الصلة

- `vercel.json` — تعريف Cron
- `src/app/api/cron/drop/route.ts` — إسقاط المراجع
- `src/app/api/cron/verify/route.ts` — فحص الروابط
- `src/lib/cron.ts` — حماية CRON_SECRET + نبضة القاعدة
- `src/lib/catalog.ts` — `runDropIfDue()` (يُحدّث `last_ping_at` عند كل إسقاط)
