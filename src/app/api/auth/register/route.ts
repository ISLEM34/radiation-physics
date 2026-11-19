import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { ensureScheduler } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  ensureScheduler();
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (name.length < 2 || name.length > 80)
    return NextResponse.json({ error: "الاسم يجب أن يكون بين حرفين و٨٠ حرفًا." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return NextResponse.json({ error: "البريد الإلكتروني غير صالح." }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "كلمة المرور يجب ألا تقل عن ٨ أحرف." }, { status: 400 });

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length)
    return NextResponse.json({ error: "هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول." }, { status: 409 });

  const inserted = await db
    .insert(users)
    .values({ name, email, passwordHash: hashPassword(password) })
    .returning({ id: users.id, name: users.name, email: users.email });

  const user = inserted[0];
  await setSessionCookie(user.id);
  return NextResponse.json({ user }, { status: 201 });
}
