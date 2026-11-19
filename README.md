# الفهرس الإشعاعي — Radiation Physics & Materials (SM)

فهرس مفتوح ومتجدد لمصادر دراسة **فيزياء الإشعاع في علومматериал** بالعربية والفرنسية والإنجليزية:
بحث، تحقق آلي من الروابط، إضافة مراجع كل ساعة، وحسابات لحفظ المراجعات.

## المزايا

- **167 مصدرًا** (ar / fr / en): أضرار الإشعاع، زرع الأيونات، توصيل النيوترونات والأشعة،
  قواعد بيانات المواد، مجلات، مؤسسات (IAEA, ILL, ESRF, ORNL, NIST, IRAMIS, SF2M…) وفيديو.
- **محرك بحث** + مُرشِّحات (اللغة / النوع / الموضوع / المُتحقَّق منه فقط) + ترتيب + تمرير لانهائي.
- **تحقق من الروابط من الخادم** (HEAD ثم GET، مهلة 7 ثوانٍ): `مُتحقَّق` / `معطّل` / `غير مؤكد`
  — مع إعادة فحص كل 6 ساعات، وزر «فحص الروابط الآن»، وإبلاغ المستخدمين عن الروابط المعطّلة.
- **إضافة كل ساعة**: 3 مراجع جديدة من طابور منظّم `QUEUE` مع عدّاد تنازلي حيّ.
- **حسابات**: تسجيل/دخول فوري، كلمة مرور مُجزّأة بـ scrypt، جلسة موقّعة HMAC في كوكيز httpOnly،
  تبويب «مراجعاتي» للحفظ/إلغاء الحفظ مع عدّاد.

## التشغيل المحلي

```bash
npm install
cp .env.example .env        # ثم عدّل DATABASE_URL
npx drizzle-kit push        # إنشاء الجداول
npm run build && npm run start
# http://localhost:3000
```

أول طلب للواجهة يُزرع الفهرس تلقائيًا ويبدأ فحص الروابط.

## النشر

انظر **[DEPLOY.md](./DEPLOY.md)** للخيارات الثلاثة:
1. استضافة جاهزة (أو Docker): `docker compose up -d --build`
2. VPS يدوي: `npx drizzle-kit push && npm run build && npm run start`
3. Serverless (Vercel + Neon/Supabase)

## بنية المشروع

```
src/app/page.tsx              الواجهة (Hero + تذييل المنهجية)
src/components/console.tsx    الفهرس: بحث، مُرشِّحات، سجل المصادر، الحفظ
src/components/auth-provider.tsx  تسجيل الدخول / إنشاء الحساب
src/lib/sources.ts            167 مصدرًا + طابور الإضافة QUEUE + المُواضيع
src/lib/catalog.ts            الزرع، المؤقّت الساعةي، الإحصاءات، المُرشِّحات
src/lib/verify.ts             فاحص الروابط
src/db/schema.ts              Drizzle: users · resources · saved_resources · site_meta
```

## متغيرات البيئة

| المتغير | الحالة |
|---|---|
| `DATABASE_URL` | مطلوب |
| `SESSION_SECRET` | يُنصح به |
| `PORT` | اختياري (3000) |
