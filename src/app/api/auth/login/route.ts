import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { ensureScheduler } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  ensureScheduler();
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password)
    return NextResponse.json({ error: "أدخل البريد وكلمة المرور." }, { status: 400 });

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash))
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });

  await setSessionCookie(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
