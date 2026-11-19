# دليل النشر — الفهرس الإشعاعي

تطبيق Next.js (App Router) + PostgreSQL عبر Drizzle ORM. لا يعتمد على أي خدمة خارجية:
الصور داخل `public/`، والخطوط تُبنى ذاتيًا (next/font)، والفحص يتم من الخادم.

---

## المتغيرات

| المتغير | مطلوب | الوصف |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/app_db` |
| `SESSION_SECRET` | يُنصح | مفتاح توقيع ملف الجلسة (بدونه يستخدم قيمة افتراضية للتطوير فقط) |
| `PORT` | اختياري | منفذ الخادم، الافتراضي `3000` |

---

## الخيار 1 — منصة جاهزة (أسرع طريقة)

النسخة الحالية منشورة أصلًا على منصة المعاينة этой الجلسة (رابط `previewUrl`).
لنشر نسخة جديدة: ارفع المستودع، وحدّث المتغيرات أعلاه، وأمر البناء والتشغيل:

```bash
npm install
npx drizzle-kit push     # ينشئ الجداول مرة واحدة
npm run build
npm run start
```

> أول طلب للواجهة يُزرع الفهرس تلقائيًا (167 مصدرًا) ويبدأ فحص الروابط.

---

## الخيار 2 — خادم خاص (VPS) مع Docker

```bash
git clone <repo> && cd <repo>
docker compose up -d --build
# الموقع على http://localhost:3000
```

`docker-compose.yml`:

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/app_db
      SESSION_SECRET: ضع-سرًا-عشوائيًا-طويلًا-هنا
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```

بدون Docker:

```bash
npm ci
npx drizzle-kit push
npm run build && npm run start        # شغّله خلف systemd/pm2 ليبقى يعمل
```

---

## الخيار 3 — استضافة Serverless (Vercel + Neon / Supabase)

1. ارفع المستودع إلى GitHub ثم استورده في Vercel.
2. أنشئ قاعدة **Neon** أو **Supabase** وانسخ `DATABASE_URL`.
3. في Vercel: أضف المتغير `DATABASE_URL` (+ `SESSION_SECRET`) للإنتاج.
4. أمر البناء: `npx drizzle-kit push && npx next build` — أو نفّذ `npx drizzle-kit push` مرة واحدة عبر `vercel env pull` + سكربت.
5. Deploy.

**ملاحظات خاصة بالـserverless:**
- المؤقّت الداخلي (كل دقيقة) لا يعمل والخادم مُجمَّد، لكن `runDropIfDue()` يفحص الفارق الزمني عند **كل طلب**، فتُسقط 3 مراجع جديدة فور أول زيارة بعد انقضاء ساعة — أي أن «الإضافة كل ساعة» تبقى تعمل حتى بلا خادم دائم.
- إن أردت دقة تامة: أضيف جدولة خارجية (Vercel Cron / GitHub Actions) كل ساعة تستدعي `POST /api/verify` و`GET /api/stats` (اللذان يستدعيان المؤقّت نفسه).

---

## بعد النشر — ما الذي يحدث تلقائيًا

1. **الزرع:** أول طلب → `seedIfEmpty()` يُدخل 167 مصدرًا (ar/fr/en) ويضبط عدّاد الإضافة.
2. **الفحص:** الصفحة تفحص الروابط تلقائيًا (10 في الدورة، حتى 5 دورات) ثم زر «فحص الروابط الآن» يدويًا؛ إعادة الفحص الدورية كل 6 ساعات، وروابط 404 تُراجَع بعد 24 ساعة.
3. **الإضافة:** كل ساعة يُسقط 3 مراجع من الطابور (37 مرجعًا متبقيًا حاليًا) — أضف عناصر جديدة إلى `QUEUE` في `src/lib/sources.ts` لاستمرار السقوط.
4. **الحسابات:** تسجيل/دخول فوري، حفظ المراجعات، الإبلاغ عن رابط معطّل.

## التحقق قبل النشر

```bash
npx next typegen
npm exec tsc -- --noEmit
npm run build
npm run start   # ثم جرّب: /api/health  ·  /api/stats  ·  /api/auth/register
```
